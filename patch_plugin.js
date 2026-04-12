const fs = require('fs');
const path = './.netlify/plugins/node_modules/@netlify/plugin-nextjs/dist/build/content/server.js';

setInterval(() => {
    try {
        if (fs.existsSync(path)) {
            let content = fs.readFileSync(path, 'utf8');
            if (content.includes('verbatimSymlinks: true')) {
                content = content.replace(/verbatimSymlinks: true/g, 'verbatimSymlinks: false');
                content = content.replace('await symlink(symlinkTarget, symlinkSrc);', 'await cp(join(src, org || "", dirent.name), symlinkSrc, { recursive: true, force: true, verbatimSymlinks: false });');
                fs.writeFileSync(path, content, 'utf8');
                console.log('PATCHED Netlify Next plugin successfully!');
            }
        }
    } catch (e) {
        // Ignore read/write locking errors
    }
}, 50);
