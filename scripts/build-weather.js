import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

function run(args, cwd = process.cwd()) {
  const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit', env: { ...process.env, NG_CLI_ANALYTICS: 'false' } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
if (process.argv.includes('--install')) {
  const npm = process.env.npm_execpath;
  if (!npm || !existsSync(npm)) throw new Error('Ejecuta la instalación mediante npm ci o npm install.');
  run([npm, 'ci', '--include=dev', '--no-audit', '--no-fund'], resolve('weather'));
}
run([resolve('weather/node_modules/@angular/cli/bin/ng.js'), 'build', '--configuration', 'production', '--progress=false'], resolve('weather'));
