const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/harsh/.gemini/antigravity/brain/a0e6334c-420e-47b0-a856-68816b419be3';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const testAccounts = [
    { name: 'Resident', username: 'Deepan', password: 'Harshini@2008', expectedPath: '/dashboard/resident/resident.html', screenshot: 'login_verified_resident_deepan.png' },
    { name: 'Primary Guardian', username: 'Palanisamy', password: 'Harshini@2008', expectedPath: '/dashboard/guardian/guardian.html', screenshot: 'login_verified_guardian_palanisamy.png' },
    { name: 'Secondary Guardian', username: 'Kavitha', password: 'Harshini@2008', expectedPath: '/dashboard/guardian/guardian.html', screenshot: 'login_verified_guardian_kavitha.png' },
    { name: 'Security Personnel', username: 'Gojo', password: 'Harshini@2008', expectedPath: '/dashboard/security/security.html', screenshot: 'login_verified_security_gojo.png' },
    { name: 'Volunteer', username: 'ShinChan', password: 'Jinwoo@2008', expectedPath: '/dashboard/volunteer/volunteer.html', screenshot: 'login_verified_volunteer_shinchan.png' },
    { name: 'Society Member', username: 'Jinwoo', password: 'Gojo@2008', expectedPath: '/dashboard/society_member/society_member.html', screenshot: 'login_verified_society_member_jinwoo.png' },
    { name: 'Superuser Admin', username: 'Harshini', password: 'Harshini@2008', expectedPath: '/dashboard/admin/admin.html', screenshot: 'login_verified_admin_harshini.png' },
];

(async () => {
    console.log('🚀 Starting Puppeteer Verification for ALL CareConnect Roles...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    let passCount = 0;

    try {
        for (const account of testAccounts) {
            console.log(`\n==================================================`);
            console.log(`Testing Login for Role: ${account.name} (Username: ${account.username})...`);
            
            const page = await browser.newPage();
            await page.setViewport({ width: 1440, height: 900 });

            // Clear cookies & storage
            const client = await page.target().createCDPSession();
            await client.send('Network.clearBrowserCookies');
            await client.send('Network.clearBrowserCache');

            await page.goto('http://127.0.0.1:5173/index.html', { waitUntil: 'networkidle2' });

            // Fill form
            await page.type('#usernameInput', account.username);
            await page.type('#passwordInput', account.password);
            
            // Submit form
            await page.click('button[type="submit"]');

            // Wait for navigation or URL change
            await sleep(3000);

            const currentUrl = page.url();
            console.log(`Current URL after login: ${currentUrl}`);

            const screenshotPath = path.join(ARTIFACT_DIR, account.screenshot);
            await page.screenshot({ path: screenshotPath });

            if (currentUrl.includes(account.expectedPath)) {
                console.log(`✅ SUCCESS: ${account.name} logged in successfully and redirected to ${account.expectedPath}!`);
                passCount++;
            } else {
                console.error(`❌ FAILED: ${account.name} login failed or did not redirect to ${account.expectedPath}. Current URL: ${currentUrl}`);
            }

            await page.close();
        }

        console.log(`\n==================================================`);
        console.log(`RESULT: ${passCount} / ${testAccounts.length} Roles Verified Successfully!`);
        console.log(`==================================================`);

    } catch (err) {
        console.error('❌ Puppeteer Execution Error:', err);
    } finally {
        await browser.close();
    }
})();
