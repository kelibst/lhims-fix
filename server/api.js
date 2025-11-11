/**
 * PATIENT SEARCH API SERVER
 *
 * Express API for MVP patient search system
 * Provides endpoints for searching patients and viewing their data
 */

const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const dbPath = path.join(__dirname, '..', 'data', 'database', 'patient-care-system.db');
const db = new Database(dbPath, { readonly: true });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/search
 * Search for patients by ID, name, NHIS number, or phone
 * Query params: q (search query), limit (default 20)
 */
app.get('/api/search', (req, res) => {
    try {
        const query = req.query.q || '';
        const limit = parseInt(req.query.limit) || 20;

        if (!query || query.length < 2) {
            return res.json({
                success: true,
                results: [],
                count: 0,
                message: 'Please enter at least 2 characters to search'
            });
        }

        // Search using full-text search for faster results
        const searchResults = db.prepare(`
            SELECT
                p.patient_id,
                p.patient_no,
                p.full_name,
                p.gender,
                p.date_of_birth,
                CASE
                    WHEN p.date_of_birth IS NOT NULL AND p.date_of_birth != '1900-01-01'
                    THEN CAST((julianday('now') - julianday(p.date_of_birth)) / 365.25 AS INTEGER)
                    ELSE NULL
                END as age_years,
                (SELECT age FROM excel_visits WHERE patient_no = p.patient_no AND age IS NOT NULL ORDER BY visit_date DESC LIMIT 1) as current_age,
                p.nhis_number,
                p.mobile_phone,
                p.address,
                COUNT(DISTINCT ev.visit_id) as visit_count,
                MAX(ev.visit_date) as last_visit_date
            FROM patients p
            LEFT JOIN excel_visits ev ON p.patient_no = ev.patient_no
            WHERE
                p.patient_no LIKE ?
                OR p.full_name LIKE ?
                OR p.nhis_number LIKE ?
                OR p.mobile_phone LIKE ?
            GROUP BY p.patient_id
            ORDER BY p.patient_no
            LIMIT ?
        `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, limit);

        res.json({
            success: true,
            results: searchResults,
            count: searchResults.length,
            query: query
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: 'Search failed',
            message: error.message
        });
    }
});

/**
 * GET /api/patient/:patient_no
 * Get complete patient bio data and summary
 */
app.get('/api/patient/:patient_no', (req, res) => {
    try {
        const patientNo = req.params.patient_no;

        // Get patient bio data
        const patient = db.prepare(`
            SELECT
                p.patient_id,
                p.patient_no,
                p.full_name,
                p.first_name,
                p.last_name,
                p.gender,
                p.date_of_birth,
                CASE
                    WHEN p.date_of_birth IS NOT NULL AND p.date_of_birth != '1900-01-01'
                    THEN CAST((julianday('now') - julianday(p.date_of_birth)) / 365.25 AS INTEGER)
                    ELSE NULL
                END as age_years,
                (SELECT age FROM excel_visits WHERE patient_no = p.patient_no AND age IS NOT NULL ORDER BY visit_date DESC LIMIT 1) as current_age,
                p.nhis_number,
                p.mobile_phone,
                p.address,
                COUNT(DISTINCT CASE WHEN ev.source_category = 'Consulting' THEN ev.visit_id END) as total_consulting_visits,
                COUNT(DISTINCT CASE WHEN ev.source_category = 'OPD' THEN ev.visit_id END) as total_opd_visits,
                COUNT(DISTINCT CASE WHEN ev.source_category = 'IPD' THEN ev.visit_id END) as total_ipd_admissions,
                COUNT(DISTINCT CASE WHEN ev.source_category = 'ANC' THEN ev.visit_id END) as total_anc_visits,
                COUNT(DISTINCT CASE WHEN ev.source_category = 'Lab' THEN ev.visit_id END) as total_lab_orders,
                MIN(ev.visit_date) as first_visit_date,
                MAX(ev.visit_date) as last_visit_date
            FROM patients p
            LEFT JOIN excel_visits ev ON p.patient_no = ev.patient_no
            WHERE p.patient_no = ?
            GROUP BY p.patient_id
        `).get(patientNo);

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        res.json({
            success: true,
            patient: patient
        });
    } catch (error) {
        console.error('Patient fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch patient data',
            message: error.message
        });
    }
});

/**
 * GET /api/patient/:patient_no/opd-visits
 * Get list of OPD visits for a patient
 */
app.get('/api/patient/:patient_no/opd-visits', (req, res) => {
    try {
        const patientNo = req.params.patient_no;

        const visits = db.prepare(`
            SELECT
                ev.visit_id,
                ev.visit_date,
                ev.source_category,
                ev.source_file,
                ev.age,
                ev.gender,
                ev.locality,
                ev.nhis_status,
                ev.raw_data,
                GROUP_CONCAT(ed.diagnosis_text, '; ') as diagnoses,
                GROUP_CONCAT(ed.icd10_code, ', ') as icd10_codes
            FROM excel_visits ev
            LEFT JOIN excel_diagnoses ed ON ev.patient_no = ed.patient_no AND ev.visit_date = ed.visit_date
            WHERE ev.patient_no = ?
            AND ev.source_category IN ('OPD', 'Consulting')
            GROUP BY ev.visit_id
            ORDER BY ev.visit_date DESC
        `).all(patientNo);

        res.json({
            success: true,
            visits: visits,
            count: visits.length
        });
    } catch (error) {
        console.error('OPD visits fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch OPD visits',
            message: error.message
        });
    }
});

/**
 * GET /api/patient/:patient_no/ipd-admissions
 * Get list of IPD admissions for a patient
 */
