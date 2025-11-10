// Quick test to see why a patient failed
const { chromium } = require('playwright');

async function testPatient() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Login
  await page.goto('http://10.10.0.59/lhims_182/login.php');
  await page.fill('input[name="username"]', 'sno-411');
  await page.fill('input[name="password"]', 'monamourd11');

  // Submit and wait for navigation
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('input[name="submit"]')
  ]);

  console.log('✓ Login successful');
  await page.waitForTimeout(1000);

  // Test patient VR-A01-AAA0090 (one that failed)
  const patientNo = 'VR-A01-AAA0090';
  console.log(`Testing patient: ${patientNo}`);

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
    }, patientNo);

    console.log('Response:', response);

    // Try to extract patient ID
    const match = response.match(/patient_id=(\d+)/);
    if (match) {
      console.log('Patient ID found:', match[1]);
    } else {
      console.log('Patient ID NOT found in response');
      console.log('This patient probably does not exist in LHIMS');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }

  await page.waitForTimeout(2000);
  await browser.close();
}

testPatient();
