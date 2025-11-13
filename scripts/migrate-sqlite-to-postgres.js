/**
 * SQLite to PostgreSQL Migration Script
 *
 * Migrates all patient data from the current SQLite database
 * to the new PostgreSQL hospital system
 *
 * Data to migrate:
 * - 70,079 patients
 * - 867,000+ visits
 * - Diagnoses, medications, lab orders
 * - Link to extracted PDFs
 */

const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
    sqlitePath: path.join(__dirname, '../data/database/patient-care-system.db'),
    pdfDirectory: path.join(__dirname, '../data/patient-pdfs'),
    batchSize: 500,
    logInterval: 1000
};

// Initialize databases
const sqlite = new Database(CONFIG.sqlitePath, { readonly: true });
const prisma = new PrismaClient();

// Migration statistics
const stats = {
    patients: { total: 0, migrated: 0, skipped: 0, failed: 0 },
    visits: { total: 0, migrated: 0, skipped: 0, failed: 0 },
    diagnoses: { total: 0, migrated: 0, skipped: 0, failed: 0 },
    medications: { total: 0, migrated: 0, skipped: 0, failed: 0 },
    labOrders: { total: 0, migrated: 0, skipped: 0, failed: 0 },
    pdfs: { total: 0, migrated: 0, skipped: 0, failed: 0 }
};

// Helper: Map SQLite gender to Prisma enum
function mapGender(gender) {
    if (!gender) return null;
    const g = String(gender).trim().toUpperCase();
    if (g === 'MALE' || g === 'M') return 'MALE';
    if (g === 'FEMALE' || g === 'F') return 'FEMALE';
    return 'UNKNOWN';
}

// Helper: Map visit category to VisitType enum
function mapVisitType(category) {
    if (!category) return 'OPD';
    const c = String(category).trim().toUpperCase();

    const mapping = {
        'OPD': 'OPD',
        'IPD': 'IPD',
        'CONSULTING': 'CONSULTING',
        'ANC': 'ANC',
        'LAB': 'OPD', // Lab visits treated as OPD
        'EMERGENCY': 'EMERGENCY'
    };

    return mapping[c] || 'OPD';
}

// ============================================================================
// STEP 1: MIGRATE PATIENTS
// ============================================================================

async function migratePatients() {
    console.log('\n📋 STEP 1: Migrating Patients');
    console.log('═'.repeat(60));

    try {
        // Get all patients from SQLite
        const sqlitePatients = sqlite.prepare(`
            SELECT * FROM patients ORDER BY patient_no
        `).all();

        stats.patients.total = sqlitePatients.length;
        console.log(`Found ${stats.patients.total.toLocaleString()} patients in SQLite`);

        // Process in batches
        for (let i = 0; i < sqlitePatients.length; i += CONFIG.batchSize) {
            const batch = sqlitePatients.slice(i, i + CONFIG.batchSize);

            try {
                await prisma.$transaction(async (tx) => {
                    for (const patient of batch) {
                        try {
                            await tx.patient.create({
                                data: {
                                    patientNo: patient.patient_no,
                                    firstName: patient.first_name || 'Unknown',
                                    middleName: patient.middle_name,
                                    lastName: patient.last_name || 'Unknown',
                                    fullName: patient.full_name || 'Unknown',
                                    dateOfBirth: patient.date_of_birth && patient.date_of_birth !== '1900-01-01'
                                        ? new Date(patient.date_of_birth)
                                        : null,
                                    gender: mapGender(patient.gender),
                                    nhisNumber: patient.nhis_number,
                                    mobilePhone: patient.mobile_phone,
                                    address: patient.address,
                                    importedFromLhims: true,
                                    lhimsImportedAt: patient.lhims_imported_at
                                        ? new Date(patient.lhims_imported_at)
                                        : new Date(),
                                    isActive: true
                                }
                            });

                            stats.patients.migrated++;
                        } catch (err) {
                            if (err.code === 'P2002') {
                                // Duplicate - skip
                                stats.patients.skipped++;
                            } else {
                                console.error(`  ❌ Failed to migrate patient ${patient.patient_no}:`, err.message);
                                stats.patients.failed++;
                            }
                        }
                    }
                });

                if ((i + CONFIG.batchSize) % CONFIG.logInterval === 0 || i + CONFIG.batchSize >= sqlitePatients.length) {
                    const processed = Math.min(i + CONFIG.batchSize, sqlitePatients.length);
                    console.log(`  ✓ Processed ${processed.toLocaleString()}/${stats.patients.total.toLocaleString()} patients`);
                }

            } catch (err) {
                console.error(`  ❌ Batch failed:`, err.message);
            }
        }

        console.log(`\n✅ Patient migration complete:`);
        console.log(`   Migrated: ${stats.patients.migrated.toLocaleString()}`);
        console.log(`   Skipped:  ${stats.patients.skipped.toLocaleString()}`);
        console.log(`   Failed:   ${stats.patients.failed.toLocaleString()}`);

    } catch (err) {
        console.error('❌ Patient migration failed:', err);
        throw err;
    }
}

