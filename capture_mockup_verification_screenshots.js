const puppeteer = require('puppeteer');
const path = require('path');
const http = require('http');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/harsh/.gemini/antigravity/brain/a0e6334c-420e-47b0-a856-68816b419be3';
const WEB_DIR = 'C:/Users/harsh/care_connect/careconnect_mobile/build/web';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    console.log('🚀 Starting HTTP static server for Flutter Web Build on Port 8089...');
    const server = http.createServer((req, res) => {
        let filePath = path.join(WEB_DIR, req.url === '/' ? 'index.html' : req.url);
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            filePath = path.join(WEB_DIR, 'index.html');
        }
        const ext = path.extname(filePath);
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.wasm': 'application/wasm'
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading ' + filePath);
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    });

    server.listen(8089);

    console.log('🚀 Launching Puppeteer to capture Admin Dashboard Verification screenshot...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        // Capture Admin Dashboard Screen
        const page = await browser.newPage();
        await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 });
        console.log('Navigating directly to Admin Dashboard Screen (/#/admin)...');
        await page.goto('http://127.0.0.1:8089/#/admin', { waitUntil: 'networkidle2' });
        await sleep(5000);

        const adminScreenshot = path.join(ARTIFACT_DIR, 'verified_mockup_3_admin_dashboard.png');
        await page.screenshot({ path: adminScreenshot, fullPage: true });
        console.log('📸 Saved Admin Dashboard Screenshot: verified_mockup_3_admin_dashboard.png');

        console.log('🎉 PUPPETEER ADMIN DASHBOARD VERIFICATION COMPLETE!');

    } catch (err) {
        console.error('❌ Puppeteer Error:', err);
    } finally {
        await browser.close();
        server.close();
    }
})();
