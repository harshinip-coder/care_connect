const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure().errorText));
    page.on('response', async res => {
        if (res.url().includes('/api/')) {
            console.log('API RES:', res.url(), res.status());
            try {
                const text = await res.text();
                console.log('BODY:', text.substring(0, 300));
            } catch(e){}
        }
    });

    console.log('--- Navigating to Login ---');
    await page.goto('http://localhost:5173/index.html');
    await page.type('#usernameInput', 'Palanisamy');
    await page.type('#passwordInput', 'Harshini@2008');
    await page.click('button[type="submit"]');
    
    await new Promise(r => setTimeout(r, 2500));
    console.log('Current URL after login:', page.url());

    await page.screenshot({ path: 'test_guardian_palanisamy.png' });

    console.log('--- Navigating to My Residents ---');
    await page.goto('http://localhost:5173/dashboard/guardian/guardians.html');
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: 'test_residents_palanisamy.png' });

    console.log('--- Navigating to Emergency Alerts ---');
    await page.goto('http://localhost:5173/dashboard/guardian/emergency.html');
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: 'test_emergency_palanisamy.png' });

    await browser.close();
})().catch(e => console.error('SCRIPT ERROR:', e));
