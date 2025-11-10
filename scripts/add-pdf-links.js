/**
 * Add PDF Links to Patient JSON Metadata
 *
 * This script updates the _metadata.json file for each patient
 * to include a link to their PDF record.
 *
 * Usage:
 *   node scripts/add-pdf-links.js
 *
 * This will:
 * 1. Scan all patient directories in data/patient-json/
 * 2. Check if corresponding PDF exists in data/patient-pdfs/
 * 3. Update _metadata.json to include pdf_path and pdf_available
 * 4. Generate summary report
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  patientJsonDir: path.join(__dirname, '..', 'data', 'patient-json'),
  patientPdfDir: path.join(__dirname, '..', 'data', 'patient-pdfs'),
  reportFile: path.join(__dirname, '..', 'pdf-links-report.txt'),
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function addPDFLinks() {
  console.log('='.repeat(70));
  console.log('ADD PDF LINKS TO PATIENT METADATA');
  console.log('='.repeat(70));
  console.log('');

  // Check if directories exist
  if (!fs.existsSync(CONFIG.patientJsonDir)) {
    console.error('✗ Patient JSON directory not found:', CONFIG.patientJsonDir);
    console.error('  Run extract-patient-json.js first to create patient data.');
    process.exit(1);
  }

  if (!fs.existsSync(CONFIG.patientPdfDir)) {
    console.warn('⚠ Patient PDF directory not found:', CONFIG.patientPdfDir);
    console.warn('  Run extract-patient-pdf.js to generate PDFs.');
    console.warn('  Continuing anyway to mark PDFs as not available...');
    console.log('');
  }

  // Get all patient directories
  console.log('[1/3] Scanning patient directories...');
  const patientDirs = fs.readdirSync(CONFIG.patientJsonDir)
    .filter(item => {
      const fullPath = path.join(CONFIG.patientJsonDir, item);
      return fs.statSync(fullPath).isDirectory();
    });

  console.log(`      Found ${patientDirs.length} patient directories`);
  console.log('');

  // Process each patient
  console.log('[2/3] Adding PDF links to metadata...');
  console.log('');

  let updatedCount = 0;
  let pdfAvailableCount = 0;
  let pdfMissingCount = 0;
  let errors = [];

  for (let i = 0; i < patientDirs.length; i++) {
    const patientNo = patientDirs[i];
    const patientDir = path.join(CONFIG.patientJsonDir, patientNo);
    const metadataFile = path.join(patientDir, '_metadata.json');

    // Check for OPD PDF
    const opdPdfFile = path.join(CONFIG.patientPdfDir, `${patientNo}-OPD.pdf`);
    const opdPdfExists = fs.existsSync(opdPdfFile);

    // Check for IPD PDFs (pattern: PATIENT-IPD-ADMISSION-12345.pdf)
    const ipdPdfPattern = new RegExp(`^${patientNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-IPD-ADMISSION-(\\d+)\\.pdf$`);
    const allPdfs = fs.existsSync(CONFIG.patientPdfDir) ? fs.readdirSync(CONFIG.patientPdfDir) : [];
    const ipdPdfFiles = allPdfs.filter(file => ipdPdfPattern.test(file));

    try {
      // Read existing metadata
      if (!fs.existsSync(metadataFile)) {
        console.log(`[${i + 1}/${patientDirs.length}] ⚠ ${patientNo}: No metadata file`);
        errors.push(`${patientNo}: No metadata file found`);
        continue;
      }

      const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));

      // Add OPD PDF information
      metadata.pdf_opd_available = opdPdfExists;
      metadata.pdf_opd_path = opdPdfExists ? `../patient-pdfs/${patientNo}-OPD.pdf` : null;
      metadata.pdf_opd_absolute_path = opdPdfExists ? opdPdfFile : null;

      if (opdPdfExists) {
        const stats = fs.statSync(opdPdfFile);
        metadata.pdf_opd_size_bytes = stats.size;
        metadata.pdf_opd_size_readable = formatBytes(stats.size);
      }

      // Add IPD PDF information
      metadata.pdf_ipd_available = ipdPdfFiles.length > 0;
      metadata.pdf_ipd_count = ipdPdfFiles.length;
      metadata.pdf_ipd_paths = [];
      metadata.pdf_ipd_absolute_paths = [];
      metadata.pdf_ipd_details = [];

      for (const ipdPdfFile of ipdPdfFiles) {
        const ipdPdfPath = path.join(CONFIG.patientPdfDir, ipdPdfFile);
        const match = ipdPdfFile.match(ipdPdfPattern);
        const admissionId = match ? match[1] : 'unknown';

        const stats = fs.statSync(ipdPdfPath);

        metadata.pdf_ipd_paths.push(`../patient-pdfs/${ipdPdfFile}`);
        metadata.pdf_ipd_absolute_paths.push(ipdPdfPath);
        metadata.pdf_ipd_details.push({
          admission_id: admissionId,
          filename: ipdPdfFile,
          path: `../patient-pdfs/${ipdPdfFile}`,
          size_bytes: stats.size,
          size_readable: formatBytes(stats.size)
        });
      }

      metadata.pdf_link_updated_at = new Date().toISOString();

      // Save updated metadata
      fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

      updatedCount++;
      const totalPdfs = (opdPdfExists ? 1 : 0) + ipdPdfFiles.length;

      if (totalPdfs > 0) {
        pdfAvailableCount++;
        console.log(`[${i + 1}/${patientDirs.length}] ✓ ${patientNo}: ${totalPdfs} PDF(s) (OPD: ${opdPdfExists ? '✓' : '✗'}, IPD: ${ipdPdfFiles.length})`);
      } else {
        pdfMissingCount++;
        console.log(`[${i + 1}/${patientDirs.length}] ⚠ ${patientNo}: No PDFs`);
      }

    } catch (error) {
      console.error(`[${i + 1}/${patientDirs.length}] ✗ ${patientNo}: ${error.message}`);
      errors.push(`${patientNo}: ${error.message}`);
    }
  }

  console.log('');
  console.log('[3/3] Generating report...');

  // Generate report
  const report = generateReport({
    totalPatients: patientDirs.length,
    updatedCount,
    pdfAvailableCount,
    pdfMissingCount,
    errors
  });

  // Save report to file
  fs.writeFileSync(CONFIG.reportFile, report);
  console.log(`      Report saved: ${CONFIG.reportFile}`);

  // Display summary
  console.log('');
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total patients:       ${patientDirs.length}`);
  console.log(`Metadata updated:     ${updatedCount}`);
  console.log(`PDFs available:       ${pdfAvailableCount} (${((pdfAvailableCount/updatedCount)*100).toFixed(1)}%)`);
  console.log(`PDFs missing:         ${pdfMissingCount} (${((pdfMissingCount/updatedCount)*100).toFixed(1)}%)`);
  console.log(`Errors:               ${errors.length}`);
  console.log('');

  if (pdfMissingCount > 0) {
    console.log('⚠ To extract missing PDFs, run:');
    console.log('  node scripts/extract-patient-pdf.js');
    console.log('');
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function generateReport(stats) {
  const timestamp = new Date().toISOString();

  return `
${'='.repeat(70)}
PDF LINKS REPORT
${'='.repeat(70)}

Generated: ${timestamp}

SUMMARY
-------
Total Patients:       ${stats.totalPatients}
Metadata Updated:     ${stats.updatedCount}
PDFs Available:       ${stats.pdfAvailableCount} (${((stats.pdfAvailableCount/stats.updatedCount)*100).toFixed(1)}%)
PDFs Missing:         ${stats.pdfMissingCount} (${((stats.pdfMissingCount/stats.updatedCount)*100).toFixed(1)}%)
Errors:               ${stats.errors.length}

METADATA STRUCTURE (NEW: OPD + IPD PDFs)
-----------------------------------------
Each patient's _metadata.json now includes separate OPD and IPD PDF sections:

{
  "patient_no": "VR-A01-AAA2142",
  "patient_id": "2239",

  // OPD PDF (Consolidated Consultations)
  "pdf_opd_available": true,
  "pdf_opd_path": "../patient-pdfs/VR-A01-AAA2142-OPD.pdf",
  "pdf_opd_size_readable": "239.92 KB",

  // IPD PDFs (One Per Admission)
  "pdf_ipd_available": true,
  "pdf_ipd_count": 2,
  "pdf_ipd_details": [
    { "admission_id": "22362", "path": "...", "size_readable": "122.49 KB" },
    { "admission_id": "657", "path": "...", "size_readable": "96.45 KB" }
  ],

  "pdf_link_updated_at": "2025-11-10T20:00:00.000Z"
}

USAGE IN APPLICATIONS
---------------------

JavaScript Example:
const metadata = require('./data/patient-json/VR-A01-AAA2142/_metadata.json');

// OPD PDF
if (metadata.pdf_opd_available) {
  console.log('OPD:', metadata.pdf_opd_path);
}

// IPD PDFs
if (metadata.pdf_ipd_available) {
  console.log(\`IPD: \${metadata.pdf_ipd_count} admissions\`);
  metadata.pdf_ipd_details.forEach(ipd => {
    console.log(\`  - Admission \${ipd.admission_id}: \${ipd.size_readable}\`);
  });
}

NEXT STEPS
----------
${stats.pdfMissingCount > 0 ? `
1. Extract missing PDFs:
   node scripts/extract-patient-pdf.js

2. Re-run this script to update links:
   node scripts/add-pdf-links.js
` : `
1. All PDFs are available and linked!

2. Build patient lookup system using the metadata

3. Create web interface with PDF links
`}

${stats.errors.length > 0 ? `
ERRORS
------
${stats.errors.join('\n')}
` : ''}

${'='.repeat(70)}
END OF REPORT
${'='.repeat(70)}
`.trim();
}

// ============================================================================
// RUN
// ============================================================================

if (require.main === module) {
  addPDFLinks().catch(error => {
    console.error('\n✗ FATAL ERROR:');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { addPDFLinks };
