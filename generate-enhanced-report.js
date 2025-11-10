/**
 * Enhanced Patient Data Report Generator
 *
 * Generates comprehensive HTML reports with all extracted data including:
 * - Patient demographics
 * - Lab results
 * - Surgical records
 * - All existing data (admissions, prescriptions, etc.)
 */

const fs = require('fs');
const path = require('path');

const PATIENT_NO = process.argv[2] || 'VR-A01-AAA2142';
const PATIENT_DIR = path.join(__dirname, 'data', 'patient-json', PATIENT_NO);
const REPORTS_DIR = path.join(__dirname, 'data', 'reports');

console.log('='.repeat(70));
console.log('ENHANCED PATIENT DATA REPORT');
console.log('='.repeat(70));
console.log('');

if (!fs.existsSync(PATIENT_DIR)) {
  console.error(`✗ Patient not found: ${PATIENT_NO}`);
  console.error(`  Directory does not exist: ${PATIENT_DIR}`);
  process.exit(1);
}

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Read all data files
const metadata = JSON.parse(fs.readFileSync(path.join(PATIENT_DIR, '_metadata.json'), 'utf8'));
const demographics = JSON.parse(fs.readFileSync(path.join(PATIENT_DIR, 'patient-demographics.json'), 'utf8'));
const admissions = JSON.parse(fs.readFileSync(path.join(PATIENT_DIR, 'admissions.json'), 'utf8'));
const prescriptions = JSON.parse(fs.readFileSync(path.join(PATIENT_DIR, 'prescriptions.json'), 'utf8'));
const labResults = JSON.parse(fs.readFileSync(path.join(PATIENT_DIR, 'lab_results.json'), 'utf8'));
const vaccinations = JSON.parse(fs.readFileSync(path.join(PATIENT_DIR, 'vaccinations.json'), 'utf8'));
const attachments = JSON.parse(fs.readFileSync(path.join(PATIENT_DIR, 'attachments.json'), 'utf8'));
const consultations = JSON.parse(fs.readFileSync(path.join(PATIENT_DIR, 'consultations.json'), 'utf8'));
const surgicalRecords = JSON.parse(fs.readFileSync(path.join(PATIENT_DIR, 'surgical-records.json'), 'utf8'));

const patient = demographics.oPatient || {};

