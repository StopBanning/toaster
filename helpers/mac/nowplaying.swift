// Reports what the Mac says is playing (Spotify, browsers, anything that shows up in
// Now Playing) as one JSON line whenever it changes. Toaster's main process reads these
// lines. Pass --once to print a single reading and exit.
//
// The session lives in the private MediaRemote framework, the same list Control Center
// shows. AppleScript can ask Music and Spotify, and misses a song playing in a browser,
// which is the case this is here for. Nothing leaves this Mac.

import AppKit
import Darwin
import Foundation

let once = CommandLine.arguments.contains("--once")

let mediaRemote = dlopen("/System/Library/PrivateFrameworks/MediaRemote.framework/MediaRemote", RTLD_LAZY)

func symbol(_ name: String) -> UnsafeMutableRawPointer? {
    guard let mediaRemote else { return nil }
    return dlsym(mediaRemote, name)
}

func stringKey(_ name: String) -> String {
    guard let raw = symbol(name) else { return name }
    return (raw.assumingMemoryBound(to: CFString?.self).pointee as String?) ?? name
}

// @escaping: MediaRemote keeps the block and calls it later. Without it Swift builds the
// block on the stack and aborts when the framework holds on to it.
typealias GetInfo = @convention(c) (DispatchQueue, @escaping @convention(block) (CFDictionary?) -> Void) -> Void
typealias GetPlaying = @convention(c) (DispatchQueue, @escaping @convention(block) (Bool) -> Void) -> Void
typealias GetPID = @convention(c) (DispatchQueue, @escaping @convention(block) (Int32) -> Void) -> Void

let getInfo: GetInfo? = symbol("MRMediaRemoteGetNowPlayingInfo").map { unsafeBitCast($0, to: GetInfo.self) }
let getPlaying: GetPlaying? = symbol("MRMediaRemoteGetNowPlayingApplicationIsPlaying").map { unsafeBitCast($0, to: GetPlaying.self) }
let getPID: GetPID? = symbol("MRMediaRemoteGetNowPlayingApplicationPID").map { unsafeBitCast($0, to: GetPID.self) }

let keyTitle = stringKey("kMRMediaRemoteNowPlayingInfoTitle")
let keyArtist = stringKey("kMRMediaRemoteNowPlayingInfoArtist")
let keyArt = stringKey("kMRMediaRemoteNowPlayingInfoArtworkData")
let keyArtType = stringKey("kMRMediaRemoteNowPlayingInfoArtworkMIMEType")

let queue = DispatchQueue(label: "toaster.nowplaying", qos: .utility)

final class OnceBox<T> {
    var value: T
    var done = false
    let lock = NSLock()
    init(_ value: T) { self.value = value }
}

/// MediaRemote calls back on the queue it's given. Wait, but not forever: a call that
/// never returns would stop the titles until Toaster is opened again.
func awaitRemote<T>(_ fallback: T, _ body: (@escaping (T) -> Void) -> Void) -> T {
    let box = OnceBox(fallback)
    let sem = DispatchSemaphore(value: 0)
    body { value in
        box.lock.lock()
        let first = !box.done
        if first {
            box.done = true
            box.value = value
        }
        box.lock.unlock()
        if first { sem.signal() }
    }
    _ = sem.wait(timeout: .now() + 2)
    box.lock.lock()
    box.done = true
    box.lock.unlock()
    return box.value
}

func text(_ info: NSDictionary, _ key: String) -> String? {
    guard let value = info[key] else { return nil }
    let raw = (value as? String) ?? (value as? NSString).map { $0 as String }
    let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines)
    guard let trimmed, !trimmed.isEmpty else { return nil }
    return trimmed
}

func artworkData(_ info: NSDictionary) -> Data? {
    guard let value = info[keyArt] else { return nil }
    if let data = value as? Data { return data }
    if let data = value as? NSData { return data as Data }
    return nil
}

/// A browser often hands over its own icon until the song's cover arrives. The page
/// tells an icon from a cover; this only checks the bytes are a small image.
func coverArt(_ info: NSDictionary) -> String? {
    guard let data = artworkData(info), data.count >= 64, data.count <= 2 * 1024 * 1024 else { return nil }
    let bytes = [UInt8](data.prefix(8))
    let sniffed: String?
    if bytes.starts(with: [0xFF, 0xD8]) { sniffed = "image/jpeg" }
    else if bytes.starts(with: [0x89, 0x50, 0x4E, 0x47]) { sniffed = "image/png" }
    else if let given = text(info, keyArtType), given.hasPrefix("image/") { sniffed = given }
    else { sniffed = nil }
    guard let sniffed else { return nil }
    return "data:\(sniffed);base64,\(data.base64EncodedString())"
}

