/**
 * Generate Comprehensive Patient Data Report
 *
 * Creates a visual HTML report of all extracted patient data
 * for verification and continuity of care assessment.
 */

const fs = require('fs');
const path = require('path');

const PATIENT_NO = process.argv[2] || 'VR-A01-AAA0001';
const PATIENT_DIR = path.join(__dirname, 'data', 'patient-json', PATIENT_NO);

console.log('='.repeat(70));
console.log('PATIENT DATA VERIFICATION REPORT');
console.log('='.repeat(70));
console.log('');

if (!fs.existsSync(PATIENT_DIR)) {
  console.error(`✗ Patient not found: ${PATIENT_NO}`);
  console.error(`  Directory does not exist: ${PATIENT_DIR}`);
  process.exit(1);
}

// Read all data files
const metadata = JSON.parse(fs.readFileSync(path.join(PATIENT_DIR, '_metadata.json'), 'utf8'));
const admissions = JSON.parse(fs.readFileSync(path.join(PATIENT_DIR, 'admissions.json'), 'utf8'));
const prescriptions = JSON.parse(fs.readFileSync(path.join(PATIENT_DIR, 'prescriptions.json'), 'utf8'));
const labResults = JSON.parse(fs.readFileSync(path.join(PATIENT_DIR, 'lab_results.json'), 'utf8'));
const vaccinations = JSON.parse(fs.readFileSync(path.join(PATIENT_DIR, 'vaccinations.json'), 'utf8'));
const attachments = JSON.parse(fs.readFileSync(path.join(PATIENT_DIR, 'attachments.json'), 'utf8'));
const consultations = JSON.parse(fs.readFileSync(path.join(PATIENT_DIR, 'consultations.json'), 'utf8'));

