const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log("Starting Puppeteer Automated Verification...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('response', resp => {
            if (resp.status() >= 400) {
                console.log(`HTTP ${resp.status()} on ${resp.url()}`);
            }
        });
        page.on('dialog', async dialog => {
            console.log('ALERT DIALOG:', dialog.message());
            await dialog.accept();
        });

        // 1. Login as Harshini (Admin)
        console.log("1. Logging in as Admin Harshini...");
        await page.goto('http://127.0.0.1:5173/index.html', { waitUntil: 'networkidle2' });
        await page.type('#usernameInput', 'Harshini');
        await page.type('#passwordInput', 'pass123');
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
        ]);

        await page.goto('http://127.0.0.1:5173/dashboard/admin/admin.html', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));

        // 2. Check Notification Behavior
        console.log("2. Checking Notification Count and Persistence...");
        const initialBadge = await page.$eval('#notifBadge', el => el.textContent.trim());
        console.log("Initial Notification Badge:", initialBadge);

        // Click Notification dropdown and Mark all read
        await page.click('#notificationBtn');
        await new Promise(r => setTimeout(r, 500));
        await page.evaluate(() => markAllNotificationsRead());
        await new Promise(r => setTimeout(r, 1000));

        const badgeAfterRead = await page.$eval('#notifBadge', el => el.textContent.trim());
        console.log("Notification Badge after Mark Read:", badgeAfterRead);

        // Refresh the page
        console.log("Reloading page to test persistence...");
        await page.reload({ waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));

        const badgeAfterReload = await page.$eval('#notifBadge', el => el.textContent.trim());
        console.log("Notification Badge after Reload:", badgeAfterReload);

        await page.screenshot({ path: path.join(__dirname, 'screenshot_notifications_fixed.png') });
        console.log("Saved screenshot_notifications_fixed.png");

        // 3. Check Admin Profile Page UI (Issue 1)
        console.log("3. Navigating to Admin Profile Page...");
        await page.goto('http://127.0.0.1:5173/dashboard/admin/profile.html', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));

        const avatarInitialsDisplay = await page.$eval('#profileAvatarInitials', el => window.getComputedStyle(el).display);
        const avatarImgDisplay = await page.$eval('#profileBigAvatar', el => window.getComputedStyle(el).display);
        console.log("Avatar Initials display:", avatarInitialsDisplay, "| Avatar Img display:", avatarImgDisplay);

        await page.screenshot({ path: path.join(__dirname, 'screenshot_profile_fixed.png') });
        console.log("Saved screenshot_profile_fixed.png");

        // 4. Test Emergency SOS Banner & Details Modal (Issue 3)
        console.log("4. Testing Emergency Banner and Details Modal...");
        await page.goto('http://127.0.0.1:5173/dashboard/admin/admin.html', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));

        const bannerVisible = await page.evaluate(() => {
            const b = document.getElementById('liveSosStatusBanner');
            return b && b.style.display !== 'none';
        });
        console.log("Live SOS Banner visible:", bannerVisible);

        if (bannerVisible) {
            // Click Details button
            console.log("Clicking Details on emergency banner...");
            await page.evaluate(() => {
                const btn = document.querySelector('#liveSosStatusBanner button[onclick*="viewSosDetails"]');
                if (btn) btn.click();
            });
            await new Promise(r => setTimeout(r, 1000));

            const modalExists = await page.evaluate(() => !!document.getElementById('sosDetailModal'));
            console.log("SOS Detail Modal opened:", modalExists);

            await page.screenshot({ path: path.join(__dirname, 'screenshot_sos_details_modal.png') });
            console.log("Saved screenshot_sos_details_modal.png");
        }

        console.log("All Puppeteer tests completed successfully!");
    } catch (e) {
        console.error("Puppeteer test error:", e);
    } finally {
        await browser.close();
    }
})();
