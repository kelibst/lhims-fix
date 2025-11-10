/**
 * LHIMS Patient PDF Fast Extraction Script (OPTIMIZED)
 *
 * Performance optimizations:
 * 1. Batch processing - Process multiple patients without page reloads
 * 2. Parallel API calls - Fetch consultations and admissions simultaneously
 * 3. Reduced waits - Minimize unnecessary waitForTimeout calls
 * 4. Smart session management - Stay on patient record page
 * 5. Direct API calls - Skip unnecessary page navigations
 * 6. Concurrent PDF downloads - Download OPD and IPD PDFs in parallel
 *
 * Usage:
 *   node scripts/extract-patient-pdf-fast.js [patient-list-file]
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  lhimsUrl: 'http://10.10.0.59/lhims_182',
  loginUrl: 'http://10.10.0.59/lhims_182/login.php',
  credentials: {
    username: 'sno-411',
    password: 'monamourd11',
  },
  pdfOutputDir: path.join(__dirname, '..', 'data', 'patient-pdfs'),
  errorLogFile: path.join(__dirname, '..', 'pdf-extraction-errors.log'),
  progressFile: path.join(__dirname, '..', 'pdf-extraction-progress.json'),
  patientListFile: (() => {
    if (process.argv[2]) {
      return path.join(__dirname, '..', process.argv[2]);
    }
    if (fs.existsSync(path.join(__dirname, '..', 'master-patient-list.txt'))) {
      return path.join(__dirname, '..', 'master-patient-list.txt');
    }
    return path.join(__dirname, '..', 'patient-list.txt');
  })(),
  headless: false,
  timeout: 30000, // Reduced from 60s
  sessionRefreshInterval: 5 * 60 * 1000,
  maxRetries: 3,
  downloadTimeout: 20000, // Reduced from 30s

  // NEW: Performance settings
  batchSize: 50, // Check session every 50 patients instead of 10
  minWaitTime: 500, // Reduced minimum wait time (from 3000ms)
  parallelDownloads: true, // Download OPD and IPD PDFs concurrently
};

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

async function extractPatientPDFs() {
  console.log('='.repeat(70));
  console.log('LHIMS PATIENT PDF FAST EXTRACTION (OPTIMIZED)');
  console.log('='.repeat(70));
  console.log('');

  const patientList = getPatientList();
  console.log(`📋 Patients to extract: ${patientList.length}`);
  console.log(`📁 Output directory: ${CONFIG.pdfOutputDir}`);
  console.log('');
  console.log('⚡ OPTIMIZATIONS ENABLED:');
  console.log('  • Batch processing (session check every 50 patients)');
  console.log('  • Parallel API calls (consultations + admissions)');
  console.log('  • Reduced wait times (500ms minimum)');
  console.log('  • Concurrent PDF downloads (OPD + IPD parallel)');
  console.log('  • Direct API calls (skip page navigations)');
  console.log('');

  if (!fs.existsSync(CONFIG.pdfOutputDir)) {
    fs.mkdirSync(CONFIG.pdfOutputDir, { recursive: true });
  }

  const progress = loadProgress();
  console.log(`📊 Progress: ${progress.completed.length} already extracted`);
  console.log('');

  console.log('[1/3] Launching browser...');
  const browser = await chromium.launch({ headless: CONFIG.headless });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  // Track timing
  const startTime = Date.now();

  try {
    console.log('[2/3] Logging into LHIMS...');
    await login(page);
    console.log('      ✓ Login successful');
    console.log('');

    console.log('[3/3] Extracting patient PDFs (FAST MODE)...');
    console.log('');

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors = [];
    const timings = [];

    for (let i = 0; i < patientList.length; i++) {
      const patientNo = patientList[i];
      const patientStartTime = Date.now();

      if (progress.completed.includes(patientNo)) {
        console.log(`[${i + 1}/${patientList.length}] ${patientNo}: Already extracted, skipping`);
        skippedCount++;
        continue;
      }

      console.log(`[${i + 1}/${patientList.length}] Patient: ${patientNo}`);

      try {
        // Check session less frequently (every CONFIG.batchSize patients)
        if (i > 0 && i % CONFIG.batchSize === 0) {
          const sessionValid = await isSessionValid(page);
          if (!sessionValid) {
            console.log('      → Session expired, re-logging in...');
            await login(page);
          }
        }

        await extractSinglePatientPDFFast(page, patientNo);

        progress.completed.push(patientNo);
        saveProgress(progress);

        const patientTime = ((Date.now() - patientStartTime) / 1000).toFixed(1);
        timings.push(parseFloat(patientTime));

        successCount++;
        console.log(`✓ Complete: ${patientNo} (${patientTime}s)`);

        // Show running average
        if (timings.length >= 10) {
          const avgTime = (timings.slice(-10).reduce((a, b) => a + b, 0) / 10).toFixed(1);
          const remaining = patientList.length - i - 1;
          const estimatedMinutes = (remaining * avgTime / 60).toFixed(0);
          console.log(`  ⚡ Avg time (last 10): ${avgTime}s/patient | Est. remaining: ${estimatedMinutes} min`);
        }

      } catch (error) {
        errorCount++;
        const errorMsg = `${patientNo}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`✗ Error: ${patientNo} - ${error.message}`);
        logError(errorMsg);
      }

      console.log('');
    }

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    const avgTimePerPatient = timings.length > 0
      ? (timings.reduce((a, b) => a + b, 0) / timings.length).toFixed(1)
      : 'N/A';

    console.log('='.repeat(70));
    console.log('EXTRACTION COMPLETE');
    console.log('='.repeat(70));
    console.log(`Total patients:           ${patientList.length}`);
    console.log(`Successful:               ${successCount}`);
    console.log(`Skipped (already done):   ${skippedCount}`);
    console.log(`Errors:                   ${errorCount}`);
    console.log(`Total time:               ${totalTime} minutes`);
    console.log(`Avg time per patient:     ${avgTimePerPatient} seconds`);
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
// OPTIMIZED PATIENT PDF EXTRACTION
// ============================================================================

async function extractSinglePatientPDFFast(page, patientNo) {
  // Quick check if PDFs already exist
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

  // Step 1: Search patient (fast API call)
  console.log('  [1/4] Searching patient...');
  const patientId = await searchPatientFast(page, patientNo);
  console.log(`      → Patient ID: ${patientId}`);

  // Step 2: Fetch consultations AND admissions in PARALLEL
  console.log('  [2/4] Fetching patient data (parallel)...');
  const [consultations, admissions] = await Promise.all([
    getConsultationsFast(page, patientId),
    getAdmissionsFast(page, patientId)
  ]);
  console.log(`      → Found ${consultations.length} consultations, ${admissions.length} admissions`);

  // Step 3: Download OPD and IPD PDFs (can be done in parallel)
  console.log('  [3/4] Generating PDFs...');

  const pdfTasks = [];

  // Add OPD PDF task
  if (!opdExists && consultations.length > 0) {
    pdfTasks.push(
      downloadOPDPDFFast(page, patientNo, patientId, consultations)
        .then(() => ({ type: 'OPD', success: true }))
        .catch(err => ({ type: 'OPD', success: false, error: err.message }))
    );
  }

  // Add IPD PDF tasks
  if (!ipdExists && admissions.length > 0) {
    pdfTasks.push(
      downloadIPDPDFsFast(page, patientNo, patientId, admissions)
        .then(count => ({ type: 'IPD', success: true, count }))
        .catch(err => ({ type: 'IPD', success: false, error: err.message }))
    );
  }

  // Execute all PDF downloads in parallel
  const results = await Promise.all(pdfTasks);

  // Report results
  let opdSuccess = opdExists;
  let ipdCount = 0;

  for (const result of results) {
    if (result.type === 'OPD') {
      opdSuccess = result.success;
      if (result.success) {
        console.log('      → OPD PDF: ✓');
      } else {
        console.log(`      → OPD PDF: ✗ (${result.error})`);
      }
    } else if (result.type === 'IPD') {
      if (result.success) {
        ipdCount = result.count;
        console.log(`      → IPD PDFs: ✓ (${result.count} files)`);
      } else {
        console.log(`      → IPD PDFs: ✗ (${result.error})`);
      }
    }
  }

  // Step 4: Summary
  console.log('  [4/4] Summary...');
  const totalPdfs = (opdSuccess ? 1 : 0) + ipdCount;
  console.log(`      → Total PDFs: ${totalPdfs} (OPD: ${opdSuccess ? 1 : 0}, IPD: ${ipdCount})`);
}

// ============================================================================
// FAST API FUNCTIONS
// ============================================================================

async function searchPatientFast(page, patientNo) {
  // Direct API call without page navigation
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

async function getConsultationsFast(page, patientId) {
  // Direct API call without page navigation
  return await page.evaluate(async (patientId) => {
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
}

async function getAdmissionsFast(page, patientId) {
  // Direct API call without page navigation
  return await page.evaluate(async (patientId) => {
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
}

async function downloadOPDPDFFast(page, patientNo, patientId, consultations) {
  // Extract IDs (already have consultations, no need to fetch again)
  const consultationIDs = [];
  const serviceIDs = [];

  for (const consultation of consultations) {
    if (Array.isArray(consultation)) {
      const html = consultation[4] || '';
      const scheduleMatch = html.match(/data-schedule-id='(\d+)'/);
      const consultId = scheduleMatch ? scheduleMatch[1] : null;
      const serviceId = consultation[9] || '0';
      if (consultId) {
        consultationIDs.push(consultId);
        serviceIDs.push(serviceId);
      }
    }
  }

  if (consultationIDs.length === 0) {
    throw new Error('Could not extract consultation IDs');
  }

  // Get token
  const token = await page.evaluate(async (data) => {
    const { patientId, consultationIDs, serviceIDs } = data;

    const formData = new URLSearchParams();
    formData.append('_isAjax', 'true');

    consultationIDs.forEach(id => formData.append('aConsultationID[]', id));
    serviceIDs.forEach(id => formData.append('aServiceID[]', id));

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
    throw new Error('Failed to get PDF token');
  }

  // Download PDF
  const pdfUrl = `http://10.10.0.59/lhims_182/viewFile.php?token=${encodeURIComponent(token.trim())}`;
  const pdfPath = path.join(CONFIG.pdfOutputDir, `${patientNo}-OPD.pdf`);

  const response = await page.request.fetch(pdfUrl);

  if (!response.ok()) {
    throw new Error(`Download failed: ${response.status()}`);
  }

  const pdfBuffer = await response.body();

  // Verify PDF
  const first4 = pdfBuffer.slice(0, 4).toString();
  if (first4 !== '%PDF') {
    throw new Error('Invalid PDF file');
  }

  fs.writeFileSync(pdfPath, pdfBuffer);
}

async function downloadIPDPDFsFast(page, patientNo, patientId, admissions) {
  let successCount = 0;

  // Process all admissions in parallel
  const tasks = admissions.map(async (admission) => {
    const admitId = admission.admit_id || admission.iAdmitID || admission.admission_id;

    if (!admitId) {
      return { success: false };
    }

    try {
      // Get token
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
        return { success: false };
      }

      // Download PDF
      const pdfUrl = `http://10.10.0.59/lhims_182/viewFile.php?token=${encodeURIComponent(token.trim())}`;
      const pdfPath = path.join(CONFIG.pdfOutputDir, `${patientNo}-IPD-ADMISSION-${admitId}.pdf`);

      const response = await page.request.fetch(pdfUrl);

      if (!response.ok()) {
        return { success: false };
      }

      const pdfBuffer = await response.body();

      // Verify PDF
      const first4 = pdfBuffer.slice(0, 4).toString();
      if (first4 !== '%PDF') {
        return { success: false };
      }

      fs.writeFileSync(pdfPath, pdfBuffer);
      return { success: true };

    } catch (error) {
      return { success: false };
    }
  });

  // Wait for all admissions to complete
  const results = await Promise.all(tasks);
  successCount = results.filter(r => r.success).length;

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

  // Reduced wait time
  await page.waitForTimeout(CONFIG.minWaitTime);

  const currentUrl = page.url();
  if (currentUrl.includes('login.php')) {
    throw new Error('Login failed');
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