// Generate HTML report
const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Patient Data Report - ${PATIENT_NO}</title>
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

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
    .summary-card .label { font-size: 12px; color: #666; text-transform: uppercase; }
    .summary-card .value { font-size: 24px; font-weight: bold; color: #333; margin-top: 5px; }

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
    }
    .data-table tr:hover { background: #f8f9fa; }

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

    .json-view {
      background: #f8f9fa;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 15px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      overflow-x: auto;
      max-height: 400px;
      overflow-y: auto;
    }

    .alert {
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .alert-warning {
      background: #fff3cd;
      border: 1px solid #ffc107;
      color: #856404;
    }
    .alert-success {
      background: #d4edda;
      border: 1px solid #28a745;
      color: #155724;
    }

    .continuity-assessment {
      background: #e8f5e9;
      padding: 20px;
      border-radius: 6px;
      margin-top: 20px;
    }
    .continuity-assessment h3 {
      color: #2e7d32;
      margin-bottom: 10px;
    }
    .continuity-assessment ul {
      margin-left: 20px;
    }
    .continuity-assessment li {
      margin: 8px 0;
    }
    .check { color: #28a745; font-weight: bold; }
    .cross { color: #dc3545; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Patient Data Verification Report</h1>
      <div class="meta">
        <strong>Patient Number:</strong> ${metadata.patient_no}<br>
        <strong>Database ID:</strong> ${metadata.patient_id}<br>
        <strong>Extracted:</strong> ${new Date(metadata.extracted_at).toLocaleString()}<br>
        <strong>Extraction Method:</strong> Fixed Script (Nov 9, 2025)
      </div>
    </div>

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
        <div class="label">Vaccinations</div>
        <div class="value">${metadata.counts.vaccinations}</div>
      </div>
      <div class="summary-card">
        <div class="label">Attachments</div>
        <div class="value">${metadata.counts.attachments}</div>
      </div>
    </div>

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
            ${consultations.slice(0, 10).map(con => {
              // Handle array format: [index, date, dept, service, link, team, staff, status, billBtn, serviceId]
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
              // Handle object format (fallback)
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
            ${consultations.length > 10 ? `<tr><td colspan="5" style="text-align:center;font-style:italic;">... and ${consultations.length - 10} more consultations</td></tr>` : ''}
          </tbody>
        </table>
      `}
    </div>

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
            ${prescriptions.slice(0, 10).map(rx => `
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
            ${prescriptions.length > 10 ? `<tr><td colspan="6" style="text-align:center;font-style:italic;">... and ${prescriptions.length - 10} more prescriptions</td></tr>` : ''}
          </tbody>
        </table>
      `}
    </div>

    <div class="section">
      <h2>🔬 Laboratory Results - ${labResults.length} records</h2>
      ${labResults.length === 0 ? '<div class="empty-state">No laboratory results found</div>' : `
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Test Name</th>
              <th>Result</th>
              <th>Reference Range</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${labResults.slice(0, 10).map(lab => `
              <tr>
                <td>${lab.test_date || lab.sample_date || 'N/A'}</td>
                <td>${lab.test_name || 'N/A'}</td>
                <td><strong>${lab.result || lab.test_result || 'N/A'}</strong></td>
                <td>${lab.reference_range || 'N/A'}</td>
                <td><span class="badge badge-${lab.abnormal ? 'danger' : 'success'}">${lab.abnormal ? 'Abnormal' : 'Normal'}</span></td>
              </tr>
            `).join('')}
            ${labResults.length > 10 ? `<tr><td colspan="5" style="text-align:center;font-style:italic;">... and ${labResults.length - 10} more lab results</td></tr>` : ''}
          </tbody>
        </table>
      `}
    </div>

    <div class="section">
      <h2>💉 Vaccinations - ${vaccinations.length} records</h2>
      ${vaccinations.length === 0 ? '<div class="empty-state">No vaccination records found</div>' : `
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Vaccine</th>
              <th>Dose</th>
              <th>Site</th>
              <th>Administered By</th>
            </tr>
          </thead>
          <tbody>
            ${vaccinations.map(vax => `
              <tr>
                <td>${vax.vaccination_date || 'N/A'}</td>
                <td>${vax.vaccine_name || 'N/A'}</td>
                <td>${vax.dose_number || 'N/A'}</td>
                <td>${vax.site || 'N/A'}</td>
                <td>${vax.staff_name || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>

    <div class="section">
      <h2>📎 Attachments - ${attachments.length} records</h2>
      ${attachments.length === 0 ? '<div class="empty-state">No attachment records found</div>' : `
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Title</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            ${attachments.map(att => `
              <tr>
                <td>${att.upload_date || 'N/A'}</td>
                <td><span class="badge badge-info">${att.file_type || att.attachment_type || 'File'}</span></td>
                <td>${att.title || att.filename || 'N/A'}</td>
                <td>${att.description || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>

    <div class="section">
      <div class="continuity-assessment">
        <h3>✅ Continuity of Care Assessment</h3>
        <p><strong>Data Completeness for Patient Care:</strong></p>
        <ul>
          <li><span class="${metadata.counts.consultations > 0 ? 'check' : 'cross'}">${metadata.counts.consultations > 0 ? '✓' : '✗'}</span> Patient visit history (${metadata.counts.consultations} consultations)</li>
          <li><span class="${metadata.counts.admissions > 0 ? 'check' : 'cross'}">${metadata.counts.admissions > 0 ? '✓' : '✗'}</span> Hospital admission records (${metadata.counts.admissions} admissions)</li>
          <li><span class="${metadata.counts.prescriptions > 0 ? 'check' : 'cross'}">${metadata.counts.prescriptions > 0 ? '✓' : '✗'}</span> Medication history (${metadata.counts.prescriptions} prescriptions)</li>
          <li><span class="${metadata.counts.lab_results > 0 ? 'check' : 'cross'}">${metadata.counts.lab_results > 0 ? '✓' : '✗'}</span> Laboratory results (${metadata.counts.lab_results} tests)</li>
          <li><span class="${metadata.counts.vaccinations > 0 ? 'check' : 'cross'}">${metadata.counts.vaccinations > 0 ? '✓' : '✗'}</span> Vaccination records (${metadata.counts.vaccinations} vaccines)</li>
          <li><span class="${metadata.counts.attachments > 0 ? 'check' : 'cross'}">${metadata.counts.attachments > 0 ? '✓' : '✗'}</span> Additional documents (${metadata.counts.attachments} files)</li>
        </ul>

        <p style="margin-top:15px;"><strong>Overall Assessment:</strong></p>
        ${getTotalRecords(metadata.counts) > 0 ?
          '<p class="check" style="font-size:16px;">✓ Patient has sufficient data for continuity of care</p>' :
          '<p class="cross" style="font-size:16px;">⚠ Limited data - patient may be newly registered or have minimal interaction with facility</p>'
        }
      </div>
    </div>

    <div class="section" style="background:#f8f9fa;">
      <p style="text-align:center;color:#666;font-size:14px;">
        <strong>Report Generated:</strong> ${new Date().toLocaleString()}<br>
        <strong>Patient Directory:</strong> ${PATIENT_DIR}
      </p>
    </div>
  </div>

  <script>
    function getTotalRecords(counts) {
      return counts.admissions + counts.consultations + counts.prescriptions +
             counts.lab_results + counts.vaccinations + counts.attachments;
    }
  </script>
</body>
</html>
`;

function getTotalRecords(counts) {
  return counts.admissions + counts.consultations + counts.prescriptions +
         counts.lab_results + counts.vaccinations + counts.attachments;
}

// Save HTML report
const reportPath = path.join(__dirname, `patient-report-${PATIENT_NO}.html`);
fs.writeFileSync(reportPath, html);

// Console summary
console.log(`Patient: ${metadata.patient_no}`);
console.log(`Database ID: ${metadata.patient_id}`);
console.log(`Extracted: ${new Date(metadata.extracted_at).toLocaleString()}`);
console.log('');
console.log('Data Summary:');
console.log(`  Admissions (IPD):    ${metadata.counts.admissions}`);
console.log(`  Consultations (OPD): ${metadata.counts.consultations}`);
console.log(`  Prescriptions:       ${metadata.counts.prescriptions}`);
console.log(`  Lab Results:         ${metadata.counts.lab_results}`);
console.log(`  Vaccinations:        ${metadata.counts.vaccinations}`);
console.log(`  Attachments:         ${metadata.counts.attachments}`);
console.log('');
console.log(`Total Records: ${getTotalRecords(metadata.counts)}`);
console.log('');
console.log('✓ HTML Report Generated:');
console.log(`  ${reportPath}`);
console.log('');
console.log('Open this file in your browser to view the complete report.');
console.log('');
