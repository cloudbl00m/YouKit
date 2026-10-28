# Youkit — GitHub Pages edition

## Publish

1. Extract this ZIP directly into your repository root. `index.html`, `app.js`, `style.css`, and `.nojekyll` must be at the root, not inside another Youkit folder.
2. Commit and push all extracted files to your `main` branch.
3. In GitHub, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then **main** and **/(root)**, and click **Save**.
4. Open the website address shown by GitHub when deployment finishes.

No npm install, build step, API key, or GitHub secret is required. Relative asset links support both `username.github.io` and `username.github.io/repository/`. Keep `.nojekyll` even if your file browser hides dotfiles.

## What works on GitHub Pages

- Upload local video files; order clips from the last rank to #1.
- Change titles, fonts, colors, ranking positions and video layout.
- Specify start/end times and export in your browser.
- Import direct media URLs when the source host permits browser downloads.

Video export is lossy and real-time. Trimming is approximate. Resolution settings cannot recover detail absent from the source video.

## YouTube / Instagram / TikTok

GitHub Pages does not run the downloader. This package does not deploy a separate online backend.

For platform imports, download **Youkit-Link-Helper.zip** from the website and extract it on your Windows computer. The helper requires Node.js, yt-dlp and FFmpeg on PATH.

### Recommended: local editor

Run `Start-Youkit.cmd`, then open http://127.0.0.1:8765/editor/. The same editor runs locally and connects directly to the downloader. Your imported media stays on your computer.

### Optional: connect the hosted editor to your local helper

Edit `allowed-origins.json` in the extracted helper directory:

```json
["https://YOUR-USERNAME.github.io"]
```

Replace the example with your exact Pages origin. Do not include the repository path or a trailing slash. Use your HTTPS custom domain instead if you have one. Restart the helper, visit your Pages site and click **Check local downloader**. Allow local-network access if your browser asks. If the browser blocks the connection, use the local editor above.

Each visitor needs their own helper; 127.0.0.1 refers to the visitor's own computer. Never add domains you do not control to the helper's allowed origins.

The helper requests the best available source without an H.264 preference or resolution cap and does not re-encode the imported streams. The editor offers **Download source** to save that imported file. Unsupported codecs are preserved rather than silently replaced with a lower-quality source. Private, login-required or platform-blocked videos may not download. The helper does not use browser cookies.

For a fully online downloader that works without local software, a separate server capable of running yt-dlp and FFmpeg, plus access controls, storage and service limits, is required. GitHub Pages alone cannot provide that backend.

## Included files

- `index.html`, `app.js`, `style.css`: the complete editor.
- `.nojekyll`: serves the files without Jekyll processing.
- `.gitignore`: keeps local working files out of the repository.
- `Youkit-Link-Helper.zip`: optional Windows helper with local editor.
- `README.md`: these deployment instructions.

No user videos, credentials, download history, or temporary files are included. Google Fonts is used for interface typography, with local font fallbacks.
