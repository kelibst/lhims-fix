/**
 * PHASE 1: EXCEL DATA IMPORT
 *
 * Imports patient data from existing Excel files into SQLite database
 * Handles: OPD, IPD, Consulting Room, ANC, Medical Laboratory
 *
 * Target: ~70,000 unique patients, ~867,000 visit records
 */

const xlsx = require('xlsx');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
    databasePath: './data/database/patient-care-system.db',
    dataPath: './data',
    categories: {
        'opd-register': {
            folder: 'opd-register',
            pattern: /OPD_Register_(\d{4})_(\w+)\.xlsx/,
            category: 'OPD'
        },
        'ipd-morbidity-mortality': {
            folder: 'ipd-morbidity-mortality',
            pattern: /IPD_Morbidity_Mortality_(\d{4})_(\w+)\.xlsx/,
            category: 'IPD'
        },
        'consulting-room': {
            folder: 'consulting-room',
            pattern: /Consulting_Room_(\d{4})_(\w+)\.xlsx/,
            category: 'Consulting'
        },
        'anc-register': {
            folder: 'anc-register',
            pattern: /ANC_Register_(\d{4})_(\w+)\.xlsx/,
            category: 'ANC'
        },
        'medical-laboratory': {
            folder: 'medical-laboratory',
            pattern: /Medical_Laboratory_(\d{4})_(\w+)\.xlsx/,
            category: 'Lab'
        }
    },
    batchSize: 500,  // Insert records in batches
    logInterval: 100  // Log progress every N records
};

// Date parsing helpers
function parseExcelDate(dateValue) {
    if (!dateValue) return null;

    // Handle Excel serial dates
    if (typeof dateValue === 'number') {
        const date = xlsx.SSF.parse_date_code(dateValue);
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }

    // Handle DD-MM-YYYY format
    if (typeof dateValue === 'string') {
        const parts = dateValue.split('-');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
    }

    return null;
}

// Clean and validate patient number
function cleanPatientNo(patientNo) {
    if (!patientNo) return null;
    return String(patientNo).trim().toUpperCase();
}

// Database connection
let db;

