-- ============================================================================
-- BIO DATA AGGREGATION VIEW FOR MVP
-- Aggregates patient demographics and visit summaries from Excel data
-- ============================================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS v_patient_bio_data;

-- Create comprehensive bio data view
CREATE VIEW v_patient_bio_data AS
SELECT
    p.patient_id,
    p.patient_no,
    p.full_name,
    p.first_name,
    p.last_name,
    p.gender,
    p.age_years,
    p.nhis_number,
    p.mobile_phone,
    p.address,

    -- Visit statistics
    COUNT(DISTINCT CASE WHEN ev.source_category = 'Consulting' THEN ev.visit_id END) as total_consulting_visits,
    COUNT(DISTINCT CASE WHEN ev.source_category = 'OPD' THEN ev.visit_id END) as total_opd_visits,
    COUNT(DISTINCT CASE WHEN ev.source_category = 'IPD' THEN ev.visit_id END) as total_ipd_admissions,
    COUNT(DISTINCT CASE WHEN ev.source_category = 'ANC' THEN ev.visit_id END) as total_anc_visits,
    COUNT(DISTINCT CASE WHEN ev.source_category = 'Lab' THEN ev.visit_id END) as total_lab_orders,
    COUNT(DISTINCT ev.visit_id) as total_visits,

    -- Date information
    MIN(ev.visit_date) as first_visit_date,
    MAX(ev.visit_date) as last_visit_date,

    -- Clinical summary
    COUNT(DISTINCT ed.excel_diagnosis_id) as total_diagnoses,
    COUNT(DISTINCT em.excel_medication_id) as total_medications,

    -- Most common diagnosis (first one alphabetically for simplicity)
    (
        SELECT ed2.diagnosis_text
        FROM excel_diagnoses ed2
        WHERE ed2.patient_no = p.patient_no
        AND ed2.diagnosis_text IS NOT NULL
        AND ed2.diagnosis_text != ''
        GROUP BY ed2.diagnosis_text
        ORDER BY COUNT(*) DESC, ed2.diagnosis_text
        LIMIT 1
    ) as most_common_diagnosis,

    -- Enhancement status
    pes.enhancement_status,
    pes.enhancement_completed_at

FROM patients p
LEFT JOIN excel_visits ev ON p.patient_no = ev.patient_no
LEFT JOIN excel_diagnoses ed ON p.patient_no = ed.patient_no
LEFT JOIN excel_medications em ON p.patient_no = em.patient_no
LEFT JOIN patient_enhancement_status pes ON p.patient_id = pes.patient_id
GROUP BY p.patient_id;

-- Create index on patient_no for fast lookups
CREATE INDEX IF NOT EXISTS idx_patients_patient_no_bio ON patients(patient_no);
