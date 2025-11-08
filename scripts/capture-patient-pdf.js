/**
 * LHIMS Patient PDF Record Capture Script
 *
 * Captures network traffic when exporting patient PDF records
 *
 * Usage:
 *   node scripts/capture-patient-pdf.js
 *
 * This script will:
 * 1. Login to LHIMS
 * 2. Search for a patient
 * 3. Click "Print" or "Export PDF" button
 * 4. Save network capture (HAR file)
 * 5. Save the downloaded PDF
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // LHIMS connection
  lhimsUrl: 'http://10.10.0.59/lhims_182',
  loginUrl: 'http://10.10.0.59/lhims_182/login.php',

  // Login credentials
  credentials: {
    username: 'sno-411',
    password: 'monamourd11',
  },

  // Sample patients to capture (you can add more)
  samplePatients: [
    'VR-A01-AAA1193',  // Sample patient 1
    'VR-A01-AAA1194',  // Sample patient 2 (change to actual patient numbers)
    'VR-A01-AAA1195',  // Sample patient 3 (change to actual patient numbers)
  ],

  // Output directories
  harOutputDir: path.join(__dirname, '..', 'network-captures'),
  pdfOutputDir: path.join(__dirname, '..', 'network-captures'),

  // Browser settings
  headless: false,  // Show browser so you can see what's happening
  slowMo: 1000,     // Slow down by 1 second to make it easier to follow
};

// ============================================================================
// MAIN CAPTURE FUNCTION
// ============================================================================

async function capturePatientPDF() {
  console.log('='.repeat(70));
  console.log('LHIMS PATIENT PDF RECORD CAPTURE');
  console.log('='.repeat(70));
  console.log('\nThis script will help capture the PDF export workflow.');
  console.log('Please interact with LHIMS to export a patient PDF record.\n');
  console.log('='.repeat(70));

  // Ensure output directories exist
  if (!fs.existsSync(CONFIG.harOutputDir)) {
    fs.mkdirSync(CONFIG.harOutputDir, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.pdfOutputDir)) {
    fs.mkdirSync(CONFIG.pdfOutputDir, { recursive: true });
  }

  // Launch browser
  console.log('\n[1/5] Launching browser...');
  const browser = await chromium.launch({
    headless: CONFIG.headless,
    slowMo: CONFIG.slowMo,
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
  });

  // Start recording network traffic
  await context.routeFromHAR(path.join(CONFIG.harOutputDir, 'temp.har'), {
    update: true,
    updateContent: 'embed',
  });

  const page = await context.newPage();

  try {
    // Login
    console.log('\n[2/5] Logging into LHIMS...');
    await login(page);
    console.log('✓ Login successful');

    console.log('\n[3/5] INTERACTIVE MODE');
    console.log('='.repeat(70));
    console.log('Please perform the following steps in the browser:');
    console.log('');
    console.log('  1. Search for a patient (e.g., VR-A01-AAA1193)');
    console.log('  2. Find and click the "Print" or "Export PDF" button');
    console.log('  3. Wait for the PDF to download');
    console.log('  4. Come back here and press ENTER when done');
    console.log('');
    console.log('NOTE: Look for buttons like:');
    console.log('  - "Print Patient Record"');
    console.log('  - "Export PDF"');
    console.log('  - "Print" (with printer icon)');
    console.log('  - "Patient Summary"');
    console.log('  - Or similar export options');
    console.log('='.repeat(70));

    // Wait for user to complete the PDF export
    await waitForUserConfirmation();

    console.log('\n[4/5] Saving network capture...');

    // Close the context to save HAR file
    await context.close();

    // Rename HAR file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const harFilename = `patient-pdf-export-${timestamp}.har`;
    const harPath = path.join(CONFIG.harOutputDir, harFilename);

    if (fs.existsSync(path.join(CONFIG.harOutputDir, 'temp.har'))) {
      fs.renameSync(
        path.join(CONFIG.harOutputDir, 'temp.har'),
        harPath
      );
      console.log(`✓ Network capture saved: ${harFilename}`);
      console.log(`  Location: ${harPath}`);
    } else {
      console.log('⚠ Warning: HAR file not found. Network capture may not have been saved.');
    }

    console.log('\n[5/5] Summary');
    console.log('='.repeat(70));
    console.log('✓ Capture complete!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Check the downloaded PDF in your Downloads folder');
    console.log('  2. Move the PDF to: network-captures/patient-record-PATIENTNO.pdf');
    console.log('  3. Review the HAR file: ' + harFilename);
    console.log('');
    console.log('To capture more patients, run this script again.');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
    console.error(error);
  } finally {
    await browser.close();
  }
}

/**
 * Login to LHIMS
 */
