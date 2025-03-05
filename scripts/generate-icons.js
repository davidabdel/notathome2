const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const ICON_SIZES = [192, 512];
const ICON_COLOR = '#10b981'; // Green color matching our theme

async function generateIcons() {
  try {
    // Create icons directory if it doesn't exist
    const iconsDir = path.join(process.cwd(), 'public', 'icons');
    await fs.mkdir(iconsDir, { recursive: true });

    // Generate icons for each size
    for (const size of ICON_SIZES) {
      const svg = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${size}" height="${size}" fill="${ICON_COLOR}" rx="${size * 0.2}" />
          <text 
            x="50%" 
            y="50%" 
            font-family="Arial" 
            font-size="${size * 0.5}"
            font-weight="bold"
            fill="white"
            text-anchor="middle"
            dominant-baseline="central"
          >
            NH
          </text>
        </svg>
      `;

      await sharp(Buffer.from(svg))
        .png()
        .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));

      console.log(`Generated ${size}x${size} icon`);
    }

    console.log('Icon generation complete!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons(); 