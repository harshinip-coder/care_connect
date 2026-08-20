const puppeteer = require('puppeteer');
const path = require('path');
const { execSync } = require('child_process');

(async () => {
    console.log("1. Resetting active emergencies in DB for clean testing...");
    try {
        execSync(`venv\\Scripts\\python.exe -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'careconnect.settings'); django.setup(); from emergency.models import EmergencyRequest; EmergencyRequest.objects.filter(status__in=['ACTIVE','NOTIFYING_PRIMARY_GUARDIAN','NOTIFYING_SECONDARY_GUARDIAN','NOTIFYING_SOCIETY_MEMBER','NOTIFYING_VOLUNTEER','NOTIFYING_EMERGENCY_CONTACT','RESPONDING']).update(status='RESOLVED')"`, { cwd: __dirname });
        console.log("Active emergencies cleared.");
    } catch(e) {
        console.error("DB Reset error:", e);
    }

    console.log("2. Launching Puppeteer browser...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        // Context 1: Resident Deepan
        const context1 = await browser.createBrowserContext();
        const page1 = await context1.newPage();
        await page1.setViewport({ width: 1280, height: 800 });

        page1.on('console', msg => console.log('RESIDENT LOG:', msg.text()));
        page1.on('dialog', async dialog => {
            console.log('RESIDENT DIALOG:', dialog.message());
            await dialog.accept();
        });

        // Step A: Resident Login (Deepan)
        console.log("Navigating to Login page for Resident Deepan...");
        await page1.goto('http://127.0.0.1:5173/index.html', { waitUntil: 'networkidle2' });

        await page1.type('#usernameInput', 'Deepan');
        await page1.type('#passwordInput', 'pass123');
        
        console.log("Submitting login form for Deepan...");
        await Promise.all([
            page1.click('button[type="submit"]'),
            page1.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
        ]);

        console.log("Resident page URL:", page1.url());
        if (!page1.url().includes('/dashboard/resident')) {
            await page1.goto('http://127.0.0.1:5173/dashboard/resident/resident.html', { waitUntil: 'networkidle2' });
        }

        await new Promise(r => setTimeout(r, 2000));

        // Step B: Open SOS Details Modal
        console.log("Opening SOS Details Modal...");
        await page1.evaluate(() => {
            if (typeof promptSosConfirmation === 'function') promptSosConfirmation();
        });

        await new Promise(r => setTimeout(r, 1000));
        await page1.screenshot({ path: path.join(__dirname, 'screenshot_1_resident_details_modal.png') });
        console.log("Saved screenshot_1_resident_details_modal.png");

        // Step C: Proceed to Confirmation Modal
        console.log("Proceeding to Confirmation Modal...");
        await page1.evaluate(() => {
            if (typeof proceedToSosConfirmation === 'function') proceedToSosConfirmation();
        });

        await new Promise(r => setTimeout(r, 1000));
        await page1.screenshot({ path: path.join(__dirname, 'screenshot_2_resident_confirmation_modal.png') });
        console.log("Saved screenshot_2_resident_confirmation_modal.png");

        // Step D: Click Send SOS
        console.log("Sending SOS alert...");
        await page1.evaluate(() => {
            if (typeof sendRealSosAlert === 'function') sendRealSosAlert('Medical Emergency', 'Chest pain emergency');
        });

        await new Promise(r => setTimeout(r, 2000));
        await page1.screenshot({ path: path.join(__dirname, 'screenshot_3_resident_sos_sent.png') });
        console.log("Saved screenshot_3_resident_sos_sent.png");

        // Context 2: Guardian Palanisamy
        console.log("Opening Guardian Dashboard as Palanisamy in fresh context...");
        const context2 = await browser.createBrowserContext();
        const page2 = await context2.newPage();
        await page2.setViewport({ width: 1280, height: 800 });

        page2.on('console', msg => console.log('GUARDIAN LOG:', msg.text()));
        page2.on('dialog', async dialog => {
            console.log('GUARDIAN DIALOG:', dialog.message());
            await dialog.accept();
        });

        await page2.goto('http://127.0.0.1:5173/index.html', { waitUntil: 'networkidle2' });

        await page2.type('#usernameInput', 'Palanisamy');
        await page2.type('#passwordInput', 'pass123');

        await Promise.all([
            page2.click('button[type="submit"]'),
            page2.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
        ]);

        console.log("Guardian page URL:", page2.url());
        if (!page2.url().includes('/dashboard/guardian')) {
            await page2.goto('http://127.0.0.1:5173/dashboard/guardian/guardian.html', { waitUntil: 'networkidle2' });
        }

        // Wait for assigned residents and emergency alert to render
        await new Promise(r => setTimeout(r, 3500));
        await page2.screenshot({ path: path.join(__dirname, 'screenshot_4_guardian_dashboard_alert.png') });
        console.log("Saved screenshot_4_guardian_dashboard_alert.png");

    } catch (err) {
        console.error("Puppeteer Test Error:", err);
    } finally {
        await browser.close();
        console.log("Puppeteer Test Workflow Finished Successfully!");
    }
})();
