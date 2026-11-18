import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(resolve('weather/package.json'));
const { build } = require('esbuild');
mkdirSync('weather/test/.qa', { recursive: true });
for (const [entry, name] of [['weather/src/app/core/weather.service.ts', 'weather.service.mjs'], ['weather/test/models.test.ts', 'models.test.mjs']]) {
  await build({ entryPoints: [entry], outfile: resolve('weather/test/.qa', name), bundle: true, platform: 'node', format: 'esm', packages: 'external', tsconfig: 'weather/tsconfig.json' });
}
const result = spawnSync(process.execPath, ['--test', 'weather/test/.qa/models.test.mjs', 'weather/test/offline.test.mjs'], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
