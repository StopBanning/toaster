// The player bar's way to the system's own player (helpers/player.cjs): the exact commands sent to Music and Spotify
// on a Mac and the media keys on Windows, read off a runner that sends nothing, so no test here ever touches a player
// or presses a key. How a refusal, a stopped player, a slow answer and a made-up one are told apart.
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { ACTIONS, MEDIA_KEYS, macCommand, macPosition, parsePosition, windowsArgs, realRun, dryRunner, createPlayerControl } = createRequire(import.meta.url)('../helpers/player.cjs');

// a runner that sends nothing: it keeps what it was asked to send, and answers with what it's given
function fake(answer = '') {
  const sent = [];
  return { sent, run: async (file, args) => { sent.push([file, ...args]); return typeof answer === 'function' ? answer(file, args) : answer; } };
}
const OSASCRIPT = '/usr/bin/osascript';

test('on a Mac, each button is exactly one AppleScript line for Music or Spotify', async () => {
  const f = fake();
  const p = createPlayerControl({ platform: 'darwin', run: f.run });
  for (const who of ['music', 'spotify']) for (const action of ACTIONS) assert.deepEqual(await p.command(who, action), { ok: true });
  assert.deepEqual(f.sent, [
    [OSASCRIPT, '-e', 'if application "Music" is running then tell application "Music" to playpause'],
    [OSASCRIPT, '-e', 'if application "Music" is running then tell application "Music" to next track'],
    [OSASCRIPT, '-e', 'if application "Music" is running then tell application "Music" to back track'],
    [OSASCRIPT, '-e', 'if application "Spotify" is running then tell application "Spotify" to playpause'],
    [OSASCRIPT, '-e', 'if application "Spotify" is running then tell application "Spotify" to next track'],
    [OSASCRIPT, '-e', 'if application "Spotify" is running then tell application "Spotify" to previous track'],
  ]);
});

test('a player that is not running is not opened: every line asks first, and none launches or activates anything', () => {
  for (const who of ['music', 'spotify']) {
    const app = { music: 'Music', spotify: 'Spotify' }[who];
    for (const script of [...ACTIONS.map((a) => macCommand(who, a)), macPosition(who)]) {
      assert.ok(script.startsWith(`if application "${app}" is running then tell application "${app}" to `), script);
      assert.doesNotMatch(script, /\b(launch|activate|reopen|open)\b/);
      assert.equal([...script.matchAll(/tell application/g)].length, 1, 'one player, once');
    }
  }
});

test('only the three actions on the known players go out, and only on their own system', async () => {
  const f = fake();
  const mac = createPlayerControl({ platform: 'darwin', run: f.run }), win = createPlayerControl({ platform: 'win32', run: f.run }), linux = createPlayerControl({ platform: 'linux', run: f.run });
  const nope = { ok: false, why: 'unsupported' };
  for (const [p, who, action] of [
    [mac, 'music', 'quit'], [mac, 'music', 'play'], [mac, 'music', 'stop'], [mac, 'music', undefined], [mac, 'music', ['playpause']], [mac, 'Music', 'playpause'],
    [mac, 'keys', 'playpause'], [mac, '__proto__', 'playpause'], [mac, 'constructor', 'next'], [mac, ['music'], 'next'], [mac, undefined, 'next'], [mac, 'chrome', 'next'],
    [win, 'music', 'playpause'], [win, 'spotify', 'next'], [win, 'keys', 'volumeup'], [win, 'keys', 'stop'], [win, '__proto__', 'next'],
    [linux, 'music', 'playpause'], [linux, 'keys', 'playpause'],
  ]) assert.deepEqual(await p.command(who, action), nope, `${String(who)} ${String(action)}`);
  assert.deepEqual(await linux.position('music'), nope);
  assert.deepEqual(await win.position('music'), nope);
  assert.deepEqual(await mac.position('keys'), nope);
  assert.deepEqual(await mac.position('__proto__'), nope);
  assert.deepEqual(f.sent, [], 'nothing was sent for any of them');
});

