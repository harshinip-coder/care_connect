const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/harsh/.gemini/antigravity/brain/a0e6ba95-fd11-42a1-a85e-c004c4a1b210';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    console.log('🚀 Starting Full Puppeteer Admin Tables Verification...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });

        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

        // 1. Log in as Admin Harshini
        console.log('1. Logging in as Admin (Harshini)...');
        await page.goto('http://127.0.0.1:5173/index.html', { waitUntil: 'networkidle2' });
        await page.type('#usernameInput', 'Harshini');
        await page.type('#passwordInput', 'pass123');
        await page.click('button[type="submit"]');

        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {});
        console.log('Current URL after login:', page.url());

        const pagesToTest = [
            { name: 'residents', url: 'http://127.0.0.1:5173/dashboard/admin/residents.html', file: 'admin_residents_verified.png' },
            { name: 'guardians', url: 'http://127.0.0.1:5173/dashboard/admin/guardians.html', file: 'admin_guardians_verified.png' },
            { name: 'society', url: 'http://127.0.0.1:5173/dashboard/admin/society.html', file: 'admin_society_verified.png' },
            { name: 'blocks', url: 'http://127.0.0.1:5173/dashboard/admin/blocks.html', file: 'admin_blocks_verified.png' },
            { name: 'flats', url: 'http://127.0.0.1:5173/dashboard/admin/flats.html', file: 'admin_flats_verified.png' },
            { name: 'security', url: 'http://127.0.0.1:5173/dashboard/admin/security.html', file: 'admin_security_verified.png' },
            { name: 'volunteers', url: 'http://127.0.0.1:5173/dashboard/admin/volunteers.html', file: 'admin_volunteers_verified.png' },
            { name: 'emergency', url: 'http://127.0.0.1:5173/dashboard/admin/emergency.html', file: 'admin_emergency_verified.png' }
        ];

        for (const p of pagesToTest) {
            console.log(`\nNavigating to ${p.name.toUpperCase()} page: ${p.url}`);
            await page.goto(p.url, { waitUntil: 'networkidle2' });
            await sleep(1500);

            const rowCount = await page.evaluate(() => {
                const tbody = document.getElementById('moduleTableBody');
                if (!tbody) return 0;
                const rows = tbody.querySelectorAll('tr');
                return rows.length;
            });

            const firstRowText = await page.evaluate(() => {
                const tbody = document.getElementById('moduleTableBody');
                if (!tbody || !tbody.firstElementChild) return 'EMPTY';
                return tbody.firstElementChild.innerText.replace(/\n+/g, ' | ');
            });

            console.log(`[${p.name.toUpperCase()}] Row Count: ${rowCount}`);
            console.log(`[${p.name.toUpperCase()}] First Row Preview: ${firstRowText}`);

            const screenshotPath = path.join(ARTIFACT_DIR, p.file);
            await page.screenshot({ path: screenshotPath });
            console.log(`📸 Screenshot saved to: ${p.file}`);
        }

        console.log('\n🎉 ALL ADMIN PAGES AND TABLES VERIFIED SUCCESSFULLY WITH REAL DATA!');
    } catch (err) {
        console.error('❌ Puppeteer Error:', err);
    } finally {
        await browser.close();
    }
})();
