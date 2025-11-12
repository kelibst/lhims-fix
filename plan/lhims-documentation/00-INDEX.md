# LHIMS Complete Navigation Map & Documentation Index

## Purpose
This document serves as the master index for all LHIMS documentation. It maps the complete navigation structure of the LHIMS system and provides links to detailed documentation for each page/module.

## Documentation Status
- **Total Pages Documented**: 0 / TBD
- **Screenshots Captured**: 0 / TBD
- **API Endpoints Discovered**: 0 / TBD
- **Last Updated**: November 12, 2025

## Quick Links
- [Page Documentation Template](./PAGE-TEMPLATE.md)
- [API Endpoints Catalog](./api-endpoints/endpoints-catalog.json)
- [UI Component Library](./ui-components-analysis.md)
- [Navigation Flow Diagram](./navigation-flow.md)

---

## LHIMS Navigation Structure

### 🔐 1. Authentication Module
**Path**: `/lhims_182/`

- **[Login Page](./01-authentication/login-page.md)** - User authentication entry point
  - Username/password login
  - Session management
  - Password recovery (if available)

- **[User Roles & Permissions](./01-authentication/user-roles.md)**
  - Doctor
  - Clinical Officer
  - Nurse
  - Pharmacist
  - Laboratory Technician
  - Medical Records Officer
  - Administrator

---

### 📊 2. Dashboard Module
**Path**: `/lhims_182/dashboard/`

