// A stand-in for Spotify on this machine, for tools/library-check.mjs. main.js reads --spotify-fake=<address> only in a copy run from
// source (never in the installed app), and with it the library's spotify section talks to a fake Spotify at that address instead of
// Spotify: the sign-in page, the token service, the Web API and the covers (served for i.scdn.co's addresses, which main still checks
// as it always does) are all there, the "browser" that opens the sign-in page is a plain request that says yes, and the tokens are kept
// with a scrambling stand-in for Electron's safeStorage (the real one is the Keychain on a Mac, which would ask a question on the
// screen of a copy nobody is watching). Nothing here goes beyond 127.0.0.1: an address anywhere else is refused before it is asked.

// The address has to be http://127.0.0.1:<port>: the fake is a local server the check starts, and nothing else.
function fakeSpotify(base) {
  let origin;
  try { origin = new URL(base); } catch { throw new Error('--spotify-fake takes an address like http://127.0.0.1:9351'); }
  if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1' || !origin.port) throw new Error('--spotify-fake takes an address like http://127.0.0.1:9351, and nothing else');
  const here = origin.origin;
  // an address of Spotify's pictures is the fake's at the same path; any other address must already be the fake's
  const ours = (url) => {
    const u = new URL(String(url));
    if (u.protocol === 'https:' && u.hostname === 'i.scdn.co') return new URL(u.pathname + u.search, here);
    if (u.origin === here) return u;
    throw new Error(`the fake Spotify does not go to ${u.origin}`);
  };
  const scramble = (bytes) => Buffer.from(bytes).map((b) => b ^ 0x5a);
  return {
    base: here,
    fetch: (url, init) => globalThis.fetch(ours(url), init),
    // (the sign-in page answers with a redirect to the callback; fetch follows it, which is the listener saying yes)
    openExternal: async (url) => { await (await globalThis.fetch(ours(url))).text(); },
    safeStorage: {
      isEncryptionAvailable: () => true,
      encryptString: (text) => scramble(Buffer.from(text)),
      decryptString: (bytes) => scramble(bytes).toString(),
    },
  };
}

module.exports = { fakeSpotify };
