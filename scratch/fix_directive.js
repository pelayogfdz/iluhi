const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const appDir = path.join(__dirname, '../app');
const files = walk(appDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const importRegex = /^import\s+prisma\s+from\s+['"][\.\/a-zA-Z0-9_\-]+['"];?\r?\n/m;
  const match = content.match(importRegex);

  if (match) {
    if (content.includes("'use server'")) {
       content = content.replace(importRegex, '');
       content = content.replace(/'use server'/, `'use server'\n${match[0]}`);
       changed = true;
    } else if (content.includes('"use server"')) {
       content = content.replace(importRegex, '');
       content = content.replace(/"use server"/, `"use server"\n${match[0]}`);
       changed = true;
    } else if (content.includes("'use client'")) {
       content = content.replace(importRegex, '');
       content = content.replace(/'use client'/, `'use client'\n${match[0]}`);
       changed = true;
    } else if (content.includes('"use client"')) {
       content = content.replace(importRegex, '');
       content = content.replace(/"use client"/, `"use client"\n${match[0]}`);
       changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed use server position in', file);
  }
});
