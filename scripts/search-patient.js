/**
 * Simple command-line patient search tool
 * Search and view patient data from the Phase 1 database
 */

const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');

const CONFIG = {
    databasePath: './data/database/patient-care-system.db'
};

let db;

// Connect to database
function connectDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(CONFIG.databasePath, sqlite3.OPEN_READONLY, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// Search patients by patient number, name, NHIS, or phone
async function searchPatients(searchTerm) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT p.patient_id, p.patient_no, p.full_name, p.gender, p.age_years,
                   p.nhis_number, p.mobile_phone, p.address,
                   COUNT(DISTINCT ev.visit_id) as total_visits,
                   MAX(ev.visit_date) as last_visit
            FROM patients p
            LEFT JOIN excel_visits ev ON p.patient_no = ev.patient_no
            WHERE p.patient_no LIKE ?
               OR p.full_name LIKE ?
               OR p.nhis_number LIKE ?
               OR p.mobile_phone LIKE ?
            GROUP BY p.patient_id
            ORDER BY p.patient_no
            LIMIT 20
        `;

        const searchPattern = `%${searchTerm}%`;

        db.all(query, [searchPattern, searchPattern, searchPattern, searchPattern], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Get patient details
async function getPatientDetails(patientNo) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT * FROM patients WHERE patient_no = ?',
            [patientNo],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
}

// Get patient visits
async function getPatientVisits(patientNo, limit = 10) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT visit_date, source_category, age, gender, locality
             FROM excel_visits
             WHERE patient_no = ?
             ORDER BY visit_date DESC
             LIMIT ?`,
            [patientNo, limit],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

// Get patient diagnoses
async function getPatientDiagnoses(patientNo, limit = 20) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT visit_date, diagnosis_type, case_type, icd10_code, diagnosis_text
             FROM excel_diagnoses
             WHERE patient_no = ?
             ORDER BY visit_date DESC
             LIMIT ?`,
            [patientNo, limit],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

// Get patient medications
async function getPatientMedications(patientNo, limit = 20) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT visit_date, medication_type, medication_text
             FROM excel_medications
             WHERE patient_no = ?
             ORDER BY visit_date DESC
             LIMIT ?`,
            [patientNo, limit],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

// Get patient lab orders
async function getPatientLabOrders(patientNo, limit = 20) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT schedule_date, test_requested, specimen_type, clinician_name
             FROM excel_lab_orders
             WHERE patient_no = ?
             ORDER BY schedule_date DESC
             LIMIT ?`,
            [patientNo, limit],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

// Display patient search results
function displaySearchResults(patients) {
    if (patients.length === 0) {
        console.log('\n❌ No patients found\n');
        return;
    }

    console.log('\n' + '='.repeat(120));
    console.log('SEARCH RESULTS');
    console.log('='.repeat(120));

    patients.forEach((p, i) => {
        console.log(`\n[${i + 1}] ${p.patient_no} - ${p.full_name}`);
        console.log(`    Gender: ${p.gender || 'N/A'} | Age: ${p.age_years || 'N/A'} years`);
        console.log(`    NHIS: ${p.nhis_number || 'N/A'} | Phone: ${p.mobile_phone || 'N/A'}`);
        console.log(`    Address: ${p.address || 'N/A'}`);
        console.log(`    Visits: ${p.total_visits || 0} | Last Visit: ${p.last_visit || 'N/A'}`);
    });

    console.log('\n' + '='.repeat(120) + '\n');
}

// Display patient full details
async function displayPatientDetails(patientNo) {
    console.log('\n' + '═'.repeat(120));
    console.log('PATIENT DETAILS');
    console.log('═'.repeat(120));

    const patient = await getPatientDetails(patientNo);

    if (!patient) {
        console.log('\n❌ Patient not found\n');
        return;
    }

    // Demographics
    console.log('\n👤 DEMOGRAPHICS');
    console.log('─'.repeat(120));
    console.log(`Patient No:    ${patient.patient_no}`);
    console.log(`Full Name:     ${patient.full_name}`);
    console.log(`Gender:        ${patient.gender || 'N/A'}`);
    console.log(`Age:           ${patient.age_years || 'N/A'} years`);
    console.log(`NHIS Number:   ${patient.nhis_number || 'N/A'}`);
    console.log(`Phone:         ${patient.mobile_phone || 'N/A'}`);
    console.log(`Address:       ${patient.address || 'N/A'}`);

    // Visit History
    const visits = await getPatientVisits(patientNo, 10);
    console.log('\n📅 VISIT HISTORY (Last 10)');
    console.log('─'.repeat(120));
    if (visits.length === 0) {
        console.log('   No visits recorded');
    } else {
        visits.forEach(v => {
            console.log(`   ${v.visit_date} | ${v.source_category.padEnd(12)} | Age: ${v.age || 'N/A'} | ${v.locality || 'N/A'}`);
        });
    }

    // Diagnoses
    const diagnoses = await getPatientDiagnoses(patientNo, 15);
    console.log('\n🩺 DIAGNOSES (Last 15)');
    console.log('─'.repeat(120));
    if (diagnoses.length === 0) {
        console.log('   No diagnoses recorded');
    } else {
        diagnoses.forEach(d => {
            const icd = d.icd10_code ? `[${d.icd10_code}]` : '[N/A]';
            const type = d.diagnosis_type ? `(${d.diagnosis_type})` : '';
            const caseType = d.case_type ? `{${d.case_type}}` : '';
            console.log(`   ${d.visit_date} | ${icd.padEnd(8)} ${type.padEnd(13)} ${caseType.padEnd(12)} ${d.diagnosis_text || 'N/A'}`);
        });
    }

    // Medications
    const medications = await getPatientMedications(patientNo, 15);
    console.log('\n💊 MEDICATIONS (Last 15)');
    console.log('─'.repeat(120));
    if (medications.length === 0) {
        console.log('   No medications recorded');
    } else {
        medications.forEach(m => {
            console.log(`   ${m.visit_date} | ${m.medication_type.padEnd(12)} | ${m.medication_text || 'N/A'}`);
        });
    }

    // Lab Orders
    const labOrders = await getPatientLabOrders(patientNo, 15);
    console.log('\n🔬 LABORATORY ORDERS (Last 15)');
    console.log('─'.repeat(120));
    if (labOrders.length === 0) {
        console.log('   No lab orders recorded');
    } else {
        labOrders.forEach(l => {
            console.log(`   ${l.schedule_date} | ${l.test_requested || 'N/A'} (${l.specimen_type || 'N/A'}) | Dr. ${l.clinician_name || 'N/A'}`);
        });
    }

    console.log('\n' + '═'.repeat(120) + '\n');
}

// Interactive search
async function interactiveSearch() {
    console.log('═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════');
    console.log('  PATIENT SEARCH TOOL');
    console.log('  Volta Regional Hospital, Hohoe - Phase 1 Database');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════\n');

    try {
        await connectDatabase();
        console.log('✓ Connected to database\n');

        // Get database statistics
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

        console.log('📊 Database Statistics:');
        console.log(`   Patients: ${stats.patients.toLocaleString()}`);
        console.log(`   Visits: ${stats.visits.toLocaleString()}`);
        console.log(`   Diagnoses: ${stats.diagnoses.toLocaleString()}`);
        console.log(`   Medications: ${stats.medications.toLocaleString()}`);
        console.log(`   Lab Orders: ${stats.lab_orders.toLocaleString()}`);
        console.log('\n' + '─'.repeat(120));

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

        while (true) {
            console.log('\n💡 Search Options:');
            console.log('   1. Search patients (by number, name, NHIS, or phone)');
            console.log('   2. View patient details (enter patient number)');
            console.log('   3. Exit');

            const choice = await askQuestion('\n❯ Enter choice (1-3): ');

            if (choice === '1') {
                const searchTerm = await askQuestion('\n❯ Enter search term: ');
                if (!searchTerm.trim()) {
                    console.log('\n⚠ Please enter a search term\n');
                    continue;
                }

                const results = await searchPatients(searchTerm.trim());
                displaySearchResults(results);

            } else if (choice === '2') {
                const patientNo = await askQuestion('\n❯ Enter patient number: ');
                if (!patientNo.trim()) {
                    console.log('\n⚠ Please enter a patient number\n');
                    continue;
                }

                await displayPatientDetails(patientNo.trim().toUpperCase());

            } else if (choice === '3') {
                console.log('\n👋 Goodbye!\n');
                rl.close();
                break;
            } else {
                console.log('\n⚠ Invalid choice. Please enter 1, 2, or 3\n');
            }
        }

    } catch (err) {
        console.error('\n❌ Error:', err.message);
    } finally {
        if (db) {
            db.close();
        }
    }
}

// Command-line mode
async function commandLineMode() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage:');
        console.log('  node scripts/search-patient.js                  # Interactive mode');
        console.log('  node scripts/search-patient.js search <term>    # Search patients');
        console.log('  node scripts/search-patient.js view <patient_no> # View patient details');
        process.exit(0);
    }

    try {
        await connectDatabase();

        if (args[0] === 'search' && args[1]) {
            const results = await searchPatients(args[1]);
            displaySearchResults(results);

        } else if (args[0] === 'view' && args[1]) {
            await displayPatientDetails(args[1].toUpperCase());

        } else {
            console.log('Invalid command. Use: search <term> or view <patient_no>');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (db) {
            db.close();
        }
    }
}

// Run
if (require.main === module) {
    const hasArgs = process.argv.length > 2;
    if (hasArgs) {
        commandLineMode();
    } else {
        interactiveSearch();
    }
}

module.exports = { searchPatients, getPatientDetails };
