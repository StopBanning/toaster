// The way in to Spotify (renderer/library.js SPOTIFY_GUIDE and SPOTIFY_STUCK; library-panel.js spSteps and guidePicture). Colin, Nov 10:
// "hold the user's hand throughout the entire process of getting the API." Spotify's rules since Feb 11 2026 (one development app per
// person, the owner on Premium, five people at most) mean every listener makes or reuses an app of their own, so the guide has to cover
// the slips people make on Spotify's form, and the two refusals Spotify gives afterwards have to come back in words.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as L from '../renderer/library.js';
const S = createRequire(import.meta.url)('../helpers/spotify.cjs');
const panel = fs.readFileSync(new URL('../renderer/library-panel.js', import.meta.url), 'utf8');
const all = (step) => [step.title, ...(step.say || []), ...(step.fields || []).flat(), ...(step.after || [])].join(' ');

test('four steps, in the order they are done: the dashboard, the form, the Client ID, the paste', () => {
  assert.deepEqual(L.SPOTIFY_GUIDE.map((s) => s.title), ['open Spotify\'s developer dashboard', 'create the app', 'copy the Client ID', 'paste it here']);
  assert.equal(L.SPOTIFY_GUIDE[0].open, true, 'step 1 has the button that opens the dashboard');
  assert.match(all(L.SPOTIFY_GUIDE[0]), /Premium/);
});

test('the form, field by field as Spotify has it: the name and the required description ready to copy, the redirect exactly, then Add, Web API, the terms, Save', () => {
  const form = L.SPOTIFY_GUIDE[1];
  assert.deepEqual(form.fields.map(([label]) => label), ['App name', 'App description', 'Redirect URIs']);
  assert.deepEqual(form.fields.map(([, value]) => value), [L.SPOTIFY_APP.name, L.SPOTIFY_APP.about, L.SPOTIFY_REDIRECT]);
  assert.match(form.fields[2][2], /press Add/, 'the redirect only counts once Add is pressed: the slip most people make');
  const words = all(form);
  for (const must of [/Web API/, /terms box/, /Save/, /Website can stay empty/]) assert.match(words, must);
});

test('someone who already has a developer app (Spotify allows one) is told to use it, and how', () => {
  assert.match(all(L.SPOTIFY_GUIDE[0]), /one per person/);
  assert.match(all(L.SPOTIFY_GUIDE[1]), /already have an app\? Open it, press Edit at the bottom, add the redirect address/);
});

test('the Client ID, not the secret: where it is on the app\'s page, and that Toaster never needs the secret', () => {
  const words = all(L.SPOTIFY_GUIDE[2]);
  assert.match(words, /first thing under Basic Information: 32 letters and numbers/);
  assert.match(words, /not the client secret/);
  assert.match(S.CLIENT_ID.source, /\[0-9a-f\]\{32\}/, 'and 32 is what the helper checks');
});

test('while it waits for the Agree, what Spotify\'s page might say instead, each with its fix', () => {
  const said = L.SPOTIFY_STUCK.map(([seen]) => seen).join(' | ');
  assert.match(said, /Invalid redirect URI/);
  assert.match(said, /Invalid client/);
  assert.match(L.SPOTIFY_STUCK.find(([seen]) => /redirect/.test(seen))[1], /press Add, Save/);
});

test('the drawing beside each step is Toaster\'s own sketch, in the theme\'s colours, with the values the guide gives (never retyped), and only on a wide window', () => {
  const fn = panel.slice(panel.indexOf('function guidePicture(k)'), panel.indexOf('function paintGuide()'));
  assert.ok(fn.length > 500);
  assert.match(fn, /T\(36, 228, SPOTIFY_REDIRECT,/, 'the redirect in the drawing is the constant');
  assert.match(fn, /SPOTIFY_APP_NAME/);
  assert.doesNotMatch(fn, /<image|https?:\/\/(?!127\.0\.0\.1|www\.w3\.org\/2000\/svg)[a-z]/i, 'no picture of Spotify\'s, nothing fetched');
  assert.doesNotMatch(fn, /#[0-9a-f]{3,6}\b/i, 'no colour of its own: the classes take the theme\'s');
  const css = fs.readFileSync(new URL('../renderer/style.css', import.meta.url), 'utf8');
  assert.match(css, /#library \.lib-guidepic \{ display: none; \}/);
  assert.match(css, /#library\.lib-guiding \.lib-guidepic \{ display: grid;/);
});

test('a step brings what it is about into view: the Client ID\'s field on the last step (with pasted links over the guide it lay under the list\'s edge, and the step says "the box below"), the step itself on the others', () => {
  const at = panel.indexOf(`e.target.closest('[data-do="guide"]')`);
  const handler = panel.slice(at, panel.indexOf(`e.target.closest('[data-do="dashboard"]')`, at));
  assert.ok(at > 0 && handler.length > 100);
  assert.match(handler, /X\.guide === SPOTIFY_GUIDE\.length - 1 \? parts\.list\.querySelector\?\.\('input\[data-field="client"\]'\) : parts\.list\.querySelector\?\.\('\.lib-guide'\)/);
  assert.match(handler, /scrollIntoView\?\.\(\{ block: 'nearest' \}\)/);
});

test('Spotify\'s two refusals for an app of one\'s own come back in words: the owner without Premium, and an account that is not on the app', async () => {
  const answer = (message) => async (url) => new Response(JSON.stringify({ error: { status: 403, message } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  const web = (message) => S.createWebApi({ accessToken: async () => 'tok', api: 'http://127.0.0.1:9', fetch: answer(message) });
  await assert.rejects(web('Active premium subscription required for the owner of the app.').list({ list: 'playlists' }), /only while the account that made it has Premium/);
  await assert.rejects(web('Check settings on developer.spotify.com/dashboard, the user may not be registered.').list({ list: 'playlists' }), /isn't on your developer app: disconnect, then connect again/);
  await assert.rejects(web('Something else entirely').list({ list: 'playlists' }), /Spotify said no \(403: Something else entirely\)/, 'anything else as Spotify said it');
});
