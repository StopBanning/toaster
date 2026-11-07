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
    await assert.rejects(web.control({ ...input('pause'), device: 'different-device' }), /changed songs or devices/);
    await assert.rejects(web.control({ ...input('pause'), uri: 'spotify:track:' + 'a'.repeat(22) }), /changed songs or devices/);
    const calls = fake.seen.length;
    for (const action of ['constructor', '__proto__', '../next', 'like']) await assert.rejects(web.control(input(action)), /Choose a Spotify/);
    assert.equal(fake.seen.length, calls, 'unknown commands never reach the API');
    assert.ok(fake.seen.filter((r) => r.method !== 'GET').every((r) => r.query.device_id === 'fake-device-1'));
    fake.state.devices[0].is_restricted = true; assert.ok(Object.values((await web.playback()).allowed).every((v) => !v));
    fake.state.devices[0].type = 'Smartphone'; assert.equal(await web.playback(), null, 'do not adopt a phone as the local player');
    fake.state.devices = []; assert.equal(await web.playback(), null, '204 playback has no timing');
  } finally { await fake.close(); }
});
