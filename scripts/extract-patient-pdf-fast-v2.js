/**
 * LHIMS Patient PDF Fast Extraction Script v2 (OPTIMIZED)
 *
 * Version 2 improvements:
 * - Fixed IPD PDF download logic
 * - Organizes PDFs into patient-specific folders: data/patient-pdfs/PATIENT-NO/
 * - All optimizations from v1 maintained
 *
 * Usage:
 *   node scripts/extract-patient-pdf-fast-v2.js [patient-list-file]
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
  timeout: 30000,
  sessionRefreshInterval: 5 * 60 * 1000,
  maxRetries: 3,
  downloadTimeout: 20000,

  // Performance settings
  batchSize: 50,
  minWaitTime: 500,
  parallelDownloads: true,
};

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

async function extractPatientPDFs() {
  console.log('='.repeat(70));
  console.log('LHIMS PATIENT PDF FAST EXTRACTION v2 (OPTIMIZED)');
  console.log('='.repeat(70));
  console.log('');

  const patientList = getPatientList();
  console.log(`📋 Patients to extract: ${patientList.length}`);
  console.log(`📁 Output directory: ${CONFIG.pdfOutputDir}`);
  console.log('');
  console.log('⚡ OPTIMIZATIONS ENABLED:');
  console.log('  • Organized folder structure (one folder per patient)');
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

  const startTime = Date.now();

  try {
    console.log('[2/3] Logging into LHIMS...');
    await login(page);
    console.log('      ✓ Login successful');
    console.log('');

    console.log('[3/3] Extracting patient PDFs (FAST MODE v2)...');
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
  // Create patient-specific folder
  const patientDir = path.join(CONFIG.pdfOutputDir, patientNo);
  if (!fs.existsSync(patientDir)) {
    fs.mkdirSync(patientDir, { recursive: true });
  }

  // Check if PDFs already exist
  const opdPdfPath = path.join(patientDir, `${patientNo}-OPD.pdf`);
  const ipdPattern = new RegExp(`^${patientNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-IPD-ADMISSION-\\d+\\.pdf$`);

  const existingFiles = fs.existsSync(patientDir)
    ? fs.readdirSync(patientDir)
    : [];

  const opdExists = fs.existsSync(opdPdfPath);
  const hasIpdFiles = existingFiles.some(file => ipdPattern.test(file));

  // Step 1: Search patient
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

  // Step 3: Download PDFs
  console.log('  [3/4] Generating PDFs...');

  const pdfTasks = [];

  // Add OPD PDF task
  if (!opdExists && consultations.length > 0) {
    pdfTasks.push(
      downloadOPDPDFFast(page, patientNo, patientId, consultations, patientDir)
        .then(() => ({ type: 'OPD', success: true }))
        .catch(err => ({ type: 'OPD', success: false, error: err.message }))
    );
  } else if (opdExists) {
    console.log('      → OPD PDF already exists');
  } else if (consultations.length === 0) {
    console.log('      → No consultations found for OPD PDF');
  }

  // Add IPD PDF tasks - ALWAYS download if admissions exist
  if (admissions.length > 0) {
    pdfTasks.push(
      downloadIPDPDFsFast(page, patientNo, patientId, admissions, patientDir)
        .then(count => ({ type: 'IPD', success: true, count }))
        .catch(err => ({ type: 'IPD', success: false, error: err.message }))
    );
  } else {
    console.log('      → No IPD admissions found');
  }

  // Execute all PDF downloads in parallel
  if (pdfTasks.length > 0) {
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
  }

  // Step 4: Summary
  console.log('  [4/4] Summary...');
  const finalFiles = fs.readdirSync(patientDir);
  const opdCount = finalFiles.filter(f => f.includes('-OPD.pdf')).length;
  const ipdCount = finalFiles.filter(f => f.includes('-IPD-ADMISSION-')).length;
  console.log(`      → Total PDFs: ${opdCount + ipdCount} (OPD: ${opdCount}, IPD: ${ipdCount})`);
  console.log(`      → Saved to: ${patientDir}`);
}

// ============================================================================
// FAST API FUNCTIONS
// ============================================================================

async function searchPatientFast(page, patientNo) {
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

async function downloadOPDPDFFast(page, patientNo, patientId, consultations, patientDir) {
  // Extract IDs
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
  const pdfPath = path.join(patientDir, `${patientNo}-OPD.pdf`);

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

async function downloadIPDPDFsFast(page, patientNo, patientId, admissions, patientDir) {
  let successCount = 0;
  const errors = [];

  // Process all admissions sequentially
  for (const admission of admissions) {
    const admitId = admission.admit_id || admission.iAdmitID || admission.admission_id;

    if (!admitId) {
      continue;
    }

    const pdfPath = path.join(patientDir, `${patientNo}-IPD-ADMISSION-${admitId}.pdf`);

    // Skip if already exists
    if (fs.existsSync(pdfPath)) {
      successCount++;
      continue;
    }

    try {
      // Extract required fields from admission
      const bedId = admission.bed_id || '';
      const visitNo = admission.visit_no || `ADMT-${admitId}`;

      // Convert date format: 2025-08-30 -> 30-08-2025
      let admitDate = admission.admit_date || admission.dAdmitDate || '';
      if (admitDate && admitDate.includes('-')) {
        const parts = admitDate.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          admitDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      // Extract time from bed_from_date: 2025-08-30 15:17:00 -> 15:17:00
      let admitTime = '';
      const bedFromDate = admission.bed_from_date || admission.dBedFromDate || '';
      if (bedFromDate && bedFromDate.includes(' ')) {
        admitTime = bedFromDate.split(' ')[1] || '';
      }

      // Call the CORRECT IPD export endpoint: exportAdmissionSummaryPDF.php
      const pdfBuffer = await page.evaluate(async (data) => {
        const { patientId, admitId, bedId, visitNo, admitDate, admitTime } = data;

        const formData = new URLSearchParams();
        formData.append('idExportAdmissionSummaryAdmitID', admitId);
        formData.append('idExportAdmissionSummaryPatientID', patientId);
        formData.append('idExportAdmissionSummaryBedID', bedId);
        formData.append('idExportAdmissionSummaryVisitNo', visitNo);
        formData.append('idExportAdmissionSummaryAdmitDate', admitDate);
        formData.append('idExportAdmissionSummaryAdmitTime', admitTime);

        // Include all sections (matching UI checkboxes)
        formData.append('idExportAdmissionSummaryTreatmentDetails', '1');
        formData.append('idExportAdmissionSummaryRecommendation', '6');
        formData.append('idExportAdmissionSummaryPrescription', '3');
        formData.append('idExportAdmissionSummaryVitals', '4');
        formData.append('idExportAdmissionSummaryDoctorNurseNotes', '7');
        formData.append('idExportAdmissionSummaryChiefComplaints', '10');
        formData.append('idExportAdmissionSummaryAdditionalServices', '11');
        formData.append('idExportAdmissionSummaryDiagnosis', '12');
        formData.append('idExportAdmissionSummaryOperations', '13');
        formData.append('idExportAdmissionSummaryFluidMonitoring', '14');
        formData.append('idExportAdmissionSummaryDiet', '15');
        formData.append('idExportAdmissionSummaryClinicalNotes', '16');

        // Use the correct endpoint for IPD
        const res = await fetch('http://10.10.0.59/lhims_182/exportAdmissionSummaryPDF.php', {
          method: 'POST',
          body: formData
        });

        // This endpoint returns the PDF directly, not a token
        const blob = await res.blob();
        const arrayBuffer = await blob.arrayBuffer();
        return Array.from(new Uint8Array(arrayBuffer));
      }, { patientId, admitId, bedId, visitNo, admitDate, admitTime });

      // Convert array back to buffer
      const pdfBufferNode = Buffer.from(pdfBuffer);

      // Verify PDF
      const first4 = pdfBufferNode.slice(0, 4).toString();
      if (first4 !== '%PDF') {
        errors.push(`Admission ${admitId}: Invalid PDF`);
        continue;
      }

      // Check if PDF is empty (0 pages)
      const pdfContent = pdfBufferNode.toString();
      if (pdfContent.includes('/Count 0')) {
        errors.push(`Admission ${admitId}: Empty PDF (no data)`);
        continue;
      }

      fs.writeFileSync(pdfPath, pdfBufferNode);
      successCount++;

    } catch (error) {
      errors.push(`Admission ${admitId}: ${error.message}`);
    }
  }

  if (successCount === 0 && errors.length > 0) {
    throw new Error(`All IPD downloads failed: ${errors.join(', ')}`);
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
