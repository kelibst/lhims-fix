/**
 * LHIMS OPD (Outpatient) Data Extraction Script
 *
 * Automatically downloads OPD register data for specified date ranges
 *
 * Usage:
 *   node scripts/extract-opd-data.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION - CUSTOMIZE THESE VALUES
// ============================================================================

const CONFIG = {
  // LHIMS connection
  lhimsUrl: 'http://10.10.0.59/lhims_182',
  loginUrl: 'http://10.10.0.59/lhims_182/login.php',
  loginSubmitUrl: 'http://10.10.0.59/lhims_182/doLogin.php',

  // Login credentials
  credentials: {
    username: 'YOUR_USERNAME',  // UPDATE if different
    password: 'YOUR_PASSWORD',  // UPDATE if different
  },

  // OPD Export endpoint
  opdEndpoint: 'http://10.10.0.59/lhims_182/exportDHIMSOutPatientRegisterV1.php',

  // Parameters (usually don't need to change these)
  defaultParams: {
    iServiceTypeID: 0,      // 0 = all services
    iSuperServiceTypeID: 0, // 0 = all super services
    iClinicID: 2,           // Your clinic ID
  },

  // Date range to extract
  // You can customize this to extract specific periods
  dateRanges: [
    // Example: Extract data month by month from 2023 to 2025
    // Format: { fromDate: 'DD-MM-YYYY', toDate: 'DD-MM-YYYY', label: 'description' }

    // 2023
    { fromDate: '01-01-2023', toDate: '31-01-2023', label: '2023_Jan' },
    { fromDate: '01-02-2023', toDate: '28-02-2023', label: '2023_Feb' },
    { fromDate: '01-03-2023', toDate: '31-03-2023', label: '2023_Mar' },
    { fromDate: '01-04-2023', toDate: '30-04-2023', label: '2023_Apr' },
    { fromDate: '01-05-2023', toDate: '31-05-2023', label: '2023_May' },
    { fromDate: '01-06-2023', toDate: '30-06-2023', label: '2023_Jun' },
    { fromDate: '01-07-2023', toDate: '31-07-2023', label: '2023_Jul' },
    { fromDate: '01-08-2023', toDate: '31-08-2023', label: '2023_Aug' },
    { fromDate: '01-09-2023', toDate: '30-09-2023', label: '2023_Sep' },
    { fromDate: '01-10-2023', toDate: '31-10-2023', label: '2023_Oct' },
    { fromDate: '01-11-2023', toDate: '30-11-2023', label: '2023_Nov' },
    { fromDate: '01-12-2023', toDate: '31-12-2023', label: '2023_Dec' },

    // 2024
    { fromDate: '01-01-2024', toDate: '31-01-2024', label: '2024_Jan' },
    { fromDate: '01-02-2024', toDate: '29-02-2024', label: '2024_Feb' }, // Leap year
    { fromDate: '01-03-2024', toDate: '31-03-2024', label: '2024_Mar' },
    { fromDate: '01-04-2024', toDate: '30-04-2024', label: '2024_Apr' },
    { fromDate: '01-05-2024', toDate: '31-05-2024', label: '2024_May' },
    { fromDate: '01-06-2024', toDate: '30-06-2024', label: '2024_Jun' },
    { fromDate: '01-07-2024', toDate: '31-07-2024', label: '2024_Jul' },
    { fromDate: '01-08-2024', toDate: '31-08-2024', label: '2024_Aug' },
    { fromDate: '01-09-2024', toDate: '30-09-2024', label: '2024_Sep' },
    { fromDate: '01-10-2024', toDate: '31-10-2024', label: '2024_Oct' },

    // 2025 (up to current month)
    { fromDate: '01-01-2025', toDate: '31-01-2025', label: '2025_Jan' },
    { fromDate: '01-02-2025', toDate: '28-02-2025', label: '2025_Feb' },
    { fromDate: '01-03-2025', toDate: '31-03-2025', label: '2025_Mar' },
    { fromDate: '01-04-2025', toDate: '30-04-2025', label: '2025_Apr' },
    { fromDate: '01-05-2025', toDate: '31-05-2025', label: '2025_May' },
    { fromDate: '01-06-2025', toDate: '30-06-2025', label: '2025_Jun' },
    { fromDate: '01-07-2025', toDate: '31-07-2025', label: '2025_Jul' },
    { fromDate: '01-08-2025', toDate: '31-08-2025', label: '2025_Aug' },
    { fromDate: '01-09-2025', toDate: '30-09-2025', label: '2025_Sep' },
    { fromDate: '01-10-2025', toDate: '31-10-2025', label: '2025_Oct' },
    { fromDate: '01-11-2025', toDate: '07-11-2025', label: '2025_Nov' }, // Up to today
  ],

  // Output directory
  outputDir: path.join(__dirname, '..', 'data', 'opd-register'),

  // Delay between requests (milliseconds) - be respectful to the server
  delayBetweenRequests: 3000, // 3 seconds

  // Browser settings
  headless: false, // Set to true to hide browser
  timeout: 420000, // 7 minutes (420 seconds) per download - for slow network/large files
};

// ============================================================================
// MAIN EXTRACTION LOGIC
// ============================================================================

async function extractOPDData() {
  console.log('='.repeat(70));
  console.log('LHIMS OPD REGISTER DATA EXTRACTION');
  console.log('='.repeat(70));
  console.log(`\nConfiguration:`);
  console.log(`  LHIMS URL: ${CONFIG.lhimsUrl}`);
  console.log(`  Username: ${CONFIG.credentials.username}`);
  console.log(`  Date Ranges: ${CONFIG.dateRanges.length} periods`);
  console.log(`  Output Directory: ${CONFIG.outputDir}`);
  console.log(`  Delay Between Requests: ${CONFIG.delayBetweenRequests}ms\n`);
  console.log('='.repeat(70));

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Launch browser
  console.log('\nLaunching browser...');
  const browser = await chromium.launch({
    headless: CONFIG.headless,
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
  });

  const page = await context.newPage();

  try {
    // Step 1: Login
    console.log('\n[1/3] Logging into LHIMS...');
    await login(page);
    console.log('✓ Login successful\n');

    // Step 2: Extract data for each date range
    console.log(`[2/3] Extracting OPD data for ${CONFIG.dateRanges.length} periods...\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const [index, range] of CONFIG.dateRanges.entries()) {
      const progress = `[${index + 1}/${CONFIG.dateRanges.length}]`;
      console.log(`${progress} Extracting ${range.label} (${range.fromDate} to ${range.toDate})...`);

      try {
        await extractDateRange(page, range);
        successCount++;
        console.log(`${progress} ✓ Successfully downloaded`);
      } catch (error) {
        errorCount++;
        const errorMsg = `${range.label}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`${progress} ✗ Error: ${error.message}`);
      }

      // Delay between requests (except for last one)
      if (index < CONFIG.dateRanges.length - 1) {
        console.log(`${progress} Waiting ${CONFIG.delayBetweenRequests}ms...\n`);
        await page.waitForTimeout(CONFIG.delayBetweenRequests);
      }
    }

    // Step 3: Summary
    console.log('\n[3/3] Extraction Complete\n');
    console.log('='.repeat(70));
    console.log('EXTRACTION SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n✓ Successful: ${successCount}`);
    console.log(`✗ Errors: ${errorCount}`);
    console.log(`Total: ${CONFIG.dateRanges.length}`);

    if (errors.length > 0) {
      console.log(`\nFailed extractions:`);
      errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log(`\n✓ Files saved to: ${CONFIG.outputDir}\n`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n✗ FATAL ERROR:');
    console.error(error);
  } finally {
    await browser.close();
  }
}

/**
 * Login to LHIMS
 */