- **[Main Dashboard](./02-dashboard/main-dashboard.md)** - System overview
  - Statistics cards (Today's visits, admissions, etc.)
  - Recent patient activities
  - Pending tasks
  - Quick navigation tiles

- **[Department Dashboards](./02-dashboard/department-dashboards.md)**
  - OPD Dashboard
  - IPD Dashboard
  - Pharmacy Dashboard
  - Laboratory Dashboard

---

### 👥 3. Patient Management Module
**Path**: `/lhims_182/patients/`

- **[Patient Search](./03-patient-management/patient-search.md)**
  - Search by patient number
  - Search by NHIS number
  - Search by name
  - Advanced search filters

- **[Patient Registration](./03-patient-management/patient-registration.md)**
  - New patient form
  - NHIS verification
  - Biometric capture (if available)
  - Document uploads

- **[Patient Profile](./03-patient-management/patient-profile.md)**
  - Demographics view/edit
  - Contact information
  - Emergency contacts
  - Allergies and chronic conditions

- **[Patient History](./03-patient-management/patient-history.md)**
  - Visit timeline
  - Previous consultations
  - Lab results history
  - Prescription history
  - Document attachments

---

### 🏥 4. Outpatient Department (OPD) Module
**Path**: `/lhims_182/opd/`

- **[OPD Queue Management](./04-opd-module/opd-queue.md)**
  - Today's appointments
  - Walk-in patients
  - Triage status
  - Queue assignment

- **[Vital Signs Capture](./04-opd-module/vital-signs.md)**
  - Blood pressure
  - Temperature
  - Pulse rate
  - Respiratory rate
  - Weight & height
  - BMI calculation

- **[Consultation Form](./04-opd-module/consultation-form.md)**
  - Presenting complaints
  - History of presenting illness
  - Past medical history
  - Physical examination
  - System review

- **[Diagnosis Entry](./04-opd-module/diagnosis-entry.md)**
  - ICD-10 code search
  - Primary diagnosis
  - Secondary diagnoses
  - Differential diagnoses

- **[Treatment Plan](./04-opd-module/treatment-plan.md)**
  - Management plan
  - Prescription generation
  - Lab test ordering
  - Referrals
  - Follow-up scheduling

- **[OPD Register](./04-opd-module/opd-register.md)**
  - Daily register view
  - Filter and search
  - Export functionality

---

### 🛏️ 5. Inpatient Department (IPD) Module
**Path**: `/lhims_182/ipd/`

- **[Admission Process](./05-ipd-module/admission-process.md)**
  - Admission form
  - Ward selection
  - Bed allocation
  - Admission diagnosis
  - Admitting doctor

- **[Ward Management](./05-ipd-module/ward-management.md)**
  - Ward overview
  - Bed occupancy status
  - Patient list by ward
  - Bed transfers

- **[Ward Rounds](./05-ipd-module/ward-rounds.md)**
  - Daily progress notes
  - Vital signs monitoring
  - Treatment orders
  - Nursing notes
  - Doctor's notes

- **[Discharge Process](./05-ipd-module/discharge-process.md)**
  - Discharge summary
  - Final diagnosis
  - Discharge medications
  - Follow-up instructions
  - Discharge types (improved, absconded, died, etc.)

- **[IPD Register](./05-ipd-module/ipd-register.md)**
  - Admission register
  - Discharge register
  - Death register

---

### 💊 6. Pharmacy Module
**Path**: `/lhims_182/pharmacy/`

- **[Prescription Queue](./06-pharmacy-module/prescription-queue.md)**
  - Pending prescriptions
  - Priority orders
  - Status tracking

- **[Dispensing Interface](./06-pharmacy-module/dispensing.md)**
  - Drug selection
  - Quantity dispensed
  - Batch tracking
  - Patient counseling notes

- **[Stock Management](./06-pharmacy-module/stock-management.md)**
  - Current stock levels
  - Expiry tracking
  - Reorder levels
  - Stock adjustments

- **[Drug Catalog](./06-pharmacy-module/drug-catalog.md)**
  - Drug master list
  - Generic/brand names
  - Dosage forms
  - Contraindications

---

### 🔬 7. Laboratory Module
**Path**: `/lhims_182/laboratory/`

- **[Test Ordering](./07-laboratory-module/test-ordering.md)**
  - Available tests catalog
  - Test selection
  - Urgency marking
  - Clinical notes

- **[Sample Collection](./07-laboratory-module/sample-collection.md)**
  - Barcode generation
  - Collection tracking
  - Sample types
  - Collection notes

- **[Results Entry](./07-laboratory-module/results-entry.md)**
  - Result input forms
  - Normal ranges
  - Abnormal flagging
  - Verification process

- **[Results Viewing](./07-laboratory-module/results-viewing.md)**
  - Results display
  - Trend analysis
  - Print/export options
  - Result history

---

### 🤰 8. Antenatal Care (ANC) Module
**Path**: `/lhims_182/anc/`

- **[ANC Registration](./08-anc-module/anc-registration.md)**
  - Pregnancy registration
  - Expected delivery date
  - Obstetric history
  - Risk assessment

- **[ANC Visits](./08-anc-module/anc-visits.md)**
  - Visit scheduling
  - Routine checkups
  - Weight monitoring
  - Fundal height
  - Fetal heart rate

- **[Immunization Tracking](./08-anc-module/immunization.md)**
  - Tetanus toxoid
  - Other vaccinations
  - Schedule tracking

---

### 📈 9. Reports Module
**Path**: `/lhims_182/reports/`

- **[OPD Reports](./09-reports-module/opd-reports.md)**
  - Daily OPD register
  - Monthly morbidity report
  - Disease statistics
  - Department-wise analysis

- **[IPD Reports](./09-reports-module/ipd-reports.md)**
  - Admission statistics
  - Discharge statistics
  - Mortality reports
  - Bed occupancy rates

- **[Laboratory Reports](./09-reports-module/lab-reports.md)**
  - Test statistics
  - TAT (Turnaround Time) reports
  - Positive/negative ratios

- **[Pharmacy Reports](./09-reports-module/pharmacy-reports.md)**
  - Dispensing reports
  - Stock reports
  - Expiry reports

- **[NHIS Reports](./09-reports-module/nhis-reports.md)**
  - Claims submission
  - Claims status
  - Revenue reports

- **[Custom Reports](./09-reports-module/custom-reports.md)**
  - Report builder
  - Saved reports
  - Scheduled reports

---

### ⚙️ 10. Administration Module
**Path**: `/lhims_182/admin/`

- **[User Management](./10-administration/user-management.md)**
  - Create/edit users
  - Role assignment
  - Password management
  - Access control

- **[Department Setup](./10-administration/department-setup.md)**
  - Department creation
  - Service points
  - Staff assignment

- **[System Configuration](./10-administration/system-config.md)**
  - Hospital details
  - System parameters
  - Billing setup
  - NHIS configuration

- **[ICD-10 Management](./10-administration/icd10-management.md)**
  - Disease codes
  - Custom additions
  - Mapping tables

- **[Audit Logs](./10-administration/audit-logs.md)**
  - User activity tracking
  - Data modifications
  - Login history
  - System events

---

## Navigation Flow Patterns

### Patient Journey - OPD
```
Login → Dashboard → Patient Search → Patient Registration (if new)
→ OPD Queue → Vital Signs → Consultation → Diagnosis
→ Prescription/Lab Orders → Pharmacy/Laboratory → Complete Visit
```

### Patient Journey - IPD
```
Login → Dashboard → Patient Search → Admission Form
→ Ward Assignment → Daily Ward Rounds → Treatment Updates
→ Discharge Planning → Discharge Summary → Complete Admission
```

### Administrative Tasks
```
Login → Dashboard → Administration → User Management/System Config
→ Make Changes → Audit Log Entry → Logout
```

---

## Common UI Components

### Recurring Elements
- **Patient Header Banner**: Appears on all patient-related pages
  - Patient name, ID, age, gender
  - NHIS status
  - Allergy alerts
  - Contact information

- **Navigation Sidebar**: Present on all pages
  - Module links
  - Quick access menu
  - User profile dropdown

- **Action Buttons**: Consistent across modules
  - Save (green)
  - Cancel (gray)
  - Delete (red)
  - Print (blue)
  - Export (orange)

### Form Patterns
- **Required fields**: Marked with red asterisk (*)
- **Validation**: Real-time validation with error messages
- **Auto-save**: Every 2 minutes on long forms
- **Confirmation dialogs**: For destructive actions

---

## API Endpoints Categories

### Authentication
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/session`

### Patient Management
- `/api/patients/search`
- `/api/patients/register`
- `/api/patients/{id}`
- `/api/patients/{id}/history`

### Clinical
- `/api/opd/queue`
- `/api/opd/consultation`
- `/api/ipd/admission`
- `/api/ipd/discharge`

### Ancillary Services
- `/api/pharmacy/prescriptions`
- `/api/laboratory/tests`
- `/api/laboratory/results`

### Reports
- `/api/reports/opd-morbidity`
- `/api/reports/ipd-statistics`
- `/api/reports/custom`

---

## Documentation Guidelines

### For Each Page Document:
1. **Overview**: Purpose and access levels
2. **Screenshots**: Full page and key sections
3. **UI Components**: All fields and elements
4. **API Calls**: Endpoints used by the page
5. **Navigation**: How users get to/from this page
6. **Business Rules**: Validation and logic
7. **Data Fields**: Complete field specifications
8. **Notes**: Performance issues, quirks, tips

### Screenshot Naming Convention
```
[module]-[page]-[section]-[number].png
Example: opd-consultation-vitals-01.png
```

### Documentation Updates
- Run documentation scripts weekly
- Update when new features discovered
- Note any changes in LHIMS behavior
- Track which pages are no longer accessible

---

## Next Steps

1. **Run Automated Documentation**
   ```bash
   node scripts/document-lhims-pages.js
   ```

2. **Review and Enhance**
   - Verify all pages captured
   - Add manual notes
   - Document business logic

3. **Analyze UI Patterns**
   ```bash
   node scripts/analyze-lhims-ui.js
   ```

4. **Create Development Specifications**
   - Based on documented pages
   - Maintain similar workflows
   - Identify improvement opportunities

---

## Notes

- **Access Required**: Must be on hospital network (10.10.0.59)
- **Credentials**: Use authorized account with full access
- **Time Estimate**: 2-3 days for complete documentation
- **Storage**: Screenshots will require ~500MB-1GB space

---

*This index will be updated as documentation progresses*