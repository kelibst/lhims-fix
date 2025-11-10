// Test both a successful and failed patient to see the difference
const { chromium } = require('playwright');

async function testPatients() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Login
  await page.goto('http://10.10.0.59/lhims_182/login.php');
  await page.fill('input[name="username"]', 'sno-411');
  await page.fill('input[name="password"]', 'monamourd11');

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('input[name="submit"]')
  ]);

  console.log('✓ Login successful');
  await page.waitForTimeout(1000);

  // Test both patients
  const patients = [
    { no: 'VR-A01-AAA2142', status: 'SUCCESSFUL (extracted before)' },
    { no: 'VR-A01-AAA0090', status: 'FAILED (should exist)' },
  ];

  for (const patient of patients) {
    console.log('\n' + '='.repeat(60));
    console.log(`Testing: ${patient.no} (${patient.status})`);
    console.log('='.repeat(60));

    try {
      const response = await page.evaluate(async (patientNo) => {
        const formData = new URLSearchParams();
        formData.append('sFlag', 'getPatientInfoByFolderNo');
        formData.append('sFolderNo', patientNo);

        const res = await fetch('http://10.10.0.59/lhims_182/ajaxPatientManager.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData
        });

        return await res.text();
      }, patient.no);

      console.log('Response:', response);
      console.log('Response length:', response.length);

      // Try to extract patient ID
      const match = response.match(/patient_id=(\d+)/);
      if (match) {
        console.log('✓ Patient ID found:', match[1]);
      } else {
        console.log('✗ Patient ID NOT found in response');
      }

    } catch (error) {
      console.error('Error:', error.message);
    }
  }

  await page.waitForTimeout(2000);
  await browser.close();
}

testPatients();
