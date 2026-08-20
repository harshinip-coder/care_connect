const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = "C:/Users/harsh/.gemini/antigravity/brain/422d07ed-1230-4e85-b9ec-923e89787e45";

(async () => {
    console.log("==================================================");
    console.log("DEBUGGING LIVE RESIDENT DASHBOARD IN PUPPETEER");
    console.log("==================================================");

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });

        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

        // 1. Perform login via fetch in browser context to set session cookie
        console.log("1. Performing API login for Deepan...");
        await page.goto('http://127.0.0.1:5173/index.html', { waitUntil: 'load', timeout: 5000 }).catch(() => {});
        
        const loginRes = await page.evaluate(async () => {
            const res = await fetch('http://127.0.0.1:8000/api/auth/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'Deepan', password: 'Harshini@2008' }),
                credentials: 'include'
            });
            const data = await res.json().catch(() => ({}));
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            return { status: res.status, data };
        });

        console.log("Login API result:", loginRes);

        // 2. Open Resident Dashboard directly
        console.log("2. Navigating to Resident Dashboard...");
        await page.goto('http://127.0.0.1:5173/dashboard/resident/resident.html', { waitUntil: 'load', timeout: 5000 }).catch(() => {});
        
        console.log("3. Triggering initCommunityCounts manually in page context...");
        await page.evaluate(async () => {
            if (typeof initCommunityCounts === 'function') {
                await initCommunityCounts();
            }
        });

        await new Promise(r => setTimeout(r, 2500));

        const renderedCounts = await page.evaluate(() => {
            return {
                residents: document.getElementById('residentCount')?.textContent?.trim(),
                guardians: document.getElementById('guardianCount')?.textContent?.trim(),
                volunteers: document.getElementById('volunteerCount')?.textContent?.trim(),
                security: document.getElementById('securityCount')?.textContent?.trim(),
                alerts: document.getElementById('activeAlertCount')?.textContent?.trim()
            };
        });

        console.log("Rendered DOM Counts in Live Browser:", renderedCounts);

        const shotLocal = path.join(__dirname, 'live_puppeteer_resident_dashboard.png');
        const shotArt = path.join(ARTIFACT_DIR, 'live_puppeteer_resident_dashboard.png');
        
        await page.screenshot({ path: shotLocal });
        fs.copyFileSync(shotLocal, shotArt);
        
        console.log("Saved Live Puppeteer Screenshot to:", shotArt);
        console.log("==================================================");

    } catch (e) {
        console.error("Puppeteer Capture Error:", e);
    } finally {
        await browser.close();
    }
})();
