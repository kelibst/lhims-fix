/**
 * LHIMS OPD Morbidity Data Extraction Script
 *
 * TEMPLATE - To be customized after HAR analysis
 *
 * This script will be finalized once we discover the actual API endpoint
 * from the HAR file analysis.
 *
 * Usage:
 *   node scripts/extract-opd-morbidity.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration - UPDATE THESE AFTER ANALYSIS
const CONFIG = {
  lhimsUrl: 'http://10.10.0.59/lhims_182',

  // Login credentials - FILL IN YOUR CREDENTIALS
  credentials: {
    username: 'YOUR_USERNAME',
    password: 'YOUR_PASSWORD',
  },

  // Download endpoint - FILL IN FROM HAR ANALYSIS
  downloadEndpoint: {
    // Example: 'http://10.10.0.59/lhims_182/reports/opd_morbidity.php'
    baseUrl: 'TO_BE_DISCOVERED',
    method: 'GET', // or 'POST' - from analysis

    // Parameters that change for each month
    params: {
      // Example: { month: '10', year: '2025', dept: 'all', format: 'excel' }
      // TO BE DISCOVERED FROM ANALYSIS
    }
  },

  // Date range to extract
  extraction: {
    startYear: 2023,
    startMonth: 1,
    endYear: 2025,
    endMonth: 10,
  },

  // Output directory
  outputDir: path.join(__dirname, '..', 'data', 'opd-morbidity'),

  // Rate limiting (milliseconds between requests)
  delayBetweenRequests: 2000, // 2 seconds
};

/**
 * Main extraction function
 */
async function extractOPDMorbidity() {
  console.log('='.repeat(70));
  console.log('LHIMS OPD MORBIDITY DATA EXTRACTION');
  console.log('='.repeat(70));
  console.log('\nConfiguration:');
  console.log(`  LHIMS URL: ${CONFIG.lhimsUrl}`);
  console.log(`  Date Range: ${CONFIG.extraction.startMonth}/${CONFIG.extraction.startYear} to ${CONFIG.extraction.endMonth}/${CONFIG.extraction.endYear}`);
  console.log(`  Output Directory: ${CONFIG.outputDir}`);
  console.log(`  Delay Between Requests: ${CONFIG.delayBetweenRequests}ms`);
  console.log('\n' + '='.repeat(70));

  // Validate configuration
  if (CONFIG.downloadEndpoint.baseUrl === 'TO_BE_DISCOVERED') {
    console.error('\n✗ ERROR: Download endpoint not configured!');
    console.error('\nPlease:');
    console.error('  1. Run: npm run capture');
    console.error('  2. Run: npm run analyze');
    console.error('  3. Update CONFIG.downloadEndpoint in this script with discovered endpoint');
    console.error('  4. Update CONFIG.credentials with your LHIMS username/password');
    process.exit(1);
  }

  if (CONFIG.credentials.username === 'YOUR_USERNAME') {
    console.error('\n✗ ERROR: Credentials not configured!');
    console.error('\nPlease update CONFIG.credentials with your LHIMS login details.');
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Launch browser
  console.log('\nLaunching browser...');
  const browser = await chromium.launch({
    headless: false, // Show browser for debugging
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  try {
    // Step 1: Login to LHIMS
    console.log('\nLogging into LHIMS...');
    await loginToLHIMS(page);
    console.log('✓ Login successful');

    // Step 2: Calculate total months to extract
    const monthsToExtract = calculateMonthsToExtract();
    console.log(`\nTotal months to extract: ${monthsToExtract.length}`);

    // Step 3: Extract each month
    let successCount = 0;
    let errorCount = 0;

    for (const [index, { year, month }] of monthsToExtract.entries()) {
      console.log(`\n[${index + 1}/${monthsToExtract.length}] Extracting ${getMonthName(month)} ${year}...`);

      try {
        await extractMonth(page, year, month);
        successCount++;
        console.log(`✓ Successfully downloaded`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Error: ${error.message}`);
      }

      // Rate limiting
      if (index < monthsToExtract.length - 1) {
        console.log(`  Waiting ${CONFIG.delayBetweenRequests}ms before next request...`);
        await page.waitForTimeout(CONFIG.delayBetweenRequests);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('EXTRACTION COMPLETE');
    console.log('='.repeat(70));
    console.log(`\nSuccessful: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Total: ${monthsToExtract.length}`);
    console.log(`\nFiles saved to: ${CONFIG.outputDir}`);

  } catch (error) {
    console.error('\n✗ FATAL ERROR:');
    console.error(error);
  } finally {
    await browser.close();
  }
}

/**
 * Login to LHIMS
 * NOTE: Update selectors based on actual LHIMS login page
 */
async function loginToLHIMS(page) {
  await page.goto(CONFIG.lhimsUrl);

  // TODO: Update these selectors based on actual LHIMS login page
  // Inspect the login page to find correct selectors

  // Example (update with actual selectors):
  // await page.fill('#username', CONFIG.credentials.username);
  // await page.fill('#password', CONFIG.credentials.password);
  // await page.click('#login-button');
  // await page.waitForNavigation();

  // TEMPORARY: Manual login
  console.log('\n⚠ MANUAL LOGIN REQUIRED:');
  console.log('  Please log into LHIMS in the browser window');
  console.log('  After logging in, press Enter in this terminal to continue...');

  // Wait for user to press Enter
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
}

/**
 * Extract data for a specific month
 */
async function extractMonth(page, year, month) {
  // Method 1: If it's a GET request with query parameters
  if (CONFIG.downloadEndpoint.method === 'GET') {
    // Build URL with parameters
    const params = new URLSearchParams({
      ...CONFIG.downloadEndpoint.params,
      year: year.toString(),
      month: month.toString(),
    });

    const url = `${CONFIG.downloadEndpoint.baseUrl}?${params.toString()}`;

    // Wait for download
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.goto(url),
    ]);

    // Save file
    const filename = `OPD_Morbidity_${year}_${String(month).padStart(2, '0')}_AllDepts.xlsx`;
    await download.saveAs(path.join(CONFIG.outputDir, filename));
  }

  // Method 2: If it's a POST request (uncomment and modify if needed)
  /*
  else if (CONFIG.downloadEndpoint.method === 'POST') {
    await page.goto(CONFIG.downloadEndpoint.baseUrl);

    // Fill form fields
    await page.selectOption('#month-select', month.toString());
    await page.selectOption('#year-select', year.toString());
    await page.selectOption('#department-select', 'all');

    // Click download button
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.click('#download-button'),
    ]);

    // Save file
    const filename = `OPD_Morbidity_${year}_${String(month).padStart(2, '0')}_AllDepts.xlsx`;
    await download.saveAs(path.join(CONFIG.outputDir, filename));
  }
  */
}

/**
 * Calculate all months to extract based on config
 */
function calculateMonthsToExtract() {
  const months = [];

  for (let year = CONFIG.extraction.startYear; year <= CONFIG.extraction.endYear; year++) {
    const startMonth = (year === CONFIG.extraction.startYear) ? CONFIG.extraction.startMonth : 1;
    const endMonth = (year === CONFIG.extraction.endYear) ? CONFIG.extraction.endMonth : 12;

    for (let month = startMonth; month <= endMonth; month++) {
      months.push({ year, month });
    }
  }

  return months;
}

/**
 * Get month name from number
 */
function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1];
}

// Run the extraction
if (require.main === module) {
  extractOPDMorbidity().catch(error => {
    console.error('\n✗ FATAL ERROR:');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { extractOPDMorbidity };
