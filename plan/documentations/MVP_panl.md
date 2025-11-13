Comprehensive MVP Hospital Information System - Implementation Plan
Executive Summary
Build an immediate LHIMS alternative that leverages existing resources: 70,079 patients in database, 11,039+ downloaded PDFs, and documented LHIMS workflows to provide continuity of care during system transition.
Phase 1: Foundation Setup (Week 1)
Day 1-2: Database Preparation
Objective: Create fully populated, indexed SQLite database
Import Excel Data
node scripts/import-excel-data-v2.js
Import 166 Excel files (OPD, IPD, ANC, Consulting, Lab registers)
Validate 70,079 unique patients imported
Create composite patient records from multiple sources
Database Schema Enhancement
-- Core tables needed
patients (existing - from Excel import)
visits (existing - from Excel import)
consultations (new - for new OPD visits)
admissions (new - for new IPD admissions)
users (new - for authentication)
audit_log (new - for tracking changes)
prescriptions (new - for medication orders)
vital_signs (new - for capturing vitals)
Create Search Indexes
Patient name (trigram index for partial matching)
Patient number (unique index)
NHIS number (unique index)
Mobile phone (index)
Date of birth (index)
Clinic/department (index)
Email (index)
Link PDF Files
Map 11,039 PDF files to patient records
Store relative paths in database
Verify PDF accessibility
Day 3-5: Application Architecture Setup
Objective: Create Next.js application with proper structure
Initialize Next.js Project
npx create-next-app@latest vrh-hims --typescript --tailwind --app
cd vrh-hims

# Core dependencies
npm install better-sqlite3 @types/better-sqlite3
npm install next-auth@beta
npm install bcryptjs @types/bcryptjs
npm install react-hook-form zod @hookform/resolvers
npm install @tanstack/react-table @tanstack/react-query
npm install react-pdf @react-pdf/renderer
npm install lucide-react clsx tailwind-merge
npm install date-fns
Project Structure
vrh-hims/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx (with sidebar, header, session)
│   │   ├── page.tsx (main dashboard grid)
│   │   ├── patients/
│   │   │   ├── page.tsx (search interface)
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx (patient profile)
│   │   │   │   ├── opd/[visitId]/page.tsx (OPD PDF viewer)
│   │   │   │   └── ipd/[admissionId]/page.tsx (IPD PDF viewer)
│   │   │   └── register/
│   │   │       └── page.tsx (new patient form)
│   │   ├── opd/
│   │   │   ├── page.tsx (OPD dashboard)
│   │   │   └── consultation/
│   │   │       └── new/page.tsx (new consultation)
│   │   ├── ipd/
│   │   │   ├── page.tsx (IPD dashboard)
│   │   │   ├── admission/
│   │   │   │   └── new/page.tsx (new admission)
│   │   │   └── wards/page.tsx (bed management)
│   │   └── reports/
│   │       ├── page.tsx (reports menu)
│   │       └── opd-register/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── patients/
│       │   ├── route.ts (search)
│       │   └── [id]/route.ts
│       ├── consultations/route.ts
│       └── admissions/route.ts
│
├── components/
│   ├── ui/ (shadcn components)
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── session-timer.tsx
│   ├── patients/
│   │   ├── patient-search.tsx
│   │   ├── patient-card.tsx
│   │   ├── patient-profile.tsx
│   │   └── visit-timeline.tsx
│   ├── forms/
│   │   ├── patient-registration.tsx
│   │   ├── consultation-form.tsx
│   │   └── admission-form.tsx
│   └── pdf/
│       └── pdf-viewer.tsx
│
├── lib/
│   ├── db/
│   │   ├── client.ts (SQLite connection)
│   │   ├── queries/
│   │   │   ├── patients.ts
│   │   │   ├── visits.ts
│   │   │   └── reports.ts
│   │   └── schema.ts
│   ├── auth/
│   │   └── config.ts
│   └── utils/
│       ├── patient-id.ts (ID generation)
│       └── date.ts
│
└── public/
    ├── lhims-logo.png
    └── pdfs/ (symlink to data/patient-pdfs)
Database Connection Layer
// lib/db/client.ts
import Database from 'better-sqlite3';

