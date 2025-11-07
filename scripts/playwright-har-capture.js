/**
 * LHIMS Network Traffic Capture Script
 *
 * This script launches a browser and records ALL network traffic while you
 * manually navigate LHIMS and download reports. The captured traffic (HAR file)
 * will be analyzed to discover API endpoints for automation.
 *
 * Usage:
 *   node scripts/playwright-har-capture.js
 *
 * What this does:
 *   1. Launches Chromium browser with network recording enabled
 *   2. You manually navigate to LHIMS and perform actions
 *   3. Press Ctrl+C when done to save the HAR file
 *   4. HAR file saved to data/captures/ with timestamp
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  lhimsUrl: 'http://10.10.0.59/lhims_182',
  captureDir: path.join(__dirname, '..', 'data', 'captures'),
  headless: false, // Show browser so user can navigate
  slowMo: 100, // Slow down actions slightly for visibility
};

async function main() {
  console.log('='.repeat(70));
  console.log('LHIMS NETWORK TRAFFIC CAPTURE TOOL');
  console.log('='.repeat(70));
  console.log('\nThis script will:');
  console.log('  1. Launch a browser window');
  console.log('  2. Record ALL network traffic (requests, responses, cookies)');
  console.log('  3. Let YOU manually navigate LHIMS and download reports');
  console.log('  4. Save everything to a HAR file when you press Ctrl+C\n');

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
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] +
                    '_' + new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
  const harFilename = `lhims-session_${timestamp}.har`;
  const harPath = path.join(CONFIG.captureDir, harFilename);

  // Launch browser with HAR recording
  console.log('Launching browser with network recording...\n');

  const browser = await chromium.launch({
    headless: CONFIG.headless,
    slowMo: CONFIG.slowMo,
  });

  const context = await browser.newContext({
    recordHar: {
      path: harPath,
      mode: 'full', // Record full request/response bodies
      urlFilter: '*', // Capture all URLs
    },
    // Ignore HTTPS certificate errors (for local network)
    ignoreHTTPSErrors: true,
    // User agent (normal browser)
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    // Enable permissions if needed
    permissions: ['geolocation'],
  });

  const page = await context.newPage();

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
  console.log(`Recording will be saved to: ${harFilename}\n`);
  console.log('Waiting for you to complete actions...\n');

  // Keep script running until user presses Ctrl+C
  let exiting = false;

  const cleanup = async () => {
    if (exiting) return;
    exiting = true;

    console.log('\n\n' + '='.repeat(70));
    console.log('SAVING NETWORK TRAFFIC...');
    console.log('='.repeat(70));

    try {
      // Close context to finalize HAR file
      await context.close();
      await browser.close();

      console.log('\n✓ HAR file saved successfully!\n');
      console.log('File location:');
      console.log(`  ${harPath}\n`);

      // Check file size
      const stats = fs.statSync(harPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`File size: ${fileSizeMB} MB`);
      console.log(`Requests captured: ${stats.size > 1000 ? 'Yes' : 'Possibly empty - did you navigate LHIMS?'}\n`);

      console.log('NEXT STEPS:');
      console.log('  1. Analyze the HAR file to find API endpoints:');
      console.log(`     node scripts/analyze-requests.js "${harFilename}"\n`);
      console.log('  2. Review the analysis output to identify the Excel download endpoint\n');
      console.log('  3. Use discovered endpoint to build automation script\n');

    } catch (error) {
      console.error('\n✗ Error saving HAR file:');
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
