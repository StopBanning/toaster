// Runs tools/stems-check.html in a hidden Electron window and prints its result as one line of JSON (the tune's line included).
//   electron tools/stems-check.cjs <audio> [start s] [seconds] [--prefer=webgpu|wasm] [--threads=n] [--wav=<file>] [--melody=<file>] [--parts=other,bass --partswav=<file with {part}>] [--rate=44100] [--stereo=1]
// --wav keeps the pulled-out voice (22050 Hz mono); --melody writes the line as [[song time s, length s, midi], ...]
// (what backlog/engineering/tunecounts.py and listen-pack.mjs read as <key>-melody.json).
const { app, BrowserWindow } = require('electron');
const path = require('node:path'), fs = require('node:fs'), os = require('node:os');
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--') && a.includes('=')).map((a) => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const [audio, start = '0', seconds = '30'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stems-check-'));
app.setPath('userData', dir); app.dock?.hide();
if (flags.prefer !== 'wasm') app.commandLine.appendSwitch('enable-unsafe-webgpu');
// (--sab=1: shared memory without cross-origin isolation, so the runtime can use threads; what main.js would have to switch on)
if (flags.sab === '1') app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');
app.whenReady().then(async () => {
  let r = null;
  try {
    const w = new BrowserWindow({ show: false, webPreferences: { backgroundThrottling: false } });
    w.webContents.setAudioMuted(true);
    w.webContents.on('console-message', (e) => process.stderr.write('console: ' + (e.message ?? '') + '\n'));
    await w.loadFile(path.join(__dirname, 'stems-check.html'), { query: { audio: path.resolve(audio), start, seconds, prefer: flags.prefer || 'webgpu', threads: flags.threads || '0', parts: flags.parts || '', rate: flags.rate || '22050', stereo: flags.stereo || '0' } });
    const limit = Number(process.env.STEMS_CHECK_SECONDS || 1800) * 20;
    for (let i = 0; i < limit && !r; i++) { r = await w.webContents.executeJavaScript('window.result'); if (!r) await new Promise((s) => setTimeout(s, 50)); }
    if (!r) r = { ok: false, error: 'no result in time; stage: ' + await w.webContents.executeJavaScript('window.stage') };
    const wav = (file, base64) => {
      const pcm = Buffer.from(base64, 'base64'), h = Buffer.alloc(44);
      h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
      h.writeUInt32LE(22050, 24); h.writeUInt32LE(44100, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
      fs.writeFileSync(file, Buffer.concat([h, pcm]));
    };
    if (r.ok && flags.wav) wav(flags.wav, await w.webContents.executeJavaScript('window.vocals'));
    // (--parts=other,bass --partswav=<dir>/<name>-{part}.wav: the other parts asked for, each to its own file)
    if (r.ok && flags.parts && flags.partswav) for (const [name, b] of Object.entries(await w.webContents.executeJavaScript('window.parts'))) wav(flags.partswav.replace('{part}', name), b);
    if (r.ok && flags.melody) fs.writeFileSync(flags.melody, JSON.stringify(r.line));
    w.destroy();
  } catch (e) { r = { ok: false, error: String(e?.stack || e) }; }
  if (!r) r = { ok: false, error: 'no result in time' };
  console.log(JSON.stringify(r.ok && r.line.length > 12 ? { ...r, line: r.line.length + ' notes' } : r));
  fs.rmSync(dir, { recursive: true, force: true });
  app.exit(r?.ok ? 0 : 1);
});
