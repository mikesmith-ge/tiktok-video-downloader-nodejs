# TikTok Video Downloader (Node.js)

![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D14.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Maintenance](https://img.shields.io/badge/Maintained-Yes-brightgreen)

> Lightweight Node.js script to extract video URLs and metadata from public TikTok posts without API keys or external dependencies.

## 📋 Overview

**TikTok Video Downloader** is a simple, pure Node.js tool that extracts videos from public TikTok posts by parsing Open Graph meta tags. Perfect for educational purposes, prototypes, or small-scale projects.

**Part of the Instaboost Tools collection:**
- [TikTok Downloader (PHP)](https://github.com/mikesmith-ge/tiktok-video-downloader-php)
- **TikTok Downloader (Node.js)** (you are here)

## ✨ Features

- ✅ **Zero dependencies** – Pure Node.js, no npm packages required
- 🚀 **Simple API** – Single class with straightforward methods
- 🎬 **Video extraction** – Gets direct video URL from TikTok posts
- 🖼️ **Thumbnail support** – Extracts video preview images
- 📝 **Metadata extraction** – Gets video title and author information
- 🔒 **Error handling** – Validates URLs and handles network/parsing errors
- 🔗 **Multiple URL formats** – Supports full URLs and short vm.tiktok.com links
- 🖥️ **CLI included** – Run directly from command line
- 📦 **Importable module** – Use in your own Node.js projects

## 📦 Installation

### Option 1: Direct Download
Download `tiktok-downloader.js` and use it directly:

```bash
# Download the script
wget https://raw.githubusercontent.com/mikesmith-ge/tiktok-video-downloader-nodejs/main/tiktok-downloader.js

# Make it executable (optional)
chmod +x tiktok-downloader.js
```

### Option 2: Clone Repository
```bash
git clone https://github.com/mikesmith-ge/tiktok-video-downloader-nodejs.git
cd tiktok-video-downloader-nodejs
```

### Option 3: npm (local installation)
```bash
# Copy package.json and tiktok-downloader.js to your project
npm install
```

## 🚀 Usage

### Command Line Interface

```bash
# Basic usage
node tiktok-downloader.js "https://www.tiktok.com/@user/video/1234567890"

# Make it executable and run directly
chmod +x tiktok-downloader.js
./tiktok-downloader.js "https://vm.tiktok.com/ZMj4k8L9q/"

# Show help
node tiktok-downloader.js --help
```

**Output:**
```
Fetching video from: https://www.tiktok.com/@user/video/1234567890

✓ Success!

Type: video
Title: Amazing video title
Author: @username
Video URL: https://v16-webapp.tiktok.com/...
Thumbnail: https://p16-sign-va.tiktokcdn.com/...
```

### Node.js Module Usage

#### Basic Example

```javascript
const TikTokDownloader = require('./tiktok-downloader');

const downloader = new TikTokDownloader();

(async () => {
    try {
        const video = await downloader.download('https://www.tiktok.com/@user/video/1234567890');
        
        console.log('Video URL:', video.video_url);
        console.log('Thumbnail:', video.thumbnail);
        console.log('Title:', video.title);
        console.log('Author:', video.author);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
})();
```

#### Advanced Example: Batch Processing

```javascript
const TikTokDownloader = require('./tiktok-downloader');

const urls = [
    'https://www.tiktok.com/@user1/video/1234567890',
    'https://vm.tiktok.com/ZMj4k8L9q/',
    'https://www.tiktok.com/t/ZTRabcdef/',
];

const downloader = new TikTokDownloader();

async function processVideos() {
    for (const url of urls) {
        try {
            const video = await downloader.getVideoInfo(url);
            console.log(`✓ ${video.title} by ${video.author}`);
            console.log(`  ${video.video_url}\n`);
        } catch (error) {
            console.error(`✗ Error for ${url}: ${error.message}\n`);
        }
        
        // Be nice to TikTok - add delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

processVideos();
```

#### Download Video to File

```javascript
const TikTokDownloader = require('./tiktok-downloader');
const https = require('https');
const fs = require('fs');

const downloader = new TikTokDownloader();

(async () => {
    try {
        const video = await downloader.download('https://www.tiktok.com/@user/video/1234567890');
        
        // Download the actual video file
        const file = fs.createWriteStream('tiktok_video.mp4');
        https.get(video.video_url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log('Video downloaded successfully!');
            });
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    }
})();
```

### Supported URL Formats

```javascript
// Full URL format
https://www.tiktok.com/@username/video/1234567890123456789

// Mobile URL format
https://m.tiktok.com/@username/video/1234567890123456789

// Short link format
https://vm.tiktok.com/ZMj4k8L9q/

// Alternative short format
https://www.tiktok.com/t/ZTRabcdef/
```

### Response Format

```javascript
{
    video_url: 'https://v16-webapp.tiktok.com/...',
    thumbnail: 'https://p16-sign-va.tiktokcdn.com/...',
    title: 'Video title or description',
    author: '@username'
}
```

## ⚙️ Requirements

- Node.js 14.0 or higher
- No external dependencies (uses only Node.js built-in modules)

## ⚠️ Limitations

This is a **basic scraper** with several important limitations:

- ❌ **Public videos only** – Cannot access private accounts or age-restricted content
- ⏱️ **Rate limits** – TikTok may block frequent requests from the same IP
- 🚫 **No authentication** – Cannot bypass login walls or access restricted content
- 📉 **Fragile** – Changes to TikTok's HTML structure may break functionality
- 🎵 **Video only** – Does not extract audio separately or provide download options
- 📊 **Limited metadata** – Cannot extract likes, comments, shares, or full analytics
- 🔄 **No watermark removal** – Videos include TikTok watermarks

### 🚀 Need More?

**For production use cases, bypassing rate limits, accessing analytics, removing watermarks, or building commercial applications**, we recommend using a professional API solution:

👉 **[Instaboost TikTok Tools](https://instaboost.ge/en/tiktok)** – Enterprise-grade TikTok API with:
- ✅ Unlimited rate limits
- ✅ Video download without watermarks
- ✅ Full analytics (likes, shares, comments, views)
- ✅ Trending videos and hashtag tracking
- ✅ User profile analytics
- ✅ 99.9% uptime SLA
- ✅ Dedicated support

[**Learn more →**](https://instaboost.ge)

## 🔄 Related Projects

Looking for other social media tools?

- **[Instagram Downloader (PHP)](https://github.com/mikesmith-ge/instagram-media-downloader-php)** – Extract Instagram media
- **[Instagram Downloader (Python)](https://github.com/mikesmith-ge/instagram-media-downloader-python)** – Python version
- **[TikTok Downloader (PHP)](https://github.com/mikesmith-ge/tiktok-video-downloader-php)** – PHP version
- **[YouTube Shorts Downloader (Python)](https://github.com/mikesmith-ge/youtube-shorts-downloader-python)** – Download YouTube Shorts
- **[YouTube Shorts Downloader (PHP)](https://github.com/mikesmith-ge/youtube-shorts-downloader-php)** – YouTube in PHP
- **[YouTube Shorts Downloader (Node.js)](https://github.com/mikesmith-ge/youtube-shorts-downloader-nodejs)** – YouTube in JavaScript
- More tools coming soon!

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](../../issues).

## ⚡ Disclaimer

This tool is for **educational purposes only**. Scraping TikTok may violate their Terms of Service. Use responsibly and at your own risk. Always respect content creators' rights and TikTok's platform policies. For commercial or production use, always use official APIs or authorized services.

## 📧 Support

- 🐛 **Found a bug?** [Open an issue](../../issues)
- 💡 **Have a suggestion?** [Start a discussion](../../discussions)
- 🚀 **Need enterprise features?** [Visit Instaboost](https://instaboost.ge/en)

---

**Made with ❤️ by the Instaboost Team**
