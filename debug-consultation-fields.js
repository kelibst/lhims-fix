/**
 * Debug script to check consultation field names
 */

const { chromium } = require('playwright');

const CONFIG = {
  lhimsUrl: 'http://10.10.0.59/lhims_182',
  loginUrl: 'http://10.10.0.59/lhims_182/login.php',
  credentials: {
    username: 'sno-411',
    password: 'monamourd11',
  },
};

async function debug() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Login
  await page.goto(CONFIG.loginUrl);
  await page.fill('input[name="username"]', CONFIG.credentials.username);
  await page.fill('input[name="password"]', CONFIG.credentials.password);
  await Promise.all([
    page.waitForNavigation(),
    page.click('input[name="submit"]'),
  ]);

  // Test patient with consultations
  const patientId = '2239'; // VR-A01-AAA2142

  const consultations = await page.evaluate(async (patientId) => {
    const formData = new URLSearchParams();
    formData.append('_isAjax', 'true');
    formData.append('iPatientID', patientId);
    formData.append('draw', '1');
    formData.append('start', '0');
    formData.append('length', '1000');

    const res = await fetch('http://10.10.0.59/lhims_182/getDynamicPatientEncounterDetails.php', {
      method: 'POST',
      body: formData
    });

    const text = await res.text();
    const result = JSON.parse(text);
    return result.data || [];
  }, patientId);

  console.log('\n=== CONSULTATION DATA ===');
  console.log(`Total consultations: ${consultations.length}`);

  if (consultations.length > 0) {
    console.log('\n=== FIRST CONSULTATION (RAW) ===');
    const firstConsultation = consultations[0];
    console.log(JSON.stringify(firstConsultation, null, 2));

    console.log('\n=== FIELD BREAKDOWN ===');
    console.log('[0] = ', firstConsultation[0], ' (likely Schedule ID)');
    console.log('[1] = ', firstConsultation[1], ' (Date)');
    console.log('[2] = ', firstConsultation[2], ' (Department)');
    console.log('[3] = ', firstConsultation[3], ' (Service)');
    console.log('[4] = ', firstConsultation[4].substring(0, 100), '... (HTML link)');
    console.log('[9] = ', firstConsultation[9], ' (Service ID)');

    console.log('\n=== EXTRACTED IDS ===');
    // Try to extract schedule ID from HTML
    const html = firstConsultation[4];
    const scheduleMatch = html.match(/data-schedule-id='(\d+)'/);
    const serviceMatch = html.match(/data-service-id='(\d+)'/);

    console.log('Schedule ID from HTML:', scheduleMatch ? scheduleMatch[1] : 'NOT FOUND');
    console.log('Service ID from HTML:', serviceMatch ? serviceMatch[1] : 'NOT FOUND');
    console.log('Service ID from field [9]:', firstConsultation[9]);
  }

  await browser.close();
}

debug().catch(console.error);