test('where it is in the song: the exact question for each player, and what its answer is read as', async () => {
  assert.equal(macPosition('music'), 'if application "Music" is running then tell application "Music" to return (((player position * 1000) div 1) as text) & "|" & ((((duration of current track) * 1000) div 1) as text) & "|" & (player state as text)');
  assert.equal(macPosition('spotify'), 'if application "Spotify" is running then tell application "Spotify" to return (((player position * 1000) div 1) as text) & "|" & (((duration of current track) div 1) as text) & "|" & (player state as text)');
  const f = fake('61250|215000|playing\n');
  const p = createPlayerControl({ platform: 'darwin', run: f.run });
  assert.deepEqual(await p.position('music'), { ok: true, position: 61.25, duration: 215, playing: true });
  assert.deepEqual(f.sent, [[OSASCRIPT, '-e', macPosition('music')]]);
  assert.deepEqual(parsePosition('0|0|stopped'), { position: 0, duration: 0, playing: false });
  assert.deepEqual(parsePosition(' 1000|180500|paused '), { position: 1, duration: 180.5, playing: false });
  assert.deepEqual(parsePosition('1000|180500|kPSP'), { position: 1, duration: 180.5, playing: true }, 'a constant handed over unnamed still says playing');
  for (const junk of ['', '\n', 'missing value', '1.5|2|playing', '1|2', '|2|playing', 'a|b|playing', '-3|10|playing', null, undefined]) assert.equal(parsePosition(junk), null, JSON.stringify(junk));
  // nothing running, or no song (the question answers nothing): not an error, just no reading
  assert.deepEqual(await createPlayerControl({ platform: 'darwin', run: fake('').run }).position('spotify'), { ok: false, why: 'off' });
});

test('macOS saying no (-1743) is "denied"; any other trouble is "failed"; neither throws', async () => {
  const refuse = () => { const e = new Error('Command failed: osascript'); e.stderr = '1:20: execution error: Not authorized to send Apple events to Music. (-1743)'; throw e; };
  const p = createPlayerControl({ platform: 'darwin', run: async () => refuse() });
  assert.deepEqual(await p.command('music', 'playpause'), { ok: false, why: 'denied' });
  assert.deepEqual(await p.position('music'), { ok: false, why: 'denied' });
  const broke = createPlayerControl({ platform: 'darwin', run: async () => { throw new Error('spawn /usr/bin/osascript ENOENT'); } });
  assert.deepEqual(await broke.command('spotify', 'next'), { ok: false, why: 'failed' });
  assert.deepEqual(await broke.position('spotify'), { ok: false, why: 'failed' });
  const slow = createPlayerControl({ platform: 'darwin', run: async () => { const e = new Error('timed out'); e.killed = true; throw e; } });
  assert.deepEqual(await slow.command('music', 'next'), { ok: false, why: 'failed' });
  // and a runner that throws at once, before any answer, is no different
  const sync = createPlayerControl({ platform: 'darwin', run: () => { throw new Error('now'); } });
  assert.deepEqual(await sync.command('music', 'next'), { ok: false, why: 'failed' });
  assert.deepEqual(await sync.position('music'), { ok: false, why: 'failed' });
  assert.deepEqual(await sync.position('music'), { ok: false, why: 'failed' }, 'and asking again still asks');
});

test('a position question still out is shared by the next, not asked twice; once answered, the next one asks again', async () => {
  const waiting = [];
  const sent = [];
  const p = createPlayerControl({ platform: 'darwin', run: (file, args) => { sent.push(args[1]); return new Promise((resolve) => waiting.push(resolve)); } });
  const a = p.position('music'), b = p.position('music'), c = p.position('spotify');
  assert.equal(sent.length, 2, 'Music once, Spotify once');
  waiting[0]('1000|2000|playing');
  const [ra, rb] = await Promise.all([a, b]);
  assert.deepEqual(ra, rb);
  assert.equal(ra.position, 1);
  const again = p.position('music');
  assert.equal(sent.length, 3, 'asked again after it answered');
  waiting[1]('5000|9000|paused'); waiting[2]('7000|9000|paused');
  assert.equal((await c).position, 5);
  assert.equal((await again).position, 7);
});