app.get('/api/patient/:patient_no/ipd-admissions', (req, res) => {
    try {
        const patientNo = req.params.patient_no;

        const admissions = db.prepare(`
            SELECT
                ev.visit_id,
                ev.visit_date as admission_date,
                ev.source_file,
                ev.age,
                ev.gender,
                ev.locality,
                ev.raw_data,
                GROUP_CONCAT(ed.diagnosis_text, '; ') as diagnoses,
                GROUP_CONCAT(ed.icd10_code, ', ') as icd10_codes
            FROM excel_visits ev
            LEFT JOIN excel_diagnoses ed ON ev.patient_no = ed.patient_no AND ev.visit_date = ed.visit_date
            WHERE ev.patient_no = ?
            AND ev.source_category = 'IPD'
            GROUP BY ev.visit_id
            ORDER BY ev.visit_date DESC
        `).all(patientNo);

        res.json({
            success: true,
            admissions: admissions,
            count: admissions.length
        });
    } catch (error) {
        console.error('IPD admissions fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch IPD admissions',
            message: error.message
        });
    }
});

/**
 * GET /api/patient/:patient_no/diagnoses
 * Get diagnosis history for a patient
 */
app.get('/api/patient/:patient_no/diagnoses', (req, res) => {
    try {
        const patientNo = req.params.patient_no;

        const diagnoses = db.prepare(`
            SELECT
                ed.excel_diagnosis_id,
                ed.visit_date,
                ed.diagnosis_type,
                ed.case_type,
                ed.diagnosis_text,
                ed.icd10_code,
                ed.source_file
            FROM excel_diagnoses ed
            WHERE ed.patient_no = ?
            ORDER BY ed.visit_date DESC
        `).all(patientNo);

        res.json({
            success: true,
            diagnoses: diagnoses,
            count: diagnoses.length
        });
    } catch (error) {
        console.error('Diagnoses fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch diagnoses',
            message: error.message
        });
    }
});

/**
 * GET /api/patient/:patient_no/medications
 * Get medication history for a patient
 */
app.get('/api/patient/:patient_no/medications', (req, res) => {
    try {
        const patientNo = req.params.patient_no;

        const medications = db.prepare(`
            SELECT
                em.excel_medication_id,
                em.visit_date,
                em.medication_type,
                em.medication_text,
                em.source_file
            FROM excel_medications em
            WHERE em.patient_no = ?
            ORDER BY em.visit_date DESC
        `).all(patientNo);

        res.json({
            success: true,
            medications: medications,
            count: medications.length
        });
    } catch (error) {
        console.error('Medications fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch medications',
            message: error.message
        });
    }
});

/**
 * GET /api/patient/:patient_no/lab-orders
 * Get lab orders for a patient
 */
app.get('/api/patient/:patient_no/lab-orders', (req, res) => {
    try {
        const patientNo = req.params.patient_no;

        const labOrders = db.prepare(`
            SELECT
                el.excel_lab_order_id,
                el.visit_no,
                el.schedule_date,
                el.test_requested,
                el.specimen_type,
                el.collection_datetime,
                el.clinician_name,
                el.source_of_request,
                el.source_file
            FROM excel_lab_orders el
            WHERE el.patient_no = ?
            ORDER BY el.schedule_date DESC
        `).all(patientNo);

        res.json({
            success: true,
            labOrders: labOrders,
            count: labOrders.length
        });
    } catch (error) {
        console.error('Lab orders fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch lab orders',
            message: error.message
        });
    }
});

/**
 * GET /api/stats
 * Get overall system statistics
 */
app.get('/api/stats', (req, res) => {
    try {
        const stats = {
            totalPatients: db.prepare('SELECT COUNT(*) as count FROM patients').get().count,
            totalVisits: db.prepare('SELECT COUNT(*) as count FROM excel_visits').get().count,
            totalDiagnoses: db.prepare('SELECT COUNT(*) as count FROM excel_diagnoses').get().count,
            totalMedications: db.prepare('SELECT COUNT(*) as count FROM excel_medications').get().count,
            totalLabOrders: db.prepare('SELECT COUNT(*) as count FROM excel_lab_orders').get().count,
            opdVisits: db.prepare("SELECT COUNT(*) as count FROM excel_visits WHERE source_category = 'OPD'").get().count,
            ipdAdmissions: db.prepare("SELECT COUNT(*) as count FROM excel_visits WHERE source_category = 'IPD'").get().count,
            consultingVisits: db.prepare("SELECT COUNT(*) as count FROM excel_visits WHERE source_category = 'Consulting'").get().count,
            ancVisits: db.prepare("SELECT COUNT(*) as count FROM excel_visits WHERE source_category = 'ANC'").get().count
        };

        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics',
            message: error.message
        });
    }
});

// ============================================================================
// SERVER START
// ============================================================================

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  PATIENT SEARCH API SERVER');
    console.log('  Volta Regional Hospital, Hohoe');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ Database: ${dbPath}`);
    console.log('\n📡 Available Endpoints:');
    console.log('   GET  /api/search?q=<query>');
    console.log('   GET  /api/patient/:patient_no');
    console.log('   GET  /api/patient/:patient_no/opd-visits');
    console.log('   GET  /api/patient/:patient_no/ipd-admissions');
    console.log('   GET  /api/patient/:patient_no/diagnoses');
    console.log('   GET  /api/patient/:patient_no/medications');
    console.log('   GET  /api/patient/:patient_no/lab-orders');
    console.log('   GET  /api/stats');
    console.log('\n🌐 Frontend: http://localhost:' + PORT);
    console.log('\n Press Ctrl+C to stop\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nShutting down server...');
    db.close();
    process.exit(0);
});
