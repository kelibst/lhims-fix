// Debug script to see the actual search response
const { chromium } = require('playwright');

async function debugSearch() {
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

  console.log('Response length:', response.length);
  console.log('\nSearching for patient_id in response...\n');

  // Find ALL occurrences of patient_id
  const regex = /patient_id[=\s]*['":]?\s*(\d+)/gi;
  let match;
  const ids = [];

  while ((match = regex.exec(response)) !== null) {
    ids.push(match[1]);
    console.log(`Found: patient_id=${match[1]} at position ${match.index}`);
  }

  console.log(`\nTotal patient_id occurrences found: ${ids.length}`);
  console.log(`Unique IDs: ${[...new Set(ids)].join(', ')}`);

  // Show context around first occurrence
  const firstMatch = response.match(/patient_id[=\s]*['":]?\s*(\d+)/i);
  if (firstMatch) {
    const start = Math.max(0, firstMatch.index - 100);
    const end = Math.min(response.length, firstMatch.index + 200);
    console.log('\nContext around first match:');
    console.log('---');
    console.log(response.substring(start, end));
    console.log('---');
  }

  await page.waitForTimeout(2000);
  await browser.close();
}

debugSearch();