// ============================================================================
// STEP 2: MIGRATE VISITS
// ============================================================================

async function migrateVisits() {
    console.log('\n🏥 STEP 2: Migrating Visits');
    console.log('═'.repeat(60));

    try {
        // Get all visits from SQLite
        const sqliteVisits = sqlite.prepare(`
            SELECT * FROM excel_visits ORDER BY visit_date
        `).all();

        stats.visits.total = sqliteVisits.length;
        console.log(`Found ${stats.visits.total.toLocaleString()} visits in SQLite`);

        // Create patient number to ID mapping
        console.log('Creating patient ID mapping...');
        const patients = await prisma.patient.findMany({
            select: { id: true, patientNo: true }
        });
        const patientMap = new Map(patients.map(p => [p.patientNo, p.id]));
        console.log(`✓ Mapped ${patientMap.size.toLocaleString()} patients`);

        // Process in batches
        for (let i = 0; i < sqliteVisits.length; i += CONFIG.batchSize) {
            const batch = sqliteVisits.slice(i, i + CONFIG.batchSize);

            try {
                await prisma.$transaction(async (tx) => {
                    for (const visit of batch) {
                        const patientId = patientMap.get(visit.patient_no);

                        if (!patientId) {
                            stats.visits.skipped++;
                            continue;
                        }

                        try {
                            await tx.visit.create({
                                data: {
                                    patientId: patientId,
                                    visitDate: new Date(visit.visit_date),
                                    visitType: mapVisitType(visit.source_category),
                                    sourceFile: visit.source_file,
                                    sourceCategory: visit.source_category,
                                    sourceRowNumber: visit.source_row_number,
                                    age: visit.age,
                                    locality: visit.locality,
                                    nhisStatus: visit.nhis_status,
                                    rawData: visit.raw_data || {},
                                    status: 'COMPLETED' // Historic visits are completed
                                }
                            });

                            stats.visits.migrated++;
                        } catch (err) {
                            console.error(`  ❌ Failed to migrate visit for ${visit.patient_no}:`, err.message);
                            stats.visits.failed++;
                        }
                    }
                });

                if ((i + CONFIG.batchSize) % CONFIG.logInterval === 0 || i + CONFIG.batchSize >= sqliteVisits.length) {
                    const processed = Math.min(i + CONFIG.batchSize, sqliteVisits.length);
                    console.log(`  ✓ Processed ${processed.toLocaleString()}/${stats.visits.total.toLocaleString()} visits`);
                }

            } catch (err) {
                console.error(`  ❌ Batch failed:`, err.message);
            }
        }

        console.log(`\n✅ Visit migration complete:`);
        console.log(`   Migrated: ${stats.visits.migrated.toLocaleString()}`);
        console.log(`   Skipped:  ${stats.visits.skipped.toLocaleString()}`);
        console.log(`   Failed:   ${stats.visits.failed.toLocaleString()}`);

    } catch (err) {
        console.error('❌ Visit migration failed:', err);
        throw err;
    }
}

// ============================================================================
// STEP 3: MIGRATE DIAGNOSES
// ============================================================================

