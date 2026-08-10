// Downloads the yt-dlp binary automatically when the server is deployed
// (Render/Railway run "npm install" which triggers this postinstall script)
const YTDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');

(async () => {
  try {
    const binPath = path.join(__dirname, '..', 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    console.log('Downloading yt-dlp binary to', binPath);
    await YTDlpWrap.downloadFromGithub(binPath);
    console.log('yt-dlp binary ready.');
  } catch (err) {
    console.error('Failed to download yt-dlp binary:', err.message);
    // Don't hard-fail the deploy; index.js will also try a fallback path.
  }
})();
