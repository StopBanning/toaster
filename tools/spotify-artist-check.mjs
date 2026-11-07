// Hidden isolated Electron copy, fake Web API and intercepted Spotify embed. No live Spotify or player calls.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { startFakeSpotify, idOf } from './spotify-fake.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '_checks/spotify-artist'); fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync(path.join(out, 'profile-'));
const png = fs.readFileSync(path.join(root, 'build/icon.png'));
const fake = await startFakeSpotify({ images: Object.fromEntries(['(III)', 'Lonerism', 'Homogenic', 'Homework', 'TRON: Legacy', 'april mixtape 3'].map((k) => [k, { type: 'image/png', bytes: png }])) });
const port = Number(process.env.SPOTIFY_ARTIST_CDP_PORT || 9477);
// Refuse an occupied port: never connect to or close a pre-existing app.
try { await fetch(`http://127.0.0.1:${port}/json`); throw new Error('CDP port is already in use'); } catch (e) { if (e.message === 'CDP port is already in use') throw e; }
const log = fs.openSync(path.join(out, 'electron.log'), 'w');
const child = spawn(path.join(root, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'), [root, '--hidden', '--mute-audio', '--use-mock-keychain', '--player-dry-run', `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, `--spotify-fake=${fake.base}`], { stdio: ['ignore', log, log] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, send, ev; const errors = [], remote = []; let next = 0;
try {
  let page;
  for (let i = 0; i < 100; i++) { try { page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((p) => p.url.startsWith('file://' + root) && p.url.includes('index.html')); } catch {} if (page) break; await sleep(100); }
  assert.ok(page, 'our isolated page starts');
  ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r) => ws.onopen = r);
  const pending = new Map();
  send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++next; pending.set(id, (m) => m.error ? reject(Error(m.error.message)) : resolve(m.result)); ws.send(JSON.stringify({ id, method, params })); });
  ws.onmessage = async (e) => {
    const m = JSON.parse(e.data); if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || 'exception');
    if (m.method === 'Fetch.requestPaused') {
      const { requestId, request } = m.params; remote.push(request.url);
      // A fake embed under the real origin verifies CSP and sandbox without fetching Spotify.
      const embed = request.url.startsWith('https://open.spotify.com/embed/track/');
      const html = '<!doctype html><meta charset="utf-8"><style>body{background:#121212;color:white;font:20px system-ui;padding:2em}small{display:block;color:#aaa}</style><h2>Spotify test player</h2><p>Video surface — fake content</p><small>No Spotify media was requested.</small><script>parent.postMessage({toasterFakeEmbed:true,bridge:typeof window.nc},"*")</script>';
      await send('Fetch.fulfillRequest', { requestId, responseCode: embed ? 200 : 403, responseHeaders: [{ name: 'Content-Type', value: 'text/html' }], body: Buffer.from(embed ? html : 'blocked by test').toString('base64') });
    }
  };
  ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || 'page exception'); return r.result.value; };
  const until = async (expr) => { for (let i = 0; i < 100; i++) { if (await ev(expr)) return; await sleep(100); } throw Error('Timed out: ' + expr + ' ' + JSON.stringify(await ev(`({artist:__nc?.library?.state.sp.artist,error:__nc?.library?.state.sp.error,typing:__nc?.library?.state.typing,open:__nc?.library?.state.open,mini:__nc?.state.mini,dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.id),focus:document.activeElement?.outerHTML,menu:document.querySelector('#menu').hidden})`)));  };
  await send('Runtime.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: 'https://*' }, { urlPattern: 'http://*' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.protocol === 'file:') localStorage.setItem('now-coding', JSON.stringify({updates:false,hintsDone:true,seenVersion:'0.5.1',calm:true}));` });
  await send('Page.reload');
  await until('!!window.__nc');
  await sleep(4000);
  await ev(`for(const b of [...document.querySelectorAll('#alerts button')]) if(b.textContent==='OK') b.click();`);
  await ev(`(async()=>{await __nc.loadLibrary(); document.querySelector('#menu').hidden=true; document.querySelector('#notice').hidden=true; await nc.spotifyConnect('0123456789abcdef0123456789abcdef'); __nc.library.open('spotify'); })()`);
  await until('__nc.library.state.sp.status?.connected && !!__nc.library.state.sp.lists.albums?.items?.length');
  await ev(`(()=>{const q=document.querySelector('.lib-sp-query');q.value='Daft Punk';document.querySelector('.lib-sp-search').requestSubmit();})()`);
  await until(`__nc.library.rows()[0]?.kind==='artist'`);
  const key = (k) => ev(`(document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(k)},bubbles:true}))`);
  await ev(`document.activeElement.blur()`); await key('ArrowRight');
  await until(`__nc.library.state.sp.artist?.releases?.album?.items?.length > 0`);
  await sleep(300);
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  const shot = async (name) => fs.writeFileSync(path.join(out, name + '.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await shot('artist');
  await ev(`document.querySelector('.lib-list .album').scrollIntoView({block:'start'})`); await shot('artist-releases');
  await ev(`__nc.library.state.cursor.spotify=__nc.library.rows().findIndex(r=>r.kind==='coll')`); await key('ArrowRight');
  await until(`__nc.library.rows()[__nc.library.state.cursor.spotify]?.coll?.kind==='album'`);
  await key('Enter'); await sleep(200);
  assert.ok(fake.seen.some((r) => r.method === 'PUT' && r.body?.context_uri?.startsWith('spotify:album:')), 'album context reached fake');
  await shot('album');
  // Prevent system-audio capture during this UI-only test (the intercepted player makes no sound); then V loads Spotify's player at once.
  await ev(`window.addEventListener('message', e=>{if(e.origin==='https://open.spotify.com' && e.data?.toasterFakeEmbed) window.__fakeEmbed=e.data});__nc.state.source='system';`);
  await key('v');
  assert.equal(await ev(`!!document.querySelector('.lib-video')`), true);
  await until(`!!document.querySelector('.lib-video iframe')`); await sleep(350);
  assert.ok(remote.some((u) => u.startsWith('https://open.spotify.com/embed/track/')));
  await until(`window.__fakeEmbed?.bridge==='undefined'`);
  await shot('video-player-fake');
  await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 800, deviceScaleFactor: 1, mobile: false }); await sleep(200); await shot('video-narrow-fake');
  assert.equal(await ev(`(()=>{const r=document.querySelector('.lib-video iframe').getBoundingClientRect();return r.width>=250&&r.height>=150;})()`), true);
  await key('Escape'); assert.equal(await ev(`!!document.querySelector('.lib-video iframe')`), false);
  await key('Escape'); assert.equal(await ev(`__nc.library.state.sp.artist===null && __nc.library.rows()[0]?.kind==='artist'`), true);
  await ev(`document.querySelector('.lib-sp-clear').click()`);
  await key('Home'); await key('Enter'); // Enter the link field through the library's keyboard path.
  assert.equal(await ev(`__nc.library.state.typing`), true);
  await ev(`const input=document.querySelector('input[data-field="link"]');input.value='https://open.spotify.com/artist/'+${JSON.stringify(idOf('artist:Daft Punk'))};input.focus();`);
  await key('Enter'); await until(`__nc.library.state.sp.artist?.name==='Daft Punk' && !__nc.library.state.sp.artist.loading`);
  await key('Escape');
  // Mini player: inject only local now-playing metadata; all timing and commands go to our fake API.
  await ev(`__nc.library.close();__nc.state.source='system';__nc.nowPlaying({title:'Kerosene',artist:'Crystal Castles',app:'Spotify',playing:true});__nc.playerBar.update({t:__nc.ac.currentTime,active:true,source:'system',app:'Spotify',session:true,song:{title:'Kerosene',artist:'Crystal Castles'}});`);
  await until(`__nc.playerBar.controls.player==='spotify-api' && !!document.querySelector('.pl-spotify-cover').src`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }); await sleep(100); await shot('mini-player-wide');
  await ev(`document.querySelector('.pl-play').focus()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await sleep(100);
  assert.equal(fake.state.playbackPlaying, false, 'Space on the player pauses only the fake Spotify');
  await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 800, deviceScaleFactor: 1, mobile: false }); await sleep(100); await shot('mini-player-narrow');
  assert.equal(await ev(`(()=>{const b=document.querySelector('#player').getBoundingClientRect(),n=document.querySelector('.pl-next').getBoundingClientRect();return n.right<=b.right&&n.bottom<=b.bottom;})()`), true);
  await ev(`(async()=>{await __nc.runPreset({name:'Mini player light check',settings:{theme:'whitescreen'}},'scene')})()`); await sleep(100); await shot('mini-player-light');
  assert.equal(await ev(`getComputedStyle(document.querySelector('.pl-spotify-link')).color`), 'rgb(0, 0, 0)');
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ passed: true, errors, interceptedRemoteRequests: remote, fakeApiRequests: fake.seen.filter((r) => r.path.startsWith('/v1/')).map(({method,path,query,body})=>({method,path,query,body})), profile }, null, 2));
  console.log('Hidden artist/video/mini-player smoke passed; screenshots in ' + out);
} finally {
  // Close only the copy this script created, over its own CDP connection.
  if (send) { send('Browser.close').catch(() => {}); await Promise.race([new Promise((r) => child.once('exit', r)), sleep(5000)]); }
  ws?.close(); await fake.close(); fs.closeSync(log);
}
