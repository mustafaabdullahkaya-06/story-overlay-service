const express = require('express');
const sharp = require('sharp');

const app = express();
app.use(express.json({ limit: '20mb' }));

const PORT = process.env.PORT || 3000;

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'story-overlay-service' });
});

// Ana endpoint
app.post('/overlay', async (req, res) => {
  try {
    const { image_base64, baslik, aciklama, marka } = req.body;

    if (!image_base64 || !baslik) {
      return res.status(400).json({ error: 'image_base64 ve baslik zorunlu' });
    }

    // Base64'ten buffer'a çevir
    const imageBuffer = Buffer.from(image_base64, 'base64');

    // Görselin boyutlarını al
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1024;
    const height = metadata.height || 1536;

    // Bant yükseklikleri
    const bandHeight = Math.round(height * 0.15); // %15 üst/alt bant
    const fontSize = Math.round(bandHeight * 0.28);
    const smallFontSize = Math.round(bandHeight * 0.22);
    const padding = Math.round(width * 0.05);

    // Metni kısalt (çok uzunsa)
    const truncate = (text, maxLen) =>
      text && text.length > maxLen ? text.substring(0, maxLen - 3) + '...' : (text || '');

    const baslikText = truncate(baslik, 50);
    const aciklamaText = truncate(aciklama, 80);
    const markaText = truncate(marka, 30);

    // SVG overlay oluştur
    const svgOverlay = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Üst bant -->
  <rect x="0" y="0" width="${width}" height="${bandHeight}" fill="rgba(0,0,0,0.72)" rx="0"/>
  
  <!-- Alt bant -->
  <rect x="0" y="${height - bandHeight}" width="${width}" height="${bandHeight}" fill="rgba(0,0,0,0.72)" rx="0"/>

  <!-- Üst: Marka adı (sol) -->
  <text 
    x="${padding}" 
    y="${Math.round(bandHeight * 0.42)}" 
    font-family="Arial, sans-serif" 
    font-size="${smallFontSize}" 
    font-weight="bold"
    fill="#ffffff" 
    opacity="0.75"
    dominant-baseline="middle">
    ${markaText}
  </text>

  <!-- Üst: Başlık (alt satır) -->
  <text 
    x="${padding}" 
    y="${Math.round(bandHeight * 0.75)}" 
    font-family="Arial, sans-serif" 
    font-size="${fontSize}" 
    font-weight="bold"
    fill="#ffffff"
    dominant-baseline="middle">
    ${baslikText}
  </text>

  <!-- Alt: Açıklama -->
  <text 
    x="${padding}" 
    y="${height - Math.round(bandHeight * 0.62)}" 
    font-family="Arial, sans-serif" 
    font-size="${smallFontSize}" 
    fill="#eeeeee"
    dominant-baseline="middle">
    ${aciklamaText}
  </text>

  <!-- Alt: Swipe up / CTA -->
  <text 
    x="${Math.round(width / 2)}" 
    y="${height - Math.round(bandHeight * 0.25)}" 
    font-family="Arial, sans-serif" 
    font-size="${smallFontSize}" 
    fill="#ffffff"
    opacity="0.85"
    text-anchor="middle"
    dominant-baseline="middle">
    ↑ Daha fazlası için takip et
  </text>
</svg>`;

    // Görsele overlay ekle
    const outputBuffer = await sharp(imageBuffer)
      .composite([
        {
          input: Buffer.from(svgOverlay),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    // Base64 olarak döndür
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
