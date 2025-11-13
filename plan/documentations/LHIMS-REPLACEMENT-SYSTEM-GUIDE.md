# LHIMS Replacement System - Complete Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Phase 1: LHIMS Documentation](#phase-1-lhims-documentation)
4. [Phase 2: Development Setup](#phase-2-development-setup)
5. [Phase 3: Data Migration](#phase-3-data-migration)
6. [Phase 4: Module Development](#phase-4-module-development)
7. [Phase 5: Deployment](#phase-5-deployment)
8. [Scripts Reference](#scripts-reference)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This guide documents the complete process of building a replacement system for LHIMS (Lightwave Health Information Management System) at Volta Regional Hospital, Hohoe. The new system will:

- **Maintain familiar UI**: Staff won't need extensive retraining
- **Improve performance**: Modern stack for speed and reliability
- **Work offline**: No cloud dependencies, runs on hospital network
- **Preserve all data**: All 70,079 patient records migrated

### Key Statistics
- **Total Patients**: 70,079 successfully extracted
- **Data Types**: JSON structured data + PDF medical records
- **Development Timeline**: 19-20 weeks (~5 months)
- **Infrastructure Cost**: ~$3,000 USD first year

### Technology Stack
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **Database**: PostgreSQL (primary) + SQLite (offline backup)
- **Cache**: Redis for session management
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Authentication**: NextAuth.js with RBAC
- **API Layer**: tRPC for type-safe endpoints

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│            Hospital Network (10.10.x.x)          │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Desktop  │  │  Laptop  │  │  Tablet  │      │
│  │ Browser  │  │ Browser  │  │ Browser  │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       └──────────────┼──────────────┘            │
│                      ▼                           │
│         ┌───────────────────────┐               │
│         │   Next.js Application  │               │
│         │   (Hospital Server)    │               │
│         └───────────┬───────────┘               │
│                     ▼                            │
│         ┌───────────────────────┐               │
│         │    PostgreSQL DB      │               │
│         │  (70,079 patients)    │               │
│         └───────────────────────┘               │
└──────────────────────────────────────────────────┘
```

---

## Phase 1: LHIMS Documentation

### Purpose
Systematically capture and document every LHIMS page to understand functionality and replicate the UI.

### Location
All documentation will be stored in: `plan/lhims-documentation/`

### Step 1: Prepare Environment

```bash
# Ensure you're on the hospital network (10.10.0.59)
# Set credentials (don't commit these!)
export LHIMS_USERNAME=your_username
export LHIMS_PASSWORD=your_password
export LHIMS_URL=http://10.10.0.59/lhims_182
```

### Step 2: Run Documentation Script

```bash
# This will navigate through all LHIMS pages automatically
node scripts/document-lhims-pages.js
```

**What this script does:**
- Logs into LHIMS using provided credentials
- Navigates to each module systematically
- Takes full-page screenshots
- Extracts all form fields and their properties
- Documents buttons, links, and navigation
- Records API endpoints used by each page
- Generates markdown documentation automatically

**Expected Output:**
```
plan/lhims-documentation/
├── 00-INDEX.md                    # Master navigation map
├── 01-authentication/
│   └── login-page.md              # Login documentation
├── 02-dashboard/
│   └── main-dashboard.md          # Dashboard documentation
├── 03-patient-management/
│   ├── patient-search.md
│   └── patient-registration.md
├── 04-opd-module/
│   ├── consultation.md
│   └── prescription.md
├── screenshots/                   # All captured screenshots
└── api-endpoints/                 # Discovered API endpoints
```

### Step 3: Analyze UI Patterns

```bash
# Extract colors, fonts, layouts, and component patterns
node scripts/analyze-lhims-ui.js
```

**What this script does:**
- Extracts color schemes (text, background, borders)
- Documents typography (fonts, sizes, headings)
- Analyzes form patterns and validation
- Identifies button styles and categories
- Documents table layouts
- Tests responsiveness across screen sizes
- Generates CSS template for replication

**Output Files:**
- `ui-analysis.json` - Raw UI data
- `UI-PATTERNS-REPORT.md` - Human-readable analysis
- `lhims-styles.css` - CSS template for new system

### Step 4: Review Documentation

After running both scripts:
1. Review `00-INDEX.md` for complete navigation structure
2. Check individual page documentation for completeness
3. Verify screenshots captured correctly
4. Note any pages that failed (may need manual documentation)

---

## Phase 2: Development Setup

### Step 1: Initialize Next.js Project

```bash
# Create new Next.js application
npx create-next-app@latest vrh-hims --typescript --tailwind --app
cd vrh-hims

# Install core dependencies
npm install @trpc/server @trpc/client @trpc/next @trpc/react-query
npm install @tanstack/react-query
npm install next-auth @auth/prisma-adapter
npm install @prisma/client prisma
npm install zod react-hook-form
npm install lucide-react

# Install shadcn/ui CLI
npx shadcn-ui@latest init
```

### Step 2: Project Structure

```
vrh-hims/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── patients/
│   │   ├── opd/
│   │   ├── ipd/
│   │   └── pharmacy/
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   └── trpc/[trpc]/
│   └── layout.tsx
├── components/
│   ├── ui/           # shadcn components
│   ├── layout/
│   └── patients/
├── server/
│   ├── db/
│   ├── routers/
│   └── context.ts
├── lib/
│   ├── utils.ts
│   └── trpc.ts
└── prisma/
    └── schema.prisma
```

### Step 3: Database Setup

```bash
# Install PostgreSQL (if not installed)
# On Ubuntu:
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb vrh_hims

# Setup Prisma
npx prisma init

# After defining schema, run:
npx prisma migrate dev --name init
npx prisma generate
```

### Step 4: Apply LHIMS Styling

Copy the generated `lhims-styles.css` from documentation phase and integrate with Tailwind:

```css
/* app/globals.css */
@import './lhims-styles.css';

/* Override with LHIMS colors */
:root {
  --primary: /* color from LHIMS */;
  --secondary: /* color from LHIMS */;
  /* ... other LHIMS colors */
}
```

---

## Phase 3: Data Migration

### Step 1: Prepare Migration Scripts

Location: `scripts/migration/`

```bash
# Create migration directory
mkdir -p scripts/migration

# Prepare patient data
node scripts/migration/prepare-patients.js

# Validate data integrity
node scripts/migration/validate-data.js
```

### Step 2: Database Schema

```sql
-- Core tables based on LHIMS structure
CREATE TABLE patients (
    id UUID PRIMARY KEY,
    patient_number VARCHAR(50) UNIQUE,
    nhis_number VARCHAR(50),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(10),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE opd_visits (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES patients(id),
    visit_date TIMESTAMP,
    complaint TEXT,
    diagnosis JSONB,
    prescription JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Continue for other tables...
```

### Step 3: Run Migration

```bash
# Import all 70,079 patients
node scripts/migration/import-to-postgres.js

# Verify import
node scripts/migration/verify-import.js

# Generate migration report
node scripts/migration/generate-report.js
```

### Step 4: Link PDF Files

```bash
# Organize PDFs by patient number
node scripts/migration/organize-pdfs.js

# Create database links to PDFs
node scripts/migration/link-pdfs.js
```

---

## Phase 4: Module Development

### Development Order (by priority)

#### Week 1-2: Core Patient Management
```bash
# Components to build
components/
├── patients/
│   ├── PatientSearch.tsx       # Global search bar
│   ├── PatientCard.tsx         # Patient info card
│   ├── PatientProfile.tsx      # Full profile view
│   └── PatientTimeline.tsx     # Visit history
```

**Key Features:**
- Search by: Patient number, NHIS number, name, phone
- Display: Demographics, allergies, chronic conditions
- Timeline: All visits, prescriptions, lab results

#### Week 3-4: OPD Module
```bash
# OPD components
components/
├── opd/
│   ├── OPDQueue.tsx           # Today's patients
│   ├── ConsultationForm.tsx   # Main consultation
│   ├── VitalSigns.tsx         # Vitals capture
│   ├── Diagnosis.tsx          # ICD-10 selection
│   └── Prescription.tsx       # Drug prescription
```

**Replicate LHIMS workflow:**
1. Patient arrives → OPD Queue
2. Nurse captures vitals
3. Doctor consultation
4. Prescription generated
5. Patient to pharmacy

#### Week 5-6: IPD Module
```bash
# IPD components
components/
├── ipd/
│   ├── AdmissionForm.tsx      # Admit patient
│   ├── WardManagement.tsx     # Bed allocation
│   ├── WardRounds.tsx         # Daily notes
│   └── DischargeForm.tsx      # Discharge process
```

#### Week 7: Pharmacy Module
```bash
# Pharmacy components
components/
├── pharmacy/
│   ├── PrescriptionQueue.tsx  # Pending prescriptions
│   ├── DispensingForm.tsx     # Dispense drugs
│   └── StockManagement.tsx    # Inventory
```

#### Week 8: Laboratory Module
```bash
# Lab components
components/
├── laboratory/
│   ├── TestOrdering.tsx       # Order tests
│   ├── SampleCollection.tsx   # Track samples
│   └── ResultsEntry.tsx       # Enter results
```

#### Week 9: Reports Module
```bash
# Report components
components/
├── reports/
│   ├── OPDMorbidity.tsx       # Monthly morbidity
│   ├── IPDStatistics.tsx      # Admission stats
│   └── CustomReports.tsx      # Report builder
```

---

## Phase 5: Deployment

### Server Requirements

**Minimum Hardware:**
- CPU: 4 cores (Intel i5 or equivalent)
- RAM: 8GB
- Storage: 500GB SSD
- Network: Gigabit Ethernet
- UPS: 1500VA for power backup

**Recommended Hardware:**
- CPU: 8 cores (Intel i7/Xeon)
- RAM: 16GB
- Storage: 1TB NVMe SSD

### Installation on Hospital Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 16
sudo apt install -y postgresql-16

# Install Redis
sudo apt install -y redis-server

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install -y nginx

# Clone and build application
cd /var/www
git clone [repository-url] vrh-hims
cd vrh-hims
npm install
npm run build

# Start with PM2
pm2 start npm --name "vrh-hims" -- start
pm2 save
pm2 startup

# Configure Nginx
sudo nano /etc/nginx/sites-available/vrh-hims
# Add proxy configuration

# Enable site
sudo ln -s /etc/nginx/sites-available/vrh-hims /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Backup Strategy

```bash
# Create backup script
cat > /usr/local/bin/backup-vrh-hims.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/vrh-hims"
DATE=$(date +%Y-%m-%d)

# Backup database
pg_dump vrh_hims | gzip > "$BACKUP_DIR/db-$DATE.sql.gz"

# Backup files
tar -czf "$BACKUP_DIR/files-$DATE.tar.gz" /var/www/vrh-hims/files

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete
EOF

# Schedule daily backup at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-vrh-hims.sh") | crontab -
```

---

## Scripts Reference

### Documentation Scripts

#### `document-lhims-pages.js`
**Purpose**: Automatically document all LHIMS pages
**Usage**: `node scripts/document-lhims-pages.js`
**Output**: Markdown files, screenshots, API endpoints

#### `analyze-lhims-ui.js`
**Purpose**: Extract UI patterns and styles
**Usage**: `node scripts/analyze-lhims-ui.js`
**Output**: UI analysis report, CSS template

### Data Scripts

#### `generate-patient-list.js`
**Purpose**: Create master patient list from Excel files
**Usage**: `node scripts/generate-patient-list.js`
**Output**: `master-patient-list.txt`

#### `extract-patient-pdf-concurrent.js`
**Purpose**: Extract patient PDFs in parallel
**Usage**: `node scripts/extract-patient-pdf-concurrent.js`
**Output**: PDF files in `data/patient-pdfs/`

### Migration Scripts

#### `init-database.js`
**Purpose**: Initialize SQLite database
**Usage**: `node scripts/init-database.js`
**Output**: `vrh-hims.db`

#### `import-excel-data.js`
**Purpose**: Import Excel data to database
**Usage**: `node scripts/import-excel-data.js`
**Output**: Populated database tables

---

## Troubleshooting

### Common Issues

#### 1. LHIMS Access Issues
```bash
# Problem: Cannot access LHIMS
# Solution: Ensure you're on hospital network (10.10.0.59)
# Disconnect from external network first

# Test connection
ping 10.10.0.59
```

#### 2. Script Errors
```bash
# Problem: "Module not found" error
# Solution: Install missing dependencies
npm install

# Problem: "sharp" module error (optional)
# Solution: Sharp is optional for image analysis
# Script will work without it
```

#### 3. Database Connection
```bash
# Problem: Cannot connect to PostgreSQL
# Solution: Check PostgreSQL is running
sudo systemctl status postgresql

# Restart if needed
sudo systemctl restart postgresql
```

#### 4. Memory Issues
```bash
# Problem: Out of memory during migration
# Solution: Process in batches
node scripts/migration/import-batch.js --batch-size=1000
```

### Performance Tips

1. **Use indexes on frequently searched fields**
```sql
CREATE INDEX idx_patients_number ON patients(patient_number);
CREATE INDEX idx_patients_nhis ON patients(nhis_number);
CREATE INDEX idx_patients_names ON patients(first_name, last_name);
```

2. **Implement caching with Redis**
```javascript
// Cache patient searches
const cacheKey = `patient:${patientNumber}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

3. **Optimize images and PDFs**
```bash
# Compress PDFs
for file in data/patient-pdfs/*.pdf; do
  gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook \
     -dNOPAUSE -dQUIET -dBATCH -sOutputFile="$file.compressed" "$file"
done
```

---

## Support & Resources

### Project Files
- **Main Documentation**: This file
- **Project Context**: `PROJECT-CONTEXT.md`
- **Navigation Map**: `plan/lhims-documentation/00-INDEX.md`
- **Import Guide**: `plan/documentation/IMPORT-GUIDE.md`

### Getting Help
- Review error logs in `logs/` directory
- Check `PROJECT-CONTEXT.md` for gotchas
- Consult LHIMS documentation in `plan/lhims-documentation/`

### Timeline Summary
- **Phase 1**: LHIMS Documentation (2 weeks)
- **Phase 2**: Setup & Architecture (1 week)
- **Phase 3**: Data Migration (2 weeks)
- **Phase 4**: Development (11 weeks)
- **Phase 5**: Testing & Deployment (2 weeks)
- **Phase 6**: Training (2 weeks)
- **Total**: ~20 weeks (5 months)

### Success Metrics
- All 70,079 patients migrated
- Page load time < 2 seconds
- 90% staff trained within 1 month
- Zero data loss incidents
- System uptime > 99.5%

---

## Conclusion

This guide provides a complete roadmap for replacing LHIMS with a modern, performant system while maintaining familiarity for hospital staff. The key to success is:

1. **Thorough documentation** of existing LHIMS
2. **Careful data migration** preserving all patient records
3. **Familiar UI** to minimize training needs
4. **Robust infrastructure** for reliability
5. **Comprehensive testing** before go-live

Following this guide, Volta Regional Hospital will have complete control over their patient data with a system that's faster, more reliable, and maintainable than LHIMS.

---

*Last Updated: November 2025*
*Version: 1.0*