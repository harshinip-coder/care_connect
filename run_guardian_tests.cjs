const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log('=== Starting CareConnect Guardian Puppeteer Verification ===');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    page.on('console', msg => {
        if (msg.type() === 'error' || msg.text().includes('Error')) {
            console.log('[BROWSER CONSOLE ERROR]:', msg.text());
        }
    });

    page.on('pageerror', err => console.log('[BROWSER PAGE ERROR]:', err.toString()));

    // ----------------------------------------------------
    // TEST 1: Guardian Palanisamy M
    // ----------------------------------------------------
    console.log('\n--- 1. Testing Guardian Palanisamy M ---');
    await page.goto('http://localhost:5173/index.html');
    await page.waitForSelector('#usernameInput');
    await page.type('#usernameInput', 'Palanisamy');
    await page.type('#passwordInput', 'Harshini@2008');
    await page.click('button[type="submit"]');

    await new Promise(r => setTimeout(r, 2000));
    console.log('Logged in as Palanisamy. Current URL:', page.url());

    // 1.1 Palanisamy Dashboard
    await page.goto('http://localhost:5173/dashboard/guardian/guardian.html');
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'guardian_dashboard_palanisamy.png', fullPage: false });
    console.log('Saved screenshot: guardian_dashboard_palanisamy.png');

    // 1.2 Palanisamy My Residents
    await page.goto('http://localhost:5173/dashboard/guardian/guardians.html');
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'guardian_residents_palanisamy.png', fullPage: false });
    console.log('Saved screenshot: guardian_residents_palanisamy.png');

    // 1.3 Palanisamy Emergency Alerts (Active Tab)
    await page.goto('http://localhost:5173/dashboard/guardian/emergency.html');
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'guardian_emergency_active_palanisamy.png', fullPage: false });
    console.log('Saved screenshot: guardian_emergency_active_palanisamy.png');

    // 1.4 Palanisamy Emergency Alerts (History Tab)
    const historyTabBtn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('.tab-btn'));
        const hBtn = btns.find(b => b.textContent.trim().toUpperCase() === 'HISTORY');
        if (hBtn) {
            hBtn.click();
            return true;
        }
        return false;
    });
    console.log('Clicked History tab:', historyTabBtn);
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'guardian_emergency_history_palanisamy.png', fullPage: false });
    console.log('Saved screenshot: guardian_emergency_history_palanisamy.png');

    // ----------------------------------------------------
    // TEST 2: Guardian Kavitha P
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Guardian Kavitha P ---');
    await page.goto('http://localhost:5173/index.html');
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    await page.goto('http://localhost:5173/index.html');
    await page.waitForSelector('#usernameInput');
    await page.type('#usernameInput', 'Kavitha');
    await page.type('#passwordInput', 'Harshini@2008');
    await page.click('button[type="submit"]');

    await new Promise(r => setTimeout(r, 2000));
    console.log('Logged in as Kavitha. Current URL:', page.url());

    // 2.1 Kavitha Dashboard
    await page.goto('http://localhost:5173/dashboard/guardian/guardian.html');
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'guardian_dashboard_kavitha.png', fullPage: false });
    console.log('Saved screenshot: guardian_dashboard_kavitha.png');

    // 2.2 Kavitha My Residents
    await page.goto('http://localhost:5173/dashboard/guardian/guardians.html');
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'guardian_residents_kavitha.png', fullPage: false });
    console.log('Saved screenshot: guardian_residents_kavitha.png');

    // 2.3 Kavitha Emergency Alerts (Active Tab)
    await page.goto('http://localhost:5173/dashboard/guardian/emergency.html');
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'guardian_emergency_active_kavitha.png', fullPage: false });
    console.log('Saved screenshot: guardian_emergency_active_kavitha.png');

    // 2.4 Kavitha Emergency Alerts (History Tab)
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('.tab-btn'));
        const hBtn = btns.find(b => b.textContent.trim().toUpperCase() === 'HISTORY');
        if (hBtn) hBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'guardian_emergency_history_kavitha.png', fullPage: false });
    console.log('Saved screenshot: guardian_emergency_history_kavitha.png');

    await browser.close();
    console.log('\n=== All Guardian verification screenshots successfully captured! ===');
})().catch(e => console.error('PUPPETEER ERROR:', e));
