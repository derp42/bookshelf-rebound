'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  throw new Error('Run this check through `npm run check:package` so npm_execpath is available.');
}

const allowedFiles = new Set([
  'CHANGELOG.md',
  'CODE_OF_CONDUCT.md',
  'GOVERNANCE.md',
  'LICENSE',
  'README.md',
  'SECURITY.md',
  'bookshelf.js',
  'package.json'
]);

function runNpm(args, options) {
  return childProcess.execFileSync(process.execPath, [npmCli, ...args], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    ...options
  });
}

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bookshelf-rebound-package-'));

try {
  const packOutput = runNpm(['pack', root, '--pack-destination', temporaryRoot, '--json', '--ignore-scripts'], {
    cwd: root
  });
  const parsedPackOutput = JSON.parse(packOutput);
  const packResults = Array.isArray(parsedPackOutput) ? parsedPackOutput : Object.values(parsedPackOutput);

  assert.strictEqual(packResults.length, 1, 'Expected npm pack to describe exactly one package.');

  const [packResult] = packResults;
  assert.ok(packResult && Array.isArray(packResult.files), 'Expected npm pack to return package file metadata.');
  const unexpectedFiles = packResult.files
    .map((file) => file.path)
    .filter((file) => !allowedFiles.has(file) && !file.startsWith('lib/'));

  assert.deepStrictEqual(unexpectedFiles, [], `Unexpected files in npm package: ${unexpectedFiles.join(', ')}`);

  const tarball = path.join(temporaryRoot, packResult.filename);
  const consumerRoot = path.join(temporaryRoot, 'consumer');
  fs.mkdirSync(consumerRoot);
  runNpm(['init', '--yes'], {cwd: consumerRoot});
  runNpm(['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball, 'knex@2.5.1', 'pg@8.22.0'], {
    cwd: consumerRoot
  });

  childProcess.execFileSync(
    process.execPath,
    [
      '-e',
      [
        "const assert = require('assert')",
        "const knex = require('knex')({client: 'pg'})",
        "const bookshelf = require('bookshelf-rebound')(knex)",
        'assert.strictEqual(bookshelf.knex, knex)',
        "assert.strictEqual(bookshelf.VERSION, require('bookshelf-rebound/package.json').version)",
        "assert.strictEqual(typeof bookshelf.Model, 'function')",
        "assert.strictEqual(typeof bookshelf.Collection, 'function')",
        'knex.destroy()'
      ].join(';')
    ],
    {cwd: consumerRoot, stdio: 'inherit'}
  );

  console.log(`Package install check passed for ${packResult.id}.`);
} finally {
  fs.rmSync(temporaryRoot, {recursive: true, force: true});
}
