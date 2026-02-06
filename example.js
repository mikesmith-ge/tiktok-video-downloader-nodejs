const TikTokDownloader = require('./tiktok-downloader');

const downloader = new TikTokDownloader();

// Example 1: Single video download
console.log('Example 1: Single video download');
console.log('-'.repeat(50));

(async () => {
    try {
        const video = await downloader.download('https://www.tiktok.com/@user/video/1234567890');
        
        console.log('Video URL:', video.video_url);
        console.log('Thumbnail:', video.thumbnail);
        console.log('Title:', video.title);
        console.log('Author:', video.author);
        console.log();
        
    } catch (error) {
        console.error('Error:', error.message);
        console.log();
    }

    // Example 2: Batch processing
    console.log('Example 2: Batch processing');
    console.log('-'.repeat(50));

    const urls = [
        'https://www.tiktok.com/@user1/video/1234567890',
        'https://vm.tiktok.com/ZMj4k8L9q/',
    ];

    for (const url of urls) {
        try {
            const video = await downloader.getVideoInfo(url);
            console.log(`✓ ${video.title || 'Video'} - ${url}`);
        } catch (error) {
            console.error(`✗ Error for ${url}: ${error.message}`);
        }
    }
})();
