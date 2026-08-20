const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log("Starting Security Dashboard Puppeteer Test...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        page.on('console', msg => console.log('SECURITY LOG:', msg.text()));
        page.on('dialog', async dialog => {
            console.log('SECURITY DIALOG:', dialog.message());
            await dialog.accept();
        });

        // 1. Login as Security Sukuna@2008
        console.log("1. Logging in as Security Officer riemann sukuna...");
        await page.goto('http://127.0.0.1:5173/index.html', { waitUntil: 'networkidle2' });
        await page.type('#usernameInput', 'Sukuna@2008');
        await page.type('#passwordInput', 'pass123');
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
        ]);

        // 2. Security Main Dashboard
        console.log("2. Verifying Security Main Dashboard...");
        await page.goto('http://127.0.0.1:5173/dashboard/security/security.html', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(__dirname, 'screenshot_security_1_dashboard.png') });
        console.log("Saved screenshot_security_1_dashboard.png");

        // 3. Test Notification Bell
        console.log("3. Testing Notification Bell on Security Dashboard...");
        await page.click('#notifBtn');
        await new Promise(r => setTimeout(r, 800));
        await page.screenshot({ path: path.join(__dirname, 'screenshot_security_notif_open.png') });
        console.log("Saved screenshot_security_notif_open.png");

        // 4. Emergency Alerts Page
        console.log("4. Verifying Security Emergency Alerts Page...");
        await page.goto('http://127.0.0.1:5173/dashboard/security/emergency.html', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(__dirname, 'screenshot_security_2_emergency.png') });
        console.log("Saved screenshot_security_2_emergency.png");

        console.log("All Security tests completed successfully!");
    } catch (e) {
        console.error("Security Test Error:", e);
    } finally {
        await browser.close();
    }
})();
