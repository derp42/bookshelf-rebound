'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const customDomain = path.join(root, 'docs', 'CNAME');

if (fs.existsSync(customDomain)) {
  throw new Error('docs/CNAME must remain absent until Bookshelf Rebound controls its own documentation domain.');
}

const files = [path.join(root, 'README.md'), path.join(root, 'docs', 'index.html')];
const abandonedDomain = /(?:https?:\/\/)?(?:www\.)?flyptox\.com/i;

for (const file of files) {
  if (abandonedDomain.test(fs.readFileSync(file, 'utf8'))) {
    throw new Error(`${path.relative(root, file)} links to the abandoned FlyptoX domain.`);
  }
}

console.log('Documentation safety checks passed.');