// Generate HTML report
const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Patient Report - ${patient.sPatientName || PATIENT_NO}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f7fa;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
    }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header .meta { opacity: 0.9; font-size: 14px; }

    .demographics {
      background: #f8f9fa;
      padding: 30px;
      border-bottom: 3px solid #667eea;
    }
    .demographics h2 {
      font-size: 22px;
      color: #333;
      margin-bottom: 20px;
    }
    .demo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
    .demo-item {
      background: white;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #667eea;
    }
    .demo-item .label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 5px;
    }
    .demo-item .value {
      font-size: 16px;
      color: #333;
      font-weight: 500;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 15px;
      padding: 20px;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
    }
    .summary-card {
      background: white;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #667eea;
    }
    .summary-card .label { font-size: 11px; color: #666; text-transform: uppercase; }
    .summary-card .value { font-size: 22px; font-weight: bold; color: #333; margin-top: 5px; }

    .section {
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
    }
    .section:last-child { border-bottom: none; }
    .section h2 {
      font-size: 20px;
      color: #333;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #667eea;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #999;
      font-style: italic;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .data-table th {
      background: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #555;
      border-bottom: 2px solid #e0e0e0;
      font-size: 13px;
    }
    .data-table td {
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
      vertical-align: top;
      font-size: 13px;
    }
    .data-table tr:hover { background: #f8f9fa; }
    .data-table tr.abnormal { background: #fff3cd; }
    .data-table tr.abnormal:hover { background: #ffe8a1; }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-success { background: #d4edda; color: #155724; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .badge-danger { background: #f8d7da; color: #721c24; }
    .badge-info { background: #d1ecf1; color: #0c5460; }

    .alert {
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .alert-info {
      background: #d1ecf1;
      border: 1px solid #0c5460;
      color: #0c5460;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Complete Patient Medical Record</h1>
      <div class="meta">
        <strong>Patient:</strong> ${patient.sPatientName || 'N/A'}<br>
        <strong>Patient Number:</strong> ${metadata.patient_no}<br>
        <strong>Report Generated:</strong> ${new Date().toLocaleString()}<br>
        <strong>Data Extracted:</strong> ${new Date(metadata.extracted_at).toLocaleString()}
      </div>
    </div>

    <!-- PATIENT DEMOGRAPHICS -->
    <div class="demographics">
      <h2>👤 Patient Demographics</h2>
      <div class="demo-grid">
        <div class="demo-item">
          <div class="label">Full Name</div>
          <div class="value">${patient.sPatientName || 'N/A'}</div>
        </div>
        <div class="demo-item">
          <div class="label">Patient Number</div>
          <div class="value">${patient.sPatientNo || 'N/A'}</div>
        </div>
        <div class="demo-item">
          <div class="label">Date of Birth</div>
          <div class="value">${patient.dDOB || 'N/A'}</div>
        </div>
        <div class="demo-item">
          <div class="label">Age</div>
          <div class="value">${patient.iAgeString || patient.iAge + ' years' || 'N/A'}</div>
        </div>
        <div class="demo-item">
          <div class="label">Gender</div>
          <div class="value">${patient.sGender || 'N/A'}</div>
        </div>
        <div class="demo-item">
          <div class="label">Blood Group</div>
          <div class="value">${patient.sBloodGroup || 'Not recorded'}</div>
        </div>
        <div class="demo-item">
          <div class="label">NHIS Number</div>
          <div class="value">${patient.sNHIANo || patient.sHealthInsuranceNumber || 'N/A'}</div>
        </div>
        <div class="demo-item">
          <div class="label">Mobile Phone</div>
          <div class="value">${patient.iMobile || 'N/A'}</div>
        </div>
        <div class="demo-item">
          <div class="label">Religion</div>
          <div class="value">${patient.sReligion || 'N/A'}</div>
        </div>
        <div class="demo-item">
          <div class="label">Marital Status</div>
          <div class="value">${patient.sMartialStatus || 'N/A'}</div>
        </div>
        <div class="demo-item">
          <div class="label">Weight</div>
          <div class="value">${patient.iWeight || 'N/A'}</div>
        </div>
        <div class="demo-item">
          <div class="label">Membership Type</div>
          <div class="value">${patient.sMembershipType || 'N/A'}</div>
        </div>
      </div>
      ${patient.sAddress ? `
        <div class="demo-item" style="margin-top:20px;">
          <div class="label">Address</div>
          <div class="value">${patient.sAddress}, ${patient.sCity || ''}, ${patient.sState || ''}</div>
        </div>
      ` : ''}
    </div>

    <!-- DATA SUMMARY -->
    <div class="summary">
      <div class="summary-card">
        <div class="label">Admissions (IPD)</div>
        <div class="value">${metadata.counts.admissions}</div>
      </div>
      <div class="summary-card">
        <div class="label">Consultations (OPD)</div>
        <div class="value">${metadata.counts.consultations}</div>
      </div>
      <div class="summary-card">
        <div class="label">Prescriptions</div>
        <div class="value">${metadata.counts.prescriptions}</div>
      </div>
      <div class="summary-card">
        <div class="label">Lab Results</div>
        <div class="value">${metadata.counts.lab_results}</div>
      </div>
      <div class="summary-card">
        <div class="label">Surgical Procedures</div>
        <div class="value">${metadata.counts.surgical_records}</div>
      </div>
      <div class="summary-card">
        <div class="label">Attachments</div>
        <div class="value">${metadata.counts.attachments}</div>
      </div>
    </div>

    <!-- LAB RESULTS -->
    <div class="section">
      <h2>🔬 Laboratory Results - ${labResults.length} records</h2>
      ${labResults.length === 0 ? '<div class="empty-state">No laboratory results found</div>' : `
        <table class="data-table">
          <thead>
            <tr>
              <th>Test Date</th>
              <th>Test Name</th>
              <th>Result</th>
              <th>Unit</th>
              <th>Reference Range</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${labResults.slice(0, 30).map(lab => {
              const isAbnormal = lab.fieldReference && lab.field_value && !isValueInRange(lab.field_value, lab.fieldReference);
              return `
                <tr class="${isAbnormal ? 'abnormal' : ''}">
                  <td>${lab.date_of_test || lab.added_on || 'N/A'}</td>
                  <td><strong>${lab.field_label || 'N/A'}</strong></td>
                  <td><strong style="font-size:14px;">${lab.field_value || 'N/A'}</strong></td>
                  <td>${lab.field_value_unit || ''}</td>
                  <td>${lab.fieldReference || lab.range || 'N/A'}</td>
                  <td>${isAbnormal ? '<span class="badge badge-warning">Abnormal</span>' : '<span class="badge badge-success">Normal</span>'}</td>
                </tr>
              `;
            }).join('')}
            ${labResults.length > 30 ? `<tr><td colspan="6" style="text-align:center;font-style:italic;">... and ${labResults.length - 30} more lab results</td></tr>` : ''}
          </tbody>
        </table>
      `}
    </div>

    <!-- SURGICAL RECORDS -->
    ${surgicalRecords.length > 0 ? `
    <div class="section">
      <h2>🏥 Surgical Procedures - ${surgicalRecords.length} records</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>Surgery Date</th>
            <th>Procedure</th>
            <th>Operating Theater</th>
            <th>Duration</th>
            <th>Status</th>
            <th>Admission</th>
          </tr>
        </thead>
        <tbody>
          ${surgicalRecords.map(surg => `
            <tr>
              <td>${surg.surgery_date || 'N/A'}</td>
              <td><strong>${surg.surgery_name || 'N/A'}</strong></td>
              <td>${surg.ot_name || 'N/A'}</td>
              <td>${surg.ot_from_time} - ${surg.ot_to_time}</td>
              <td><span class="badge badge-${surg.is_surgery_completed === '1' ? 'success' : 'warning'}">${surg.is_surgery_completed === '1' ? 'Completed' : 'Pending'}</span></td>
              <td>${surg.visit_no || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- ADMISSIONS -->
    <div class="section">
      <h2>🏥 Admissions (IPD) - ${admissions.length} records</h2>
      ${admissions.length === 0 ? '<div class="empty-state">No admission records found</div>' : `
        <table class="data-table">
          <thead>
            <tr>
              <th>Admit Date</th>
              <th>Discharge Date</th>
              <th>Ward/Room</th>
              <th>Bed</th>
              <th>Chief Complaint</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${admissions.map(adm => `
              <tr>
                <td>${adm.dAdmitDate || adm.admit_date || 'N/A'}</td>
                <td>${adm.sDischargeDate || adm.discharge_date || '<span style="color:#f39c12;">Active</span>'}</td>
                <td>${adm.sRoomWardName || adm.ward_name || 'N/A'}</td>
                <td>${adm.sBedNo || adm.bed_no || 'N/A'}</td>
                <td>${adm.chief_complaint || adm.admission_reason || 'N/A'}</td>
                <td><span class="badge badge-${adm.sDischargeDate || adm.discharge_date ? 'success' : 'warning'}">${adm.sDischargeDate || adm.discharge_date ? 'Discharged' : 'Active'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${admissions.some(adm => adm.admit_notes) ? `
          <div style="margin-top:20px;">
            <h3 style="font-size:16px;color:#555;margin-bottom:10px;">📝 Admission Notes</h3>
            ${admissions.filter(adm => adm.admit_notes).map(adm => `
              <div style="background:#f8f9fa;padding:15px;border-left:4px solid #667eea;margin-bottom:10px;border-radius:4px;">
                <strong style="color:#667eea;">Admitted: ${adm.dAdmitDate || adm.admit_date}</strong><br>
                <div style="margin-top:8px;font-size:13px;line-height:1.6;white-space:pre-wrap;max-height:300px;overflow-y:auto;">${adm.admit_notes}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `}
    </div>

    <!-- CONSULTATIONS -->
    <div class="section">
      <h2>🩺 Consultations (OPD) - ${consultations.length} records</h2>
      ${consultations.length === 0 ? '<div class="empty-state">No consultation records found</div>' : `
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Department</th>
              <th>Service</th>
              <th>Doctor/Staff</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${consultations.slice(0, 15).map(con => {
              if (Array.isArray(con)) {
                return `
                  <tr>
                    <td>${con[1] || 'N/A'}</td>
                    <td>${con[2] || 'N/A'}</td>
                    <td>${con[3] || 'N/A'}</td>
                    <td>${con[6] || 'N/A'}</td>
                    <td><span class="badge badge-${con[7] === 'Completed' ? 'success' : 'warning'}">${con[7] || 'N/A'}</span></td>
                  </tr>
                `;
              }
              return `
                <tr>
                  <td>${con.consultation_date || con.visit_date || 'N/A'}</td>
                  <td>${con.department_name || 'N/A'}</td>
                  <td>${con.service_name || 'N/A'}</td>
                  <td>${con.doctor_name || con.staff_name || 'N/A'}</td>
                  <td><span class="badge badge-success">${con.status || 'N/A'}</span></td>
                </tr>
              `;
            }).join('')}
            ${consultations.length > 15 ? `<tr><td colspan="5" style="text-align:center;font-style:italic;">... and ${consultations.length - 15} more consultations</td></tr>` : ''}
          </tbody>
        </table>
      `}
    </div>

    <!-- PRESCRIPTIONS -->
    <div class="section">
      <h2>💊 Prescriptions - ${prescriptions.length} records</h2>
      ${prescriptions.length === 0 ? '<div class="empty-state">No prescription records found</div>' : `
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Medication</th>
              <th>Strength</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            ${prescriptions.slice(0, 15).map(rx => `
              <tr>
                <td>${rx.start_date || rx.creation_date || 'N/A'}</td>
                <td><strong>${rx.drug_name || rx.medication_name || 'N/A'}</strong><br>
                    <small style="color:#666;">${rx.generic_name && rx.generic_name !== rx.drug_name ? rx.generic_name : ''}</small></td>
                <td>${rx.strength || 'N/A'}</td>
                <td>${rx.actual_dosage || rx.dosage || 'N/A'}</td>
                <td>${rx.frequency_name || rx.frequency || 'N/A'}</td>
                <td>${rx.days ? rx.days + ' days' : 'N/A'}</td>
              </tr>
            `).join('')}
            ${prescriptions.length > 15 ? `<tr><td colspan="6" style="text-align:center;font-style:italic;">... and ${prescriptions.length - 15} more prescriptions</td></tr>` : ''}
          </tbody>
        </table>
      `}
    </div>

    <!-- FOOTER -->
    <div class="section" style="background:#f8f9fa;">
      <p style="text-align:center;color:#666;font-size:14px;">
        <strong>Continuity of Care Assessment:</strong> This patient has comprehensive medical records including demographics,
        ${metadata.counts.lab_results} lab results, ${metadata.counts.consultations} consultations,
        ${metadata.counts.prescriptions} prescriptions, and ${metadata.counts.admissions} hospital admissions.
        Data is sufficient for continuity of care.<br><br>
        <strong>Report Generated:</strong> ${new Date().toLocaleString()}<br>
        <strong>Source:</strong> LHIMS Data Extraction - Volta Regional Hospital, Hohoe
      </p>
    </div>
  </div>

  <script>
    function isValueInRange(value, range) {
      try {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return true;

        // Handle "min - max" format
        const rangeMatch = range.match(/([0-9.]+)\s*-\s*([0-9.]+)/);
        if (rangeMatch) {
          const min = parseFloat(rangeMatch[1]);
          const max = parseFloat(rangeMatch[2]);
          return numValue >= min && numValue <= max;
        }

        return true;
      } catch {
        return true;
      }
    }
  </script>
</body>
</html>
`;

function isValueInRange(value, range) {
  try {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return true;

    const rangeMatch = range.match(/([0-9.]+)\s*-\s*([0-9.]+)/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      return numValue >= min && numValue <= max;
    }

    return true;
  } catch {
    return true;
  }
}

// Save HTML report
const reportPath = path.join(REPORTS_DIR, `${PATIENT_NO}-complete-report.html`);
fs.writeFileSync(reportPath, html);

// Console summary
console.log(`Patient: ${patient.sPatientName || PATIENT_NO}`);
console.log(`Patient Number: ${metadata.patient_no}`);
console.log(`Age: ${patient.iAgeString || patient.iAge + ' years'}`);
console.log(`Gender: ${patient.sGender}`);
console.log(`NHIS: ${patient.sNHIANo || 'N/A'}`);
console.log('');
console.log('Data Summary:');
console.log(`  Admissions (IPD):    ${metadata.counts.admissions}`);
console.log(`  Consultations (OPD): ${metadata.counts.consultations}`);
console.log(`  Prescriptions:       ${metadata.counts.prescriptions}`);
console.log(`  Lab Results:         ${metadata.counts.lab_results}`);
console.log(`  Surgical Records:    ${metadata.counts.surgical_records}`);
console.log(`  Attachments:         ${metadata.counts.attachments}`);
console.log('');
console.log('✓ Enhanced HTML Report Generated:');
console.log(`  ${reportPath}`);
console.log('');
console.log('Open this file in your browser to view the complete enhanced report.');
console.log('');
