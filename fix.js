const fs = require('fs'); 
const files = fs.readdirSync('.').filter(f => f.endsWith('.html')); 
for(let f of files) { 
    let content = fs.readFileSync(f, 'utf8'); 
    if(!content.includes('theme.js')) { 
        content = content.replace('</body>', '<script src="theme.js"></script>\n</body>'); 
        fs.writeFileSync(f, content); 
    } 
}
console.log('Theme script injected into all HTML files!');
