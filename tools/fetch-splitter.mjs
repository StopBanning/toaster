// The voice splitter's model put where the app looks for it (renderer/models/htdemucs/htdemucs_embedded.onnx) before a build, so the
// packager takes it in (tools/package.mjs). It is the half-size htdemucs (88 MB; Demucs by Meta, MIT; converted for onnxruntime-web
// by timcsy's demucs-web, MIT; its weights then stored at half precision by backlog/engineering/onnx-half.mjs), and it is used only
// if its SHA-256 is this one, whatever it came from.
//   node tools/fetch-splitter.mjs            from Toaster's own GitHub release (a file of its own, not in the code)
//   node tools/fetch-splitter.mjs <file>     from a file on this computer
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA256 = '27d8c2a6e4386ddb7020f2a7b3f3478b76023016341d29ea042fd8dc452acce9';
const URL_ = 'https://github.com/StopBanning/toaster/releases/download/splitter-1/htdemucs-half-1.onnx';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(root, 'renderer', 'models', 'htdemucs', 'htdemucs_embedded.onnx');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

if (fs.existsSync(dest) && sha(fs.readFileSync(dest)) === SHA256) { console.log('the splitter is in place'); process.exit(0); }
const from = process.argv[2];
let bytes;
if (from) bytes = fs.readFileSync(from);
else {
  const res = await fetch(URL_, { redirect: 'follow' });
  if (!res.ok) { console.error(`the splitter could not be fetched (${res.status} from ${URL_})`); process.exit(1); }
  bytes = Buffer.from(await res.arrayBuffer());
}
const got = sha(bytes);
if (got !== SHA256) { console.error(`not the splitter this app was tested with (SHA-256 ${got})`); process.exit(1); }
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest + '.part', bytes); fs.renameSync(dest + '.part', dest);
console.log(`the splitter is in place (${(bytes.length / 1048576).toFixed(1)} MB)`);
