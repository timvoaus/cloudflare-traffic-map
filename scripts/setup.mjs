#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { randomUUID } from 'node:crypto';

const rl = createInterface({ input, output });
const rootDir = new URL('..', import.meta.url).pathname.replace(/^\/(.:\/)/, '$1');
const refreshDir = new URL('../workers/refresh', import.meta.url).pathname.replace(/^\/(.:\/)/, '$1');

const defaults = {
  pagesProject: 'cloudflare-traffic-map',
  d1Name: 'traffic-map-db',
  pagesBinding: 'DB',
  refreshWorker: 'traffic-map-refresh',
};

function run(command, args, options = {}) {
  console.log(`\n> ${[command, ...args].join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd || rootDir,
    stdio: options.capture ? 'pipe' : 'inherit',
    shell: process.platform === 'win32',
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`Command failed: ${[command, ...args].join(' ')}`);
  }

  return result;
}

async function ask(question, fallback = '') {
  const suffix = fallback ? ` (${fallback})` : '';
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer || fallback;
}

async function confirm(question, fallback = true) {
  const hint = fallback ? 'Y/n' : 'y/N';
  const answer = (await rl.question(`${question} [${hint}]: `)).trim().toLowerCase();
  if (!answer) return fallback;
  return ['y', 'yes'].includes(answer);
}

function loadEnvFile() {
  const envPath = `${rootDir}/.env`;
  if (!existsSync(envPath)) return {};

  return Object.fromEntries(
    readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const index = line.indexOf('=');
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')];
      })
  );
}

function updateDatabaseId(filePath, databaseId) {
  const current = readFileSync(filePath, 'utf8');
  const updated = current.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${databaseId}"`);
  if (updated !== current) writeFileSync(filePath, updated);
}

function extractDatabaseId(outputText) {
  const match = outputText.match(/database_id\s*=\s*"([^"]+)"/) || outputText.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return match?.[1] || '';
}

async function putSecret(name, value, cwd = refreshDir) {
  if (!value) return;

  const command = process.platform === 'win32'
    ? `echo ${value}| npx wrangler secret put ${name}`
    : `printf '%s' '${value.replaceAll("'", "'\\''")}' | npx wrangler secret put ${name}`;

  run(command, [], { cwd });
}

async function main() {
  console.log('\nCloudflare Traffic Map guided setup');
  console.log('This wizard deploys Pages, D1, and the refresh Worker.');
  console.log('You still need to create a Cloudflare API token in the dashboard when prompted.');

  const env = loadEnvFile();

  if (await confirm('\nInstall npm dependencies first?', !existsSync(`${rootDir}/node_modules`))) {
    run('npm', ['install']);
  }

  if (await confirm('Login to Cloudflare with Wrangler?', true)) {
    run('npx', ['wrangler', 'login']);
  }

  const d1Name = await ask('\nD1 database name', defaults.d1Name);
  let databaseId = env.D1_DATABASE_ID || '';

  if (!databaseId && await confirm(`Create D1 database "${d1Name}"?`, true)) {
    const result = run('npx', ['wrangler', 'd1', 'create', d1Name], { capture: true, allowFailure: true });
    console.log(result.stdout || result.stderr);
    databaseId = extractDatabaseId(`${result.stdout}\n${result.stderr}`);
  }

  if (!databaseId) {
    databaseId = await ask('Paste the D1 database_id from Cloudflare/Wrangler');
  }

  if (databaseId) {
    updateDatabaseId(`${rootDir}/wrangler.toml`, databaseId);
    updateDatabaseId(`${refreshDir}/wrangler.toml`, databaseId);
    console.log('Updated D1 database_id in wrangler.toml files.');
  }

  if (await confirm(`Apply schema.sql to remote D1 database "${d1Name}"?`, true)) {
    run('npx', ['wrangler', 'd1', 'execute', d1Name, '--remote', '--file=schema.sql']);
  }

  const pagesProject = await ask('\nCloudflare Pages project name', defaults.pagesProject);
  if (await confirm(`Deploy Pages project "${pagesProject}"?`, true)) {
    run('npx', ['wrangler', 'pages', 'deploy', 'public', `--project-name=${pagesProject}`]);
  }

  console.log('\nD1 binding reminder:');
  console.log(`In Cloudflare Pages settings, bind D1 database "${d1Name}" as variable name "${defaults.pagesBinding}" if it is not already bound.`);

  if (await confirm('\nDeploy refresh Worker?', true)) {
    run('npx', ['wrangler', 'deploy'], { cwd: refreshDir });
  }

  console.log('\nWorker secrets');
  console.log('Create an API token in Cloudflare: My Profile -> API Tokens -> Create Custom Token.');
  console.log('Permission required: Account -> Zero Trust -> Read.');

  const accountId = await ask('Cloudflare Account ID', env.CF_ACCOUNT_ID || '');
  const apiToken = await ask('Cloudflare API token', env.CF_API_TOKEN || '');
  const refreshToken = await ask('Refresh token', env.REFRESH_TOKEN || `${randomUUID()}${randomUUID()}`);

  if (await confirm('Upload secrets to the refresh Worker?', true)) {
    await putSecret('CF_ACCOUNT_ID', accountId);
    await putSecret('CF_API_TOKEN', apiToken);
    await putSecret('REFRESH_TOKEN', refreshToken);
  }

  console.log('\nSetup complete.');
  console.log(`Manual refresh URL: https://${defaults.refreshWorker}.<your-subdomain>.workers.dev/refresh?token=${refreshToken}`);
  console.log(`Status URL: https://${defaults.refreshWorker}.<your-subdomain>.workers.dev/status`);
  console.log('Replace <your-subdomain> with the workers.dev subdomain shown by Wrangler.');
}

main().catch(error => {
  console.error(`\nSetup failed: ${error.message}`);
  process.exitCode = 1;
}).finally(() => {
  rl.close();
});