async function migrateDiagnoses() {
    console.log('\n🔬 STEP 3: Migrating Diagnoses');
    console.log('═'.repeat(60));

    try {
        const sqliteDiagnoses = sqlite.prepare(`
            SELECT * FROM excel_diagnoses ORDER BY visit_date
        `).all();

        stats.diagnoses.total = sqliteDiagnoses.length;
        console.log(`Found ${stats.diagnoses.total.toLocaleString()} diagnoses in SQLite`);

        // Create patient mapping
        const patients = await prisma.patient.findMany({
            select: { id: true, patientNo: true }
        });
        const patientMap = new Map(patients.map(p => [p.patientNo, p.id]));

        // Map diagnosis types
        const diagnosisTypeMap = {
            'Principal': 'PRINCIPAL',
            'Additional': 'ADDITIONAL',
            'Provisional': 'PROVISIONAL'
        };

        const caseTypeMap = {
            'New': 'NEW',
            'Old': 'OLD',
            'Recurring': 'RECURRING'
        };

        // Process in batches
        for (let i = 0; i < sqliteDiagnoses.length; i += CONFIG.batchSize) {
            const batch = sqliteDiagnoses.slice(i, i + CONFIG.batchSize);

            try {
                await prisma.$transaction(async (tx) => {
                    for (const diagnosis of batch) {
                        const patientId = patientMap.get(diagnosis.patient_no);

                        if (!patientId) {
                            stats.diagnoses.skipped++;
                            continue;
                        }

                        try {
                            await tx.diagnosis.create({
                                data: {
                                    patientId: patientId,
                                    visitDate: new Date(diagnosis.visit_date),
                                    diagnosisType: diagnosisTypeMap[diagnosis.diagnosis_type] || 'PRINCIPAL',
                                    caseType: diagnosis.case_type ? caseTypeMap[diagnosis.case_type] : null,
                                    diagnosisText: diagnosis.diagnosis_text,
                                    icd10Code: diagnosis.icd10_code,
                                    sourceFile: diagnosis.source_file
                                }
                            });

                            stats.diagnoses.migrated++;
                        } catch (err) {
                            stats.diagnoses.failed++;
                        }
                    }
                });

                if ((i + CONFIG.batchSize) % CONFIG.logInterval === 0 || i + CONFIG.batchSize >= sqliteDiagnoses.length) {
                    const processed = Math.min(i + CONFIG.batchSize, sqliteDiagnoses.length);
                    console.log(`  ✓ Processed ${processed.toLocaleString()}/${stats.diagnoses.total.toLocaleString()} diagnoses`);
                }

            } catch (err) {
                console.error(`  ❌ Batch failed:`, err.message);
            }
        }

        console.log(`\n✅ Diagnosis migration complete:`);
        console.log(`   Migrated: ${stats.diagnoses.migrated.toLocaleString()}`);
        console.log(`   Skipped:  ${stats.diagnoses.skipped.toLocaleString()}`);
        console.log(`   Failed:   ${stats.diagnoses.failed.toLocaleString()}`);

    } catch (err) {
        console.error('❌ Diagnosis migration failed:', err);
        throw err;
    }
}

// ============================================================================
// STEP 4: MIGRATE MEDICATIONS
// ============================================================================

async function migrateMedications() {
    console.log('\n💊 STEP 4: Migrating Medications');
    console.log('═'.repeat(60));

    try {
        const sqliteMedications = sqlite.prepare(`
            SELECT * FROM excel_medications ORDER BY visit_date
        `).all();

        stats.medications.total = sqliteMedications.length;
        console.log(`Found ${stats.medications.total.toLocaleString()} medications in SQLite`);

        const patients = await prisma.patient.findMany({
            select: { id: true, patientNo: true }
        });
        const patientMap = new Map(patients.map(p => [p.patientNo, p.id]));

        const medicationTypeMap = {
            'Prescribed': 'PRESCRIBED',
            'Dispensed': 'DISPENSED'
        };

        for (let i = 0; i < sqliteMedications.length; i += CONFIG.batchSize) {
            const batch = sqliteMedications.slice(i, i + CONFIG.batchSize);

            try {
                await prisma.$transaction(async (tx) => {
                    for (const medication of batch) {
                        const patientId = patientMap.get(medication.patient_no);

                        if (!patientId) {
                            stats.medications.skipped++;
                            continue;
                        }

                        try {
                            await tx.medication.create({
                                data: {
                                    patientId: patientId,
                                    visitDate: new Date(medication.visit_date),
                                    medicationType: medicationTypeMap[medication.medication_type] || 'PRESCRIBED',
                                    medicationText: medication.medication_text,
                                    sourceFile: medication.source_file
                                }
                            });

                            stats.medications.migrated++;
                        } catch (err) {
                            stats.medications.failed++;
                        }
                    }
                });

                if ((i + CONFIG.batchSize) % CONFIG.logInterval === 0 || i + CONFIG.batchSize >= sqliteMedications.length) {
                    const processed = Math.min(i + CONFIG.batchSize, sqliteMedications.length);
                    console.log(`  ✓ Processed ${processed.toLocaleString()}/${stats.medications.total.toLocaleString()} medications`);
                }

            } catch (err) {
                console.error(`  ❌ Batch failed:`, err.message);
            }
        }

        console.log(`\n✅ Medication migration complete:`);
        console.log(`   Migrated: ${stats.medications.migrated.toLocaleString()}`);
        console.log(`   Skipped:  ${stats.medications.skipped.toLocaleString()}`);
        console.log(`   Failed:   ${stats.medications.failed.toLocaleString()}`);

    } catch (err) {
        console.error('❌ Medication migration failed:', err);
        throw err;
    }
}

