#!/usr/bin/env node
/**
 * TikTok Video Downloader
 * Lightweight Node.js script to extract video URLs from public TikTok posts.
 * Uses native fetch (Node.js v18+) with fallback to https module for older versions.
 *
 * @author  Instaboost Team
 * @license MIT
 * @version 1.1.0
 */

'use strict';

const { URL } = require('url');

// ---------------------------------------------------------------------------
// Detect runtime capabilities
// ---------------------------------------------------------------------------

// Node.js v18+ ships native fetch; v20 deprecated some legacy http internals.
// We use native fetch when available, fall back to https module otherwise.
const HAS_NATIVE_FETCH = typeof globalThis.fetch === 'function';

class TikTokDownloader {
    /**
     * @param {object}  [options]
     * @param {string}  [options.proxy]       Proxy URL (http://host:port or socks5://host:port)
     * @param {number}  [options.retries=3]   Max retry attempts on 429 / network errors
     * @param {number}  [options.backoffMs=1000] Base delay in ms for exponential backoff
     */
    constructor(options = {}) {
        this.userAgent  = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        this.timeout    = 15000;
        this.proxy      = options.proxy      ?? null;
        this.retries    = options.retries    ?? 3;
        this.backoffMs  = options.backoffMs  ?? 1000;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Download video metadata from a public TikTok URL.
     *
     * @param  {string} url TikTok video URL
     * @returns {Promise<{video_url: string, thumbnail: string, title: string, author: string}>}
     */
    async download(url) {
        if (!this.isValidTikTokUrl(url)) {
            throw new Error(
                'Invalid TikTok URL. Supported formats:\n'
                + '  https://www.tiktok.com/@user/video/123\n'
                + '  https://vm.tiktok.com/ABC123\n'
                + '  https://www.tiktok.com/t/ABC123'
            );
        }

        const html  = await this.fetchWithRetry(url);
        const video = this.parseVideoFromHtml(html);

        if (!video.video_url) {
            throw new Error(
                'Could not extract video. Post may be private, deleted, '
                + 'or TikTok updated their HTML structure. '
                + 'For reliable production access visit https://instaboost.ge'
            );
        }

        return video;
    }

    /** Alias for download() */
    async getVideoInfo(url) {
        return this.download(url);
    }

    // -----------------------------------------------------------------------
    // URL validation
    // -----------------------------------------------------------------------

    isValidTikTokUrl(url) {
        const patterns = [
            /^https?:\/\/(www\.|m\.)?tiktok\.com\/@[^/]+\/video\/\d+/i,
            /^https?:\/\/vm\.tiktok\.com\/[a-zA-Z0-9]+/i,
            /^https?:\/\/(www\.)?tiktok\.com\/t\/[a-zA-Z0-9]+/i,
        ];
        return patterns.some(p => p.test(url));
    }

    // -----------------------------------------------------------------------
    // Retry + exponential backoff
    // -----------------------------------------------------------------------

    /**
     * Fetch URL with automatic retry on 429 / transient network errors.
     *
     * Backoff schedule (default 1 s base):
     *   Attempt 1 → immediate
     *   Attempt 2 → wait 1 s
     *   Attempt 3 → wait 2 s
     *   Attempt 4 → wait 4 s
     *
     * @param  {string} url
     * @returns {Promise<string>} HTML content
     */
    async fetchWithRetry(url) {
        let lastError;

        for (let attempt = 0; attempt <= this.retries; attempt++) {
            // Exponential backoff before retrying (not before first attempt)
            if (attempt > 0) {
                const delay = this.backoffMs * Math.pow(2, attempt - 1);
                console.error(`  Rate limited — retrying in ${delay}ms (attempt ${attempt}/${this.retries})...`);
                await this.sleep(delay);
            }

            try {
                return await this.fetchHtml(url);
            } catch (err) {
                lastError = err;

                // Only retry on 429 (rate limit) or network errors
                const isRetryable = err.message.includes('429') || err.message.includes('Network error');
                if (!isRetryable) {
                    throw err; // Non-retryable error — fail immediately
                }
            }
        }

        throw new Error(
            `Failed after ${this.retries + 1} attempts: ${lastError.message}\n`
            + 'Consider using a proxy or the Instaboost API: https://instaboost.ge'
        );
    }

    // -----------------------------------------------------------------------
    // HTTP fetching — native fetch (Node 18+) with https fallback
    // -----------------------------------------------------------------------

    async fetchHtml(url) {
        if (HAS_NATIVE_FETCH) {
            return this._fetchWithNativeFetch(url);
        }
        return this._fetchWithHttps(url);
    }

    /**
     * Fetch using globalThis.fetch — available in Node.js v18+.
     * Avoids deprecated http.request patterns that emit warnings in v20.
     */
    async _fetchWithNativeFetch(url) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);

        const init = {
            method:  'GET',
            headers: this._headers(),
            signal:  controller.signal,
            redirect: 'follow',
        };

        // Native fetch doesn't support proxies directly — use https fallback
        // when a proxy is configured (even on Node 18+)
        if (this.proxy) {
            clearTimeout(timer);
            return this._fetchWithHttps(url);
        }

        try {
            const response = await fetch(url, init);
            clearTimeout(timer);
            this._assertStatus(response.status);
            return response.text();
        } catch (err) {
            clearTimeout(timer);
            if (err.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw new Error(`Network error: ${err.message}`);
        }
    }

