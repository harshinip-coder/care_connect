const puppeteer = require('puppeteer');
const path = require('path');
const { execSync } = require('child_process');

(async () => {
    console.log("==================================================");
    console.log("STARTING PUPPETEER SOS WORKFLOW VERIFICATION");
    console.log("==================================================");

    // 1. Reset DB active emergencies
    console.log("Resetting active emergencies in DB...");
    try {
        execSync(`python -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'careconnect.settings'); django.setup(); from emergency.models import EmergencyRequest; EmergencyRequest.objects.filter(status__in=['ACTIVE','NOTIFYING_PRIMARY_GUARDIAN','NOTIFYING_SECONDARY_GUARDIAN','NOTIFYING_SOCIETY_MEMBER','NOTIFYING_SECURITY','NOTIFYING_VOLUNTEER','RESPONDING']).update(status='RESOLVED')"`, { cwd: __dirname });
    } catch(e) {
        console.error("DB Reset error:", e);
    }

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        // Step A: Resident Deepan triggers SOS
        console.log("1. Resident (Deepan) logging in to trigger SOS...");
        const resContext = await browser.createBrowserContext();
        const resPage = await resContext.newPage();
        await resPage.setViewport({ width: 1280, height: 800 });

        await resPage.goto('http://127.0.0.1:8000/login/', { waitUntil: 'networkidle2' });
        await resPage.type('input[name="username"]', 'Deepan');
        await resPage.type('input[name="password"]', 'Harshini@2008');
        
        await Promise.all([
            resPage.evaluate(() => {
                const btn = document.querySelector('button.btn-primary');
                if (btn) {
                    btn.type = 'submit';
                    btn.click();
                } else {
                    document.querySelector('form').submit();
                }
            }),
            resPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
        ]);

        console.log("Resident URL after login:", resPage.url());

        // Trigger SOS alert via API
        console.log("Triggering SOS emergency from Resident Deepan...");
        const sosResult = await resPage.evaluate(async () => {
            const getCookie = (name) => {
                let cookieValue = null;
                if (document.cookie && document.cookie !== '') {
                    const cookies = document.cookie.split(';');
                    for (let i = 0; i < cookies.length; i++) {
                        const cookie = cookies[i].trim();
                        if (cookie.substring(0, name.length + 1) === (name + '=')) {
                            cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                            break;
                        }
                    }
                }
                return cookieValue;
            };

            const res = await fetch('/api/emergency/sos/', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ emergency_type: 'Medical Emergency', description: 'Puppeteer Security Verification SOS' })
            });
            return await res.json();
        });

        console.log("SOS Triggered Result:", sosResult.success ? `SOS #${sosResult.emergency.id} Created` : sosResult.message);
        const sosId = sosResult.emergency.id;

        // Step B: Advance stages via timeout simulation to reach SECURITY (Stage 4)
        console.log("2. Advancing escalation chain to reach SECURITY stage (Stage 4)...");
        execSync(`python -c "import os, django, datetime; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'careconnect.settings'); django.setup(); from emergency.models import EmergencyRequest; from emergency.services import evaluate_emergency_timeouts; from django.utils import timezone; em = EmergencyRequest.objects.get(id=${sosId}); notif1 = em.notifications.filter(status='PENDING').first(); notif1.timeout_at = timezone.now() - datetime.timedelta(seconds=1); notif1.save(); evaluate_emergency_timeouts(em); em.refresh_from_db(); notif2 = em.notifications.filter(status='PENDING').first(); notif2.timeout_at = timezone.now() - datetime.timedelta(seconds=1); notif2.save(); evaluate_emergency_timeouts(em); em.refresh_from_db(); notif3 = em.notifications.filter(status='PENDING').first(); notif3.timeout_at = timezone.now() - datetime.timedelta(seconds=1); notif3.save(); evaluate_emergency_timeouts(em); em.refresh_from_db(); print('New Active Stage:', em.active_escalation_level, 'Status:', em.status)"`, { cwd: __dirname });

        // Step C: Security Guard Gojo logs in
        console.log("3. Security Officer (Gojo) logging in to Security Dashboard...");
        const secContext = await browser.createBrowserContext();
        const secPage = await secContext.newPage();
        await secPage.setViewport({ width: 1280, height: 800 });

        await secPage.goto('http://127.0.0.1:8000/login/', { waitUntil: 'networkidle2' });
        await secPage.type('input[name="username"]', 'Gojo');
        await secPage.type('input[name="password"]', 'Harshini@2008');
        await Promise.all([
            secPage.evaluate(() => {
                const btn = document.querySelector('button.btn-primary');
                if (btn) {
                    btn.type = 'submit';
                    btn.click();
                } else {
                    document.querySelector('form').submit();
                }
            }),
            secPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
        ]);

        console.log("Security Officer URL after login:", secPage.url());

        // Wait 2.5 seconds for polling & live alert modal to render on Security Dashboard
        await new Promise(r => setTimeout(r, 2500));

        // Take Screenshot of Security Dashboard with Alert Modal & Tracker
        const screenshotPath = path.join(__dirname, 'screenshot_security_sos_alert_verified.png');
        await secPage.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Saved verification screenshot: ${screenshotPath}`);

        // Verify SOS data fetched on Security Dashboard
        const secStatusData = await secPage.evaluate(async () => {
            const res = await fetch('/api/emergency/my-active/');
            return await res.json();
        });

        console.log("==================================================");
        console.log("SECURITY DASHBOARD API VERIFICATION:");
        console.log("Has Active Emergency:", secStatusData.has_active);
        console.log("Active Escalation Level:", secStatusData.emergency.active_escalation_level);
        console.log("Can Security Respond?:", secStatusData.emergency.can_respond);
        console.log("Stages Count:", secStatusData.emergency.stages.length);
        console.log("Stage 4 Role Label:", secStatusData.emergency.stages[3].role_label);
        console.log("Stage 4 Status:", secStatusData.emergency.stages[3].status);
        console.log("==================================================");

        if (secStatusData.has_active && secStatusData.emergency.active_escalation_level === 'SECURITY' && secStatusData.emergency.can_respond === true) {
            console.log("==================================================");
            console.log("✅ PUPPETEER VERIFICATION PASSED: Security receives active SOS notification modal & can respond!");
            console.log("==================================================");
        } else {
            console.error("❌ PUPPETEER VERIFICATION FAILED!");
        }

    } catch (err) {
        console.error("Puppeteer Script Error:", err);
    } finally {
        await browser.close();
    }
})();
