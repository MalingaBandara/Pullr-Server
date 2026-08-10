// Downloads the yt-dlp binary automatically when the server is deployed
// (Render/Railway run "npm install" which triggers this postinstall script)
const YTDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const fs = require('fs');

(async () => {
  try {
    const binDir = path.join(__dirname, '..', 'bin');
    const binPath = path.join(binDir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

    // Make sure the bin/ folder exists first — a fresh clone won't have it,
    // since git doesn't track empty directories.
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    console.log('Downloading yt-dlp binary to', binPath);
    await YTDlpWrap.downloadFromGithub(binPath);
    console.log('yt-dlp binary ready.');
  } catch (err) {
    console.error('Failed to download yt-dlp binary:', err.message);
    // Don't hard-fail the deploy; index.js will also try a fallback path.
  }
})();
