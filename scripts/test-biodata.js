/**
 * Test Bio Data Extraction
 * Quick script to verify bio data extraction from imported data
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'database', 'patient-care-system.db');

console.log('═══════════════════════════════════════════════════════');
console.log('  BIO DATA EXTRACTION TEST');
console.log('  Volta Regional Hospital, Hohoe');
console.log('═══════════════════════════════════════════════════════\n');

try {
    // Open database
    const db = new Database(dbPath, { readonly: true });

    console.log('✓ Connected to database\n');

    // Check current data
    console.log('📊 DATABASE STATISTICS:');
    console.log('─────────────────────────────────────────────────────');

    const stats = {
        totalPatients: db.prepare('SELECT COUNT(*) as count FROM patients').get().count,
        totalVisits: db.prepare('SELECT COUNT(*) as count FROM excel_visits').get().count,
        totalDiagnoses: db.prepare('SELECT COUNT(*) as count FROM excel_diagnoses').get().count,
        totalMedications: db.prepare('SELECT COUNT(*) as count FROM excel_medications').get().count,
        totalLabOrders: db.prepare('SELECT COUNT(*) as count FROM excel_lab_orders').get().count,
    };

    console.log(`Total Patients:     ${stats.totalPatients.toLocaleString()}`);
    console.log(`Total Visits:       ${stats.totalVisits.toLocaleString()}`);
    console.log(`Total Diagnoses:    ${stats.totalDiagnoses.toLocaleString()}`);
    console.log(`Total Medications:  ${stats.totalMedications.toLocaleString()}`);
    console.log(`Total Lab Orders:   ${stats.totalLabOrders.toLocaleString()}`);
    console.log('');

    // Get sample patients with bio data
    console.log('👤 SAMPLE PATIENT BIO DATA:');
    console.log('─────────────────────────────────────────────────────');

    const samplePatients = db.prepare(`
        SELECT
            p.patient_id,
            p.patient_no,
            p.full_name,
            p.gender,
            p.age_years,
            p.nhis_number,
            p.mobile_phone,
            p.address,
            COUNT(DISTINCT CASE WHEN ev.source_category = 'Consulting' THEN ev.visit_id END) as consulting_visits,
            COUNT(DISTINCT CASE WHEN ev.source_category = 'OPD' THEN ev.visit_id END) as opd_visits,
            COUNT(DISTINCT CASE WHEN ev.source_category = 'IPD' THEN ev.visit_id END) as ipd_admissions,
            COUNT(DISTINCT CASE WHEN ev.source_category = 'ANC' THEN ev.visit_id END) as anc_visits,
            COUNT(DISTINCT CASE WHEN ev.source_category = 'Lab' THEN ev.visit_id END) as lab_orders,
            MIN(ev.visit_date) as first_visit,
            MAX(ev.visit_date) as last_visit,
            COUNT(DISTINCT ev.visit_id) as total_visits,
            COUNT(DISTINCT ed.excel_diagnosis_id) as total_diagnoses,
            COUNT(DISTINCT em.excel_medication_id) as total_medications
        FROM patients p
        LEFT JOIN excel_visits ev ON p.patient_no = ev.patient_no
        LEFT JOIN excel_diagnoses ed ON p.patient_no = ed.patient_no
        LEFT JOIN excel_medications em ON p.patient_no = em.patient_no
        GROUP BY p.patient_id
        HAVING total_visits > 0
        ORDER BY total_visits DESC
        LIMIT 5
    `).all();

    if (samplePatients.length === 0) {
        console.log('⚠  No patients with visits found yet (import may still be running)');
    } else {
        samplePatients.forEach((patient, index) => {
            console.log(`\n[${index + 1}] ${patient.full_name || 'Unknown'}`);
            console.log(`    Patient ID:        ${patient.patient_no}`);
            console.log(`    Gender/Age:        ${patient.gender || 'N/A'} / ${patient.age_years || 'N/A'} years`);
            console.log(`    NHIS:              ${patient.nhis_number || 'N/A'}`);
            console.log(`    Phone:             ${patient.mobile_phone || 'N/A'}`);
            console.log(`    Address:           ${patient.address || 'N/A'}`);
            console.log(`    ─────────────────────────────────────────────────`);
            console.log(`    Consulting Visits: ${patient.consulting_visits}`);
            console.log(`    OPD Visits:        ${patient.opd_visits}`);
            console.log(`    IPD Admissions:    ${patient.ipd_admissions}`);
            console.log(`    ANC Visits:        ${patient.anc_visits}`);
            console.log(`    Lab Orders:        ${patient.lab_orders}`);
            console.log(`    Total Visits:      ${patient.total_visits}`);
            console.log(`    Total Diagnoses:   ${patient.total_diagnoses}`);
            console.log(`    Total Medications: ${patient.total_medications}`);
            console.log(`    First Visit:       ${patient.first_visit || 'N/A'}`);
            console.log(`    Last Visit:        ${patient.last_visit || 'N/A'}`);
        });
    }

    // Test search functionality
    console.log('\n\n🔍 SEARCH TEST:');
    console.log('─────────────────────────────────────────────────────');

    const searchTest = db.prepare(`
        SELECT
            p.patient_no,
            p.full_name,
            p.gender,
            p.mobile_phone,
            COUNT(DISTINCT ev.visit_id) as visit_count
        FROM patients p
        LEFT JOIN excel_visits ev ON p.patient_no = ev.patient_no
        WHERE p.patient_no LIKE ?
        GROUP BY p.patient_id
        LIMIT 3
    `).all('%VR-A01-AAA%');

    if (searchTest.length > 0) {
        console.log(`Found ${searchTest.length} patients matching "VR-A01-AAA":`);
        searchTest.forEach(patient => {
            console.log(`  - ${patient.patient_no}: ${patient.full_name} (${patient.visit_count} visits)`);
        });
    } else {
        console.log('No patients found (import may still be running)');
    }

    // Check import progress
    console.log('\n\n📥 IMPORT PROGRESS:');
    console.log('─────────────────────────────────────────────────────');

    const importLog = db.prepare(`
        SELECT
            source_category,
            COUNT(*) as files_imported,
            SUM(records_imported) as total_records,
            SUM(records_failed) as total_failed,
            import_status
        FROM import_log
        WHERE import_status = 'Completed'
        GROUP BY source_category
        ORDER BY source_category
    `).all();

    if (importLog.length > 0) {
        importLog.forEach(log => {
            console.log(`${log.source_category.padEnd(15)} ${log.files_imported} files, ${log.total_records.toLocaleString()} records, ${log.total_failed} failed`);
        });
    } else {
        console.log('No completed imports yet');
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✓ BIO DATA TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════\n');

    db.close();

} catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error('\nMake sure:');
    console.error('  1. Database exists: npm run db:init');
    console.error('  2. Data is imported: npm run db:import');
    process.exit(1);
}