test('on Windows, each button is one media key, pressed and let go with SendInput by helpers/mediakeys.ps1, run with -File as the other helpers are', async () => {
  const f = fake();
  const p = createPlayerControl({ platform: 'win32', run: f.run });
  for (const action of ACTIONS) assert.deepEqual(await p.command('keys', action), { ok: true });
  assert.equal(f.sent.length, 3);
  ACTIONS.forEach((action, i) => {
    const [file, ...args] = f.sent[i];
    assert.equal(file, 'powershell.exe');
    assert.deepEqual(args, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', MEDIA_KEYS, action]);
    assert.deepEqual(args, windowsArgs(action));
  });
  // the helper beside player.cjs, and in the installed app the unpacked copy (packaging leaves helpers/ as files)
  assert.equal(path.basename(MEDIA_KEYS), 'mediakeys.ps1');
  assert.equal(path.basename(path.dirname(MEDIA_KEYS)), 'helpers');
  assert.doesNotMatch(windowsArgs('next').join(' '), /EncodedCommand/);
});

test('the Windows helper presses only the three media keys, and is pinned so a change is a decision', () => {
  const script = fs.readFileSync(MEDIA_KEYS, 'utf8').replace(/\r\n/g, '\n'); // (as checked out on any machine)
  assert.match(script, /param\(\[Parameter\(Mandatory\)\]\[ValidateSet\('playpause', 'next', 'previous'\)\]\[string\]\$Key\)/);
  assert.match(script, /\$vk = @\{ playpause = 0xB3; next = 0xB0; previous = 0xB1 \}\[\$Key\]/); // VK_MEDIA_PLAY_PAUSE, VK_MEDIA_NEXT_TRACK, VK_MEDIA_PREV_TRACK
  assert.match(script, /DllImport\("user32\.dll", SetLastError = true\)\]\s+static extern uint SendInput\(uint count, INPUT\[\] inputs, int size\);/);
  // the INPUT struct is as big as its biggest member (the mouse's), through the union, or SendInput refuses it
  assert.match(script, /struct INPUTUNION \{ \[FieldOffset\(0\)\] public MOUSEINPUT mi; \[FieldOffset\(0\)\] public KEYBDINPUT ki; \}/);
  assert.match(script, /struct INPUT \{ public uint type; public INPUTUNION u; \}/);
  assert.match(script, /Marshal\.SizeOf\(typeof\(INPUT\)\)/);
  // one press (the extended-key flag) and one release (that and key-up), as a keyboard's media key is
  assert.match(script, /keys\[0\]\.u\.ki\.dwFlags = 1;/);
  assert.match(script, /keys\[1\]\.u\.ki\.dwFlags = 3;/);
  assert.equal(crypto.createHash('sha256').update(script).digest('hex'), PINNED);
});
const PINNED = '054d9e32b34d91c4f389feb81bbe111de9dadb16afc6cbdf6aed06c44625b020';

test('a copy run with --player-dry-run keeps what it would have sent, and answers a position question with a made-up reading', async () => {
  const dry = dryRunner();
  const mac = createPlayerControl({ platform: 'darwin', run: dry.run });
  assert.deepEqual(await mac.command('music', 'playpause'), { ok: true });
  assert.deepEqual(await mac.position('spotify'), { ok: true, position: 61, duration: 215, playing: true });
  assert.deepEqual(dry.sent, [
    [OSASCRIPT, '-e', 'if application "Music" is running then tell application "Music" to playpause'],
    [OSASCRIPT, '-e', macPosition('spotify')],
  ]);
});

test('the real runner gives back what a program printed, and a failure carries what it said; nothing here is a player', async () => {
  assert.equal(await realRun(process.execPath, ['-e', 'process.stdout.write("hi")']), 'hi');
  await assert.rejects(realRun(process.execPath, ['-e', 'console.error("no thanks (-1743)"); process.exit(3)']), (err) => /no thanks \(-1743\)/.test(err.stderr));
  // so a refusal that comes through the real runner is read as one
  const p = createPlayerControl({ platform: 'darwin', run: (file, args) => realRun(process.execPath, ['-e', 'console.error("Not authorized to send Apple events to Music. (-1743)"); process.exit(1)']) });
  assert.deepEqual(await p.command('music', 'next'), { ok: false, why: 'denied' });
});
