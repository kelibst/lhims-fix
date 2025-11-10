/**
 * Capture IPD PDF workflow - manual navigation to see how LHIMS exports IPD
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

async function captureIPDWorkflow() {
  console.log('='.repeat(70));
  console.log('CAPTURE IPD PDF WORKFLOW');
  console.log('='.repeat(70));
  console.log('');
  console.log('This script will:');
  console.log('1. Login to LHIMS');
  console.log('2. Navigate to patient VR-A01-AAA2142');
  console.log('3. Open the IPD section');
  console.log('4. Keep browser open for you to manually export IPD PDF');
  console.log('5. We will capture the network requests');
  console.log('');
  console.log('INSTRUCTIONS:');
  console.log('- Once the browser opens and navigates to the patient record');
  console.log('- Click on the IPD/Admission tab');
  console.log('- Try to export/print the IPD PDF manually');
  console.log('- The script will capture what happens');
  console.log('');
  console.log('Press Ctrl+C when done capturing');
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all network requests
  const requests = [];
  page.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method(),
      postData: request.postData(),
      headers: request.headers()
    });
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('exportServiceReportsInSinglePDF') ||
        url.includes('viewFile.php') ||
        url.includes('IPD') ||
        url.includes('admission')) {
      console.log('\n📡 Captured relevant request:');
      console.log(`   URL: ${url}`);
      console.log(`   Status: ${response.status()}`);
      console.log(`   Content-Type: ${response.headers()['content-type']}`);
    }
  });

  try {
    // Login
    console.log('[1/3] Logging in...');
    await page.goto(CONFIG.loginUrl);
    await page.fill('input[name="username"]', CONFIG.credentials.username);
    await page.fill('input[name="password"]', CONFIG.credentials.password);
    await Promise.all([
      page.waitForNavigation(),
      page.click('input[name="submit"]'),
    ]);
    console.log('      ✓ Logged in');

    // Navigate to patient record
    console.log('\n[2/3] Opening patient record for VR-A01-AAA2142...');
    const patientId = '2239';
    const recordUrl = `http://10.10.0.59/lhims_182/patientRecord.php?patient_id=${patientId}`;
    await page.goto(recordUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    console.log('      ✓ Patient record opened');

    console.log('\n[3/3] Browser is ready. Please:');
    console.log('      1. Look for IPD/Admissions tab or section');
    console.log('      2. Click on it to view IPD records');
    console.log('      3. Try to export/print the IPD PDF');
    console.log('      4. Check the console below for captured requests');
    console.log('');
    console.log('      Keeping browser open for 10 minutes...');
    console.log('      (Press Ctrl+C to stop earlier)');

    // Wait for 10 minutes or until user closes
    await page.waitForTimeout(600000);

  } catch (error) {
    if (error.message.includes('Target closed')) {
      console.log('\n✓ Browser closed by user');
    } else {
      console.error('\n✗ ERROR:', error.message);
    }
  } finally {
    console.log('\n' + '='.repeat(70));
    console.log('CAPTURED REQUESTS SUMMARY');
    console.log('='.repeat(70));

    const relevantRequests = requests.filter(r =>
      r.url.includes('exportServiceReportsInSinglePDF') ||
      r.url.includes('viewFile.php') ||
      r.url.includes('IPD') ||
      r.url.includes('admission') ||
      r.url.includes('ajax')
    );

    console.log(`\nTotal relevant requests captured: ${relevantRequests.length}`);

    if (relevantRequests.length > 0) {
      console.log('\nShowing last 10 requests:\n');
      relevantRequests.slice(-10).forEach((req, i) => {
        console.log(`[${i + 1}] ${req.method} ${req.url}`);
        if (req.postData) {
          console.log(`    POST Data: ${req.postData.substring(0, 100)}...`);
        }
      });
    }

    await browser.close();
  }
}

captureIPDWorkflow();
