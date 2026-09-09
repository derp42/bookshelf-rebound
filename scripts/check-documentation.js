'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const customDomain = path.join(root, 'docs', 'CNAME');

if (fs.existsSync(customDomain)) {
  throw new Error('docs/CNAME must remain absent until Bookshelf Rebound controls its own documentation domain.');
}

const readme = path.join(root, 'README.md');
const files = [readme, path.join(root, 'docs', 'index.html')];
const abandonedDomain = /(?:https?:\/\/)?(?:www\.)?flyptox\.com/i;

for (const file of files) {
  if (abandonedDomain.test(fs.readFileSync(file, 'utf8'))) {
    throw new Error(`${path.relative(root, file)} links to the abandoned FlyptoX domain.`);
  }
}

const readmeSource = fs.readFileSync(readme, 'utf8');
const staleReadmePatterns = [
  [/\bhasMany\(Posts\)/, 'the undefined `Posts` starter model'],
  [/\bnode-inspector\b/i, 'the retired node-inspector debugger'],
  [/process\.stderr\.on\(['"]data['"]/, 'the invalid process.stderr data-listener guidance']
];

for (const [pattern, description] of staleReadmePatterns) {
  if (pattern.test(readmeSource)) {
    throw new Error(`README.md contains ${description}.`);
  }
}

console.log('Documentation safety checks passed.');
