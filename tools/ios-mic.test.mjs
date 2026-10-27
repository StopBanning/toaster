// The microphone on iOS (one request in the tap, plain words when it's refused) and the sound coming back
// after iOS cuts it off; the scenarios are in ios-mic-scenarios.mjs. These run the real code from
// renderer/app.js in Node against a stand-in world; renderer/ in a WebKit page: see the report.
import fs from 'node:fs';
import { test } from 'node:test';
import { scenarios } from './ios-mic-scenarios.mjs';

const app = fs.readFileSync(new URL('../renderer/app.js', import.meta.url), 'utf8');
for (const s of scenarios(app)) test(s.name, s.run);
