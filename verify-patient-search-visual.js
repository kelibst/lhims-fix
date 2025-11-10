/**
 * Visual Verification Script: Patient Search with Browser Navigation
 *
 * This script actually navigates to the search page in the browser so you can
 * see the search results and verify the correct patient is being selected.
 *
 * Usage:
 *   node verify-patient-search-visual.js
 *
 * Press Ctrl+C when done to exit.
 */

const { chromium } = require('playwright');

const CONFIG = {
  lhimsUrl: 'http://10.10.0.59/lhims_182',
  loginUrl: 'http://10.10.0.59/lhims_182/login.php',
  searchUrl: 'http://10.10.0.59/lhims_182/searchPatientResult.php',
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

async function visualVerification() {
  console.log('='.repeat(70));
  console.log('VISUAL PATIENT SEARCH VERIFICATION');
  console.log('='.repeat(70));
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500  // Slow down actions so you can see them
  });

  const page = await browser.newPage();

  try {
    // Login
    console.log('[1/3] Logging into LHIMS...');
    await page.goto(CONFIG.loginUrl);
    await page.fill('input[name="username"]', CONFIG.credentials.username);
    await page.fill('input[name="password"]', CONFIG.credentials.password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('input[name="submit"]'),
    ]);
    console.log('✓ Login successful');
    console.log('');

    console.log('[2/3] Navigating to main page...');
    await page.goto(CONFIG.lhimsUrl);
    await page.waitForTimeout(2000);
    console.log('✓ Main page loaded');
    console.log('');

    console.log('[3/3] Testing patient searches...');
    console.log('='.repeat(70));
    console.log('');
    console.log('For each patient, the script will:');
    console.log('1. Submit a search using the patient number via API');
    console.log('2. Display the search results in the browser');
    console.log('3. Show you what was found');
    console.log('4. Extract the database ID using both OLD and NEW methods');
    console.log('');
    console.log('You can visually inspect the search results!');
    console.log('');
    console.log('='.repeat(70));

    for (let i = 0; i < TEST_PATIENTS.length; i++) {
      const patientNo = TEST_PATIENTS[i];

      console.log('');
      console.log(`[${i + 1}/${TEST_PATIENTS.length}] Testing: ${patientNo}`);
      console.log('-'.repeat(70));
      console.log('  Submitting search...');

      // Perform search by posting to search endpoint
      const response = await page.evaluate(async (patientNo, searchUrl) => {
        const formData = new URLSearchParams();
        formData.append('fnam', '');
        formData.append('pregno', patientNo);
        formData.append('InputPatientClinicSrting', '');
        formData.append('InputPatientClinic', '');
        formData.append('area', '');
        formData.append('iPatientID', '');

        const res = await fetch(searchUrl, {
          method: 'POST',
          body: formData
        });

        return await res.text();
      }, patientNo, CONFIG.searchUrl);

      // Create a proper HTML page with LHIMS styling to display results
      const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Search Results for ${patientNo}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
    .info { background: #e7f3ff; padding: 10px; margin: 10px 0; border-left: 4px solid #0066cc; }
    table { border-collapse: collapse; width: 100%; background: white; margin-top: 20px; }
    th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
    th { background: #0066cc; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Search Results for Patient: ${patientNo}</h1>
  <div class="info">
    <strong>Note:</strong> Below are the actual search results from LHIMS.
    Check if multiple patients are shown or just the exact match.
  </div>
  ${response}
</body>
</html>`;

      await page.setContent(fullHtml);

      console.log('  ✓ Search results loaded in browser');
      console.log('');
      console.log('  >> LOOK AT THE BROWSER NOW <<');
      console.log('  Count how many patient rows are displayed.');
      console.log('');

      // Analyze the response
      // OLD METHOD: Get first patient_id (WRONG if multiple results!)
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

      console.log('  Analysis Results:');
      console.log(`    Patient searched: ${patientNo}`);
      console.log(`    Patients found in results: ${uniquePatients.length}`);

      if (uniquePatients.length === 0) {
        console.log('    ⚠️  WARNING: No patient numbers found in HTML!');
      } else if (uniquePatients.length === 1) {
        console.log(`    ✓ Exact match only: ${uniquePatients[0]}`);
      } else {
        console.log(`    ⚠️  MULTIPLE PATIENTS FOUND:`);
        uniquePatients.forEach((p, idx) => {
          const isMatch = p === patientNo ? ' ← SEARCHED PATIENT' : '';
          console.log(`       ${idx + 1}. ${p}${isMatch}`);
        });
      }

      console.log('');
      console.log(`    Database IDs in response: ${uniqueIds.join(', ')}`);
      console.log('');
      console.log('  Extraction Methods:');
      console.log(`    OLD Method (first match): ${oldMethod}`);
      console.log(`    NEW Method (exact match): ${newMethod}`);

      if (oldMethod !== newMethod) {
        console.log('');
        console.log('  ⚠️  ⚠️  ⚠️  CRITICAL: METHODS DIFFER! ⚠️  ⚠️  ⚠️');
        console.log(`  OLD method would extract ID ${oldMethod} (WRONG PATIENT!)`);
        console.log(`  NEW method extracts ID ${newMethod} (CORRECT!)`);
      } else {
        console.log('');
        console.log('  ✓ Both methods agree');
        if (uniquePatients.length === 1) {
          console.log('  (Only one patient in results, so both work)');
        }
      }

      console.log('');
      console.log('  Verification URL:');
      console.log(`  http://10.10.0.59/lhims_182/patientRecord.php?patient_id=${newMethod}`);
      console.log('');
      console.log('  ^ Open this URL to verify it shows patient: ' + patientNo);
      console.log('');

      // Wait for user to review
      if (i < TEST_PATIENTS.length - 1) {
        console.log('  Press Enter to continue to next patient...');
        await page.waitForTimeout(5000); // Give time to read
      }
    }

    console.log('');
    console.log('='.repeat(70));
    console.log('VERIFICATION COMPLETE');
    console.log('='.repeat(70));
    console.log('');
    console.log('Summary:');
    console.log('1. Check the browser - you saw the actual search results');
    console.log('2. For each patient, verify the verification URL shows correct patient');
    console.log('3. If OLD and NEW methods differ, the fix is CRITICAL!');
    console.log('4. If they are the same, check if search returned multiple patients');
    console.log('');
    console.log('Browser will stay open.');
    console.log('Press Ctrl+C when you are done to exit.');
    console.log('');

    // Keep browser open
    await new Promise(() => {});

  } catch (error) {
    console.error('');
    console.error('✗ ERROR:', error.message);
    console.error(error.stack);
    await browser.close();
  }
}

visualVerification();
