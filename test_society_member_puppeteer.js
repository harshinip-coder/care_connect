const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log("Starting Society Member Dashboard Puppeteer Test...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        page.on('console', msg => console.log('SOCIETY MEMBER LOG:', msg.text()));
        page.on('response', resp => {
            if (resp.status() >= 400 && !resp.url().includes('favicon')) {
                console.log(`HTTP ${resp.status()} on ${resp.url()}`);
            }
        });

        // 1. Login as Society Member Gojo@2008
        console.log("1. Logging in as satoru Gojo...");
        await page.goto('http://127.0.0.1:5173/index.html', { waitUntil: 'networkidle2' });
        await page.type('#usernameInput', 'Gojo@2008');
        await page.type('#passwordInput', 'pass123');
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
        ]);

        // 2. Society Member Dashboard
        console.log("2. Verifying Society Member Dashboard...");
        await page.goto('http://127.0.0.1:5173/dashboard/society_member/society_member.html', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(__dirname, 'screenshot_society_member_dashboard.png') });
        console.log("Saved screenshot_society_member_dashboard.png");

        // 3. Test Sidebar Links
        const pagesToTest = [
            { name: "Profile", url: "http://127.0.0.1:5173/dashboard/society_member/profile.html", file: "screenshot_sm_profile.png" },
            { name: "Residents", url: "http://127.0.0.1:5173/dashboard/society_member/residents.html", file: "screenshot_sm_residents.png" },
            { name: "Guardians", url: "http://127.0.0.1:5173/dashboard/society_member/guardians.html", file: "screenshot_sm_guardians.png" },
            { name: "Society", url: "http://127.0.0.1:5173/dashboard/society_member/society.html", file: "screenshot_sm_society.png" },
            { name: "Blocks", url: "http://127.0.0.1:5173/dashboard/society_member/blocks.html", file: "screenshot_sm_blocks.png" },
            { name: "Flats", url: "http://127.0.0.1:5173/dashboard/society_member/flats.html", file: "screenshot_sm_flats.png" },
            { name: "Security", url: "http://127.0.0.1:5173/dashboard/society_member/security.html", file: "screenshot_sm_security.png" },
            { name: "Volunteers", url: "http://127.0.0.1:5173/dashboard/society_member/volunteers.html", file: "screenshot_sm_volunteers.png" },
            { name: "Emergency Alerts", url: "http://127.0.0.1:5173/dashboard/society_member/emergency.html", file: "screenshot_sm_emergency.html.png" },
        ];

        for (const item of pagesToTest) {
            console.log(`Testing sidebar link: ${item.name} (${item.url})...`);
            await page.goto(item.url, { waitUntil: 'networkidle2' });
            await new Promise(r => setTimeout(r, 1200));
            await page.screenshot({ path: path.join(__dirname, item.file) });
            console.log(`Saved ${item.file}`);
        }

        console.log("All Society Member tests completed successfully!");
    } catch (e) {
        console.error("Society Member Test Error:", e);
    } finally {
        await browser.close();
    }
})();
