#!/usr/bin/env node
/**
 * LHIMS Master Patient List Generator (Node.js version)
 *
 * Scans all extracted Excel files and generates a deduplicated list
 * of all unique patient numbers for JSON extraction.
 *
 * Usage:
 *     node scripts/generate-patient-list.js
 *
 * Output:
 *     master-patient-list.txt - Deduplicated list of patient numbers
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Data folders to scan
const DATA_FOLDERS = [
  'data/opd-register',
  'data/ipd-morbidity-mortality',
  'data/anc-register',
  'data/consulting-room',
  'data/medical-laboratory',
];

// Patient number pattern (XX-A01-AAANNNN) - Accepts all facility codes
const PATIENT_NO_PATTERN = /[A-Z]{2}-[A-Z]\d{2}-[A-Z]{3}\d+/;

/**
 * Find the row with column headers
 */
function findHeaderRow(sheet, maxSearch = 20) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const maxRow = Math.min(maxSearch - 1, range.e.r);

  for (let rowIdx = 0; rowIdx <= maxRow; rowIdx++) {
    let nonEmpty = 0;
    for (let colIdx = range.s.c; colIdx <= range.e.c; colIdx++) {
      const cellAddr = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
      const cell = sheet[cellAddr];
      if (cell && cell.v) nonEmpty++;
    }
    if (nonEmpty >= 5) {
      return rowIdx;
    }
  }
  return null;
}

/**
 * Find the Patient No. column index
 */
function findPatientNoColumn(headers) {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (header && typeof header === 'string') {
      const h = header.toLowerCase();
      if (h.includes('patient') && h.includes('no')) {
        return i;
      }
    }
  }
  return null;
}

/**
 * Extract all patient numbers from an Excel file
 */
function extractPatientsFromExcel(filepath) {
  const patients = new Set();

  try {
    // Read workbook
    const workbook = XLSX.readFile(filepath, {
      type: 'file',
      cellDates: false,
      cellNF: false,
      cellStyles: false
    });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet['!ref']) {
      return patients;
    }

    const range = XLSX.utils.decode_range(sheet['!ref']);

    // Find header row
    const headerRowIdx = findHeaderRow(sheet);
    if (headerRowIdx === null) {
      console.log(`      ⚠ No header row found`);
      return patients;
    }

    // Get headers
    const headers = [];
    for (let colIdx = range.s.c; colIdx <= range.e.c; colIdx++) {
      const cellAddr = XLSX.utils.encode_cell({ r: headerRowIdx, c: colIdx });
      const cell = sheet[cellAddr];
      headers.push(cell && cell.v ? String(cell.v).trim() : '');
    }

    // Find Patient No. column
    const patientColIdx = findPatientNoColumn(headers);
    if (patientColIdx === null) {
      console.log(`      ⚠ No 'Patient No.' column found`);
      return patients;
    }

    // Extract patient numbers
    for (let rowIdx = headerRowIdx + 1; rowIdx <= range.e.r; rowIdx++) {
      const cellAddr = XLSX.utils.encode_cell({ r: rowIdx, c: patientColIdx });
      const cell = sheet[cellAddr];

      if (cell && cell.v) {
        const patientNo = String(cell.v).trim();
        // Validate format
        if (PATIENT_NO_PATTERN.test(patientNo)) {
          patients.add(patientNo);
        }
      }
    }

  } catch (error) {
    console.log(`      ✗ Error: ${error.message}`);
  }

  return patients;
}

/**
 * Generate master patient list from all Excel files
 */
function generatePatientList() {
  console.log('='.repeat(70));
  console.log('LHIMS MASTER PATIENT LIST GENERATOR');
  console.log('='.repeat(70));
  console.log('');

  const allPatients = new Set();
  let fileCount = 0;

  // Process each data folder
  for (const folder of DATA_FOLDERS) {
    const folderPath = path.join(__dirname, '..', folder);

    if (!fs.existsSync(folderPath)) {
      console.log(`⚠ Folder not found: ${folder}`);
      continue;
    }

    console.log(`📂 Scanning: ${folder}`);

    // Get all Excel files
    const files = fs.readdirSync(folderPath);
    const excelFiles = files
      .filter(f => (f.endsWith('.xlsx') || f.endsWith('.xls')) && !f.startsWith('~$'))
      .map(f => path.join(folderPath, f));

    const folderPatients = new Set();

    for (let i = 0; i < excelFiles.length; i++) {
      const excelFile = excelFiles[i];
      const fileName = path.basename(excelFile);

      process.stdout.write(`  [${i + 1}/${excelFiles.length}] Processing: ${fileName}...`);

      const patients = extractPatientsFromExcel(excelFile);
      for (const p of patients) {
        folderPatients.add(p);
      }
      fileCount++;

      console.log(` ✓ (${patients.size} patients)`);
    }

    console.log(`  ✓ Found ${folderPatients.size} unique patients in ${excelFiles.length} files`);
    for (const p of folderPatients) {
      allPatients.add(p);
    }
    console.log('');
  }

  // Sort patients
  const sortedPatients = Array.from(allPatients).sort();

  // Generate output file
  console.log('='.repeat(70));
  console.log('GENERATING OUTPUT FILE');
  console.log('='.repeat(70));
  console.log('');

  const now = new Date().toISOString();
  const outputLines = [
    '# LHIMS Master Patient List',
    '# Generated automatically from extracted Excel files',
    '#',
    `# Generated on: ${now}`,
    `# Total unique patients: ${sortedPatients.length}`,
    `# Files scanned: ${fileCount}`,
    `# Source folders: ${DATA_FOLDERS.join(', ')}`,
    '#',
    '# Format: XX-A01-AAANNNN (one patient number per line, all facility codes)',
    '# Lines starting with # are comments and will be ignored',
    '#',
    '',
    ...sortedPatients
  ];

  const outputFile = path.join(__dirname, '..', 'master-patient-list.txt');
  fs.writeFileSync(outputFile, outputLines.join('\n'));

  console.log(`✓ Master patient list generated: ${path.basename(outputFile)}`);
  console.log(`  Total unique patients: ${sortedPatients.length.toLocaleString()}`);
  console.log(`  Files scanned: ${fileCount}`);
  console.log('');

  // Show sample
  console.log('Sample patients:');
  for (let i = 0; i < Math.min(10, sortedPatients.length); i++) {
    console.log(`  - ${sortedPatients[i]}`);
  }
  if (sortedPatients.length > 10) {
    console.log(`  ... and ${sortedPatients.length - 10} more`);
  }
  console.log('');

  console.log('='.repeat(70));
  console.log('NEXT STEPS');
  console.log('='.repeat(70));
  console.log('1. Review: master-patient-list.txt');
  console.log('2. Run extraction: npm run extract:patients');
  console.log('3. Find JSON data in: data/patient-json/');
  console.log('');
}

// Run generator
generatePatientList();
