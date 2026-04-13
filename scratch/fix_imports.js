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

  const importRegex = /^import\s+prisma\s+from\s+['"][\.\/a-zA-Z0-9_\-]+['"];?$/m;
  const match = content.match(importRegex);

  if (match && match.index > 0) {
    const importStmt = match[0];
    content = content.replace(importStmt, '');
    
    // Check if the file starts with "use client" or "use server" at the very OUTSIDE level
    if (content.trim().startsWith('"use client"') || content.trim().startsWith("'use client'")) {
       const parts = content.split('\n');
       parts.splice(1, 0, importStmt);
       content = parts.join('\n');
    } else {
       content = importStmt + '\n' + content;
    }
    
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed imports in', file);
  }
});
