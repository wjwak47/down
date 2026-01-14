const fs = require('fs');

let content = fs.readFileSync('src/renderer/src/pages/FileCompressor.jsx', 'utf-8');

// Remove the duplicate old code block
const duplicatePattern = /\}\)\$' \}\s*\].map\(set => \(\s*<button key=\{set\.id\} onClick=\{\(\) => toggleCharset\(set\.id\)\}[\s\S]*?<\/div>\s*\)\}\s*<\/div>\s*\)\}/;

if (duplicatePattern.test(content)) {
    content = content.replace(duplicatePattern, '');
    console.log('Removed duplicate code block');
} else {
    console.log('Duplicate pattern not found, trying alternative...');
    
    // Try to find and remove the old bruteforce settings
    const altPattern = /\$' \}\s*\].map\(set[\s\S]*?Max Length[\s\S]*?max="16" \/>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}\s*<\/div>\s*\)\}/;
    if (altPattern.test(content)) {
        content = content.replace(altPattern, '');
        console.log('Removed using alternative pattern');
    }
}

// Fix any encoding issues with bullet points
content = content.replace(/鈥?/g, '•');
content = content.replace(/鉁?/g, '✓');
content = content.replace(/鉁?/g, '✗');

fs.writeFileSync('src/renderer/src/pages/FileCompressor.jsx', content);
console.log('File saved');