const db = new Database('./data/database/lhims.db', {
  readonly: false,
  fileMustExist: true
});

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
Phase 2: Core Features Implementation (Week 2-3)
Day 6-7: Authentication & Session Management
Objective: Replicate LHIMS authentication system
Login Page (LHIMS Style)
Username/password fields
Hospital logo and branding
Session timeout warning (5 hours)
Remember me option
User Roles
Biostatistics Officer
Doctor
Nurse
Lab Technician
Pharmacist
Administrator
Session Management
5-hour timeout with visible countdown
Auto-logout on inactivity
Session refresh mechanism
Audit logging for login/logout
Day 8-10: Patient Search Module (CRITICAL)
Objective: Implement all 7 LHIMS search methods
Search Interface Components
Search type selector (dropdown)
Search input with validation
Results grid with pagination
Patient cards showing:
Patient ID, Name, Age, Gender
NHIS number
Last visit date
Quick actions (View, New OPD, New IPD)
Search Implementation
// 7 search methods
searchByName(query: string, minChars: 3)
searchByPatientNumber(patientNo: string)
searchByClinic(clinic: string)
searchByMobile(phone: string)
searchByNHIS(nhisNo: string)
searchByReferredEntity(entity: string)
searchByDateOfBirth(dob: Date)
searchByEmail(email: string)
Performance Optimization
Debounced search (300ms)
Result caching
Lazy loading for large result sets
Virtual scrolling for performance
Day 11-12: Patient Profile & PDF Viewer
Objective: Complete patient information display with PDF access
Patient Profile Page
Demographics section
Contact information
Insurance details
Emergency contacts
Visit history timeline
Document links (PDFs)
PDF Viewer Integration
Embedded PDF viewer
Support for OPD and IPD PDFs
Navigation between multiple PDFs
Download option
Print functionality
Visit Timeline
Chronological visit display
Visit type indicators (OPD/IPD)
Click to view PDF
Summary information per visit
Phase 3: Data Entry Modules (Week 3-4)
Day 13-15: Patient Registration
Objective: New patient registration matching LHIMS
Registration Form Fields
Personal Information:
- First Name, Middle Name, Last Name
- Date of Birth, Age calculation
- Gender, Marital Status
- Occupation, Religion
- Nationality, Ethnicity

Contact Information:
- Mobile Phone (primary/secondary)
- Email Address
- Residential Address
- GPS Address
- Emergency Contact (name, phone, relationship)

Insurance Information:
- NHIS Number
- NHIS Status (Active/Expired)
- Insurance Type
- Employer Information

Clinical Information:
- Blood Group
- Allergies
- Chronic Conditions
Patient ID Generation
Format: VR-A01-AAANNNN
Auto-increment number
Duplicate prevention
ID card printing option
Day 16-18: OPD Consultation Module
Objective: Create new OPD consultations
Consultation Form
Visit Information:
- Visit Date/Time
- Department/Clinic
- Consulting Officer
- Visit Type (New/Follow-up)

Vital Signs:
- Temperature, Blood Pressure
- Pulse, Respiratory Rate
- Weight, Height, BMI
- Oxygen Saturation

Clinical Data:
- Presenting Complaints
- History of Present Illness
- Physical Examination
- Provisional Diagnosis
- Final Diagnosis (ICD-10)
- Treatment Plan

Prescriptions:
- Drug Name, Dosage
- Frequency, Duration
- Route, Instructions

Investigations:
- Lab Tests Ordered
- Radiology Requests

Disposition:
- Admitted, Discharged, Referred
- Follow-up Date
PDF Generation
Generate consultation summary PDF
Include all entered data
Hospital header/footer
Doctor's signature block
Day 19-20: IPD Admission Module
Objective: Create new IPD admissions
Admission Form
Admission Details:
- Admission Date/Time
- Admission Type (Emergency/Elective)
- Referring Department
- Admitting Officer

Ward Assignment:
- Ward Selection
- Bed Number
- Room Type

Clinical Information:
- Admission Diagnosis
- Presenting Complaints
- Admission Notes
- Treatment Plan

