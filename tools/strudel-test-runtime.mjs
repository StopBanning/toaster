// Optional musical integration tests: install @strudel/{core,mini,tonal,transpiler} 1.2.6
// under _checks, or set STRUDEL_TEST_MODULES to a test-only node_modules directory.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire, registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const moduleURL = (source) => 'data:text/javascript,' + encodeURIComponent(source);
const engine = moduleURL(fs.readFileSync(new URL('../renderer/engine.js', import.meta.url), 'utf8'));
export const writer = await import(moduleURL(fs.readFileSync(new URL('../renderer/codegen.js', import.meta.url), 'utf8')
  .replace("'./engine.js'", JSON.stringify(engine))));

const modules = process.env.STRUDEL_TEST_MODULES || fileURLToPath(new URL('../_checks/node_modules', import.meta.url));
export const hasStrudel = fs.existsSync(path.join(modules, '@strudel/core/package.json'));
let runtime;
export async function strudelRuntime() {
  if (runtime) return runtime;
  const require = createRequire(path.join(modules, '../package.json'));
  // This published dependency's default Node export lacks SalatRepl. It is only used by
  // kabelsalat's own REPL, which these pattern queries never construct.
  registerHooks({ resolve(specifier, context, next) {
    return specifier === '@kabelsalat/web'
      ? { url: 'data:text/javascript,export class SalatRepl {}', shortCircuit: true }
      : next(specifier, context);
  } });
  const load = (name) => import(pathToFileURL(require.resolve('@strudel/' + name)));
  const core = await load('core'), mini = await load('mini'), tonal = await load('tonal');
  const { transpiler } = await load('transpiler');
  await core.evalScope(core, mini, tonal);
  mini.miniAllStrings();
  await core.evalScope({ slider: (value) => core.pure(value), sliderWithID: (_id, value) => core.pure(value) });
  let punchcards = 0;
  core.Pattern.prototype._punchcard = function () { punchcards++; return this; };
  runtime = {
    get punchcards() { return punchcards; },
    async evaluate(code) {
      const repl = core.repl({ transpiler, defaultOutput: () => {}, getTime: () => 0 });
      const pattern = await repl.evaluate(code, false);
      if (!pattern) throw repl.state.evalError || Error('No Strudel pattern returned');
      return pattern;
    },
  };
  return runtime;
}

export function events(pattern, begin, cycles = 1) {
  return pattern.queryArc(begin, begin + cycles).filter((hap) => hap.hasOnset()).map((hap) => ({
    begin: Number(hap.whole.begin) - begin, end: Number(hap.whole.end) - begin, value: hap.value,
  })).sort((a, b) => a.begin - b.begin || JSON.stringify(a.value).localeCompare(JSON.stringify(b.value)));
}
