/**
 * LHIMS Patient IPD-ONLY Extraction (PRODUCTION)
 *
 * Extracts ONLY IPD (Inpatient) admission PDFs:
 * - Skips OPD (Outpatient) extraction completely
 * - Processes 3-5 patients simultaneously (configurable)
 * - Shares single login session across all concurrent operations
 * - Auto-resume from last completed patient
 * - Browser restart every 500 patients
 *
 * Usage:
 *   node scripts/extract-ipd-only.js [patient-list-file] [concurrency]
 *
 * Examples:
 *   node scripts/extract-ipd-only.js                    # Default: 3 concurrent
 *   node scripts/extract-ipd-only.js master-patient-list.txt 5  # 5 concurrent
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
  errorLogFile: path.join(__dirname, '..', 'ipd-extraction-errors.log'),
  progressFile: path.join(__dirname, '..', 'ipd-extraction-progress.json'),
  statsFile: path.join(__dirname, '..', 'ipd-extraction-stats.json'),
  patientListFile: (() => {
    if (process.argv[2] && !process.argv[2].match(/^\d+$/)) {
      return path.join(__dirname, '..', process.argv[2]);
    }
    if (fs.existsSync(path.join(__dirname, '..', 'master-patient-list.txt'))) {
      return path.join(__dirname, '..', 'master-patient-list.txt');
    }
    return path.join(__dirname, '..', 'patient-list.txt');
  })(),

  // Concurrency: how many patients to process at once
  // Can be overridden via command line: node script.js patientlist.txt 5
  concurrentPatients: (() => {
    const arg = process.argv.find(a => a.match(/^\d+$/));
    return arg ? parseInt(arg) : 3; // Default: 3 concurrent patients
  })(),

  headless: false,
  timeout: 30000,
  downloadTimeout: 20000,
  patientTimeout: 10 * 60 * 1000, // 10 minutes max per patient
  sessionCheckInterval: 50, // Check session every 50 patients
  maxRetries: 2,
};

// ============================================================================
// TIMEOUT HELPER
// ============================================================================

function createTimeout(ms, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message || `Timeout after ${ms}ms`)), ms);
  });
}

// ============================================================================
// STATISTICS & SHARED STATE
// ============================================================================

const STATS = {
  total: 0,
  processed: 0,
  successful: 0,
  failed: 0,
  skipped: 0,
  timed_out: 0,
  opd_created: 0,
  ipd_created: 0,
  opd_failed: 0,
  ipd_failed: 0,
  no_opd: 0,
  no_ipd: 0,
  start_time: null,
  end_time: null,
};

// Shared state for workers
let sharedContext = null;
let sharedMainPage = null;
let sharedProgress = null;
let sharedTimings = [];
let sessionCheckCounter = 0;

// ============================================================================
// WORKER PROCESS
// ============================================================================

async function workerProcess(workerId, patientQueue, totalPatients) {
  let processedCount = 0;

  while (patientQueue.length > 0) {
    const patientNo = patientQueue.shift();
    if (!patientNo) break;

    const patientIndex = totalPatients - patientQueue.length;
    const patientStartTime = Date.now();

    console.log(`[${patientIndex}/${totalPatients}] Patient: ${patientNo} (Worker ${workerId})`);

    let patientPage = null;

    try {
      // Check session periodically
      sessionCheckCounter++;
      if (sessionCheckCounter % CONFIG.sessionCheckInterval === 0) {
        const valid = await isSessionValid(sharedMainPage);
        if (!valid) {
          console.log(`→ Worker ${workerId}: Session expired, re-logging in...`);
          await login(sharedMainPage);
        }
      }

      // Create dedicated page for this patient
      patientPage = await sharedContext.newPage();

      // Navigate to LHIMS to activate session cookies
      await patientPage.goto(CONFIG.lhimsUrl, {
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.timeout
      }).catch(() => {});

      // Process with timeout
      const result = await Promise.race([
        extractSinglePatient(patientPage, patientNo),
        createTimeout(CONFIG.patientTimeout, `Timeout after 10 minutes`)
      ]);

      // Update stats
      STATS.processed++;
      processedCount++;
      if (result.success) STATS.successful++;
      else STATS.failed++;
      STATS.opd_created += result.opd_count;
      STATS.ipd_created += result.ipd_count;
      if (result.opd_failed) STATS.opd_failed++;
      if (result.ipd_failed) STATS.ipd_failed++;
      if (result.no_opd) STATS.no_opd++;
      if (result.no_ipd) STATS.no_ipd++;

      // Mark complete
      sharedProgress.completed.push(patientNo);
      saveProgress(sharedProgress);

      const elapsed = ((Date.now() - patientStartTime) / 1000).toFixed(1);
      sharedTimings.push(parseFloat(elapsed));

      console.log(`✓ ${patientNo} (${elapsed}s) - OPD: ${result.opd_count}, IPD: ${result.ipd_count}`);

      // Show stats every 10 patients
      if (STATS.processed % 10 === 0 && sharedTimings.length >= 10) {
        showStats(sharedTimings, patientIndex, totalPatients);
      }

    } catch (error) {
      const elapsed = ((Date.now() - patientStartTime) / 1000).toFixed(1);

      if (error.message.includes('Timeout')) {
        STATS.timed_out++;
        console.error(`⏱ ${patientNo} - TIMEOUT after ${elapsed}s (exceeded 10 minutes)`);
        logError(`${patientNo}: TIMEOUT after ${elapsed}s`);
      } else if (error.message.includes('Target page') || error.message.includes('page closed')) {
        STATS.failed++;
        console.error(`✗ ${patientNo} - Page closed (${elapsed}s)`);
        logError(`${patientNo}: Page closed - ${error.message}`);
      } else {
        STATS.failed++;
        console.error(`✗ ${patientNo} - ${error.message} (${elapsed}s)`);
        logError(`${patientNo}: ${error.message}`);
      }
    } finally {
      // Always close page
      if (patientPage) {
        await patientPage.close().catch(() => {});
      }
    }

    console.log('');
  }

  console.log(`→ Worker ${workerId}: Finished (processed ${processedCount} patients)`);
}

// ============================================================================
// MAIN EXTRACTION
// ============================================================================

async function extractPatientPDFs() {
  console.log('='.repeat(70));
  console.log('LHIMS PATIENT PDF CONCURRENT EXTRACTION (WORKER QUEUE)');
  console.log('='.repeat(70));
  console.log('');
  console.log(`⚡ Workers: ${CONFIG.concurrentPatients} independent workers`);
  console.log('⚡ Timeout: 10 minutes max per patient');
  console.log('⚡ Session: Shared across all workers');
  console.log('⚡ APIs: Only consultations + admissions (minimal)');
  console.log('');

  const patientList = getPatientList();
  STATS.total = patientList.length;
  console.log(`📋 Total patients: ${STATS.total}`);
  console.log(`📁 Output: ${CONFIG.pdfOutputDir}`);
  console.log('');

  if (!fs.existsSync(CONFIG.pdfOutputDir)) {
    fs.mkdirSync(CONFIG.pdfOutputDir, { recursive: true });
  }

  sharedProgress = loadProgress();
  console.log(`📊 Previously completed: ${sharedProgress.completed.length}`);
  console.log('');

  console.log('[1/3] Launching browser...');
  const browser = await chromium.launch({ headless: CONFIG.headless });
  sharedContext = await browser.newContext({ acceptDownloads: true });

  STATS.start_time = new Date().toISOString();
  const startTime = Date.now();

  try {
    console.log('[2/3] Logging into LHIMS...');
    sharedMainPage = await sharedContext.newPage();
    await login(sharedMainPage);
    console.log('      ✓ Login successful');
    console.log('');

    console.log('[3/3] Extracting PDFs (WORKER QUEUE MODE)...');
    console.log('');

    // Create patient queue
    const patientQueue = patientList.filter(p => !sharedProgress.completed.includes(p));
    STATS.skipped = STATS.total - patientQueue.length;

    if (STATS.skipped > 0) {
      console.log(`→ Skipping ${STATS.skipped} already completed patients`);
      console.log('');
    }

    // Spawn workers
    const workers = [];
    for (let workerId = 0; workerId < CONFIG.concurrentPatients; workerId++) {
      workers.push(workerProcess(workerId, patientQueue, patientList.length));
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    STATS.end_time = new Date().toISOString();
    const totalMin = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    const avgTime = sharedTimings.length > 0
      ? (sharedTimings.reduce((a, b) => a + b) / sharedTimings.length).toFixed(1)
      : 'N/A';

    saveStats();

    console.log('');
    console.log('='.repeat(70));
    console.log('EXTRACTION COMPLETE');
    console.log('='.repeat(70));
    console.log(`Total patients:     ${STATS.total}`);
    console.log(`Processed:          ${STATS.processed}`);
    console.log(`Successful:         ${STATS.successful}`);
    console.log(`Failed:             ${STATS.failed}`);
    console.log(`Timed out:          ${STATS.timed_out}`);
    console.log(`Skipped:            ${STATS.skipped}`);
    console.log('');
    console.log('PDF Statistics:');
    console.log(`  OPD created:      ${STATS.opd_created}`);
    console.log(`  IPD created:      ${STATS.ipd_created}`);
    console.log(`  Total PDFs:       ${STATS.opd_created + STATS.ipd_created}`);
    console.log(`  OPD failed:       ${STATS.opd_failed}`);
    console.log(`  IPD failed:       ${STATS.ipd_failed}`);
    console.log(`  No OPD data:      ${STATS.no_opd}`);
    console.log(`  No IPD data:      ${STATS.no_ipd}`);
    console.log('');
    console.log(`Total time:         ${totalMin} minutes`);
    console.log(`Avg per patient:    ${avgTime} seconds`);
    console.log('');
    console.log(`Stats: ${CONFIG.statsFile}`);
    if (STATS.failed > 0 || STATS.timed_out > 0) console.log(`Errors: ${CONFIG.errorLogFile}`);

  } catch (error) {
    console.error('✗ FATAL ERROR:', error);
    STATS.end_time = new Date().toISOString();
    saveStats();
  } finally {
    await browser.close();
  }
}

// ============================================================================
// SINGLE PATIENT EXTRACTION
// ============================================================================

async function extractSinglePatient(page, patientNo) {
  const result = {
    success: false,
    opd_count: 0,
    ipd_count: 0,
    opd_failed: false,
    ipd_failed: false,
    no_opd: false,
    no_ipd: false,
  };

  const patientDir = path.join(CONFIG.pdfOutputDir, patientNo);

  console.log('  [1/3] Searching...');
  const patientId = await searchPatient(page, patientNo);
  console.log(`      → ID: ${patientId}`);

  // IPD-ONLY: Fetch only admissions data
  console.log('  [2/3] Fetching admissions...');
  const admissions = await getAdmissions(page, patientId).catch(() => []);
  console.log(`      → ${admissions.length} admissions`);

  // Create folder only if there are admissions
  if (admissions.length > 0) {
    if (!fs.existsSync(patientDir)) {
      fs.mkdirSync(patientDir, { recursive: true });
    }
  }

  // Download IPD PDFs only
  console.log('  [3/3] Downloading IPD PDFs...');
  const pdfTasks = [];

  if (admissions.length > 0) {
    pdfTasks.push(
      downloadAllIPDPDFs(page, patientNo, patientId, admissions, patientDir)
        .then(count => {
          result.ipd_count = count;
          return { type: 'IPD', ok: true, count };
        })
        .catch(err => {
          result.ipd_failed = true;
          return { type: 'IPD', ok: false, error: err.message };
        })
    );
  } else {
    result.no_ipd = true;
  }

  if (pdfTasks.length > 0) {
    const results = await Promise.all(pdfTasks);
    for (const r of results) {
      console.log(`      → ${r.type}: ${r.ok ? '✓' : '✗'}`);
    }
  }

  // IPD-ONLY: Success means at least one IPD PDF was created
  result.success = (result.ipd_count > 0);
  return result;
}

// ============================================================================
// API FUNCTIONS (MINIMAL - ONLY WHAT'S NEEDED)
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

  const rows = response.split('<tr');
  for (const row of rows) {
    if (row.includes(patientNo)) {
      const match = row.match(/patient_id[=\s]*['":]?\s*(\d+)/i);
      if (match) return match[1];
    }
  }

  throw new Error(`Patient not found: ${patientNo}`);
}

async function getConsultations(page, patientId) {
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

async function getAdmissions(page, patientId) {
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

// ============================================================================
// PDF DOWNLOADS
// ============================================================================

async function downloadOPDPDF(page, patientNo, patientId, consultations, patientDir) {
  const consultationIDs = [];
  const serviceIDs = [];

  for (const consultation of consultations) {
    if (Array.isArray(consultation)) {
      const html = consultation[4] || '';
      const match = html.match(/data-schedule-id='(\d+)'/);
      const consultId = match ? match[1] : null;
      const serviceId = consultation[9] || '0';
      if (consultId) {
        consultationIDs.push(consultId);
        serviceIDs.push(serviceId);
      }
    }
  }

  if (consultationIDs.length === 0) {
    throw new Error('No consultation IDs');
  }

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
    throw new Error('No PDF token');
  }

  const pdfUrl = `http://10.10.0.59/lhims_182/viewFile.php?token=${encodeURIComponent(token.trim())}`;
  const pdfPath = path.join(patientDir, `${patientNo}-OPD.pdf`);

  const response = await page.request.fetch(pdfUrl, { timeout: CONFIG.downloadTimeout });
  if (!response.ok()) {
    throw new Error(`Download failed: ${response.status()}`);
  }

  const pdfBuffer = await response.body();
  const first4 = pdfBuffer.slice(0, 4).toString();
  if (first4 !== '%PDF') {
    throw new Error('Invalid PDF');
  }

  fs.writeFileSync(pdfPath, pdfBuffer);
}

async function downloadAllIPDPDFs(page, patientNo, patientId, admissions, patientDir) {
  let successCount = 0;
  const errors = [];

  // Process admissions sequentially (simpler and more reliable)
  for (const admission of admissions) {
    const admitId = admission.admit_id || admission.iAdmitID || admission.admission_id;
    if (!admitId) continue;

    const pdfPath = path.join(patientDir, `${patientNo}-IPD-ADMISSION-${admitId}.pdf`);
    if (fs.existsSync(pdfPath)) {
      successCount++;
      continue;
    }

    try {
      const bedId = admission.bed_id || '';
      const visitNo = admission.visit_no || `ADMT-${admitId}`;

      let admitDate = admission.admit_date || admission.dAdmitDate || '';
      if (admitDate && admitDate.includes('-')) {
        const parts = admitDate.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          admitDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      let admitTime = '';
      const bedFromDate = admission.bed_from_date || admission.dBedFromDate || '';
      if (bedFromDate && bedFromDate.includes(' ')) {
        admitTime = bedFromDate.split(' ')[1] || '';
      }

      const pdfBuffer = await page.evaluate(async (data) => {
        const { patientId, admitId, bedId, visitNo, admitDate, admitTime } = data;
        const formData = new URLSearchParams();
        formData.append('idExportAdmissionSummaryAdmitID', admitId);
        formData.append('idExportAdmissionSummaryPatientID', patientId);
        formData.append('idExportAdmissionSummaryBedID', bedId);
        formData.append('idExportAdmissionSummaryVisitNo', visitNo);
        formData.append('idExportAdmissionSummaryAdmitDate', admitDate);
        formData.append('idExportAdmissionSummaryAdmitTime', admitTime);
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

        const res = await fetch('http://10.10.0.59/lhims_182/exportAdmissionSummaryPDF.php', {
          method: 'POST',
          body: formData
        });

        const blob = await res.blob();
        const arrayBuffer = await blob.arrayBuffer();
        return Array.from(new Uint8Array(arrayBuffer));
      }, { patientId, admitId, bedId, visitNo, admitDate, admitTime });

      const pdfBufferNode = Buffer.from(pdfBuffer);
      const first4 = pdfBufferNode.slice(0, 4).toString();
      if (first4 !== '%PDF') {
        errors.push(`Admission ${admitId}: Invalid PDF`);
        continue;
      }

      const pdfContent = pdfBufferNode.toString();
      if (pdfContent.includes('/Count 0')) {
        errors.push(`Admission ${admitId}: Empty PDF`);
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
  await page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
  await page.fill('input[name="username"]', CONFIG.credentials.username);
  await page.fill('input[name="password"]', CONFIG.credentials.password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: CONFIG.timeout }),
    page.click('input[name="submit"]'),
  ]);
  await page.waitForTimeout(500);

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
// UTILITIES
// ============================================================================

function showStats(timings, current, total) {
  const avgTime = (timings.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, timings.length)).toFixed(1);
  const remaining = total - current;
  const estSeconds = remaining * avgTime / CONFIG.concurrentPatients;
  const estHours = (estSeconds / 3600).toFixed(1);

  console.log('');
  console.log('📊 STATS:');
  console.log(`  Avg (last 10): ${avgTime}s/patient`);
  console.log(`  Remaining: ${remaining} patients`);
  console.log(`  Est. time: ${estHours}h`);
  console.log(`  Throughput: ${(CONFIG.concurrentPatients / avgTime).toFixed(2)} patients/s`);
  console.log('');
}

function getPatientList() {
  if (!fs.existsSync(CONFIG.patientListFile)) {
    console.error(`✗ File not found: ${CONFIG.patientListFile}`);
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

function saveStats() {
  fs.writeFileSync(CONFIG.statsFile, JSON.stringify(STATS, null, 2));
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
    console.error('\n✗ FATAL ERROR:', error);
    STATS.end_time = new Date().toISOString();
    saveStats();
    process.exit(1);
  });
}

module.exports = { extractPatientPDFs };
