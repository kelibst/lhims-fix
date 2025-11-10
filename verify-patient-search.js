/**
 * Verification Script: Test Patient Search Fix
 *
 * This script searches for specific patients and shows:
 * 1. What the OLD method would return (first patient_id found)
 * 2. What the NEW method returns (exact match)
 * 3. All patients returned in the search results
 *
 * Usage:
 *   node verify-patient-search.js
 */

const { chromium } = require('playwright');

const CONFIG = {
  lhimsUrl: 'http://10.10.0.59/lhims_182',
  loginUrl: 'http://10.10.0.59/lhims_182/login.php',
  credentials: {
    username: 'sno-411',
    password: 'monamourd11',
  }
};

// Test these patients
const TEST_PATIENTS = [
  'VR-A01-AAA0001',
  'VR-A01-AAA0090',
  'VR-A01-AAA2142',
];

async function verifyPatientSearch() {
  console.log('='.repeat(70));
  console.log('PATIENT SEARCH VERIFICATION');
  console.log('='.repeat(70));
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Login
    console.log('[1/2] Logging into LHIMS...');
    await page.goto(CONFIG.loginUrl);
    await page.fill('input[name="username"]', CONFIG.credentials.username);
    await page.fill('input[name="password"]', CONFIG.credentials.password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('input[name="submit"]'),
    ]);
    console.log('✓ Login successful');
    console.log('');

    // Test each patient
    console.log('[2/2] Testing patient searches...');
    console.log('='.repeat(70));

    for (const patientNo of TEST_PATIENTS) {
      console.log('');
      console.log(`Testing: ${patientNo}`);
      console.log('-'.repeat(70));

      const response = await page.evaluate(async (patientNo) => {
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
      }, patientNo);

      // OLD METHOD: Get first patient_id (WRONG!)
      const oldMatch = response.match(/patient_id[=\s]*['":]?\s*(\d+)/i);
      const oldMethod = oldMatch ? oldMatch[1] : 'NOT FOUND';

      // NEW METHOD: Get patient_id from row containing exact patient number
      let newMethod = 'NOT FOUND';
      const rows = response.split('<tr');
      for (const row of rows) {
        if (row.includes(patientNo)) {
          const match = row.match(/patient_id[=\s]*['":]?\s*(\d+)/i);
          if (match) {
            newMethod = match[1];
            break;
          }
        }
      }

      // Find all patient numbers in response
      const patientRegex = /[A-Z]{2}-[A-Z]\d{2}-[A-Z]{3}\d+/g;
      const foundPatients = response.match(patientRegex) || [];
      const uniquePatients = [...new Set(foundPatients)];

      // Find all patient IDs in response
      const idRegex = /patient_id[=\s]*['":]?\s*(\d+)/gi;
      const allIds = [];
      let match;
      while ((match = idRegex.exec(response)) !== null) {
        allIds.push(match[1]);
      }
      const uniqueIds = [...new Set(allIds)];

      console.log(`  Search Results:`);
      console.log(`    - Patients returned: ${uniquePatients.length}`);
      if (uniquePatients.length > 1) {
        console.log(`      ⚠️  WARNING: Multiple patients found!`);
        uniquePatients.forEach((p, i) => {
          console.log(`      ${i + 1}. ${p}`);
        });
      } else if (uniquePatients.length === 1) {
        console.log(`      ✓ Only exact match: ${uniquePatients[0]}`);
      } else {
        console.log(`      ✗ No patients found in response`);
      }

      console.log('');
      console.log(`  Database IDs found: ${uniqueIds.join(', ')}`);
      console.log('');
      console.log(`  OLD Method (WRONG): ${oldMethod}`);
      console.log(`  NEW Method (FIXED): ${newMethod}`);

      if (oldMethod !== newMethod) {
        console.log('');
        console.log(`  ⚠️  DIFFERENCE DETECTED!`);
        console.log(`  The old method would have extracted WRONG patient data!`);
        console.log(`  The new method correctly finds the exact match.`);
      } else {
        console.log('');
        console.log(`  ✓ Both methods agree (only one patient in results)`);
      }

      console.log('');
      console.log(`  You can verify by manually opening:`);
      console.log(`  http://10.10.0.59/lhims_182/patientRecord.php?patient_id=${newMethod}`);
      console.log(`  and checking if it shows patient: ${patientNo}`);
    }

    console.log('');
    console.log('='.repeat(70));
    console.log('VERIFICATION COMPLETE');
    console.log('='.repeat(70));
    console.log('');
    console.log('Next steps:');
    console.log('1. For each patient tested above, manually open the URL shown');
    console.log('2. Verify the patient number matches what you searched for');
    console.log('3. If all matches are correct, the fix is working!');
    console.log('');
    console.log('Browser will stay open for manual verification.');
    console.log('Press Ctrl+C when you are done to close the browser and exit.');
    console.log('');

    // Keep the browser open until user manually stops the script
    await new Promise(() => {}); // Never resolves, keeps script running

  } catch (error) {
    console.error('');
    console.error('✗ ERROR:', error.message);
    await browser.close();
  }
}

verifyPatientSearch();
