const fs = require('fs');
const path = require('path');

const wwwDir = path.join(__dirname, 'www');

console.log('Cleaning and preparing www directory for Android build...');
if (fs.existsSync(wwwDir)) {
  fs.rmSync(wwwDir, { recursive: true, force: true });
}
fs.mkdirSync(wwwDir, { recursive: true });

// Core web game files
const filesToCopy = [
  'index.html',
  'style.css',
  'game.js',
  'config.js',
  'manifest.json',
  'sw.js'
];

for (const file of filesToCopy) {
  const src = path.join(__dirname, file);
  const dest = path.join(wwwDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} -> www/${file}`);
  } else {
    console.warn(`Warning: ${file} not found at ${src}`);
  }
}

// Copy directories
const dirsToCopy = ['audio', 'icons', 'screenshots'];
for (const dir of dirsToCopy) {
  const src = path.join(__dirname, dir);
  const dest = path.join(wwwDir, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    const items = fs.readdirSync(dest);
    console.log(`Copied ${dir}/ (${items.length} files) -> www/${dir}/`);
  } else {
    console.warn(`Warning: ${dir}/ directory not found`);
  }
}

console.log('Mobile assets preparation complete! Ready for Capacitor sync.');
