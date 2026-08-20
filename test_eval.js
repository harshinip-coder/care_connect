const puppeteer = require('puppeteer');
const path = require('path');
const { execSync } = require('child_process');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.goto('http://127.0.0.1:5173/index.html', { waitUntil: 'networkidle2' });

        await page.type('#usernameInput', 'Palanisamy');
        await page.type('#passwordInput', 'pass123');

        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
        ]);

        await page.goto('http://127.0.0.1:5173/dashboard/guardian/guardian.html', { waitUntil: 'networkidle2' });

        const resTest = await page.evaluate(async () => {
            try {
                const r = await fetch('/api/guardians/my-residents/', { credentials: 'include' });
                const d = await r.json();
                return { ok: r.ok, status: r.status, data: d, containerHtml: document.getElementById('myResidentsContainer') ? document.getElementById('myResidentsContainer').innerHTML : 'no container' };
            } catch(e) {
                return { error: e.message };
            }
        });
        console.log('Evaluate result:', JSON.stringify(resTest, null, 2));

        // Call fetchAssignedResidents explicitly in page evaluate
        await page.evaluate(async () => {
            if (typeof fetchAssignedResidents === 'function') {
                await fetchAssignedResidents();
            }
        });

        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: path.join(__dirname, 'screenshot_test_residents.png') });
        console.log("Saved screenshot_test_residents.png");

    } catch (err) {
        console.error("Test error:", err);
    } finally {
        await browser.close();
    }
})();
