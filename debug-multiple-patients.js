// Check if search returns multiple patients
const { chromium } = require('playwright');
const fs = require('fs');

async function debugMultiplePatients() {
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

  const patientNo = 'VR-A01-AAA0090';
  console.log(`Searching for patient: ${patientNo}\n`);

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

  // Save full response to file
  fs.writeFileSync('search-response.html', response);
  console.log('Full response saved to search-response.html\n');

  // Count table rows (each patient is a row)
  const rowMatches = response.match(/<tr[^>]*>/gi);
  console.log(`Total <tr> tags found: ${rowMatches ? rowMatches.length : 0}\n`);

  // Find all patient folder numbers in the response
  const folderRegex = /VR-[A-Z]\d{2}-[A-Z]{3}\d+/g;
  const folders = response.match(folderRegex);

  if (folders) {
    console.log(`Found ${folders.length} patient folder numbers in response:`);
    const uniqueFolders = [...new Set(folders)];
    uniqueFolders.forEach((folder, i) => {
      console.log(`  ${i + 1}. ${folder}`);
    });

    if (uniqueFolders.length > 1) {
      console.log('\n⚠️  WARNING: Multiple patients returned!');
      console.log('The search might be matching partial patient numbers!\n');
    } else if (uniqueFolders[0] === patientNo) {
      console.log('\n✓ Correct: Only the exact patient was returned\n');
    } else {
      console.log(`\n✗ ERROR: Returned ${uniqueFolders[0]} instead of ${patientNo}\n`);
    }
  }

  // Find patient_id values
  const idRegex = /patient_id[=\s]*['":]?\s*(\d+)/gi;
  const ids = [];
  let match;

  while ((match = idRegex.exec(response)) !== null) {
    ids.push(match[1]);
  }

  const uniqueIds = [...new Set(ids)];
  console.log(`Patient IDs found: ${uniqueIds.join(', ')}`);

  if (uniqueIds.length > 1) {
    console.log('\n⚠️  WARNING: Multiple patient IDs found!');
    console.log('We are using the FIRST occurrence, but this might be wrong!\n');
  }

  await page.waitForTimeout(2000);
  await browser.close();
}

debugMultiplePatients();