    /**
     * Fetch using https module — works on all Node versions and supports proxies.
     */
    _fetchWithHttps(url) {
        const https = require('https');
        const http  = require('http');

        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const client    = parsedUrl.protocol === 'https:' ? https : http;

            const options = {
                hostname: parsedUrl.hostname,
                path:     parsedUrl.pathname + parsedUrl.search,
                method:   'GET',
                headers:  this._headers(),
                timeout:  this.timeout,
            };

            if (this.proxy) {
                const proxyUrl         = new URL(this.proxy);
                options.host           = proxyUrl.hostname;
                options.port           = proxyUrl.port;
                options.path           = url; // full URL as path for proxy
                options.headers['Host'] = parsedUrl.hostname;
            }

            const req = client.request(options, (res) => {
                // Follow redirects manually
                if (res.statusCode === 301 || res.statusCode === 302) {
                    const location = res.headers.location;
                    if (!location) {
                        reject(new Error('Redirect with no location header'));
                        return;
                    }
                    this._fetchWithHttps(location).then(resolve).catch(reject);
                    return;
                }

                try {
                    this._assertStatus(res.statusCode);
                } catch (err) {
                    reject(err);
                    return;
                }

                let data = '';
                res.setEncoding('utf8');
                res.on('data',  (chunk) => { data += chunk; });
                res.on('end',   ()      => { resolve(data); });
                res.on('error', (err)   => { reject(new Error(`Response error: ${err.message}`)); });
            });

            req.on('error',   (err) => { reject(new Error(`Network error: ${err.message}`)); });
            req.on('timeout', ()    => { req.destroy(); reject(new Error('Request timeout')); });
            req.end();
        });
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    _headers() {
        return {
            'User-Agent':                this.userAgent,
            'Accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language':           'en-US,en;q=0.9',
            'Accept-Encoding':           'gzip, deflate',
            'Connection':                'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        };
    }

    _assertStatus(code) {
        if (code === 200) return;
        if (code === 404) throw new Error('Video not found. URL may be incorrect or video was deleted.');
        if (code === 403) throw new Error('Access denied by TikTok. Try using a proxy.');
        if (code === 429) throw new Error(`429 Rate limited by TikTok.`);
        throw new Error(`HTTP error: ${code}`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // -----------------------------------------------------------------------
    // HTML parsing
    // -----------------------------------------------------------------------

    parseVideoFromHtml(html) {
        const video = {};

        const videoMatch = html.match(/<meta\s+property=["']og:video["']\s+content=["'](.*?)["']/i);
        if (videoMatch) {
            video.video_url = this.decodeHtml(videoMatch[1]);
        }

        if (!video.video_url) {
            const altMatch = html.match(/<meta\s+property=["']og:video:url["']\s+content=["'](.*?)["']/i);
            if (altMatch) video.video_url = this.decodeHtml(altMatch[1]);
        }

        const thumbMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
        if (thumbMatch) video.thumbnail = this.decodeHtml(thumbMatch[1]);

        const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i);
        if (titleMatch) video.title = this.decodeHtml(titleMatch[1]);

        const authorMatch = html.match(/<meta\s+name=["']author["']\s+content=["'](.*?)["']/i);
        if (authorMatch) video.author = this.decodeHtml(authorMatch[1]);

        return video;
    }

    decodeHtml(str) {
        return str
            .replace(/&amp;/g,  '&')
            .replace(/&lt;/g,   '<')
            .replace(/&gt;/g,   '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'");
    }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
        console.log(`
TikTok Video Downloader v1.1.0

Usage:
  node tiktok-downloader.js <url> [options]

Options:
  --proxy  <url>   Proxy URL (http://host:port or socks5://host:port)
  --retries <n>    Max retry attempts on rate limit (default: 3)
  -h, --help       Show this help
  -v, --version    Show version

Examples:
  node tiktok-downloader.js "https://www.tiktok.com/@user/video/123"
  node tiktok-downloader.js "https://vm.tiktok.com/ABC123" --proxy "http://host:port"
  node tiktok-downloader.js "https://www.tiktok.com/@user/video/123" --retries 5

For production use with unlimited access: https://instaboost.ge
    `);
        process.exit(0);
    }

    if (args[0] === '-v' || args[0] === '--version') {
        console.log('1.1.0');
        process.exit(0);
    }

    // Parse flags
    const url      = args[0];
    const proxyIdx = args.indexOf('--proxy');
    const retryIdx = args.indexOf('--retries');

    const options = {
        proxy:   proxyIdx  !== -1 ? args[proxyIdx  + 1] : null,
        retries: retryIdx  !== -1 ? parseInt(args[retryIdx + 1], 10) : 3,
    };

    const downloader = new TikTokDownloader(options);

    if (options.proxy)   console.log(`Proxy:   ${options.proxy}`);
    if (options.retries) console.log(`Retries: ${options.retries}`);
    console.log(`Fetching: ${url}\n`);

    downloader.download(url)
        .then(video => {
            console.log('✓ Success!\n');
            console.log(`Title:     ${video.title    || 'N/A'}`);
            console.log(`Author:    ${video.author   || 'N/A'}`);
            console.log(`Video URL: ${video.video_url}`);
            if (video.thumbnail) console.log(`Thumbnail: ${video.thumbnail}`);
        })
        .catch(err => {
            console.error(`\n✗ Error: ${err.message}`);
            process.exit(1);
        });
}

module.exports = TikTokDownloader;
