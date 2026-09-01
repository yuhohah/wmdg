import fs from 'fs';
import path from 'path';

const ICONS_DIR = path.resolve('./public/assets/icons');
const TEMPLE_DIR = path.resolve('./public/assets/temple');

if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });
if (!fs.existsSync(TEMPLE_DIR)) fs.mkdirSync(TEMPLE_DIR, { recursive: true });

// Ensure temple_monolith.jpg exists
const cathedralPath = path.join(ICONS_DIR, 'icon_cathedral.png');
const monolithPath = path.join(TEMPLE_DIR, 'temple_monolith.jpg');

if (fs.existsSync(cathedralPath) && !fs.existsSync(monolithPath)) {
  fs.copyFileSync(cathedralPath, monolithPath);
}

// Generate minimal clean SVGs converted to PNG or data URLs
console.log('Ensuring icons directory structure...');