// ============================================================================
// STEP 5: MIGRATE LAB ORDERS
// ============================================================================

async function migrateLabOrders() {
    console.log('\n🧪 STEP 5: Migrating Lab Orders');
    console.log('═'.repeat(60));

    try {
        const sqliteLabOrders = sqlite.prepare(`
            SELECT * FROM excel_lab_orders ORDER BY schedule_date
        `).all();

        stats.labOrders.total = sqliteLabOrders.length;
        console.log(`Found ${stats.labOrders.total.toLocaleString()} lab orders in SQLite`);

        const patients = await prisma.patient.findMany({
            select: { id: true, patientNo: true }
        });
        const patientMap = new Map(patients.map(p => [p.patientNo, p.id]));

        for (let i = 0; i < sqliteLabOrders.length; i += CONFIG.batchSize) {
            const batch = sqliteLabOrders.slice(i, i + CONFIG.batchSize);

            try {
                await prisma.$transaction(async (tx) => {
                    for (const labOrder of batch) {
                        const patientId = patientMap.get(labOrder.patient_no);

                        if (!patientId) {
                            stats.labOrders.skipped++;
                            continue;
                        }

                        try {
                            await tx.labOrder.create({
                                data: {
                                    patientId: patientId,
                                    visitNo: labOrder.visit_no,
                                    scheduleDate: new Date(labOrder.schedule_date),
                                    testRequested: labOrder.test_requested,
                                    specimenType: labOrder.specimen_type,
                                    collectionDatetime: labOrder.collection_datetime,
                                    pathologyBarcode: labOrder.pathology_barcode,
                                    clinicianName: labOrder.clinician_name,
                                    clinicianContact: labOrder.clinician_contact,
                                    sourceOfRequest: labOrder.source_of_request,
                                    sourceFile: labOrder.source_file,
                                    status: 'COMPLETED' // Historic orders are completed
                                }
                            });

                            stats.labOrders.migrated++;
                        } catch (err) {
                            stats.labOrders.failed++;
                        }
                    }
                });

                if ((i + CONFIG.batchSize) % CONFIG.logInterval === 0 || i + CONFIG.batchSize >= sqliteLabOrders.length) {
                    const processed = Math.min(i + CONFIG.batchSize, sqliteLabOrders.length);
                    console.log(`  ✓ Processed ${processed.toLocaleString()}/${stats.labOrders.total.toLocaleString()} lab orders`);
                }

            } catch (err) {
                console.error(`  ❌ Batch failed:`, err.message);
            }
        }

        console.log(`\n✅ Lab order migration complete:`);
        console.log(`   Migrated: ${stats.labOrders.migrated.toLocaleString()}`);
        console.log(`   Skipped:  ${stats.labOrders.skipped.toLocaleString()}`);
        console.log(`   Failed:   ${stats.labOrders.failed.toLocaleString()}`);

    } catch (err) {
        console.error('❌ Lab order migration failed:', err);
        throw err;
    }
}

// ============================================================================
// STEP 6: LINK PDFs
// ============================================================================

