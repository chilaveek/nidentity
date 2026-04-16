const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const appDir = path.join(srcDir, 'app');

// 1. Prune legacy directories that belong to the old project
const oldDirs = ['components', 'pages', 'contexts'];
for (const dir of oldDirs) {
    const fullPath = path.join(srcDir, dir);
    if (fs.existsSync(fullPath)) {
        // If it's contexts, save AuthContext.tsx
        if (dir === 'contexts') {
            const authCtx = path.join(fullPath, 'AuthContext.tsx');
            if (fs.existsSync(authCtx)) {
                const newCtxDir = path.join(appDir, 'context');
                fs.copyFileSync(authCtx, path.join(newCtxDir, 'AuthContext.tsx'));
            }
        }
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`Deleted legacy directory: ${dir}`);
    }
}

// 2. Fix imports in app/components to point to the new AuthContext location
function fixImports(dir) {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            fixImports(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            
            content = content.replace(/['"]\.\.\/\.\.\/\.\.\/client\/src\/contexts\/AuthContext['"]/g, `"../context/AuthContext"`);
            content = content.replace(/['"]\.\.\/\.\.\/contexts\/AuthContext['"]/g, `"../context/AuthContext"`);
            content = content.replace(/['"]\.\.\/\.\.\/\.\.\/client\/src\/App\.css['"]/g, `"../../App.css"`);
            
            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log(`Fixed imports in ${item}`);
            }
        }
    }
}

fixImports(appDir);
console.log('Restructure complete.');
