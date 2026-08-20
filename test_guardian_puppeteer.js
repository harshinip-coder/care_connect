const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log("Starting Guardian Dashboard Puppeteer Test...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        page.on('console', msg => console.log('GUARDIAN LOG:', msg.text()));
        page.on('response', resp => {
            if (resp.status() >= 400) {
                console.log(`HTTP ${resp.status()} on ${resp.url()}`);
            }
        });
        page.on('dialog', async dialog => {
            console.log('GUARDIAN DIALOG:', dialog.message());
            await dialog.accept();
        });

        // 1. Login as Guardian Kavitha
        console.log("1. Logging in as Guardian Kavitha...");
        await page.goto('http://127.0.0.1:5173/index.html', { waitUntil: 'networkidle2' });
        await page.type('#usernameInput', 'Kavitha');
        await page.type('#passwordInput', 'pass123');
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
        ]);

        // 2. Guardian Main Dashboard
        console.log("2. Verifying Guardian Main Dashboard...");
        await page.goto('http://127.0.0.1:5173/dashboard/guardian/guardian.html', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));

        const residentContent = await page.$eval('#myResidentsContainer', el => el.innerText);
        console.log("Assigned Residents container text:", residentContent.replace(/\n/g, ' '));

        await page.screenshot({ path: path.join(__dirname, 'screenshot_guardian_1_dashboard.png') });
        console.log("Saved screenshot_guardian_1_dashboard.png");

        // 3. Test Notification Popover & Mark All Read
        console.log("3. Testing Notification Popover & Mark All Read...");
        await page.click('#notifBtn');
        await new Promise(r => setTimeout(r, 800));

        await page.screenshot({ path: path.join(__dirname, 'screenshot_guardian_4_notifications_open.png') });
        console.log("Saved screenshot_guardian_4_notifications_open.png");

        // Click Mark all read if present
        const markReadExists = await page.evaluate(() => {
            const el = Array.from(document.querySelectorAll('#guardianNotifPopover span')).find(s => s.innerText.includes('Mark all read'));
            if (el) {
                el.click();
                return true;
            }
            return false;
        });
        console.log("Mark all read clicked:", markReadExists);
        await new Promise(r => setTimeout(r, 1000));

        // Click notification icon again to verify 0 and "No Notifications"
        await page.click('#notifBtn');
        await new Promise(r => setTimeout(r, 800));
        await page.screenshot({ path: path.join(__dirname, 'screenshot_guardian_4_notifications_cleared.png') });
        console.log("Saved screenshot_guardian_4_notifications_cleared.png");

        // 4. Sidebar: My Residents Page
        console.log("4. Verifying My Residents Page...");
        await page.goto('http://127.0.0.1:5173/dashboard/guardian/guardians.html', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));

        await page.screenshot({ path: path.join(__dirname, 'screenshot_guardian_2_residents.png') });
        console.log("Saved screenshot_guardian_2_residents.png");

        // 5. Sidebar: Emergency Alerts Page
        console.log("5. Verifying Emergency Alerts Page...");
        await page.goto('http://127.0.0.1:5173/dashboard/guardian/emergency.html', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));

        await page.screenshot({ path: path.join(__dirname, 'screenshot_guardian_3_emergency.png') });
        console.log("Saved screenshot_guardian_3_emergency.png");

        console.log("All Guardian Dashboard tests completed successfully!");
    } catch (e) {
        console.error("Guardian Test Error:", e);
    } finally {
        await browser.close();
    }
})();