async function login(page) {
  // Navigate to login page
  await page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle' });

  // Fill in credentials
  await page.fill('input[name="username"]', CONFIG.credentials.username);
  await page.fill('input[name="password"]', CONFIG.credentials.password);

  // Submit login form
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('input[name="submit"]'),
  ]);

  // Verify login success (wait for dashboard elements)
  await page.waitForTimeout(2000);

  // Check if we're on the main page (not login page)
  const currentUrl = page.url();
  if (currentUrl.includes('login.php')) {
    throw new Error('Login failed - still on login page');
  }
}

/**
 * Extract data for a specific date range
 */
async function extractDateRange(page, range) {
  // Build download URL
  const params = new URLSearchParams({
    dFromDate: range.fromDate,
    dToDate: range.toDate,
    iServiceTypeID: CONFIG.defaultParams.iServiceTypeID.toString(),
    iSuperServiceTypeID: CONFIG.defaultParams.iSuperServiceTypeID.toString(),
    iClinicID: CONFIG.defaultParams.iClinicID.toString(),
  });

  const downloadUrl = `${CONFIG.opdEndpoint}?${params.toString()}`;

  // Download file
  // Navigate and wait for download to start
  const downloadPromise = page.waitForEvent('download', { timeout: CONFIG.timeout });

  // Navigate to download URL (will trigger download and may throw "Download is starting" error)
  try {
    await page.goto(downloadUrl, { timeout: CONFIG.timeout, waitUntil: 'commit' });
  } catch (error) {
    // Ignore "Download is starting" errors - this is expected
    if (!error.message.includes('Download is starting')) {
      throw error;
    }
  }

  // Wait for the download to actually start
  const download = await downloadPromise;

  // Save file with custom name
  const filename = `OPD_Register_${range.label}.xlsx`;
  const savePath = path.join(CONFIG.outputDir, filename);
  await download.saveAs(savePath);

  // Wait a moment for file to be written
  await page.waitForTimeout(500);

  // Verify file was saved
  if (!fs.existsSync(savePath)) {
    throw new Error('File was not saved successfully');
  }

  const stats = fs.statSync(savePath);
  if (stats.size < 1000) {
    throw new Error(`File is too small (${stats.size} bytes) - might be empty or error page`);
  }
}

// ============================================================================
// RUN THE EXTRACTION
// ============================================================================

if (require.main === module) {
  extractOPDData().catch(error => {
    console.error('\n✗ FATAL ERROR:');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { extractOPDData };