Authorization:
- Insurance Approval
- Relative/Guardian Info
Ward Management
Bed availability display
Ward occupancy dashboard
Transfer between wards
Discharge planning
Phase 4: UI/UX Implementation (Throughout all phases)
LHIMS Design System Replication
Color Palette
--primary-blue: #2196F3;
--header-blue: #1976D2;
--danger-red: #FF0000;
--action-orange: #FFA500;
--success-green: #4CAF50;
--text-primary: #000000;
--text-secondary: #666666;
--background: #FFFFFF;
--background-alt: #F5F5F5;
Typography
--font-family: 'Times New Roman', serif;
--font-size-base: 16px;
--font-size-h1: 24px;
--font-size-h2: 20px;
--font-size-h3: 18px;
Component Patterns
Grid-based dashboard (3x4 tiles)
Module tiles with icons
Left sidebar (250px width)
Right sidebar for search
Breadcrumb navigation
Table layouts with alternating rows
Form layouts (label above input)
Modal dialogs for confirmations
Dashboard Layout
┌─────────────────────────────────────┐
│          Header with Logo           │
├──────┬──────────────────────┬──────┤
│      │                      │      │
│ Left │   Dashboard Grid     │Right │
│ Menu │   (3x4 Modules)      │Search│
│      │                      │      │
└──────┴──────────────────────┴──────┘
Phase 5: Reports Module (Week 4)
Day 21-22: Basic Reporting
Objective: Essential reports for daily operations
OPD Register
Daily patient list
Department-wise statistics
Export to Excel
Print functionality
IPD Census
Current admissions
Ward occupancy
Discharge summary
Bed utilization
Statistical Reports
Monthly morbidity
Disease patterns
Department performance
Patient demographics
Phase 6: Deployment & Training (Week 5)
Day 23-25: Local Deployment
Objective: Deploy on hospital network
Server Setup
# Windows deployment
- Install Node.js 20 LTS
- Install PM2 globally
- Configure as Windows service
- Setup auto-start on boot
Application Configuration
DATABASE_PATH=C:/vrh-hims/data/database/lhims.db
PDF_PATH=C:/vrh-hims/data/patient-pdfs
PORT=3000
NEXTAUTH_SECRET=generated-secret
NEXTAUTH_URL=http://localhost:3000
Network Configuration
Configure firewall rules
Allow LAN access
Setup static IP
Configure backup DNS
Day 26-28: User Training
Objective: Train hospital staff
Training Materials
User manual (with screenshots)
Quick reference cards
Video tutorials
Troubleshooting guide
Training Sessions
Administrators (2 hours)
Doctors (1.5 hours)
Nurses (1.5 hours)
Support staff (1 hour)
Parallel Running
Run alongside LHIMS for 1 week
Compare outputs
Gather feedback
Fix critical issues
Technical Specifications
Performance Requirements
Page load: < 2 seconds
Search results: < 1 second
PDF load: < 3 seconds
Concurrent users: 50+
Database size: 1GB+
Response time: < 500ms
Security Measures
Password hashing (bcrypt)
Session management
SQL injection prevention
XSS protection
CSRF tokens
Audit logging
Role-based access
Backup Strategy
Daily database backup
Weekly full system backup
PDF archive backup
Configuration backup
Automated backup scripts
Risk Mitigation
Technical Risks
Database Performance
Risk: Slow queries with 70,079 patients
Mitigation: Proper indexing, query optimization, caching
PDF Storage
Risk: Large storage requirements
Mitigation: Compression, archival strategy, external storage
Network Reliability
Risk: Hospital network issues
Mitigation: Offline capability, local caching, retry logic
Operational Risks
User Adoption
Risk: Resistance to new system
Mitigation: LHIMS-like UI, comprehensive training, support
Data Integrity
Risk: Data corruption or loss
Mitigation: Transactions, backups, validation, audit logs
System Downtime
Risk: Service unavailability
Mitigation: PM2 management, auto-restart, monitoring
Success Metrics
Week 1 Goals
✅ Database fully populated
✅ Application structure created
✅ Authentication working
Week 2 Goals
✅ Patient search functional (all 7 methods)
✅ PDF viewer integrated
✅ Patient profile complete
Week 3 Goals
✅ Patient registration working
✅ OPD consultation form complete
✅ IPD admission functional
Week 4 Goals
✅ Basic reports generated
✅ Excel export working
✅ Print functionality added
Week 5 Goals
✅ System deployed locally
✅ Staff trained (minimum 10 users)
✅ Parallel running started
Budget Estimate
Development Costs
Developer time: 200 hours @ $50/hour = $10,000
Testing & QA: 40 hours @ $40/hour = $1,600
Training materials: $500
Total Development: $12,100
Infrastructure (if needed)
Server hardware: $2,000
Backup storage: $500
UPS: $300
Network equipment: $200
Total Infrastructure: $3,000
Maintenance (Annual)
Support & updates: $3,000/year
Backups & storage: $500/year
Total Maintenance: $3,500/year
Total Project Cost: ~$15,100 initial + $3,500/year
Next Immediate Actions
Today: Import Excel data to SQLite database
Tomorrow: Setup Next.js project with authentication
Day 3: Implement patient search interface
Day 4: Add PDF viewer functionality
Day 5: Create patient registration form
Week 2: Complete OPD and IPD modules
Week 3: Testing with real users
Week 4: Deploy to hospital network