function connectDatabase() {
    return new Promise((resolve, reject) => {
        // Ensure database directory exists
        const dbDir = path.dirname(CONFIG.databasePath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        db = new sqlite3.Database(CONFIG.databasePath, (err) => {
            if (err) reject(err);
            else {
                console.log('✓ Connected to database:', CONFIG.databasePath);
                // Enable foreign keys
                db.run('PRAGMA foreign_keys = ON', resolve);
            }
        });
    });
}

function closeDatabase() {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// ============================================================================
// PATIENT MASTER TABLE FUNCTIONS
// ============================================================================

const patientCache = new Map();  // Cache patient_id lookups

async function getOrCreatePatient(patientNo, patientName, additionalData = {}) {
    return new Promise((resolve, reject) => {
        if (!patientNo) {
            return resolve(null);
        }

        // Check cache
        if (patientCache.has(patientNo)) {
            return resolve(patientCache.get(patientNo));
        }

        // Check if patient exists
        db.get(
            'SELECT patient_id FROM patients WHERE patient_no = ?',
            [patientNo],
            (err, row) => {
                if (err) return reject(err);

                if (row) {
                    patientCache.set(patientNo, row.patient_id);
                    return resolve(row.patient_id);
                }

                // Create new patient
                const nameParts = String(patientName || '').trim().split(/\s+/);
                const firstName = nameParts[0] || 'Unknown';
                const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Unknown';
                const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null;

                db.run(
                    `INSERT INTO patients (
                        patient_no, first_name, middle_name, last_name, full_name,
                        date_of_birth, gender, nhis_number, mobile_phone, address,
                        imported_from_lhims, lhims_imported_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
                    [
                        patientNo,
                        firstName,
                        middleName,
                        lastName,
                        patientName || 'Unknown',
                        additionalData.dob || '1900-01-01',  // Placeholder DOB
                        additionalData.gender || null,
                        additionalData.nhis || null,
                        additionalData.phone || null,
                        additionalData.address || null
                    ],
                    function(err) {
                        if (err) return reject(err);
                        patientCache.set(patientNo, this.lastID);
                        resolve(this.lastID);
                    }
                );
            }
        );
    });
}

// ============================================================================
// IMPORT LOG FUNCTIONS
// ============================================================================

async function startImportLog(sourceFile, sourceCategory, fileDate) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO import_log (
                source_file, source_category, file_date,
                import_started_at, import_status
            ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'Started')`,
            [sourceFile, sourceCategory, fileDate],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

async function completeImportLog(importId, stats, status = 'Completed', errorMessage = null) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE import_log SET
                records_imported = ?,
                records_skipped = ?,
                records_failed = ?,
                import_completed_at = CURRENT_TIMESTAMP,
                import_status = ?,
                error_message = ?
            WHERE import_id = ?`,
            [stats.imported, stats.skipped, stats.failed, status, errorMessage, importId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// ============================================================================
// CONSULTING ROOM IMPORT (Best Demographics + Diagnoses + Medications)
// ============================================================================

async function importConsultingRoom(filePath, fileName) {
    console.log(`\n📋 Importing Consulting Room: ${fileName}`);

    const match = fileName.match(CONFIG.categories['consulting-room'].pattern);
    const fileDate = match ? `${match[1]}_${match[2]}` : 'unknown';

    const importId = await startImportLog(fileName, 'Consulting', fileDate);
    const stats = { imported: 0, skipped: 0, failed: 0 };

    try {
        const workbook = xlsx.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(worksheet);

        console.log(`   Found ${rows.length} rows`);

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                const patientNo = cleanPatientNo(row['Patient No.']);
                const patientName = String(row['Patient Name'] || '').trim();
                const scheduleDate = parseExcelDate(row['Schedule Date']);

                if (!patientNo || !scheduleDate) {
                    stats.skipped++;
                    continue;
                }

                // Get or create patient with enhanced demographics from consulting room
                const patientId = await getOrCreatePatient(patientNo, patientName, {
                    gender: row['Gender'],
                    nhis: row['NHIA No.'],
                    phone: row['Contact No.'],
                    address: row['Locality']
                });

                if (!patientId) {
                    stats.skipped++;
                    continue;
                }

                // Insert visit record
                await new Promise((resolve, reject) => {
                    db.run(
                        `INSERT INTO excel_visits (
                            patient_no, patient_name, visit_date, source_file,
                            source_category, source_row_number, age, gender,
                            locality, nhis_status, raw_data
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            patientNo, patientName, scheduleDate, fileName,
                            'Consulting', i + 2, row['Age'], row['Gender'],
                            row['Locality'], row['NHIA Patient'], JSON.stringify(row)
                        ],
                        (err) => err ? reject(err) : resolve()
                    );
                });

                // Import diagnoses (Principal and Additional, for New/Old/Recurring cases)
                const diagnosisFields = [
                    { key: 'Principal Diagnosis (New Case)', type: 'Principal', caseType: 'New' },
                    { key: 'Principal Diagnosis (Old Case)', type: 'Principal', caseType: 'Old' },
                    { key: 'Principal Diagnosis (Recurring Case)', type: 'Principal', caseType: 'Recurring' },
                    { key: 'Additional Diagnosis (New Case)', type: 'Additional', caseType: 'New' },
                    { key: 'Additional Diagnosis (Old Case)', type: 'Additional', caseType: 'Old' },
                    { key: 'Additional Diagnosis (Recurring Case)', type: 'Additional', caseType: 'Recurring' }
                ];

                for (const field of diagnosisFields) {
                    const diagnosisText = row[field.key];
                    if (diagnosisText && diagnosisText !== 'NA') {
                        // Extract ICD-10 code if present (format: "A09 - Diarrhoea and gastroenteritis")
                        const match = String(diagnosisText).match(/^([A-Z]\d{2}(?:\.\d{1,2})?)\s*-\s*(.+)$/);
                        const icd10Code = match ? match[1] : null;
                        const cleanDiagnosis = match ? match[2].trim() : diagnosisText;

                        await new Promise((resolve, reject) => {
                            db.run(
                                `INSERT INTO excel_diagnoses (
                                    patient_no, visit_date, source_file,
                                    diagnosis_type, case_type, diagnosis_text, icd10_code
                                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                [patientNo, scheduleDate, fileName, field.type, field.caseType, cleanDiagnosis, icd10Code],
                                (err) => err ? reject(err) : resolve()
                            );
                        });
                    }
                }

                // Import medications (Prescribed and Dispensed)
                const medicationFields = [
                    { key: 'Medicines Prescribed', type: 'Prescribed' },
                    { key: 'Medicines Dispensed', type: 'Dispensed' }
                ];

                for (const field of medicationFields) {
                    const medications = row[field.key];
                    if (medications && medications !== 'NA') {
                        await new Promise((resolve, reject) => {
                            db.run(
                                `INSERT INTO excel_medications (
                                    patient_no, visit_date, source_file,
                                    medication_type, medication_text
                                ) VALUES (?, ?, ?, ?, ?)`,
                                [patientNo, scheduleDate, fileName, field.type, medications],
                                (err) => err ? reject(err) : resolve()
                            );
                        });
                    }
                }

                stats.imported++;

                if ((i + 1) % CONFIG.logInterval === 0) {
                    console.log(`   Processed ${i + 1}/${rows.length} rows...`);
                }

            } catch (err) {
                console.error(`   Error processing row ${i + 2}:`, err.message);
                stats.failed++;
            }
        }

        await completeImportLog(importId, stats);
        console.log(`   ✓ Completed: ${stats.imported} imported, ${stats.skipped} skipped, ${stats.failed} failed`);

    } catch (err) {
        await completeImportLog(importId, stats, 'Failed', err.message);
        console.error(`   ✗ Failed:`, err.message);
    }
}

// ============================================================================
// IPD MORBIDITY & MORTALITY IMPORT (Admissions + Diagnoses)
// ============================================================================

async function importIPDMorbidityMortality(filePath, fileName) {
    console.log(`\n🏥 Importing IPD Morbidity & Mortality: ${fileName}`);

    const match = fileName.match(CONFIG.categories['ipd-morbidity-mortality'].pattern);
    const fileDate = match ? `${match[1]}_${match[2]}` : 'unknown';

    const importId = await startImportLog(fileName, 'IPD', fileDate);
    const stats = { imported: 0, skipped: 0, failed: 0 };

    try {
        const workbook = xlsx.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(worksheet);

        console.log(`   Found ${rows.length} rows`);

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                const patientNo = cleanPatientNo(row['Patient No.']);
                const patientName = String(row['Patient Name'] || '').trim();
                const admissionDate = parseExcelDate(row['Date of Admission']);
                const dischargeDate = parseExcelDate(row['Date of Discharge']);

                if (!patientNo || !admissionDate) {
                    stats.skipped++;
                    continue;
                }

                const patientId = await getOrCreatePatient(patientNo, patientName, {
                    gender: row['Gender'],
                    address: row['Locality/Address/Residence'],
                    occupation: row['Occupation']
                });

                if (!patientId) {
                    stats.skipped++;
                    continue;
                }

                // Insert visit record
                await new Promise((resolve, reject) => {
                    db.run(
                        `INSERT INTO excel_visits (
                            patient_no, patient_name, visit_date, source_file,
                            source_category, source_row_number, age, gender,
                            locality, nhis_status, raw_data
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            patientNo, patientName, admissionDate, fileName,
                            'IPD', i + 2, row['Age'], row['Gender'],
                            row['Locality/Address/Residence'], row['NHIS Status'], JSON.stringify(row)
                        ],
                        (err) => err ? reject(err) : resolve()
                    );
                });

                // Import diagnoses
                const diagnosisFields = [
                    { key: 'Principal Diagnosis', type: 'Principal' },
                    { key: 'Additional Diagnosis', type: 'Additional' },
                    { key: 'Provisional Diagnosis', type: 'Provisional' }
                ];

                for (const field of diagnosisFields) {
                    const diagnosisText = row[field.key];
                    if (diagnosisText && diagnosisText !== 'NA') {
                        const match = String(diagnosisText).match(/^([A-Z]\d{2}(?:\.\d{1,2})?)\s*-\s*(.+)$/);
                        const icd10Code = match ? match[1] : null;
                        const cleanDiagnosis = match ? match[2].trim() : diagnosisText;

                        await new Promise((resolve, reject) => {
                            db.run(
                                `INSERT INTO excel_diagnoses (
                                    patient_no, visit_date, source_file,
                                    diagnosis_type, diagnosis_text, icd10_code
                                ) VALUES (?, ?, ?, ?, ?, ?)`,
                                [patientNo, admissionDate, fileName, field.type, cleanDiagnosis, icd10Code],
                                (err) => err ? reject(err) : resolve()
                            );
                        });
                    }
                }

                stats.imported++;

                if ((i + 1) % CONFIG.logInterval === 0) {
                    console.log(`   Processed ${i + 1}/${rows.length} rows...`);
                }

            } catch (err) {
                console.error(`   Error processing row ${i + 2}:`, err.message);
                stats.failed++;
            }
        }

        await completeImportLog(importId, stats);
        console.log(`   ✓ Completed: ${stats.imported} imported, ${stats.skipped} skipped, ${stats.failed} failed`);

    } catch (err) {
        await completeImportLog(importId, stats, 'Failed', err.message);
        console.error(`   ✗ Failed:`, err.message);
    }
}

// ============================================================================
// OPD REGISTER IMPORT (Outpatient Visits)
// ============================================================================

async function importOPDRegister(filePath, fileName) {
    console.log(`\n👨‍⚕️ Importing OPD Register: ${fileName}`);

    const match = fileName.match(CONFIG.categories['opd-register'].pattern);
    const fileDate = match ? `${match[1]}_${match[2]}` : 'unknown';

    const importId = await startImportLog(fileName, 'OPD', fileDate);
    const stats = { imported: 0, skipped: 0, failed: 0 };

    try {
        const workbook = xlsx.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(worksheet);

        console.log(`   Found ${rows.length} rows`);

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                const patientNo = cleanPatientNo(row['Patient No.']);
                const patientName = String(row['Patient Name'] || '').trim();
                const scheduleDate = parseExcelDate(row['Schedule Date']);

                if (!patientNo || !scheduleDate) {
                    stats.skipped++;
                    continue;
                }

                const patientId = await getOrCreatePatient(patientNo, patientName, {
                    gender: row['Gender'],
                    address: row['Locality']
                });

                if (!patientId) {
                    stats.skipped++;
                    continue;
                }

                // Insert visit record
                await new Promise((resolve, reject) => {
                    db.run(
                        `INSERT INTO excel_visits (
                            patient_no, patient_name, visit_date, source_file,
                            source_category, source_row_number, age, gender,
                            locality, nhis_status, raw_data
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            patientNo, patientName, scheduleDate, fileName,
                            'OPD', i + 2, row['Age'], row['Gender'],
                            row['Locality'], row['NHIS Status'], JSON.stringify(row)
                        ],
                        (err) => err ? reject(err) : resolve()
                    );
                });

                stats.imported++;

                if ((i + 1) % CONFIG.logInterval === 0) {
                    console.log(`   Processed ${i + 1}/${rows.length} rows...`);
                }

            } catch (err) {
                console.error(`   Error processing row ${i + 2}:`, err.message);
                stats.failed++;
            }
        }

        await completeImportLog(importId, stats);
        console.log(`   ✓ Completed: ${stats.imported} imported, ${stats.skipped} skipped, ${stats.failed} failed`);

    } catch (err) {
        await completeImportLog(importId, stats, 'Failed', err.message);
        console.error(`   ✗ Failed:`, err.message);
    }
}

// ============================================================================
// MEDICAL LABORATORY IMPORT (Lab Test Orders)
// ============================================================================

async function importMedicalLaboratory(filePath, fileName) {
    console.log(`\n🔬 Importing Medical Laboratory: ${fileName}`);

    const match = fileName.match(CONFIG.categories['medical-laboratory'].pattern);
    const fileDate = match ? `${match[1]}_${match[2]}` : 'unknown';

    const importId = await startImportLog(fileName, 'Lab', fileDate);
    const stats = { imported: 0, skipped: 0, failed: 0 };

    try {
        const workbook = xlsx.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(worksheet);

        console.log(`   Found ${rows.length} rows`);

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                const patientNo = cleanPatientNo(row['Patient No.']);
                const patientName = String(row['Patient Name'] || '').trim();
                const scheduleDate = parseExcelDate(row['Schedule Date']);

                if (!patientNo || !scheduleDate) {
                    stats.skipped++;
                    continue;
                }

                const patientId = await getOrCreatePatient(patientNo, patientName, {
                    gender: row['Sex']
                });

                if (!patientId) {
                    stats.skipped++;
                    continue;
                }

                // Insert lab order
                await new Promise((resolve, reject) => {
                    db.run(
                        `INSERT INTO excel_lab_orders (
                            patient_no, visit_no, schedule_date, source_file,
                            test_requested, specimen_type, collection_datetime,
                            pathology_barcode, clinician_name, clinician_contact,
                            source_of_request
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            patientNo,
                            row['Visit No.'],
                            scheduleDate,
                            fileName,
                            row['Test Requested'],
                            row['Type of Specimen'],
                            row['Date/Time of Sample Collection'],
                            row['Barcode (Pathology Number)'],
                            row['Name of Clinician'],
                            row["Clinician's Contact Number"],
                            row['Source of Request (IPD/OPD)']
                        ],
                        (err) => err ? reject(err) : resolve()
                    );
                });

                stats.imported++;

                if ((i + 1) % CONFIG.logInterval === 0) {
                    console.log(`   Processed ${i + 1}/${rows.length} rows...`);
                }

            } catch (err) {
                console.error(`   Error processing row ${i + 2}:`, err.message);
                stats.failed++;
            }
        }

        await completeImportLog(importId, stats);
        console.log(`   ✓ Completed: ${stats.imported} imported, ${stats.skipped} skipped, ${stats.failed} failed`);

    } catch (err) {
        await completeImportLog(importId, stats, 'Failed', err.message);
        console.error(`   ✗ Failed:`, err.message);
    }
}

// ============================================================================
// ANC REGISTER IMPORT (Antenatal Care)
// ============================================================================

async function importANCRegister(filePath, fileName) {
    console.log(`\n🤰 Importing ANC Register: ${fileName}`);

    const match = fileName.match(CONFIG.categories['anc-register'].pattern);
    const fileDate = match ? `${match[1]}_${match[2]}` : 'unknown';

    const importId = await startImportLog(fileName, 'ANC', fileDate);
    const stats = { imported: 0, skipped: 0, failed: 0 };

    try {
        const workbook = xlsx.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(worksheet);

        console.log(`   Found ${rows.length} rows`);

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                const patientNo = cleanPatientNo(row['Patient No.']);
                const patientName = String(row['Patient Name'] || '').trim();
                const registrationDate = parseExcelDate(row['Date of Registration']);

                if (!patientNo || !registrationDate) {
                    stats.skipped++;
                    continue;
                }

                const patientId = await getOrCreatePatient(patientNo, patientName, {
                    gender: row['Gender'],
                    address: row['Locality']
                });

                if (!patientId) {
                    stats.skipped++;
                    continue;
                }

                // Insert visit record (ANC visit)
                await new Promise((resolve, reject) => {
                    db.run(
                        `INSERT INTO excel_visits (
                            patient_no, patient_name, visit_date, source_file,
                            source_category, source_row_number, age, gender,
                            locality, raw_data
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            patientNo, patientName, registrationDate, fileName,
                            'ANC', i + 2, row['Age'], row['Gender'],
                            row['Locality'], JSON.stringify(row)
                        ],
                        (err) => err ? reject(err) : resolve()
                    );
                });

                stats.imported++;

                if ((i + 1) % CONFIG.logInterval === 0) {
                    console.log(`   Processed ${i + 1}/${rows.length} rows...`);
                }

            } catch (err) {
                console.error(`   Error processing row ${i + 2}:`, err.message);
                stats.failed++;
            }
        }

        await completeImportLog(importId, stats);
        console.log(`   ✓ Completed: ${stats.imported} imported, ${stats.skipped} skipped, ${stats.failed} failed`);

    } catch (err) {
        await completeImportLog(importId, stats, 'Failed', err.message);
        console.error(`   ✗ Failed:`, err.message);
    }
}

// ============================================================================
// MAIN IMPORT ORCHESTRATOR
// ============================================================================

async function importAllFiles() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  PHASE 1: EXCEL DATA IMPORT');
    console.log('  Volta Regional Hospital, Hohoe');
    console.log('═══════════════════════════════════════════════════════\n');

    const startTime = Date.now();

    try {
        await connectDatabase();

        // Track totals
        const totals = {
            files: 0,
            patients: 0,
            visits: 0,
            diagnoses: 0,
            medications: 0,
            labOrders: 0
        };

        // Import in order of priority
        const categories = [
            'consulting-room',  // Priority 1: Best demographics + diagnoses + medications
            'ipd-morbidity-mortality',  // Priority 2: Admissions + diagnoses
            'opd-register',  // Priority 3: Outpatient visits
            'medical-laboratory',  // Priority 4: Lab test orders
            'anc-register'  // Priority 5: Antenatal care
        ];

        for (const category of categories) {
            const config = CONFIG.categories[category];
            const folderPath = path.join(CONFIG.dataPath, config.folder);

            if (!fs.existsSync(folderPath)) {
                console.log(`⚠ Skipping ${category}: folder not found`);
                continue;
            }

            const files = fs.readdirSync(folderPath)
                .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
                .sort();

            console.log(`\n${'='.repeat(60)}`);
            console.log(`📁 Category: ${config.category} (${files.length} files)`);
            console.log('='.repeat(60));

            for (const file of files) {
                const filePath = path.join(folderPath, file);

                switch (category) {
                    case 'consulting-room':
                        await importConsultingRoom(filePath, file);
                        break;
                    case 'ipd-morbidity-mortality':
                        await importIPDMorbidityMortality(filePath, file);
                        break;
                    case 'opd-register':
                        await importOPDRegister(filePath, file);
                        break;
                    case 'medical-laboratory':
                        await importMedicalLaboratory(filePath, file);
                        break;
                    case 'anc-register':
                        await importANCRegister(filePath, file);
                        break;
                }

                totals.files++;
            }
        }

        // Get final statistics
        const stats = await new Promise((resolve, reject) => {
            db.get(`
                SELECT
                    (SELECT COUNT(*) FROM patients) as patients,
                    (SELECT COUNT(*) FROM excel_visits) as visits,
                    (SELECT COUNT(*) FROM excel_diagnoses) as diagnoses,
                    (SELECT COUNT(*) FROM excel_medications) as medications,
                    (SELECT COUNT(*) FROM excel_lab_orders) as lab_orders
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

        console.log('\n' + '═'.repeat(60));
        console.log('  IMPORT COMPLETED SUCCESSFULLY');
        console.log('═'.repeat(60));
        console.log(`\n📊 Final Statistics:`);
        console.log(`   Files processed: ${totals.files}`);
        console.log(`   Unique patients: ${stats.patients.toLocaleString()}`);
        console.log(`   Visit records: ${stats.visits.toLocaleString()}`);
        console.log(`   Diagnosis records: ${stats.diagnoses.toLocaleString()}`);
        console.log(`   Medication records: ${stats.medications.toLocaleString()}`);
        console.log(`   Lab order records: ${stats.lab_orders.toLocaleString()}`);
        console.log(`\n⏱ Total time: ${duration} minutes`);
        console.log(`\n✓ Database ready: ${CONFIG.databasePath}`);

    } catch (err) {
        console.error('\n✗ Import failed:', err);
        throw err;
    } finally {
        await closeDatabase();
    }
}

// Run import if called directly
if (require.main === module) {
    importAllFiles()
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = { importAllFiles };
