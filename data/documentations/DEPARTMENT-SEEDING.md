# Department Seeding Guide

This guide explains how to use the department seeding script to prepopulate your hospital information system with standard hospital departments.

## Overview

The department seeding script (`prisma/seed-departments.ts`) automatically creates 37 common hospital departments in your database, organized by clinical areas and operational functions.

## Quick Start

### Running the Seed Script

From the nextjs-starter directory:

```bash
cd /home/kelib/Desktop/projects/lhims-fix/nextjs-starter
npx tsx prisma/seed-departments.ts
```

The script will:
- Check if departments already exist
- Skip seeding if departments are found (to prevent duplicates)
- Create all 37 departments if none exist
- Display a summary of created departments

### Expected Output

```
🏥 Starting department seeding...

✅ Created: RECORDS              - Medical Records
✅ Created: OPD                  - Outpatient Department (OPD)
✅ Created: CONSULTING-1         - Consulting Room 1
...

============================================================
🎉 Department seeding complete!
   Created: 37 departments
   Skipped: 0 departments
============================================================

📊 Summary:
   Active: 37 departments
```

## Department Categories

The script creates departments in the following categories:

### 1. Patient Registration & Records
- **RECORDS** - Medical Records: Patient registration, records management, and data entry

### 2. Outpatient Services
- **OPD** - Outpatient Department: General outpatient consultations and minor procedures
- **CONSULTING-1** - Consulting Room 1: Primary consultation room for general medicine
- **CONSULTING-2** - Consulting Room 2: Secondary consultation room
- **CONSULTING-3** - Consulting Room 3: Tertiary consultation room

### 3. Nursing & Vitals
- **NURSES-STATION** - Nurses Station: Vital signs recording, triage, and nursing assessments
- **VITALS-ROOM** - Vitals Room: Dedicated room for vital signs measurement

### 4. Inpatient Services
- **IPD** - Inpatient Department: Ward admissions and inpatient care management
- **MALE-WARD** - Male Medical Ward: Inpatient ward for male patients
- **FEMALE-WARD** - Female Medical Ward: Inpatient ward for female patients
- **PAEDIATRIC-WARD** - Paediatric Ward: Children's ward for patients under 18 years

### 5. Emergency Services
- **EMERGENCY** - Accident & Emergency: Emergency department for urgent and critical cases
- **CASUALTY** - Casualty: Trauma and accident cases

### 6. Maternal & Child Health
- **ANC** - Antenatal Care: Antenatal clinic for pregnant women
- **MATERNITY** - Maternity Ward: Labour ward and postnatal care
- **LABOUR-WARD** - Labour Ward: Delivery suite and labour management
- **CHILD-WELFARE** - Child Welfare Clinic: Well-baby clinic, immunization, and growth monitoring

### 7. Diagnostic Services - Laboratory
- **LABORATORY** - Medical Laboratory: Clinical laboratory for blood tests, urinalysis, and other investigations
- **LAB-HEMATOLOGY** - Haematology Lab: Blood counts, blood film, and haematology tests
- **LAB-CHEMISTRY** - Clinical Chemistry Lab: Biochemistry tests, blood sugar, liver function, kidney function
- **LAB-MICROBIOLOGY** - Microbiology Lab: Culture and sensitivity, microscopy, parasitology

### 8. Diagnostic Services - Imaging
- **RADIOLOGY** - Radiology Department: X-ray and imaging services
- **XRAY** - X-Ray Unit: Plain radiography and X-ray imaging
- **ULTRASOUND** - Ultrasound/Scan Unit: Ultrasound scanning and sonography services

### 9. Pharmacy
- **PHARMACY** - Hospital Pharmacy: Drug dispensing and pharmaceutical services
- **PHARMACY-OPD** - OPD Pharmacy: Outpatient pharmacy for ambulatory patients
- **PHARMACY-IPD** - IPD Pharmacy: Inpatient pharmacy for ward medication supplies

### 10. Specialist Clinics
- **DENTAL** - Dental Clinic: Dental consultations and procedures
- **EYE-CLINIC** - Eye Clinic: Ophthalmology services and eye examinations
- **PHYSIOTHERAPY** - Physiotherapy Department: Physical therapy and rehabilitation services
- **ENT** - ENT Clinic: Ear, Nose, and Throat specialist services

### 11. Surgical Services
- **SURGICAL-OPD** - Surgical Outpatient: Surgical consultations and pre-operative assessments
- **THEATRE** - Operating Theatre: Main operating theatre for surgical procedures
- **MINOR-THEATRE** - Minor Theatre: Minor procedures and surgical interventions

### 12. Support Services
- **NHIS-OFFICE** - NHIS Office: National Health Insurance Scheme registration and claims
- **BILLING** - Billing Department: Patient billing and accounts
- **ADMIN** - Hospital Administration: Administrative offices and management

## Modifying the Department List

### Adding New Departments

Edit the `departments` array in `prisma/seed-departments.ts`:

```typescript
const departments = [
  // ... existing departments ...

  // Add your new department
  {
    code: "YOUR-DEPT-CODE",           // Uppercase alphanumeric code
    name: "Your Department Name",      // Display name
    description: "Description of what this department does",
  },
];
```

**Department Code Guidelines:**
- Use UPPERCASE letters, numbers, hyphens, or underscores
- Keep codes short and meaningful (2-20 characters)
- Use hyphens to separate words (e.g., "EYE-CLINIC")
- Avoid special characters or spaces

**Examples:**
```typescript
{
  code: "CARDIOLOGY",
  name: "Cardiology Department",
  description: "Heart and cardiovascular disease treatment",
},
{
  code: "NEURO-SURGERY",
  name: "Neurosurgery",
  description: "Surgical treatment of neurological conditions",
},
```

