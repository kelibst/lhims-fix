// Test the OLD endpoint that was in the extraction script
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

  console.log('✓ Login successful\n');
  await page.waitForTimeout(1000);

  const patients = [
    { no: 'VR-A01-AAA2142', status: 'SUCCESSFUL (extracted before)' },
    { no: 'VR-A01-AAA0090', status: 'FAILED (should exist)' },
  ];

  for (const patient of patients) {
    console.log('='.repeat(70));
    console.log(`Testing: ${patient.no} (${patient.status})`);
    console.log('='.repeat(70));

    try {
      // Test OLD endpoint (searchPatientResult.php)
      console.log('\n1. OLD ENDPOINT (searchPatientResult.php):');
      const oldResponse = await page.evaluate(async (patientNo) => {
        const formData = new URLSearchParams();
        formData.append('fnam', '');
        formData.append('pregno', patientNo);
        formData.append('InputPatientClinicSrting', '');
        formData.append('InputPatientClinic', '');
        formData.append('area', '');
        formData.append('iPatientID', '');

        const res = await fetch('http://10.10.0.59/lhims_182/searchPatientResult.php', {
          method: 'POST',
          body: formData
        });

        return await res.text();
      }, patient.no);

      console.log(`   Response length: ${oldResponse.length} chars`);
      console.log(`   First 200 chars: ${oldResponse.substring(0, 200)}`);

      const oldMatch = oldResponse.match(/patient_id=(\d+)/);
      if (oldMatch) {
        console.log(`   ✓ Patient ID found: ${oldMatch[1]}`);
      } else {
        console.log(`   ✗ Patient ID NOT found`);
      }

      // Test NEW endpoint (ajaxPatientManager.php)
      console.log('\n2. NEW ENDPOINT (ajaxPatientManager.php):');
      const newResponse = await page.evaluate(async (patientNo) => {
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

      console.log(`   Response length: ${newResponse.length} chars`);
      console.log(`   Response: ${newResponse}`);

      const newMatch = newResponse.match(/patient_id=(\d+)/);
      if (newMatch) {
        console.log(`   ✓ Patient ID found: ${newMatch[1]}`);
      } else {
        console.log(`   ✗ Patient ID NOT found`);
      }

      console.log('');

    } catch (error) {
      console.error('Error:', error.message);
    }
  }

  await page.waitForTimeout(2000);
  await browser.close();
}

testPatients();
