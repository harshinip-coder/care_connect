const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = "C:/Users/harsh/.gemini/antigravity/brain/515ca440-6990-4888-8335-7151409bbaef";

(async () => {
    console.log("==========================================");
    console.log("CARECONNECT — E2E PUPPETEER AUTOMATION TEST");
    console.log("==========================================");

    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Listen to network requests & responses
    page.on('response', async response => {
        const url = response.url();
        if (url.includes('/api/emergency/')) {
            try {
                const status = response.status();
                const text = await response.text();
                console.log(`[API RESPONSE] ${status} -> ${url}`);
                console.log(`               BODY: ${text.slice(0, 300)}`);
            } catch (e) {}
        }
    });

    // Handle all browser alert/confirm dialogs automatically
    page.on('dialog', async dialog => {
        console.log(`[BROWSER DIALOG] Type: "${dialog.type()}" | Message: "${dialog.message()}"`);
        await dialog.accept();
    });

    try {
        console.log("\nSTEP 1: Navigating to Login Page (http://127.0.0.1:5173/index.html)...");
        await page.goto("http://127.0.0.1:5173/index.html", { waitUntil: "networkidle2" });

        console.log("STEP 2: Logging in as Resident 'Deepan'...");
        await page.type("#usernameInput", "Deepan");
        await page.type("#passwordInput", "Harshini@2008");

        await Promise.all([
            page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {}),
            page.click("#loginForm button[type='submit']")
        ]);

        console.log(` -> Current URL after login: ${page.url()}`);
        const screenshot1 = path.join(ARTIFACT_DIR, "step1_logged_in.png");
        await page.screenshot({ path: screenshot1 });
        console.log(` -> Saved screenshot: step1_logged_in.png`);

        console.log("\nSTEP 3: Navigating to Resident Emergency Page...");
        await page.goto("http://127.0.0.1:5173/dashboard/resident/emergency.html", { waitUntil: "networkidle2" });
        await new Promise(r => setTimeout(r, 1000));

        console.log("STEP 4: Opening SOS Category Modal & Triggering Send SOS...");
        // Click "Trigger New SOS" button
        const triggerBtn = await page.$("button[onclick*='triggerOneTapSOS'], button[onclick*='promptSosConfirmation']");
        if (triggerBtn) {
            await triggerBtn.click();
            await new Promise(r => setTimeout(r, 500));
        } else {
            await page.evaluate(() => promptSosConfirmation());
            await new Promise(r => setTimeout(r, 500));
        }

        // If emergency details modal opened, click Continue
        const continueBtn = await page.$("#sosDetailsModal button[onclick*='proceedToSosConfirmation']");
        if (continueBtn) {
            await continueBtn.click();
            await new Promise(r => setTimeout(r, 500));
        }

        // Click "Send SOS" button
        console.log(" -> Clicking 'Send SOS' button...");
        await page.evaluate(() => {
            const sendBtn = document.getElementById("sosSendBtn");
            if (sendBtn) sendBtn.click();
            else sendRealSosAlert("Medical Emergency", "Puppeteer E2E Emergency Test");
        });

        await new Promise(r => setTimeout(r, 2000));

        const screenshot2 = path.join(ARTIFACT_DIR, "step2_sos_active.png");
        await page.screenshot({ path: screenshot2 });
        console.log(` -> Saved screenshot: step2_sos_active.png`);

        // Check if banner is visible
        const bannerVisible = await page.evaluate(() => {
            const b = document.getElementById("liveSosStatusBanner");
            return b ? b.style.display !== "none" : false;
        });
        console.log(` -> Live SOS Banner Active in DOM: ${bannerVisible}`);

        console.log("\nSTEP 5: Clicking 'Cancel SOS' Button...");
        await page.evaluate(() => {
            if (typeof cancelActiveSOS === "function") {
                cancelActiveSOS();
            }
        });

        await new Promise(r => setTimeout(r, 2000));

        const screenshot3 = path.join(ARTIFACT_DIR, "step3_sos_cancelled.png");
        await page.screenshot({ path: screenshot3 });
        console.log(` -> Saved screenshot: step3_sos_cancelled.png`);

        const bannerAfterCancel = await page.evaluate(() => {
            const b = document.getElementById("liveSosStatusBanner");
            return b ? b.style.display !== "none" : false;
        });
        console.log(` -> Live SOS Banner Active after Cancel: ${bannerAfterCancel}`);

        console.log("\n==========================================");
        console.log("TEST VERIFICATION RESULT:");
        console.log(`- SOS Triggered Successfully: ${bannerVisible ? "PASS ✅" : "FAIL ❌"}`);
        console.log(`- SOS Cancelled Cleanly: ${!bannerAfterCancel ? "PASS ✅" : "FAIL ❌"}`);
        console.log("==========================================");

    } catch (err) {
        console.error("Test execution failed:", err);
    } finally {
        await browser.close();
    }
})();
