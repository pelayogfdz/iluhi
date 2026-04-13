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

  // Pattern 1: import { PrismaClient } from '@prisma/client'
  if (content.includes("import { PrismaClient } from '@prisma/client'")) {
    content = content.replace(/import\s*\{\s*PrismaClient\s*\}\s*from\s*['"]@prisma\/client['"];?\s*/g, '');
    changed = true;
  }
  
  if (content.match(/const\s+prisma\s*=\s*new\s+PrismaClient\(\);?/g)) {
    // Determine path depth to lib
    const relPath = path.relative(path.dirname(file), path.join(__dirname, '../lib/prisma'));
    let importPath = relPath.replace(/\\/g, '/');
    if (!importPath.startsWith('.')) {
      importPath = './' + importPath;
    }
    
    // Add import statement at the top (after "use client" or "use server" if exists, or just top)
    const importStmt = `import prisma from '${importPath}';\n`;
    
    content = content.replace(/const\s+prisma\s*=\s*new\s+PrismaClient\(\);?/g, '');
    
    if (content.includes('"use server"')) {
      content = content.replace(/"use server";?/, `"use server"\n${importStmt}`);
    } else if (content.includes("'use server'")) {
      content = content.replace(/'use server';?/, `'use server'\n${importStmt}`);
    } else if (content.includes('"use client"')) {
      content = content.replace(/"use client";?/, `"use client"\n${importStmt}`);
    } else if (content.includes("'use client'")) {
      content = content.replace(/'use client';?/, `'use client'\n${importStmt}`);
    } else {
      content = importStmt + content;
    }

    changed = true;
  }

  if (changed) {
    // some cleanups
    // Because we just removed `const prisma = new PrismaClient()`, maybe there are empty lines
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});