### Removing Departments

Simply delete or comment out the department from the array:

```typescript
// {
//   code: "DENTAL",
//   name: "Dental Clinic",
//   description: "Dental consultations and procedures",
// },
```

### Modifying Existing Departments

Change the name or description while keeping the code:

```typescript
{
  code: "OPD",  // Keep the code unchanged
  name: "General Outpatient Services",  // Updated name
  description: "Walk-in consultations and minor treatments",  // Updated description
},
```

## Re-seeding After Changes

If you need to re-seed after modifying the department list:

### Option 1: Delete Existing Departments First

Use Prisma Studio to delete all departments:

```bash
cd /home/kelib/Desktop/projects/lhims-fix/nextjs-starter
npm run db:studio
```

Then navigate to the Department table and delete all records.

### Option 2: Manually Delete Via SQL

```bash
cd /home/kelib/Desktop/projects/lhims-fix/nextjs-starter
npx prisma db execute --stdin <<EOF
DELETE FROM "Department";
EOF
```

### Option 3: Modify Script for Update Mode

You can temporarily comment out the duplicate check in `seed-departments.ts`:

```typescript
// Comment out these lines to force re-seed
// if (existingCount > 0) {
//   console.log(`⚠️  Found ${existingCount} existing departments.`);
//   console.log("   Skipping seed to prevent duplicates.");
//   return;
// }
```

After making changes, run the seed script again:

```bash
npx tsx prisma/seed-departments.ts
```

## Database Schema

Departments are stored with the following fields:

```typescript
model Department {
  id          String   @id @default(cuid())
  code        String   @unique          // Unique department code
  name        String                    // Display name
  description String?                   // Optional description
  isActive    Boolean  @default(true)   // Active/inactive status
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Viewing Seeded Departments

### Via Web Interface

Navigate to the admin departments page:
```
http://localhost:3001/admin/departments
```

### Via Prisma Studio

```bash
cd /home/kelib/Desktop/projects/lhims-fix/nextjs-starter
npm run db:studio
```

Navigate to the "Department" table to view all seeded departments.

### Via API

```bash
# Get all departments (requires admin authentication)
curl -X GET http://localhost:3001/api/admin/departments \
  -H "Cookie: access_token=YOUR_TOKEN"
```

## Customizing for Your Hospital

### Step 1: Review Default Departments

Review the 37 default departments and identify which ones apply to your facility.

### Step 2: Remove Irrelevant Departments

Comment out or delete departments you don't need:

```typescript
// Example: Remove specialist clinics if not available
// {
//   code: "DENTAL",
//   name: "Dental Clinic",
//   description: "Dental consultations and procedures",
// },
```

### Step 3: Add Your Departments

Add any specialized departments specific to your hospital:

```typescript
{
  code: "ONCOLOGY",
  name: "Oncology Department",
  description: "Cancer treatment and chemotherapy services",
},
{
  code: "DIALYSIS",
  name: "Dialysis Unit",
  description: "Renal dialysis and kidney disease management",
},
```

### Step 4: Update Descriptions

Modify descriptions to match your hospital's terminology:

```typescript
{
  code: "OPD",
  name: "General Outpatient Clinic",  // Changed from "Outpatient Department (OPD)"
  description: "First point of contact for walk-in patients",  // Customized
},
```

### Step 5: Run the Seed Script

```bash
cd /home/kelib/Desktop/projects/lhims-fix/nextjs-starter
npx tsx prisma/seed-departments.ts
```

## Troubleshooting

### Error: "Department code already exists"

This means the department code is a duplicate. Each code must be unique. Either:
1. Change the code to something unique
2. Delete existing departments first (see Re-seeding section)

### Error: "Skipping seed to prevent duplicates"

The script detected existing departments. To re-seed:
1. Delete all departments via Prisma Studio or SQL
2. Or modify the script to allow updates (see Re-seeding section)

### Script Hangs or Doesn't Complete

Check your database connection:
```bash
# Verify database is running
docker compose ps

# Check database logs
docker compose logs postgres
```

### Permission Errors

Make sure you're running from the correct directory:
```bash
cd /home/kelib/Desktop/projects/lhims-fix/nextjs-starter
```

## Integration with Clinical Workflow

After seeding departments, you can:

1. **Assign Staff to Departments** - Use the Staff Management UI at `/admin/staff`
2. **Create Consultations** - Records staff can select departments when creating new patient visits
3. **Track Department Activity** - View visit statistics per department on the dashboard
4. **Generate Reports** - Filter clinical data by department for reporting

## Best Practices

1. **Backup Before Changes** - Always backup your database before re-seeding
2. **Use Descriptive Codes** - Choose clear, meaningful department codes
3. **Document Customizations** - Keep notes on why certain departments were added/removed
4. **Test After Seeding** - Verify departments appear correctly in the admin UI
5. **Coordinate with Staff** - Ensure department names match what staff are familiar with

## Related Documentation

- [Hospital System Implementation Plan](../../HOSPITAL-SYSTEM-IMPLEMENTATION-PLAN.md)
- [Admin Department Management](../../nextjs-starter/app/(admin)/admin/departments/page.tsx)
- [Prisma Schema](../../nextjs-starter/prisma/schema.prisma)

## Support

For issues or questions about department seeding:
1. Check this documentation first
2. Review the seed script: `prisma/seed-departments.ts`
3. Inspect the Department model in `prisma/schema.prisma`
4. Test in Prisma Studio: `npm run db:studio`
