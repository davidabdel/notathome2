const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Create the scripts directory if it doesn't exist
if (!fs.existsSync('scripts')) {
  fs.mkdirSync('scripts');
}

// Create the icons directory if it doesn't exist
const iconsDir = path.join('public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Define the icon sizes we need
const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

// Source icon
const sourceIcon = path.join('public', 'icons', 'icon-512x512.png');

// Check if source icon exists
if (!fs.existsSync(sourceIcon)) {
  console.error(`Source icon not found: ${sourceIcon}`);
  process.exit(1);
}

// Generate icons for each size
async function generateIcons() {
  console.log('Generating PWA icons...');
  
  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(sourceIcon)
        .resize(size, size)
        .toFile(outputPath);
      
      console.log(`Generated: ${outputPath}`);
    } catch (error) {
      console.error(`Error generating ${outputPath}:`, error);
    }
  }
  
  console.log('Icon generation complete!');
}

// Run the icon generation
generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
}); 