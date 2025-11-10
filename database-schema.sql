-- ============================================================================
-- LOCAL PATIENT CARE SYSTEM - DATABASE SCHEMA
-- Volta Regional Hospital, Hohoe
--
-- Purpose: Offline patient management system for continuity of care
-- Database: SQLite (offline-capable, single-file)
-- ============================================================================

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================================================
-- CORE PATIENT INFORMATION
-- ============================================================================

CREATE TABLE patients (
    patient_id INTEGER PRIMARY KEY,
    patient_no TEXT NOT NULL UNIQUE,  -- VR-A01-AAA2142
    short_patient_no TEXT,

    -- Demographics
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    age_years INTEGER,
    age_string TEXT,
    gender TEXT CHECK(gender IN ('Male', 'Female', 'Other')),

    -- Contact Information
    mobile_phone TEXT,
    home_phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'Ghana',

    -- Clinical Information
    blood_group TEXT,
    nhis_number TEXT,  -- National Health Insurance
    nhis_status TEXT,
    weight_kg REAL,
    height_cm REAL,

    -- Personal Information
    religion TEXT,
    marital_status TEXT,
    occupation TEXT,
    education TEXT,

    -- Emergency Contact
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,

    -- Medical Alerts
    allergies TEXT,  -- Comma-separated or JSON
    chronic_conditions TEXT,  -- JSON array

    -- System Fields
    primary_clinic_id INTEGER DEFAULT 2,
    membership_type TEXT,
    is_vip INTEGER DEFAULT 0,
    is_frozen INTEGER DEFAULT 0,

    -- Audit
    lhims_patient_id TEXT,  -- Original LHIMS ID
    imported_from_lhims INTEGER DEFAULT 1,
    lhims_imported_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Full-text search index
    patient_search_text TEXT  -- Combination of name, patient_no, nhis for fast search
);

-- Indexes for fast lookups
CREATE INDEX idx_patients_patient_no ON patients(patient_no);
CREATE INDEX idx_patients_nhis ON patients(nhis_number);
CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_patients_dob ON patients(date_of_birth);

-- Full-text search virtual table
CREATE VIRTUAL TABLE patients_fts USING fts5(
    patient_no,
    full_name,
    nhis_number,
    mobile_phone,
    content='patients',
    content_rowid='patient_id'
);

-- Trigger to keep FTS in sync
CREATE TRIGGER patients_fts_insert AFTER INSERT ON patients BEGIN
    INSERT INTO patients_fts(rowid, patient_no, full_name, nhis_number, mobile_phone)
    VALUES (new.patient_id, new.patient_no, new.full_name, new.nhis_number, new.mobile_phone);
END;

CREATE TRIGGER patients_fts_update AFTER UPDATE ON patients BEGIN
    UPDATE patients_fts SET
        patient_no = new.patient_no,
        full_name = new.full_name,
        nhis_number = new.nhis_number,
        mobile_phone = new.mobile_phone
    WHERE rowid = old.patient_id;
END;

-- ============================================================================
-- ADMISSIONS (IPD - In-Patient Department)
-- ============================================================================

