const express = require('express');
const sharp = require('sharp');
const multer = require('multer');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json({ limit: '20mb' }));

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'story-overlay-service' });
});

app.post('/overlay', upload.single('image'), async (req, res) => {
  try {
    let imageBuffer;

    if (req.file) {
      imageBuffer = req.file.buffer;
    } else if (req.body.image_base64) {
      imageBuffer = Buffer.from(req.body.image_base64, 'base64');
    } else {
      return res.status(400).json({ error: 'Gorsel zorunlu (image veya image_base64)' });
    }

    const baslik = req.body.baslik || '';
    const aciklama = req.body.aciklama || '';
    const marka = req.body.marka || '';

    if (!baslik) {
      return res.status(400).json({ error: 'baslik zorunlu' });
    }

    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1024;
    const height = metadata.height || 1536;

    const bandHeight = Math.round(height * 0.15);
    const fontSize = Math.round(bandHeight * 0.28);
    const smallFontSize = Math.round(bandHeight * 0.22);
    const padding = Math.round(width * 0.05);

    const truncate = (text, maxLen) =>
      text && text.length > maxLen ? text.substring(0, maxLen - 3) + '...' : (text || '');

const cleanText = (text) => {
  if (!text) return '';
  return text.replace(/[\u{1F300}-\u{1FFFF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u2600-\u26FF\u2700-\u27BF]/gu, '').trim();
};

const baslikText = truncate(cleanText(baslik), 50);
const aciklamaText = truncate(cleanText(aciklama), 80);
const markaText = truncate(cleanText(marka), 30);

    const svgOverlay = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${width}" height="${bandHeight}" fill="rgba(0,0,0,0.72)"/>
  <rect x="0" y="${height - bandHeight}" width="${width}" height="${bandHeight}" fill="rgba(0,0,0,0.72)"/>
  <text x="${padding}" y="${Math.round(bandHeight * 0.38)}" font-family="Arial, sans-serif" font-size="${smallFontSize}" font-weight="bold" fill="#ffffff" opacity="0.75" dominant-baseline="middle">${markaText}</text>
  <text x="${padding}" y="${Math.round(bandHeight * 0.72)}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ffffff" dominant-baseline="middle">${baslikText}</text>
  <text x="${padding}" y="${height - Math.round(bandHeight * 0.62)}" font-family="Arial, sans-serif" font-size="${smallFontSize}" fill="#eeeeee" dominant-baseline="middle">${aciklamaText}</text>
  <text x="${Math.round(width / 2)}" y="${height - Math.round(bandHeight * 0.25)}" font-family="Arial, sans-serif" font-size="${smallFontSize}" fill="#ffffff" opacity="0.85" text-anchor="middle" dominant-baseline="middle">Daha fazlasi icin takip et</text>
</svg>`;

    const outputBuffer = await sharp(imageBuffer)
      .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
      .png()
      .toBuffer();

    const resultBase64 = outputBuffer.toString('base64');

    res.json({
      success: true,
      image_base64: resultBase64,
      format: 'png',
    });

  } catch (err) {
    console.error('Overlay error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Story overlay service running on port ${PORT}`);
});
