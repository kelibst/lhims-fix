/**
 * LHIMS Patient PDF-ONLY Extraction Script
 *
 * Extracts ONLY PDF files for patients (no JSON data extraction).
 * Uses browser download method for reliable PDF downloads.
 *
 * Usage:
 *   node scripts/extract-patient-pdf-only.js [patient-list-file]
 *
 * Examples:
 *   node scripts/extract-patient-pdf-only.js
 *   node scripts/extract-patient-pdf-only.js test-patient-list.txt
 *
 * This script will:
 * 1. Login to LHIMS
 * 2. For each patient in the list:
 *    - Navigate to patient record
 *    - Generate and download OPD PDF (consolidated consultations)
 *    - Generate and download IPD PDFs (one per admission)
 *    - Save to data/patient-pdfs/
 * 3. Track progress and handle errors
 * 4. Resume from last successful extraction
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

  // Output directories
  pdfOutputDir: path.join(__dirname, '..', 'data', 'patient-pdfs'),
  errorLogFile: path.join(__dirname, '..', 'pdf-extraction-errors.log'),
  progressFile: path.join(__dirname, '..', 'pdf-extraction-progress.json'),

  // Patient list file (can be overridden by command-line argument)
  patientListFile: (() => {
    // Check for command-line argument
    if (process.argv[2]) {
      return path.join(__dirname, '..', process.argv[2]);
    }
    // Use master list if available
    if (fs.existsSync(path.join(__dirname, '..', 'master-patient-list.txt'))) {
      return path.join(__dirname, '..', 'master-patient-list.txt');
    }
    return path.join(__dirname, '..', 'patient-list.txt');
  })(),

  // Browser settings
  headless: false,
  timeout: 60000,

  // Session management
  sessionRefreshInterval: 5 * 60 * 1000, // 5 minutes
  maxRetries: 3,

  // Download timeout (wait up to 30 seconds for PDF to generate)
  downloadTimeout: 30000,
};

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

async function extractPatientPDFs() {
  console.log('='.repeat(70));
  console.log('LHIMS PATIENT PDF-ONLY EXTRACTION');
  console.log('='.repeat(70));
  console.log('');

  // Get patient list
  const patientList = getPatientList();
  console.log(`📋 Patients to extract: ${patientList.length}`);
  console.log(`📁 Output directory: ${CONFIG.pdfOutputDir}`);
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.pdfOutputDir)) {
    fs.mkdirSync(CONFIG.pdfOutputDir, { recursive: true });
  }

  // Load progress (to resume from last position)
  const progress = loadProgress();
  console.log(`📊 Progress: ${progress.completed.length} already extracted`);
  console.log('');

  // Launch browser with download support
  console.log('[1/3] Launching browser...');
  const browser = await chromium.launch({
    headless: CONFIG.headless,
  });

  const context = await browser.newContext({
    acceptDownloads: true
  });

  const page = await context.newPage();

  try {
    // Login
    console.log('[2/3] Logging into LHIMS...');
    await login(page);
    console.log('      ✓ Login successful');
    console.log('');

    // Extract PDFs for each patient
    console.log('[3/3] Extracting patient PDFs...');
    console.log('');

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let i = 0; i < patientList.length; i++) {
      const patientNo = patientList[i];

      // Skip if already completed
      if (progress.completed.includes(patientNo)) {
        console.log(`[${i + 1}/${patientList.length}] ${patientNo}: Already extracted, skipping`);
        skippedCount++;
        continue;
      }

      console.log(`[${i + 1}/${patientList.length}] Patient: ${patientNo}`);

      try {
        // Check session validity every few patients
        if (i > 0 && i % 10 === 0) {
          const sessionValid = await isSessionValid(page);
          if (!sessionValid) {
            console.log('      → Session expired, re-logging in...');
            await login(page);
          }
        }

        await extractSinglePatientPDF(page, patientNo);

        // Mark as completed
        progress.completed.push(patientNo);
        saveProgress(progress);

        successCount++;
        console.log(`✓ Complete: ${patientNo}`);

      } catch (error) {
        errorCount++;
        const errorMsg = `${patientNo}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`✗ Error: ${patientNo} - ${error.message}`);
        logError(errorMsg);

        // Continue with next patient
      }

      console.log('');
    }

    // Final summary
    console.log('='.repeat(70));
    console.log('EXTRACTION COMPLETE');
    console.log('='.repeat(70));
    console.log(`Total patients:       ${patientList.length}`);
    console.log(`Successful:           ${successCount}`);
    console.log(`Skipped (already done): ${skippedCount}`);
    console.log(`Errors:               ${errorCount}`);
    console.log('');

    if (errors.length > 0) {
      console.log('Errors logged to:', CONFIG.errorLogFile);
    }

  } catch (error) {
    console.error('✗ FATAL ERROR:');
    console.error(error);
  } finally {
    await browser.close();
  }
}

// ============================================================================
// PATIENT PDF EXTRACTION
// ============================================================================

async function extractSinglePatientPDF(page, patientNo) {
  // Check if PDFs already exist (skip if already extracted)
  const opdPdfPath = path.join(CONFIG.pdfOutputDir, `${patientNo}-OPD.pdf`);
  const ipdPattern = new RegExp(`^${patientNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-IPD-ADMISSION-\\d+\\.pdf$`);

  const existingFiles = fs.existsSync(CONFIG.pdfOutputDir)
    ? fs.readdirSync(CONFIG.pdfOutputDir)
    : [];

  const opdExists = fs.existsSync(opdPdfPath);
  const ipdExists = existingFiles.some(file => ipdPattern.test(file));

  if (opdExists && ipdExists) {
    console.log('  → PDFs already exist, skipping');
    return;
  }

  // Step 1: Search patient and get internal ID
  console.log('  [1/5] Searching patient...');
  const patientId = await searchPatient(page, patientNo);
  console.log(`      → Patient ID: ${patientId}`);

  // Step 2: Navigate to patient record page
  console.log('  [2/5] Opening patient record...');
  await openPatientRecord(page, patientId);

  let opdPdfGenerated = false;
  let ipdPdfsGenerated = 0;

  // Step 3: Generate and download OPD PDF (consolidated consultations)
  if (!opdExists) {
    console.log('  [3/5] Generating OPD PDF (consultations)...');
    try {
      await downloadOPDPDF(page, patientNo, patientId);
      opdPdfGenerated = true;

      if (fs.existsSync(opdPdfPath)) {
        const stats = fs.statSync(opdPdfPath);
        console.log(`      → OPD PDF saved: ${formatBytes(stats.size)}`);
      }
    } catch (error) {
      console.log(`      ⚠ OPD PDF failed: ${error.message}`);
    }
  } else {
    console.log('  [3/5] OPD PDF already exists, skipping');
  }

  // Step 4: Generate and download IPD PDFs (one per admission)
  if (!ipdExists) {
    console.log('  [4/5] Generating IPD PDFs (admissions)...');
    try {
      ipdPdfsGenerated = await downloadIPDPDFs(page, patientNo, patientId);
      if (ipdPdfsGenerated > 0) {
        console.log(`      → ${ipdPdfsGenerated} IPD PDF(s) saved`);
      } else {
        console.log(`      → No IPD admissions found`);
      }
    } catch (error) {
      console.log(`      ⚠ IPD PDFs failed: ${error.message}`);
    }
  } else {
    console.log('  [4/5] IPD PDFs already exist, skipping');
  }

  // Step 5: Summary
  console.log('  [5/5] Summary...');
  const totalPdfs = (opdPdfGenerated ? 1 : 0) + ipdPdfsGenerated;
  if (totalPdfs > 0) {
    console.log(`      → Total PDFs generated: ${totalPdfs} (OPD: ${opdPdfGenerated ? 1 : 0}, IPD: ${ipdPdfsGenerated})`);
  } else {
    console.log(`      → No new PDFs generated`);
  }
}

// ============================================================================
// LHIMS INTERACTION FUNCTIONS
// ============================================================================

async function searchPatient(page, patientNo) {
  const response = await page.evaluate(async (patientNo) => {
    const formData = new URLSearchParams();
    formData.append('fnam', '');
    formData.append('pregno', patientNo);
    formData.append('InputPatientClinicSrting', '');
    formData.append('InputPatientClinic', '');
    formData.append('area', '');
    formData.append('iPatientID', '');
    formData.append('iPatientMobileNo', '');
    formData.append('iPatientUniqueNo', '');
    formData.append('idPatientTag', '');

    const res = await fetch('http://10.10.0.59/lhims_182/searchPatientResult.php', {
      method: 'POST',
      body: formData
    });

    return await res.text();
  }, patientNo);

  // Search returns multiple patients - find EXACT match
  const rows = response.split('<tr');

  for (const row of rows) {
    if (row.includes(patientNo)) {
      const match = row.match(/patient_id[=\s]*['":]?\s*(\d+)/i);
      if (match) {
        return match[1];
      }
    }
  }

  throw new Error(`Patient not found: ${patientNo}`);
}

async function openPatientRecord(page, patientId) {
  const recordUrl = `http://10.10.0.59/lhims_182/patientRecord.php?patient_id=${patientId}`;
  await page.goto(recordUrl, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
  await page.waitForTimeout(3000);
}

async function downloadOPDPDF(page, patientNo, patientId) {
  // Get consultations data
  console.log('      → Getting patient consultations...');

  const consultations = await page.evaluate(async (patientId) => {
    const formData = new URLSearchParams();
    formData.append('_isAjax', 'true');
    formData.append('iPatientID', patientId);
    formData.append('draw', '1');
    formData.append('start', '0');
    formData.append('length', '1000');

    const res = await fetch('http://10.10.0.59/lhims_182/getDynamicPatientEncounterDetails.php', {
      method: 'POST',
      body: formData
    });

    const text = await res.text();
    try {
      const result = JSON.parse(text);
      return result.data || [];
    } catch {
      return [];
    }
  }, patientId);

  if (!consultations || consultations.length === 0) {
    throw new Error('No consultations found for OPD PDF');
  }

  console.log(`      → Found ${consultations.length} consultations`);

  // Extract consultation IDs and service IDs
  const consultationIDs = [];
  const serviceIDs = [];

  for (const consultation of consultations) {
    let consultId = null;
    let serviceId = null;

    if (Array.isArray(consultation)) {
      const html = consultation[4] || '';
      const scheduleMatch = html.match(/data-schedule-id='(\d+)'/);
      consultId = scheduleMatch ? scheduleMatch[1] : null;
      serviceId = consultation[9] || '0';
    }

    if (consultId) {
      consultationIDs.push(consultId);
      serviceIDs.push(serviceId);
    }
  }

  if (consultationIDs.length === 0) {
    throw new Error('Could not extract consultation IDs from response');
  }

  console.log('      → Requesting PDF export from LHIMS...');
  console.log(`      → Sending ${consultationIDs.length} consultation/schedule IDs`);

  // Get PDF token
  const token = await page.evaluate(async (data) => {
    const { patientId, consultationIDs, serviceIDs } = data;

    const formData = new URLSearchParams();
    formData.append('_isAjax', 'true');

    consultationIDs.forEach(id => {
      formData.append('aConsultationID[]', id);
    });

    serviceIDs.forEach(id => {
      formData.append('aServiceID[]', id);
    });

    formData.append('iStaffClinicID', '2');
    formData.append('iLoggedInStaffID', '411');
    formData.append('iPatientID', patientId);
    formData.append('bPrintAllPrintableEntities', 'true');

    const res = await fetch('http://10.10.0.59/lhims_182/exportServiceReportsInSinglePDF.php', {
      method: 'POST',
      body: formData
    });

    return await res.text();
  }, { patientId, consultationIDs, serviceIDs });

  if (!token || token.trim().length === 0) {
    throw new Error('Failed to get PDF token from LHIMS');
  }

  console.log('      → Downloading PDF...');

  // Download using browser fetch (reliable method)
  const pdfUrl = `http://10.10.0.59/lhims_182/viewFile.php?token=${encodeURIComponent(token.trim())}`;
  const pdfPath = path.join(CONFIG.pdfOutputDir, `${patientNo}-OPD.pdf`);

  const response = await page.request.fetch(pdfUrl);

  if (!response.ok()) {
    throw new Error(`PDF download failed with status: ${response.status()}`);
  }

  const pdfBuffer = await response.body();

  // Verify it's a valid PDF
  const first4 = pdfBuffer.slice(0, 4).toString();
  if (first4 !== '%PDF') {
    throw new Error('Downloaded file is not a valid PDF');
  }

  fs.writeFileSync(pdfPath, pdfBuffer);

  return pdfPath;
}

async function downloadIPDPDFs(page, patientNo, patientId) {
  console.log('      → Getting patient admissions...');

  // Get admissions data
  const admissions = await page.evaluate(async (patientId) => {
    const url = `http://10.10.0.59/lhims_182/ajaxIPDManager.php?sFlag=patientAllAdmitDetails&_isAjax=true&iPatientID=${patientId}`;

    const res = await fetch(url);
    const text = await res.text();
    try {
      const result = JSON.parse(text);
      return result || [];
    } catch {
      return [];
    }
  }, patientId);

  if (!admissions || admissions.length === 0) {
    console.log('      → No IPD admissions found');
    return 0;
  }

  console.log(`      → Found ${admissions.length} admission(s)`);

  let successCount = 0;

  // Process each admission
  for (let i = 0; i < admissions.length; i++) {
    const admission = admissions[i];
    const admitId = admission.admit_id || admission.iAdmitID || admission.admission_id;

    if (!admitId) {
      console.log(`      ⚠ Admission ${i + 1}: No admit_id found, skipping`);
      continue;
    }

    const admissionDate = admission.admission_date || admission.dAdmissionDate || 'unknown';
    console.log(`      → Processing admission ${i + 1}/${admissions.length} (ID: ${admitId}, Date: ${admissionDate})`);

    try {
      // Get PDF token for this admission
      const token = await page.evaluate(async (data) => {
        const { patientId, admitId } = data;

        const formData = new URLSearchParams();
        formData.append('_isAjax', 'true');
        formData.append('iAdmitID', admitId);
        formData.append('iPatientID', patientId);
        formData.append('iStaffClinicID', '2');
        formData.append('iLoggedInStaffID', '411');
        formData.append('bPrintAllPrintableEntities', 'true');

        const res = await fetch('http://10.10.0.59/lhims_182/exportServiceReportsInSinglePDF.php', {
          method: 'POST',
          body: formData
        });

        return await res.text();
      }, { patientId, admitId });

      if (!token || token.trim().length === 0) {
        console.log(`      ⚠ Admission ${admitId}: Failed to get PDF token`);
        continue;
      }

      // Download using browser fetch (reliable method)
      const pdfUrl = `http://10.10.0.59/lhims_182/viewFile.php?token=${encodeURIComponent(token.trim())}`;
      const pdfPath = path.join(CONFIG.pdfOutputDir, `${patientNo}-IPD-ADMISSION-${admitId}.pdf`);

      const response = await page.request.fetch(pdfUrl);

      if (!response.ok()) {
        console.log(`      ⚠ Admission ${admitId}: PDF download failed (status: ${response.status()})`);
        continue;
      }

      const pdfBuffer = await response.body();

      // Verify it's a valid PDF
      const first4 = pdfBuffer.slice(0, 4).toString();
      if (first4 !== '%PDF') {
        console.log(`      ⚠ Admission ${admitId}: Downloaded file is not a valid PDF`);
        continue;
      }

      fs.writeFileSync(pdfPath, pdfBuffer);

      const stats = fs.statSync(pdfPath);
      console.log(`      ✓ Admission ${admitId}: PDF saved (${formatBytes(stats.size)})`);

      successCount++;
    } catch (error) {
      console.log(`      ⚠ Admission ${admitId}: Error - ${error.message}`);
    }
  }

  return successCount;
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

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

async function isSessionValid(page) {
  const currentUrl = page.url();
  return !currentUrl.includes('login.php');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getPatientList() {
  if (!fs.existsSync(CONFIG.patientListFile)) {
    console.error(`✗ Patient list file not found: ${CONFIG.patientListFile}`);
    console.error('  Please create a patient list file with one patient number per line.');
    process.exit(1);
  }

  const content = fs.readFileSync(CONFIG.patientListFile, 'utf8');
  const patients = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  if (patients.length === 0) {
    console.error('✗ Patient list is empty');
    process.exit(1);
  }

  return patients;
}

function loadProgress() {
  if (fs.existsSync(CONFIG.progressFile)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG.progressFile, 'utf8'));
    } catch {
      return { completed: [], started_at: new Date().toISOString() };
    }
  }
  return { completed: [], started_at: new Date().toISOString() };
}

function saveProgress(progress) {
  progress.last_updated = new Date().toISOString();
  fs.writeFileSync(CONFIG.progressFile, JSON.stringify(progress, null, 2));
}

function logError(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(CONFIG.errorLogFile, logMessage);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// RUN
// ============================================================================

if (require.main === module) {
  extractPatientPDFs().catch(error => {
    console.error('\n✗ FATAL ERROR:');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { extractPatientPDFs };