CREATE TABLE admissions (
    admission_id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL,

    -- Admission Details
    admission_no TEXT UNIQUE,  -- ADMT-12923
    admit_date DATE NOT NULL,
    admit_time TIME,
    discharge_date DATE,
    discharge_time TIME,

    -- Location
    ward_id INTEGER,
    ward_name TEXT,
    room_name TEXT,
    bed_no TEXT,
    bed_from_date DATETIME,

    -- Clinical
    chief_complaint TEXT,
    admission_reason TEXT,
    admission_notes TEXT,  -- Full nursing notes
    diagnosis TEXT,

    -- Medical Team
    attending_doctor_id INTEGER,
    attending_doctor_name TEXT,
    duty_doctor_id INTEGER,

    -- Status
    status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Discharged', 'Transferred', 'Deceased')),
    discharge_reason TEXT,
    transfer_reason TEXT,

    -- Referral
    referral_in TEXT,
    referral_in_notes TEXT,

    -- Audit
    lhims_admission_id TEXT,
    lhims_admit_id TEXT,
    imported_from_lhims INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE INDEX idx_admissions_patient ON admissions(patient_id);
CREATE INDEX idx_admissions_date ON admissions(admit_date DESC);
CREATE INDEX idx_admissions_status ON admissions(status);

-- ============================================================================
-- CONSULTATIONS (OPD - Out-Patient Department)
-- ============================================================================

CREATE TABLE consultations (
    consultation_id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL,

    -- Consultation Details
    consultation_date DATE NOT NULL,
    consultation_time TIME,
    consultation_no TEXT,

    -- Department/Service
    department_id INTEGER,
    department_name TEXT,
    service_id INTEGER,
    service_name TEXT,

    -- Clinical Staff
    doctor_id INTEGER,
    doctor_name TEXT,
    staff_id INTEGER,
    staff_name TEXT,

    -- Clinical Information
    chief_complaint TEXT,
    presenting_complaint TEXT,
    history_of_presenting_complaint TEXT,
    clinical_findings TEXT,
    diagnosis TEXT,
    diagnosis_icd10 TEXT,  -- ICD-10 codes
    treatment_plan TEXT,
    clinical_notes TEXT,

    -- Vital Signs (captured during consultation)
    blood_pressure TEXT,
    temperature_celsius REAL,
    pulse_bpm INTEGER,
    respiratory_rate INTEGER,
    weight_kg REAL,
    height_cm REAL,
    bmi REAL,
    oxygen_saturation INTEGER,

    -- Status
    status TEXT DEFAULT 'Scheduled' CHECK(status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled')),

    -- Audit
    lhims_consultation_id TEXT,
    lhims_schedule_id TEXT,
    imported_from_lhims INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE INDEX idx_consultations_patient ON consultations(patient_id);
CREATE INDEX idx_consultations_date ON consultations(consultation_date DESC);
CREATE INDEX idx_consultations_status ON consultations(status);

-- ============================================================================
-- PRESCRIPTIONS
-- ============================================================================

CREATE TABLE prescriptions (
    prescription_id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    consultation_id INTEGER,  -- Link to consultation if applicable
    admission_id INTEGER,  -- Link to admission if IPD prescription

    -- Drug Information
    drug_id INTEGER,
    drug_name TEXT NOT NULL,
    generic_name TEXT,
    formulation TEXT,  -- Tablet, Capsule, Syrup, etc.
    strength TEXT,

    -- Dosage Instructions
    dosage TEXT,  -- e.g., "1-0-1" (morning-afternoon-evening)
    actual_dosage TEXT,
    frequency TEXT,  -- BDS, TDS, QDS, etc.
    frequency_description TEXT,  -- Twice daily, Three times daily
    route_of_administration TEXT,  -- Oral, IV, IM, etc.

    -- Duration
    start_date DATE NOT NULL,
    end_date DATE,
    duration_days INTEGER,

    -- Instructions
    instructions TEXT,
    special_instructions TEXT,

    -- Safety
    side_effects TEXT,
    drug_interactions TEXT,
    contraindications TEXT,

    -- Prescriber
    prescriber_id INTEGER,
    prescriber_name TEXT,
    prescription_date DATE,

    -- Dispensing
    dispense_status TEXT DEFAULT 'Not Dispensed' CHECK(dispense_status IN ('Not Dispensed', 'Partially Dispensed', 'Fully Dispensed')),
    quantity_prescribed INTEGER,
    quantity_dispensed INTEGER,

    -- Status
    is_stopped INTEGER DEFAULT 0,
    stopped_date DATE,
    stopped_by TEXT,
    reason_for_stopped TEXT,

    -- Audit
    lhims_prescription_id TEXT,
    imported_from_lhims INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id),
    FOREIGN KEY (admission_id) REFERENCES admissions(admission_id)
);

CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_date ON prescriptions(start_date DESC);
CREATE INDEX idx_prescriptions_drug ON prescriptions(drug_name);
CREATE INDEX idx_prescriptions_active ON prescriptions(is_stopped, end_date);

-- ============================================================================
-- LABORATORY RESULTS
-- ============================================================================

CREATE TABLE lab_results (
    lab_result_id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    consultation_id INTEGER,

    -- Test Information
    test_code TEXT,
    test_name TEXT NOT NULL,
    test_category TEXT,  -- Hematology, Chemistry, Microbiology, etc.

    -- Results
    result_value TEXT,
    result_numeric REAL,  -- For numeric values
    result_unit TEXT,
    reference_range TEXT,
    reference_min REAL,
    reference_max REAL,

    -- Interpretation
    is_abnormal INTEGER DEFAULT 0,
    abnormal_flag TEXT,  -- High, Low, Critical
    interpretation TEXT,
    clinician_notes TEXT,

    -- Dates
    test_date DATE NOT NULL,
    sample_collection_date DATE,
    result_date DATE,

    -- Lab Details
    lab_technician TEXT,
    verified_by TEXT,

    -- Audit
    lhims_test_id TEXT,
    imported_from_lhims INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id)
);

CREATE INDEX idx_lab_results_patient ON lab_results(patient_id);
CREATE INDEX idx_lab_results_date ON lab_results(test_date DESC);
CREATE INDEX idx_lab_results_test ON lab_results(test_name);
CREATE INDEX idx_lab_results_abnormal ON lab_results(is_abnormal);

-- ============================================================================
-- SURGICAL PROCEDURES
-- ============================================================================

CREATE TABLE surgical_procedures (
    surgery_id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    admission_id INTEGER,

    -- Procedure Details
    surgery_name TEXT NOT NULL,
    surgery_code TEXT,  -- ICD-10-PCS or local code
    surgery_category TEXT,

    -- Schedule
    surgery_date DATE NOT NULL,
    surgery_time TIME,
    start_time TIME,
    end_time TIME,
    duration_minutes INTEGER,

    -- Location
    operating_theater TEXT,
    ot_id INTEGER,

    -- Surgical Team
    chief_surgeon TEXT,
    assistant_surgeons TEXT,  -- JSON array
    anesthetist TEXT,
    nurses TEXT,  -- JSON array

    -- Anesthesia
    anesthesia_type TEXT,
    anesthesia_notes TEXT,

    -- Clinical
    indication TEXT,
    procedure_notes TEXT,
    findings TEXT,
    complications TEXT,
    estimated_blood_loss_ml INTEGER,

    -- Status
    status TEXT DEFAULT 'Scheduled' CHECK(status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled')),
    is_emergency INTEGER DEFAULT 0,

    -- Audit
    lhims_surgery_id TEXT,
    imported_from_lhims INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (admission_id) REFERENCES admissions(admission_id)
);

CREATE INDEX idx_surgeries_patient ON surgical_procedures(patient_id);
CREATE INDEX idx_surgeries_date ON surgical_procedures(surgery_date DESC);

-- ============================================================================
-- VACCINATIONS
-- ============================================================================

CREATE TABLE vaccinations (
    vaccination_id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL,

    -- Vaccine Details
    vaccine_name TEXT NOT NULL,
    vaccine_code TEXT,
    vaccine_type TEXT,
    manufacturer TEXT,
    batch_number TEXT,

    -- Administration
    vaccination_date DATE NOT NULL,
    dose_number INTEGER,
    dose_amount TEXT,
    route TEXT,
    site TEXT,  -- Left arm, right arm, etc.

    -- Medical Staff
    administered_by TEXT,
    staff_id INTEGER,

    -- Next Dose
    next_dose_date DATE,
    is_completed INTEGER DEFAULT 0,

    -- Adverse Reactions
    adverse_reaction TEXT,

    -- Audit
    lhims_vaccination_id TEXT,
    imported_from_lhims INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE INDEX idx_vaccinations_patient ON vaccinations(patient_id);
CREATE INDEX idx_vaccinations_date ON vaccinations(vaccination_date DESC);

-- ============================================================================
-- VITAL SIGNS (Historical Tracking)
-- ============================================================================

CREATE TABLE vital_signs (
    vital_sign_id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    consultation_id INTEGER,
    admission_id INTEGER,

    -- Vital Signs
    measurement_date DATE NOT NULL,
    measurement_time TIME,

    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    blood_pressure_text TEXT,

    temperature_celsius REAL,
    pulse_bpm INTEGER,
    respiratory_rate INTEGER,
    oxygen_saturation INTEGER,

    weight_kg REAL,
    height_cm REAL,
    bmi REAL,

    -- Additional
    pain_score INTEGER CHECK(pain_score BETWEEN 0 AND 10),
    consciousness_level TEXT,

    -- Measured By
    measured_by TEXT,
    staff_id INTEGER,

    -- Audit
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id),
    FOREIGN KEY (admission_id) REFERENCES admissions(admission_id)
);

CREATE INDEX idx_vital_signs_patient ON vital_signs(patient_id);
CREATE INDEX idx_vital_signs_date ON vital_signs(measurement_date DESC);

-- ============================================================================
-- DIAGNOSES (Separate table for multiple diagnoses per visit)
-- ============================================================================

CREATE TABLE diagnoses (
    diagnosis_id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    consultation_id INTEGER,
    admission_id INTEGER,

    -- Diagnosis Details
    diagnosis_text TEXT NOT NULL,
    icd10_code TEXT,
    icd10_description TEXT,

    -- Classification
    diagnosis_type TEXT CHECK(diagnosis_type IN ('Primary', 'Secondary', 'Differential')),
    is_chronic INTEGER DEFAULT 0,
    onset_date DATE,
    resolved_date DATE,

    -- Status
    status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Resolved', 'Under Investigation')),

    -- Clinician
    diagnosed_by TEXT,
    diagnosis_date DATE NOT NULL,

    -- Audit
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id),
    FOREIGN KEY (admission_id) REFERENCES admissions(admission_id)
);

CREATE INDEX idx_diagnoses_patient ON diagnoses(patient_id);
CREATE INDEX idx_diagnoses_icd10 ON diagnoses(icd10_code);
CREATE INDEX idx_diagnoses_status ON diagnoses(status);

-- ============================================================================
-- ALLERGIES & ADVERSE REACTIONS
-- ============================================================================

CREATE TABLE allergies (
    allergy_id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL,

    -- Allergy Details
    allergen TEXT NOT NULL,
    allergen_type TEXT CHECK(allergen_type IN ('Drug', 'Food', 'Environmental', 'Other')),
    reaction TEXT NOT NULL,
    severity TEXT CHECK(severity IN ('Mild', 'Moderate', 'Severe', 'Life-threatening')),

    -- Dates
    onset_date DATE,
    recorded_date DATE DEFAULT CURRENT_DATE,

    -- Status
    is_active INTEGER DEFAULT 1,
    verified INTEGER DEFAULT 0,

    -- Notes
    notes TEXT,

    -- Audit
    recorded_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE INDEX idx_allergies_patient ON allergies(patient_id);
CREATE INDEX idx_allergies_active ON allergies(is_active);

-- ============================================================================
-- ATTACHMENTS / DOCUMENTS
-- ============================================================================

CREATE TABLE attachments (
    attachment_id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    consultation_id INTEGER,
    admission_id INTEGER,

    -- File Information
    filename TEXT NOT NULL,
    file_type TEXT,  -- PDF, JPG, PNG, DOCX, etc.
    file_size_bytes INTEGER,
    file_path TEXT,  -- Relative path to stored file

    -- Description
    title TEXT,
    description TEXT,
    document_type TEXT,  -- Lab Report, X-Ray, Prescription, etc.
    document_date DATE,

    -- Audit
    uploaded_by TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    lhims_attachment_id TEXT,
    imported_from_lhims INTEGER DEFAULT 1,

    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id),
    FOREIGN KEY (admission_id) REFERENCES admissions(admission_id)
);

CREATE INDEX idx_attachments_patient ON attachments(patient_id);

-- ============================================================================
-- CLINICAL NOTES (Free-text notes)
-- ============================================================================

CREATE TABLE clinical_notes (
    note_id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    consultation_id INTEGER,
    admission_id INTEGER,

    -- Note Details
    note_type TEXT CHECK(note_type IN ('Progress Note', 'Discharge Summary', 'Procedure Note', 'Nursing Note', 'General')),
    note_date DATE NOT NULL,
    note_time TIME,
    note_text TEXT NOT NULL,

    -- Author
    author_name TEXT,
    author_id INTEGER,
    author_role TEXT,  -- Doctor, Nurse, etc.

    -- Status
    is_confidential INTEGER DEFAULT 0,
    is_signed INTEGER DEFAULT 0,

    -- Audit
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (consultation_id) REFERENCES consultations(consultation_id),
    FOREIGN KEY (admission_id) REFERENCES admissions(admission_id)
);

CREATE INDEX idx_clinical_notes_patient ON clinical_notes(patient_id);
CREATE INDEX idx_clinical_notes_date ON clinical_notes(note_date DESC);

-- ============================================================================
-- AUDIT LOG (Track all changes)
-- ============================================================================

CREATE TABLE audit_log (
    audit_id INTEGER PRIMARY KEY,

    -- What changed
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    action TEXT CHECK(action IN ('INSERT', 'UPDATE', 'DELETE')),

    -- Who changed it
    user_id INTEGER,
    user_name TEXT,
    user_role TEXT,

    -- When
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Details
    old_values TEXT,  -- JSON
    new_values TEXT,  -- JSON
    change_reason TEXT
);

CREATE INDEX idx_audit_log_table ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);