/// Chrome's helper processes report the helper, which lives inside the real app.
/// Climb to the outermost .app so the card says "Google Chrome", not the helper.
func appName(pid: Int32) -> String? {
    guard pid > 0, let running = NSRunningApplication(processIdentifier: pid) else { return nil }
    if let url = running.bundleURL {
        var top = url
        var cursor = url.deletingLastPathComponent()
        while cursor.path != "/" {
            if cursor.pathExtension == "app" { top = cursor }
            let next = cursor.deletingLastPathComponent()
            if next.path == cursor.path { break }
            cursor = next
        }
        if let bundle = Bundle(url: top) {
            let name = (bundle.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String)
                ?? (bundle.object(forInfoDictionaryKey: "CFBundleName") as? String)
                ?? top.deletingPathExtension().lastPathComponent
            if !name.isEmpty { return name }
        }
    }
    let name = running.localizedName?.trimmingCharacters(in: .whitespacesAndNewlines)
    return (name?.isEmpty == false) ? name : nil
}

func jsonString(_ value: String?) -> String {
    guard let value else { return "null" }
    var out = "\""
    for scalar in value.unicodeScalars {
        switch scalar {
        case "\\": out += "\\\\"
        case "\"": out += "\\\""
        case "\n": out += "\\n"
        case "\r": out += "\\r"
        case "\t": out += "\\t"
        default:
            if scalar.value < 0x20 {
                out += String(format: "\\u%04x", scalar.value)
            } else {
                out.unicodeScalars.append(scalar)
            }
        }
    }
    out += "\""
    return out
}

func readSession() -> (title: String?, artist: String?, app: String?, playing: Bool, info: NSDictionary) {
    guard let getInfo, let getPlaying, let getPID else {
        return (nil, nil, nil, false, NSDictionary())
    }
    let info = awaitRemote(NSDictionary()) { done in
        getInfo(queue) { dict in
            done((dict as NSDictionary?) ?? NSDictionary())
        }
    }
    let playing = awaitRemote(false) { done in
        getPlaying(queue) { done($0) }
    }
    let pid = awaitRemote(Int32(0)) { done in
        getPID(queue) { done($0) }
    }
    return (text(info, keyTitle), text(info, keyArtist), appName(pid: pid), playing, info)
}

// The cover is read again through the song's first 20 seconds and every 15 after: a
// browser playing a song gives the title at once and the cover a moment later, with
// the browser's own icon standing in till then. A read that fails keeps the cover
// there was. Same timing as the Windows helper (a poll is 1.5 seconds).
var artKey = ""
var artAge = 0
var art: String?
var last = ""
var warned = false

func poll() {
    if mediaRemote == nil || getInfo == nil {
        if !warned {
            fputs("nowplaying: MediaRemote is not available\n", stderr)
            warned = true
        }
    }
    let session = readSession()
    let identity = "\(session.app ?? "")|\(session.title ?? "")|\(session.artist ?? "")"
    if identity != artKey {
        artKey = identity
        artAge = 0
        art = nil
    }
    var shown = art
    if session.title != nil && (artAge < 14 || artAge % 10 == 0) {
        // Encoding the cover is the expensive part, so it only happens on a refresh.
        if let fresh = coverArt(session.info) {
            art = fresh
            shown = fresh
        } else if artAge == 0 {
            art = nil
            shown = nil
        }
    }
    if session.title != nil { artAge += 1 }
    let json = "{\"title\":\(jsonString(session.title)),\"artist\":\(jsonString(session.artist)),\"app\":\(jsonString(session.app)),\"playing\":\(session.playing ? "true" : "false"),\"art\":\(jsonString(shown))}"
    if json != last {
        print(json)
        fflush(stdout)
        last = json
    }
}

if mediaRemote == nil {
    fputs("nowplaying: could not open MediaRemote\n", stderr)
}

while true {
    poll()
    if once { break }
    // Toaster gone without stopping this (a crash, or killed): launchd has taken this over, so stop too. With no
    // music playing nothing is ever written, so the closed pipe alone would never end it.
    if getppid() == 1 { exit(0) }
    Thread.sleep(forTimeInterval: 1.5)
}
