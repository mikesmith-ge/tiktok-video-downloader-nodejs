#!/usr/bin/env node

/**
 * TikTok Video Downloader
 * 
 * A lightweight Node.js script to extract video URLs and metadata from public TikTok posts
 * by parsing Open Graph meta tags. No API key required.
 * 
 * @author Instaboost Team
 * @license MIT
 * @version 1.0.0
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class TikTokDownloader {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        this.timeout = 15000; // 15 seconds
    }

    /**
     * Download video metadata from a public TikTok URL
     * 
     * @param {string} url - TikTok video URL
     * @returns {Promise<Object>} Video metadata including video_url, thumbnail, title, author
     */
    async download(url) {
        // Validate URL
        if (!this.isValidTikTokUrl(url)) {
            throw new Error('Invalid TikTok URL. Please provide a valid video URL (e.g., https://www.tiktok.com/@user/video/1234567890)');
        }

        // Fetch HTML content
        const html = await this.fetchHtml(url);

        // Parse video metadata
        const video = this.parseVideoFromHtml(html);

        if (!video.video_url) {
            throw new Error('Could not extract video from this post. It may be private, deleted, or TikTok has updated their HTML structure.');
        }

        return video;
    }

    /**
     * Validate if the URL is a proper TikTok video URL
     * 
     * @param {string} url - URL to validate
     * @returns {boolean}
     */
    isValidTikTokUrl(url) {
        const patterns = [
            /^https?:\/\/(www\.|m\.)?tiktok\.com\/@[^\/]+\/video\/\d+/i,
            /^https?:\/\/vm\.tiktok\.com\/[a-zA-Z0-9]+/i,
            /^https?:\/\/(www\.)?tiktok\.com\/t\/[a-zA-Z0-9]+/i
        ];

        return patterns.some(pattern => pattern.test(url));
    }

    /**
     * Fetch HTML content from TikTok URL
     * 
     * @param {string} url - TikTok URL
     * @returns {Promise<string>} HTML content
     */
    fetchHtml(url) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const client = parsedUrl.protocol === 'https:' ? https : http;

            const options = {
                hostname: parsedUrl.hostname,
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET',
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: this.timeout
            };

            const req = client.request(options, (res) => {
                // Handle redirects
                if (res.statusCode === 301 || res.statusCode === 302) {
                    this.fetchHtml(res.headers.location)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                if (res.statusCode === 404) {
                    reject(new Error('Video not found. The URL may be incorrect or the video has been deleted.'));
                    return;
                }

                if (res.statusCode === 403 || res.statusCode === 429) {
                    reject(new Error('Access denied or rate limited by TikTok. Please try again later or use a professional API service.'));
                    return;
                }

                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP error: ${res.statusCode}`));
                    return;
                }

                let data = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve(data);
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Network error: ${error.message}`));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    /**
     * Parse video metadata from HTML using Open Graph meta tags
     * 
     * @param {string} html - HTML content
     * @returns {Object} Video metadata
     */
    parseVideoFromHtml(html) {
        const video = {};

        // Extract og:video (main video URL)
        const videoMatch = html.match(/<meta\s+property=["']og:video["']\s+content=["'](.*?)["']/i);
        if (videoMatch) {
            video.video_url = this.decodeHtmlEntities(videoMatch[1]);
        }

        // Try alternative video URL pattern
        if (!video.video_url) {
            const videoAltMatch = html.match(/<meta\s+property=["']og:video:url["']\s+content=["'](.*?)["']/i);
            if (videoAltMatch) {
                video.video_url = this.decodeHtmlEntities(videoAltMatch[1]);
            }
        }

        // Extract og:image (thumbnail)
        const thumbMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
        if (thumbMatch) {
            video.thumbnail = this.decodeHtmlEntities(thumbMatch[1]);
        }

        // Extract og:title (video title/description)
        const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i);
        if (titleMatch) {
            video.title = this.decodeHtmlEntities(titleMatch[1]);
        }

        // Extract author/username
        const authorMatch = html.match(/<meta\s+name=["']author["']\s+content=["'](.*?)["']/i);
        if (authorMatch) {
            video.author = this.decodeHtmlEntities(authorMatch[1]);
        }

        return video;
    }

    /**
     * Decode HTML entities
     * 
     * @param {string} str - String with HTML entities
     * @returns {string} Decoded string
     */
    decodeHtmlEntities(str) {
        return str
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'");
    }

    /**
     * Get video info (alias for download)
     * 
     * @param {string} url - TikTok video URL
     * @returns {Promise<Object>} Video metadata
     */
    async getVideoInfo(url) {
        return this.download(url);
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
        console.log(`
TikTok Video Downloader v1.0.0

Usage:
  node tiktok-downloader.js <url>

Options:
  -h, --help     Show this help message
  -v, --version  Show version

Example:
  node tiktok-downloader.js "https://www.tiktok.com/@user/video/1234567890"

For production use with unlimited API access, check https://instaboost.ge
        `);
        process.exit(0);
    }

    if (args[0] === '-v' || args[0] === '--version') {
        console.log('1.0.0');
        process.exit(0);
    }

    const downloader = new TikTokDownloader();
    const url = args[0];

    console.log(`Fetching video from: ${url}\n`);

    downloader.download(url)
        .then(video => {
            console.log('✓ Success!\n');
            console.log(`Type: video`);
            console.log(`Title: ${video.title || 'N/A'}`);
            console.log(`Author: ${video.author || 'N/A'}`);
            console.log(`Video URL: ${video.video_url}`);
            if (video.thumbnail) {
                console.log(`Thumbnail: ${video.thumbnail}`);
            }
        })
        .catch(error => {
            console.error(`\n✗ Error: ${error.message}`);
            process.exit(1);
        });
}

module.exports = TikTokDownloader;