-- ============================================================================
-- REFERENCE TABLES
-- ============================================================================

-- Departments/Services
CREATE TABLE departments (
    department_id INTEGER PRIMARY KEY,
    department_name TEXT NOT NULL UNIQUE,
    department_code TEXT,
    is_active INTEGER DEFAULT 1
);

-- Common Drugs/Medications (for auto-complete)
CREATE TABLE drug_formulary (
    drug_id INTEGER PRIMARY KEY,
    drug_name TEXT NOT NULL,
    generic_name TEXT,
    formulation TEXT,
    strength TEXT,
    is_active INTEGER DEFAULT 1
);

-- ICD-10 Codes (for diagnosis coding)
CREATE TABLE icd10_codes (
    icd10_id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category TEXT
);

-- Staff/Users
CREATE TABLE staff (
    staff_id INTEGER PRIMARY KEY,
    staff_no TEXT UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT,  -- Doctor, Nurse, Lab Technician, etc.
    department_id INTEGER,
    phone TEXT,
    email TEXT,
    is_active INTEGER DEFAULT 1,

    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active patient summary
CREATE VIEW v_active_patients AS
SELECT
    p.patient_id,
    p.patient_no,
    p.full_name,
    p.age_years,
    p.gender,
    p.nhis_number,
    p.mobile_phone,
    COUNT(DISTINCT c.consultation_id) as total_consultations,
    COUNT(DISTINCT a.admission_id) as total_admissions,
    MAX(c.consultation_date) as last_visit_date
FROM patients p
LEFT JOIN consultations c ON p.patient_id = c.patient_id
LEFT JOIN admissions a ON p.patient_id = a.patient_id
WHERE p.is_frozen = 0
GROUP BY p.patient_id;

-- Recent consultations
CREATE VIEW v_recent_consultations AS
SELECT
    c.consultation_id,
    c.consultation_date,
    p.patient_no,
    p.full_name,
    p.age_years,
    c.department_name,
    c.doctor_name,
    c.diagnosis,
    c.status
FROM consultations c
JOIN patients p ON c.patient_id = p.patient_id
ORDER BY c.consultation_date DESC, c.consultation_time DESC;

-- Active prescriptions
CREATE VIEW v_active_prescriptions AS
SELECT
    pr.prescription_id,
    p.patient_no,
    p.full_name,
    pr.drug_name,
    pr.strength,
    pr.dosage,
    pr.frequency,
    pr.start_date,
    pr.end_date,
    pr.prescriber_name
FROM prescriptions pr
JOIN patients p ON pr.patient_id = p.patient_id
WHERE pr.is_stopped = 0
    AND (pr.end_date IS NULL OR pr.end_date >= DATE('now'))
ORDER BY pr.start_date DESC;

-- Abnormal lab results
CREATE VIEW v_abnormal_lab_results AS
SELECT
    l.lab_result_id,
    l.test_date,
    p.patient_no,
    p.full_name,
    l.test_name,
    l.result_value,
    l.result_unit,
    l.reference_range,
    l.abnormal_flag
FROM lab_results l
JOIN patients p ON l.patient_id = p.patient_id
WHERE l.is_abnormal = 1
ORDER BY l.test_date DESC;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Auto-update timestamp triggers
CREATE TRIGGER update_patients_timestamp
AFTER UPDATE ON patients
BEGIN
    UPDATE patients SET updated_at = CURRENT_TIMESTAMP WHERE patient_id = NEW.patient_id;
END;

CREATE TRIGGER update_admissions_timestamp
AFTER UPDATE ON admissions
BEGIN
    UPDATE admissions SET updated_at = CURRENT_TIMESTAMP WHERE admission_id = NEW.admission_id;
END;

CREATE TRIGGER update_consultations_timestamp
AFTER UPDATE ON consultations
BEGIN
    UPDATE consultations SET updated_at = CURRENT_TIMESTAMP WHERE consultation_id = NEW.consultation_id;
END;

-- Auto-calculate BMI trigger
CREATE TRIGGER calculate_bmi_vital_signs
AFTER INSERT ON vital_signs
WHEN NEW.weight_kg IS NOT NULL AND NEW.height_cm IS NOT NULL
BEGIN
    UPDATE vital_signs
    SET bmi = ROUND(NEW.weight_kg / ((NEW.height_cm / 100.0) * (NEW.height_cm / 100.0)), 1)
    WHERE vital_sign_id = NEW.vital_sign_id;
END;

-- ============================================================================
-- INITIAL REFERENCE DATA
-- ============================================================================

-- Insert common departments
INSERT INTO departments (department_name) VALUES
    ('OBSTETRICS AND GYNAECOLOGY'),
    ('INVESTIGATIONS'),
    ('GENERAL LAB SERVICES'),
    ('ANTENATAL / POSTNATAL CLINIC'),
    ('EMERGENCY DEPARTMENT'),
    ('PEDIATRICS'),
    ('SURGERY'),
    ('MEDICINE');

-- ============================================================================
-- DATABASE METADATA
-- ============================================================================

CREATE TABLE database_info (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO database_info (key, value) VALUES
    ('schema_version', '1.0'),
    ('created_date', CURRENT_TIMESTAMP),
    ('hospital_name', 'Volta Regional Hospital, Hohoe'),
    ('system_name', 'Local Patient Care System'),
    ('lhims_last_sync', NULL);

-- ============================================================================
-- PHASE 1 EXCEL IMPORT TRACKING
-- ============================================================================

-- Track which Excel files have been imported
CREATE TABLE import_log (
    import_id INTEGER PRIMARY KEY,
    source_file TEXT NOT NULL,
    source_category TEXT NOT NULL,  -- 'OPD', 'IPD', 'Consulting', 'ANC', 'Lab'
    file_date TEXT,  -- e.g., '2023_Jan'
    records_imported INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    import_started_at DATETIME,
    import_completed_at DATETIME,
    import_status TEXT CHECK(import_status IN ('Started', 'Completed', 'Failed')),
    error_message TEXT
);

CREATE INDEX idx_import_log_status ON import_log(import_status);
CREATE INDEX idx_import_log_category ON import_log(source_category);

-- Track Phase 2 enhancement progress per patient
CREATE TABLE patient_enhancement_status (
    patient_id INTEGER PRIMARY KEY,
    patient_no TEXT NOT NULL UNIQUE,

    -- Phase 1 data (from Excel)
    has_excel_data INTEGER DEFAULT 1,
    excel_imported_at DATETIME,

    -- Phase 2 data (from JSON extraction)
    has_demographics INTEGER DEFAULT 0,
    has_lab_results INTEGER DEFAULT 0,
    has_vital_signs INTEGER DEFAULT 0,
    has_prescriptions INTEGER DEFAULT 0,
    has_consultations INTEGER DEFAULT 0,
    has_admissions INTEGER DEFAULT 0,
    has_allergies INTEGER DEFAULT 0,
    has_surgical_records INTEGER DEFAULT 0,

    enhancement_started_at DATETIME,
    enhancement_completed_at DATETIME,
    enhancement_status TEXT CHECK(enhancement_status IN ('Pending', 'In Progress', 'Completed', 'Failed')),
    extraction_attempts INTEGER DEFAULT 0,
    last_error TEXT,

    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE INDEX idx_enhancement_status ON patient_enhancement_status(enhancement_status);

-- ============================================================================
-- PHASE 1 SPECIFIC TABLES FOR EXCEL DATA
-- ============================================================================

-- Store raw visit records from Excel (can be linked back to source)
CREATE TABLE excel_visits (
    visit_id INTEGER PRIMARY KEY,
    patient_no TEXT NOT NULL,
    patient_name TEXT,

    visit_date DATE NOT NULL,
    source_file TEXT NOT NULL,  -- Original Excel filename
    source_category TEXT NOT NULL,  -- 'OPD', 'IPD', 'Consulting', 'ANC', 'Lab'
    source_row_number INTEGER,

    -- Common fields across all Excel files
    age TEXT,
    gender TEXT,
    locality TEXT,
    nhis_status TEXT,

    -- Store all columns as JSON for flexibility
    raw_data TEXT,  -- JSON containing all original columns

    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_excel_visits_patient ON excel_visits(patient_no);
CREATE INDEX idx_excel_visits_date ON excel_visits(visit_date DESC);
CREATE INDEX idx_excel_visits_source ON excel_visits(source_category);

-- Store ICD-10 diagnoses extracted from Excel
CREATE TABLE excel_diagnoses (
    excel_diagnosis_id INTEGER PRIMARY KEY,
    patient_no TEXT NOT NULL,
    visit_date DATE NOT NULL,
    source_file TEXT NOT NULL,

    diagnosis_type TEXT,  -- 'Principal', 'Additional', 'Provisional'
    case_type TEXT,  -- 'New', 'Old', 'Recurring'
    diagnosis_text TEXT,
    icd10_code TEXT,

    -- Link to proper diagnoses table when created
    linked_diagnosis_id INTEGER,

    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (linked_diagnosis_id) REFERENCES diagnoses(diagnosis_id)
);

CREATE INDEX idx_excel_diagnoses_patient ON excel_diagnoses(patient_no);
CREATE INDEX idx_excel_diagnoses_icd10 ON excel_diagnoses(icd10_code);

-- Store medications extracted from Excel (Consulting Room)
CREATE TABLE excel_medications (
    excel_medication_id INTEGER PRIMARY KEY,
    patient_no TEXT NOT NULL,
    visit_date DATE NOT NULL,
    source_file TEXT NOT NULL,

    medication_type TEXT,  -- 'Prescribed', 'Dispensed'
    medication_text TEXT,  -- Raw text from Excel (may contain multiple drugs)

    -- Link to proper prescriptions table when enhanced
    linked_prescription_id INTEGER,

    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (linked_prescription_id) REFERENCES prescriptions(prescription_id)
);

CREATE INDEX idx_excel_medications_patient ON excel_medications(patient_no);

-- Store lab test orders from Excel
CREATE TABLE excel_lab_orders (
    excel_lab_order_id INTEGER PRIMARY KEY,
    patient_no TEXT NOT NULL,
    visit_no TEXT,
    schedule_date DATE NOT NULL,
    source_file TEXT NOT NULL,

    test_requested TEXT,
    specimen_type TEXT,
    collection_datetime TEXT,
    pathology_barcode TEXT,
    clinician_name TEXT,
    clinician_contact TEXT,
    source_of_request TEXT,  -- 'IPD', 'OPD'

    -- Link to proper lab_results when Phase 2 data available
    linked_lab_result_id INTEGER,

    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (linked_lab_result_id) REFERENCES lab_results(lab_result_id)
);

CREATE INDEX idx_excel_lab_orders_patient ON excel_lab_orders(patient_no);
CREATE INDEX idx_excel_lab_orders_date ON excel_lab_orders(schedule_date DESC);

-- ============================================================================
-- VIEWS FOR PHASE 1 DATA
-- ============================================================================

-- Patient summary with Excel data
CREATE VIEW v_phase1_patient_summary AS
SELECT
    p.patient_id,
    p.patient_no,
    p.full_name,
    p.gender,
    p.age_years,
    p.nhis_number,
    p.mobile_phone,
    p.address,
    COUNT(DISTINCT ev.visit_id) as total_visits,
    COUNT(DISTINCT ed.excel_diagnosis_id) as total_diagnoses,
    COUNT(DISTINCT em.excel_medication_id) as total_medications,
    COUNT(DISTINCT el.excel_lab_order_id) as total_lab_orders,
    MAX(ev.visit_date) as last_visit_date,
    pes.enhancement_status,
    pes.enhancement_completed_at
FROM patients p
LEFT JOIN excel_visits ev ON p.patient_no = ev.patient_no
LEFT JOIN excel_diagnoses ed ON p.patient_no = ed.patient_no
LEFT JOIN excel_medications em ON p.patient_no = em.patient_no
LEFT JOIN excel_lab_orders el ON p.patient_no = el.patient_no
LEFT JOIN patient_enhancement_status pes ON p.patient_id = pes.patient_id
GROUP BY p.patient_id;

-- Patient visit history from Excel
CREATE VIEW v_excel_visit_history AS
SELECT
    ev.visit_id,
    ev.patient_no,
    ev.patient_name,
    ev.visit_date,
    ev.source_category,
    ev.age,
    ev.gender,
    ev.locality,
    ed.diagnosis_text,
    ed.icd10_code,
    em.medication_text,
    el.test_requested
FROM excel_visits ev
LEFT JOIN excel_diagnoses ed ON ev.patient_no = ed.patient_no AND ev.visit_date = ed.visit_date
LEFT JOIN excel_medications em ON ev.patient_no = em.patient_no AND ev.visit_date = em.visit_date
LEFT JOIN excel_lab_orders el ON ev.patient_no = el.patient_no AND ev.visit_date = el.schedule_date
ORDER BY ev.visit_date DESC;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