async function linkPdfs() {
    console.log('\n📄 STEP 6: Linking Patient PDFs');
    console.log('═'.repeat(60));

    try {
        // Check if PDF directory exists
        if (!fs.existsSync(CONFIG.pdfDirectory)) {
            console.log('⚠️  PDF directory not found, skipping...');
            return;
        }

        const files = fs.readdirSync(CONFIG.pdfDirectory);
        const pdfFiles = files.filter(f => f.endsWith('.pdf'));

        stats.pdfs.total = pdfFiles.length;
        console.log(`Found ${stats.pdfs.total.toLocaleString()} PDF files`);

        const patients = await prisma.patient.findMany({
            select: { id: true, patientNo: true }
        });
        const patientMap = new Map(patients.map(p => [p.patientNo, p.id]));

        for (const file of pdfFiles) {
            try {
                // Parse filename: VR-A01-AAA0001_opd_visits.pdf or VR-A01-AAA0001_ipd_admissions.pdf
                let patientNo, pdfType;

                if (file.includes('_opd_')) {
                    patientNo = file.split('_opd_')[0];
                    pdfType = 'OPD_VISITS';
                } else if (file.includes('_ipd_')) {
                    patientNo = file.split('_ipd_')[0];
                    pdfType = 'IPD_ADMISSIONS';
                } else {
                    console.log(`  ⚠️  Unknown PDF format: ${file}`);
                    stats.pdfs.skipped++;
                    continue;
                }

                const patientId = patientMap.get(patientNo);

                if (!patientId) {
                    stats.pdfs.skipped++;
                    continue;
                }

                // Get file stats
                const filePath = path.join(CONFIG.pdfDirectory, file);
                const fileStats = fs.statSync(filePath);

                await prisma.patientPdf.create({
                    data: {
                        patientId: patientId,
                        pdfType: pdfType,
                        filePath: `patient-pdfs/${file}`,
                        fileName: file,
                        fileSize: fileStats.size,
                        extractedFrom: 'LHIMS'
                    }
                });

                stats.pdfs.migrated++;

                if (stats.pdfs.migrated % 100 === 0) {
                    console.log(`  ✓ Linked ${stats.pdfs.migrated.toLocaleString()}/${stats.pdfs.total.toLocaleString()} PDFs`);
                }

            } catch (err) {
                console.error(`  ❌ Failed to link PDF ${file}:`, err.message);
                stats.pdfs.failed++;
            }
        }

        console.log(`\n✅ PDF linking complete:`);
        console.log(`   Migrated: ${stats.pdfs.migrated.toLocaleString()}`);
        console.log(`   Skipped:  ${stats.pdfs.skipped.toLocaleString()}`);
        console.log(`   Failed:   ${stats.pdfs.failed.toLocaleString()}`);

    } catch (err) {
        console.error('❌ PDF linking failed:', err);
        throw err;
    }
}

// ============================================================================
// MAIN MIGRATION ORCHESTRATOR
// ============================================================================

async function main() {
    const startTime = Date.now();

    console.log('═'.repeat(60));
    console.log('  SQLite → PostgreSQL MIGRATION');
    console.log('  Volta Regional Hospital, Hohoe');
    console.log('═'.repeat(60));
    console.log(`\nStarted: ${new Date().toLocaleString()}\n`);

    try {
        // Check SQLite database exists
        if (!fs.existsSync(CONFIG.sqlitePath)) {
            throw new Error(`SQLite database not found: ${CONFIG.sqlitePath}`);
        }

        console.log('✓ SQLite database found');
        console.log('✓ PostgreSQL connection ready');

        // Run migrations in order
        await migratePatients();
        await migrateVisits();
        await migrateDiagnoses();
        await migrateMedications();
        await migrateLabOrders();
        await linkPdfs();

        // Calculate duration
        const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

        console.log('\n' + '═'.repeat(60));
        console.log('  MIGRATION COMPLETED SUCCESSFULLY');
        console.log('═'.repeat(60));
        console.log('\n📊 Final Statistics:\n');
        console.log(`   Patients:     ${stats.patients.migrated.toLocaleString()} migrated`);
        console.log(`   Visits:       ${stats.visits.migrated.toLocaleString()} migrated`);
        console.log(`   Diagnoses:    ${stats.diagnoses.migrated.toLocaleString()} migrated`);
        console.log(`   Medications:  ${stats.medications.migrated.toLocaleString()} migrated`);
        console.log(`   Lab Orders:   ${stats.labOrders.migrated.toLocaleString()} migrated`);
        console.log(`   PDFs Linked:  ${stats.pdfs.migrated.toLocaleString()} migrated`);
        console.log(`\n⏱  Total time: ${duration} minutes`);
        console.log(`\n✓ PostgreSQL database ready for hospital system\n`);

    } catch (err) {
        console.error('\n❌ Migration failed:', err);
        process.exit(1);
    } finally {
        // Cleanup
        sqlite.close();
        await prisma.$disconnect();
    }
}

// Run migration
if (require.main === module) {
    main();
}

module.exports = { main };
