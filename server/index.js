const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const YTDlpWrap = require('yt-dlp-wrap').default;

const app = express();
app.use(cors());
app.use(express.json());

// Locate the yt-dlp binary (downloaded by scripts/install-ytdlp.js on deploy)
const binPath = path.join(
  __dirname,
  'bin',
  process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
);
const ytDlpWrap = new YTDlpWrap(fs.existsSync(binPath) ? binPath : undefined);

const SUPPORTED_HOSTS = ['youtube.com', 'youtu.be', 'tiktok.com', 'instagram.com', 'facebook.com', 'fb.watch'];

function isSupported(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return SUPPORTED_HOSTS.some((h) => host.includes(h));
  } catch {
    return false;
  }
}

// 1) Fetch metadata + available quality options for a pasted link
app.get('/api/info', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing "url" query param' });
  if (!isSupported(url)) return res.status(400).json({ error: 'Unsupported site' });

  try {
    const raw = await ytDlpWrap.getVideoInfo(url);

    // Build a clean, de-duplicated list of downloadable qualities
    const formats = (raw.formats || [])
      .filter((f) => f.vcodec !== 'none' || f.acodec !== 'none')
      .map((f) => ({
        format_id: f.format_id,
        ext: f.ext,
        resolution: f.resolution || (f.height ? `${f.height}p` : 'audio only'),
        note: f.format_note || '',
        filesize: f.filesize || f.filesize_approx || null,
        hasVideo: f.vcodec !== 'none',
        hasAudio: f.acodec !== 'none',
      }))
      .sort((a, b) => (b.filesize || 0) - (a.filesize || 0));

    res.json({
      title: raw.title,
      thumbnail: raw.thumbnail,
      duration: raw.duration,
      uploader: raw.uploader,
      formats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch video info. The link may be private or invalid.' });
  }
});

// 2) Stream the actual download in the chosen quality (merges video+audio via ffmpeg when needed)
app.get('/api/download', async (req, res) => {
  const { url, format_id } = req.query;
  if (!url || !format_id) return res.status(400).json({ error: 'Missing url or format_id' });
  if (!isSupported(url)) return res.status(400).json({ error: 'Unsupported site' });

  res.setHeader('Content-Disposition', 'attachment; filename="download.mp4"');

  const stream = ytDlpWrap.execStream([
    url,
    '-f', format_id,
    '--merge-output-format', 'mp4',
    '-o', '-', // pipe to stdout
  ]);

  stream.pipe(res);
  stream.on('error', (err) => {
    console.error('Download stream error:', err);
    if (!res.headersSent) res.status(500).end('Download failed');
  });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`BitLord downloader API running on port ${PORT}`));
