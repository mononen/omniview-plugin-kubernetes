// Candidate PR validation only. Published dependencies and release installs stay unchanged.
import { appendFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;
const state = join(env.RUNNER_TEMP, 'kubernetes-candidate-ui.json');
const git = (cwd, args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
const sha = value => /^[a-f0-9]{40}$/.test(value ?? '');
const host = resolve(env.CANDIDATE_HOST_SOURCE);
const hostRef = env.OMNIVIEW_RESOURCE_V2_REVIEWED_HOST_REVISION;
const execute = (program, args, options = {}) => {
  const result = execFileSync(program, args, { cwd: options.cwd ?? host, env: { ...env, GOWORK: 'off', GOFLAGS: '', ...options.extraEnv }, encoding: 'utf8', stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit', timeout: options.timeout ?? 600_000 });
  return options.capture ? result.trim() : '';
};
const privateTestCache = cohort => {
  const cache = cohort.testCache;
  const parent = realpathSync(join(env.RUNNER_TEMP, 'kubernetes-candidate-ui'));
  if (typeof cache !== 'string' || dirname(cache) !== parent || !basename(cache).startsWith('vitest-cache-') || realpathSync(cache) !== cache) throw Error('Owned candidate test cache required');
  const info = lstatSync(cache);
  if (!info.isDirectory() || (info.mode & 0o077) !== 0 || (process.getuid && info.uid !== process.getuid())) throw Error('Candidate test cache is not a private owned directory');
  return cache;
};
if (process.argv[2] === 'cleanup') {
  if (!existsSync(state)) process.exit(0); // No constructed cohort to retire.
  if (!sha(hostRef) || git(host, ['rev-parse', 'HEAD']) !== hostRef) throw Error('Exact independently approved host revision required for retirement');
  const cohort = JSON.parse(readFileSync(state, 'utf8'));
  const cache = cohort.testCache === undefined ? undefined : privateTestCache(cohort);
  const { retireApplicationCohort } = await import(pathToFileURL(join(host, 'e2e/scripts/cohort.mjs')));
  retireApplicationCohort(cohort, execute);
  if (cache !== undefined) rmSync(cache, { recursive: true });
  process.exit(0);
}
if (!sha(hostRef) || git(host, ['rev-parse', 'HEAD']) !== hostRef) throw Error('Exact independently approved host revision required');
const { admitCandidate, verifyCandidate, verifyGitlink, verifyIsolation } = await import(pathToFileURL(join(host, 'e2e/scripts/candidate-source.mjs')));
const refs = admitCandidate(JSON.parse(readFileSync(join(host, 'e2e/source-cohort.json'), 'utf8')), env);
verifyGitlink(refs, git(host, ['ls-tree', 'HEAD', 'plugins/kubernetes']));
if (!sha(env.CANDIDATE_PR_HEAD) || env.CANDIDATE_PR_HEAD !== refs.kubernetes || git(root, ['rev-parse', 'HEAD']) !== refs.kubernetes) throw Error('PR head must equal approved host cohort Kubernetes revision');

if (process.argv[2] === 'resolve') {
  appendFileSync(env.GITHUB_OUTPUT, Object.entries(refs).map(([key, value]) => `${key}=${value}\n`).join(''));
} else if (process.argv[2] === 'prepare') {
  const sdk = resolve(env.CANDIDATE_SDK_SOURCE);
  const ui = resolve(env.CANDIDATE_UI_SOURCE);
  verifyCandidate(refs, { sdk, ui, kubernetes: root }, git);
  verifyIsolation(sdk, git);
  const privateRoot = join(env.RUNNER_TEMP, 'kubernetes-candidate-ui');
  mkdirSync(privateRoot, { mode: 0o700 });
  env.GOCACHE = join(privateRoot, 'go-cache');
  mkdirSync(env.GOCACHE, { mode: 0o700 });
  const probe = JSON.parse(execute(process.execPath, ['e2e/scripts/prepare-workspace-probe.mjs', '--destination', join(privateRoot, 'workspace-probe')], { capture: true }));
  if (probe.pluginID !== 'workspace-probe' || probe.source !== join(privateRoot, 'workspace-probe') || git(probe.source, ['rev-parse', 'HEAD']) !== probe.ref) throw Error('Invalid canonical probe source');
  const { prepareApplicationCohort, buildApplicationPluginUI } = await import(pathToFileURL(join(host, 'e2e/scripts/cohort.mjs')));
  const cohort = prepareApplicationCohort({ privateRoot, sources: { omniview: host, 'plugin-sdk': sdk, ui, kubernetes: root, 'workspace-probe': probe.source }, refs: { omniview: hostRef, 'plugin-sdk': refs.sdk, ui: refs.ui, kubernetes: refs.kubernetes, 'workspace-probe': probe.ref }, env, execute, phase: (_name, action) => action() });
  cohort.testCache = realpathSync(mkdtempSync(join(privateRoot, 'vitest-cache-')));
  writeFileSync(state, JSON.stringify(cohort), { mode: 0o600, flag: 'wx' });
  buildApplicationPluginUI(cohort, 'kubernetes', execute);
} else if (process.argv[2] === 'build') {
  const cohort = JSON.parse(readFileSync(state, 'utf8'));
  const { buildApplicationPluginUI } = await import(pathToFileURL(join(host, 'e2e/scripts/cohort.mjs')));
  buildApplicationPluginUI(cohort, 'kubernetes', execute);
} else if (process.argv[2] === 'run') {
  const cohort = JSON.parse(readFileSync(state, 'utf8'));
  const directory = join(cohort.sources.kubernetes, 'ui');
  const testCache = privateTestCache(cohort);
  execFileSync(cohort.tool, ['run', cohort.config, directory, cohort.program, ...cohort.args, ...process.argv.slice(3)], { env: { ...env, OMNIVIEW_TEST_CACHE_DIRECTORY: testCache }, stdio: 'inherit' });
} else throw Error('Expected resolve, prepare, build, run or cleanup');
