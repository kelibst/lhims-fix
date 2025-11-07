/**
 * LHIMS Network Traffic Capture Script (Alternative Method)
 *
 * This version uses Playwright's network event listeners instead of HAR recording
 * More reliable for capturing ALL network traffic
 *
 * Usage:
 *   node scripts/playwright-network-capture.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  lhimsUrl: 'http://10.10.0.59/lhims_182',
  captureDir: path.join(__dirname, '..', 'data', 'captures'),
  headless: false,
};

// Storage for captured requests
const capturedRequests = [];
const capturedResponses = [];

async function main() {
  console.log('='.repeat(70));
  console.log('LHIMS NETWORK TRAFFIC CAPTURE TOOL (IMPROVED)');
  console.log('='.repeat(70));
  console.log('\nThis script will:');
  console.log('  1. Launch a browser window');
  console.log('  2. Record ALL network traffic using network event listeners');
  console.log('  3. Let YOU manually navigate LHIMS and download reports');
  console.log('  4. Save everything to a JSON file when you press Ctrl+C\n');

  console.log('INSTRUCTIONS:');
  console.log('  - Browser will open automatically');
  console.log('  - Navigate to LHIMS login page');
  console.log('  - Log in with your credentials');
  console.log('  - Navigate to OPD Morbidity report');
  console.log('  - Select monthly report, all departments');
  console.log('  - Download the Excel file');
  console.log('  - Press Ctrl+C in this terminal when done\n');

  console.log('IMPORTANT:');
  console.log('  - Make sure you are connected to hospital network (10.10.0.59)');
  console.log('  - Disconnect from external network if needed');
  console.log('  - Complete actions normally - script records in background\n');

  console.log('-'.repeat(70));
  console.log('Starting browser in 3 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Ensure capture directory exists
  if (!fs.existsSync(CONFIG.captureDir)) {
    fs.mkdirSync(CONFIG.captureDir, { recursive: true });
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
  const captureFilename = `lhims-capture_${timestamp}.json`;
  const capturePath = path.join(CONFIG.captureDir, captureFilename);

  // Launch browser
  console.log('Launching browser with network recording...\n');

  const browser = await chromium.launch({
    headless: CONFIG.headless,
    slowMo: 100,
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  // Listen to all network events
  let requestCounter = 0;
  let downloadCounter = 0;

  page.on('request', request => {
    requestCounter++;
    const requestData = {
      id: requestCounter,
      timestamp: new Date().toISOString(),
      type: 'request',
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      postData: request.postData(),
      resourceType: request.resourceType(),
    };
    capturedRequests.push(requestData);

    // Log important requests
    if (request.url().includes('10.10.0.59') || request.url().includes('lhims')) {
      console.log(`[${requestCounter}] ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', async response => {
    const request = response.request();
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';

    const responseData = {
      id: requestCounter,
      timestamp: new Date().toISOString(),
      type: 'response',
      url: url,
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers(),
      contentType: contentType,
      method: request.method(),
      requestHeaders: request.headers(),
      requestPostData: request.postData(),
    };

    // Try to get response body for important responses
    try {
      if (contentType.includes('json') ||
          contentType.includes('text') ||
          contentType.includes('html') ||
          url.includes('login') ||
          url.includes('auth')) {
        const body = await response.text();
        responseData.body = body.substring(0, 10000); // Limit to 10KB
      }
    } catch (error) {
      responseData.bodyError = 'Could not read body';
    }

    capturedResponses.push(responseData);

    // Highlight Excel downloads
    if (contentType.includes('excel') ||
        contentType.includes('spreadsheet') ||
        contentType.includes('vnd.ms-excel') ||
        contentType.includes('vnd.openxmlformats') ||
        url.includes('.xls')) {
      downloadCounter++;
      console.log(`\n🎉 EXCEL DOWNLOAD DETECTED [${downloadCounter}]`);
      console.log(`   URL: ${url}`);
      console.log(`   Method: ${request.method()}`);
      console.log(`   Status: ${response.status()}`);
      console.log(`   Content-Type: ${contentType}\n`);
    }
  });

  // Handle downloads
  page.on('download', async download => {
    downloadCounter++;
    console.log(`\n📥 FILE DOWNLOAD STARTED [${downloadCounter}]`);
    console.log(`   Filename: ${download.suggestedFilename()}`);
    console.log(`   URL: ${download.url()}\n`);

    // Save download info
    capturedRequests.push({
      timestamp: new Date().toISOString(),
      type: 'download',
      filename: download.suggestedFilename(),
      url: download.url(),
    });
  });

  // Navigate to LHIMS
  console.log(`Navigating to LHIMS: ${CONFIG.lhimsUrl}\n`);

  try {
    await page.goto(CONFIG.lhimsUrl, {
      timeout: 30000,
      waitUntil: 'networkidle'
    });
    console.log('✓ LHIMS page loaded\n');
  } catch (error) {
    console.error('✗ Error loading LHIMS page:');
    console.error(`  ${error.message}\n`);
    console.log('TROUBLESHOOTING:');
    console.log('  - Verify you are connected to hospital network');
    console.log('  - Check LHIMS URL is accessible: http://10.10.0.59/lhims_182');
    console.log('  - Try opening the URL in your normal browser first\n');
  }

  console.log('='.repeat(70));
  console.log('BROWSER IS READY - RECORDING NETWORK TRAFFIC');
  console.log('='.repeat(70));
  console.log('\nYou can now:');
  console.log('  1. Log into LHIMS in the browser window');
  console.log('  2. Navigate to the OPD Morbidity report');
  console.log('  3. Download the Excel file');
  console.log('  4. When done, press Ctrl+C here to save and exit\n');
  console.log(`Recording will be saved to: ${captureFilename}\n`);
  console.log('Network activity will be logged below:\n');
  console.log('-'.repeat(70));

  // Keep script running until user presses Ctrl+C
  let exiting = false;

  const cleanup = async () => {
    if (exiting) return;
    exiting = true;

    console.log('\n\n' + '='.repeat(70));
    console.log('SAVING NETWORK TRAFFIC...');
    console.log('='.repeat(70));

    try {
      // Combine requests and responses
      const captureData = {
        timestamp: new Date().toISOString(),
        lhimsUrl: CONFIG.lhimsUrl,
        totalRequests: capturedRequests.length,
        totalResponses: capturedResponses.length,
        downloadsDetected: downloadCounter,
        requests: capturedRequests,
        responses: capturedResponses,
      };

      // Save to file
      fs.writeFileSync(capturePath, JSON.stringify(captureData, null, 2));

      console.log('\n✓ Network capture saved successfully!\n');
      console.log('File location:');
      console.log(`  ${capturePath}\n`);

      // Check file size
      const stats = fs.statSync(capturePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`File size: ${fileSizeMB} MB`);
      console.log(`Total requests: ${capturedRequests.length}`);
      console.log(`Total responses: ${capturedResponses.length}`);
      console.log(`Excel downloads: ${downloadCounter}\n`);

      if (downloadCounter > 0) {
        console.log('✓ SUCCESS: Excel download(s) detected!\n');
      } else {
        console.log('⚠ WARNING: No Excel downloads detected');
        console.log('  Did you download an Excel file during the session?\n');
      }

      console.log('NEXT STEPS:');
      console.log('  1. Analyze the capture file to find API endpoints:');
      console.log(`     node scripts/analyze-capture.js "${captureFilename}"\n`);

      await context.close();
      await browser.close();

    } catch (error) {
      console.error('\n✗ Error saving capture:');
      console.error(`  ${error.message}\n`);
    }

    console.log('='.repeat(70));
    process.exit(0);
  };

  // Handle Ctrl+C
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Keep process alive
  await new Promise(() => {}); // Never resolves - waits for Ctrl+C
}

// Run the script
main().catch(error => {
  console.error('\n✗ FATAL ERROR:');
  console.error(error);
  process.exit(1);
});