async function login(page) {
  await page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle' });

  await page.fill('input[name="username"]', CONFIG.credentials.username);
  await page.fill('input[name="password"]', CONFIG.credentials.password);

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('input[name="submit"]'),
  ]);

  await page.waitForTimeout(2000);

  const currentUrl = page.url();
  if (currentUrl.includes('login.php')) {
    throw new Error('Login failed - still on login page');
  }
}

/**
 * Wait for user to press ENTER
 */
async function waitForUserConfirmation() {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('\nPress ENTER when you have exported the PDF: ', () => {
      rl.close();
      resolve();
    });
  });
}

// ============================================================================
// ALTERNATIVE: Automated Capture (if we know the exact steps)
// ============================================================================

async function capturePatientPDFAutomated() {
  console.log('='.repeat(70));
  console.log('AUTOMATED PATIENT PDF CAPTURE (EXPERIMENTAL)');
  console.log('='.repeat(70));
  console.log('\nAttempting to automatically capture PDF exports...\n');

  // Ensure output directories exist
  if (!fs.existsSync(CONFIG.harOutputDir)) {
    fs.mkdirSync(CONFIG.harOutputDir, { recursive: true });
  }
  if (!fs.existsSync(CONFIG.pdfOutputDir)) {
    fs.mkdirSync(CONFIG.pdfOutputDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
  });

  const page = await context.newPage();

  try {
    // Login
    console.log('[1/4] Logging in...');
    await login(page);
    console.log('✓ Logged in');

    // Capture each sample patient
    for (const [index, patientNo] of CONFIG.samplePatients.entries()) {
      console.log(`\n[${index + 1}/${CONFIG.samplePatients.length}] Capturing PDF for patient: ${patientNo}`);

      try {
        // Start HAR recording for this patient
        await context.routeFromHAR(
          path.join(CONFIG.harOutputDir, `patient-pdf-${patientNo}.har`),
          { update: true, updateContent: 'embed' }
        );

        // TODO: Automate the following steps (need to know exact UI elements)
        // 1. Navigate to patient search
        // 2. Search for patient by patientNo
        // 3. Click PDF export button
        // 4. Wait for PDF download

        console.log('  ⚠ Automated capture not yet implemented');
        console.log('  Please use the interactive mode instead (run without --auto flag)');

      } catch (error) {
        console.error(`  ✗ Error capturing ${patientNo}:`, error.message);
      }
    }

  } catch (error) {
    console.error('\n✗ FATAL ERROR:', error.message);
  } finally {
    await context.close();
    await browser.close();
  }
}

// ============================================================================
// RUN THE CAPTURE
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const isAutomated = args.includes('--auto');

  if (isAutomated) {
    console.log('⚠ Automated mode not yet fully implemented');
    console.log('Please use interactive mode for now.\n');
    capturePatientPDFAutomated().catch(error => {
      console.error('\n✗ FATAL ERROR:', error);
      process.exit(1);
    });
  } else {
    capturePatientPDF().catch(error => {
      console.error('\n✗ FATAL ERROR:', error);
      process.exit(1);
    });
  }
}

module.exports = { capturePatientPDF };
