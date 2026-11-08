import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startFakeSpotify } from './spotify-fake.mjs';
const { createWebApi } = createRequire(import.meta.url)('../helpers/spotify.cjs');

test('mini-player state and transport use existing scopes, target the displayed device, and respect restrictions', async () => {
  const fake = await startFakeSpotify(), web = createWebApi({ api: fake.base, accessToken: async () => 'fake-access-0' });
  try {
    let s = await web.playback();
    assert.equal(s.track.name, 'Kerosene'); assert.equal(s.position, 92); assert.equal(s.duration, 192); assert.equal(s.playing, true);
    assert.deepEqual(s.allowed, { pause: true, resume: true, next: true, previous: true });
    const input = (action) => ({ action, uri: s.track.uri, device: s.device });
    await web.control(input('pause')); assert.equal(fake.state.playbackPlaying, false);
    await web.control(input('resume')); assert.equal(fake.state.playbackPlaying, true);
    await web.control(input('next')); s = await web.playback(); assert.equal(s.track.name, 'Jóga');
    await web.control(input('previous')); s = await web.playback(); assert.equal(s.track.name, 'Kerosene');
    const mutations = () => fake.seen.filter((r) => r.method !== 'GET').length, n = mutations();
    fake.state.playbackActions = { skipping_next: true, pausing: true };
    s = await web.playback(); assert.equal(s.allowed.next, false); assert.equal(s.allowed.pause, false);
    await assert.rejects(web.control(input('next')), /does not allow/); assert.equal(mutations(), n);
    fake.state.playbackActions = { disallows: { skipping_prev: true } };
    assert.equal((await web.playback()).allowed.previous, false, 'older nested restrictions are respected too');
    // a poll-old song or device (a song that ended, Spotify restarted with a new device id): the button still acts, on this
    // computer's Spotify as it is now (Colin's error box, Nov 8: 'Spotify changed songs or devices')
    await web.control({ ...input('pause'), device: 'different-device' }); assert.equal(fake.state.playbackPlaying, false);
    await web.control({ ...input('resume'), uri: 'spotify:track:' + 'a'.repeat(22) }); assert.equal(fake.state.playbackPlaying, true);
    // already so: pause on a paused player and resume on a playing one ask Spotify nothing (it would answer 'not allowed')
    const before = mutations();
    await web.control(input('resume')); assert.equal(mutations(), before, 'resume while playing is a no-op');
    const calls = fake.seen.length;
    for (const action of ['constructor', '__proto__', '../next', 'like']) await assert.rejects(web.control(input(action)), /Choose a Spotify/);
    assert.equal(fake.seen.length, calls, 'unknown commands never reach the API');
    assert.ok(fake.seen.filter((r) => r.method !== 'GET').every((r) => r.query.device_id === 'fake-device-1'));
    fake.state.devices[0].is_restricted = true; assert.ok(Object.values((await web.playback()).allowed).every((v) => !v));
    fake.state.devices[0].type = 'Smartphone'; assert.equal(await web.playback(), null, 'do not adopt a phone as the local player');
    fake.state.devices = []; assert.equal(await web.playback(), null, '204 playback has no timing');
    const quiet = mutations();
    assert.deepEqual(await web.control(input('pause')), { ok: true }, 'nothing active here: pause is already done');
    assert.equal(mutations(), quiet);
  } finally { await fake.close(); }
});

test("a command Spotify answers 200 with plain text (not JSON, not 204) still goes through, with no error (Colin's error box, Nov 8)", async () => {
  const fake = await startFakeSpotify();
  // the fake carries the command out, then the reply is swapped for what Spotify sent: 200 and a bare id
  const fetch = async (url, opts) => { const res = await globalThis.fetch(url, opts); return opts?.method && opts.method !== 'GET' ? new Response('JKvh2WzHVLsnapshot', { status: 200, headers: { 'Content-Type': 'text/plain' } }) : res; };
  const web = createWebApi({ api: fake.base, accessToken: async () => 'fake-access-0', fetch });
  try {
    const s = await web.playback(), input = (action) => ({ action, uri: s.track.uri, device: s.device });
    assert.deepEqual(await web.control(input('pause')), { ok: true }); assert.equal(fake.state.playbackPlaying, false);
    assert.deepEqual(await web.control(input('resume')), { ok: true }); assert.equal(fake.state.playbackPlaying, true);
    await web.control(input('next')); assert.equal((await web.playback()).track.name, 'Jóga');
  } finally { await fake.close(); }
});
