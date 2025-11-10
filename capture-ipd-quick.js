/**
 * Quick IPD capture - optimized for fast manual capture
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  lhimsUrl: 'http://10.10.0.59/lhims_182',
  loginUrl: 'http://10.10.0.59/lhims_182/login.php',
  credentials: {
    username: 'sno-411',
    password: 'monamourd11',
  },
};

async function captureIPD() {
  console.log('='.repeat(70));
  console.log('QUICK IPD CAPTURE - Ready to capture in 5 seconds!');
  console.log('='.repeat(70));
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Store all network activity
  const networkLog = [];

  page.on('request', request => {
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'request',
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData()
    };
    networkLog.push(entry);
  });

  page.on('response', async response => {
    const url = response.url();

    const entry = {
      timestamp: new Date().toISOString(),
      type: 'response',
      url: url,
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers()
    };

    // Capture response body for important requests
    if (url.includes('exportServiceReportsInSinglePDF') ||
        url.includes('viewFile.php') ||
        url.includes('IPD') ||
        url.includes('ajax') ||
        url.includes('pdf')) {

      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('application/json') ||
            contentType.includes('text/') ||
            contentType.includes('application/x-www-form-urlencoded')) {
          entry.body = await response.text();
        } else if (contentType.includes('application/pdf')) {
          const buffer = await response.body();
          entry.bodySize = buffer.length;
          entry.isPDF = true;

          // Check if PDF is empty
          const pdfText = buffer.toString();
          if (pdfText.includes('/Count 0')) {
            entry.pdfEmpty = true;
            console.log(`\n⚠ EMPTY PDF detected: ${url}`);
          } else {
            const pageMatch = pdfText.match(/\/Count (\d+)/);
            if (pageMatch) {
              entry.pdfPages = parseInt(pageMatch[1]);
              console.log(`\n✓ PDF with ${pageMatch[1]} pages: ${url}`);
            }
          }
        }
      } catch (e) {
        entry.bodyError = e.message;
      }

      console.log(`\n📡 ${response.status()} ${response.request().method()} ${url}`);
    }

    networkLog.push(entry);
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

    // Navigate to patient
    console.log('\n[2/3] Opening patient record VR-A01-AAA2142...');
    await page.goto('http://10.10.0.59/lhims_182/patientRecord.php?patient_id=2239', {
      waitUntil: 'networkidle'
    });
    await page.waitForTimeout(2000);
    console.log('      ✓ Patient record opened');

    console.log('\n[3/3] Ready to capture! Please:');
    console.log('');
    console.log('   👉 Navigate to IPD section');
    console.log('   👉 Click export/print for IPD');
    console.log('   👉 Watch console for captured requests');
    console.log('');
    console.log('   Browser will stay open for 3 minutes');
    console.log('   (Close browser when done capturing)');
    console.log('');

    // Wait 3 minutes or until closed
    await page.waitForTimeout(180000).catch(() => {});

  } catch (error) {
    if (error.message.includes('Target closed') || error.message.includes('Protocol error')) {
      console.log('\n✓ Browser closed');
    } else {
      console.error('\n✗ ERROR:', error.message);
    }
  } finally {
    // Save capture
    const captureFile = path.join(__dirname, 'data', 'captures', `ipd-capture-${Date.now()}.json`);

    fs.writeFileSync(captureFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      patient: 'VR-A01-AAA2142',
      patientId: '2239',
      networkLog: networkLog
    }, null, 2));

    console.log('\n' + '='.repeat(70));
    console.log('CAPTURE SAVED');
    console.log('='.repeat(70));
    console.log(`File: ${captureFile}`);
    console.log(`Total requests: ${networkLog.filter(e => e.type === 'request').length}`);
    console.log(`Total responses: ${networkLog.filter(e => e.type === 'response').length}`);

    // Filter and show relevant requests
    const pdfRequests = networkLog.filter(e =>
      e.type === 'request' && (
        e.url.includes('exportServiceReportsInSinglePDF') ||
        e.url.includes('viewFile.php') ||
        e.url.includes('pdf')
      )
    );

    if (pdfRequests.length > 0) {
      console.log('\nPDF-related requests captured:');
      pdfRequests.forEach((req, i) => {
        console.log(`\n[${i + 1}] ${req.method} ${req.url}`);
        if (req.postData) {
          console.log(`    POST: ${req.postData.substring(0, 150)}`);
        }
      });
    }

    console.log('\n✓ Capture complete! Check the file for full details.');

    try {
      await browser.close();
    } catch (e) {
      // Already closed
    }
  }
}

captureIPD();
