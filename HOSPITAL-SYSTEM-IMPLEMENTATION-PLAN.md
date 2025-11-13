# Hospital Information System - Implementation Plan
**Using Next.js Starter Template**

Based on:
- Your Next.js starter: https://github.com/kelibst/nextjs-starter
- LHIMS Replacement Guide: `plan/documentation/LHIMS-REPLACEMENT-SYSTEM-GUIDE.md`
- Current SQLite database: 70K patients, 867K visits, extracted PDFs

---

## Overview

**Goal**: Build a lightweight, fast hospital information system with:
- ✅ User authentication (already in starter)
- ✅ Role-based access control (extend existing roles)
- 📋 Patient search and management
- 📄 PDF record viewing (OPD/IPD PDFs)
- 📊 Basic hospital dashboard
- 🚀 Fast performance (offline-capable)

**Timeline**: 2-3 weeks for MVP

---

## Phase 1: Project Setup (Day 1-2)

### Step 1: Clone and Initialize

```bash
# Create new hospital project from your starter
cd ~/Desktop/projects
git clone https://github.com/kelibst/nextjs-starter vrh-hospital-system
cd vrh-hospital-system

# Install dependencies
npm install

# Setup PostgreSQL (Docker)
docker compose up -d

# Initialize database
npm run db:migrate
npm run db:seed
```

### Step 2: Configure for Hospital Use

**Update `.env`:**
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vrh_hospital"

# App
NEXT_PUBLIC_APP_NAME="VRH Hospital System"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# JWT (use existing from starter)
JWT_SECRET="your-super-secret-key-here"
JWT_REFRESH_SECRET="your-refresh-secret-key-here"
```

### Step 3: Project Structure Updates

```
vrh-hospital-system/
├── app/
│   ├── (auth)/              # ✅ Already exists
│   ├── (dashboard)/         # 🆕 Add hospital modules
│   │   ├── dashboard/       # 🆕 Hospital stats dashboard
│   │   ├── patients/        # 🆕 Patient management
│   │   │   ├── page.tsx                 # Patient list/search
│   │   │   └── [patientNo]/page.tsx     # Patient detail + PDF
│   │   ├── users/           # ✅ Already exists (adapt)
│   │   └── layout.tsx       # ✅ Already exists
│   └── api/
│       ├── auth/            # ✅ Already exists
│       └── patients/        # 🆕 Add patient endpoints
├── components/
│   ├── ui/                  # ✅ Already exists (shadcn/ui)
│   ├── patients/            # 🆕 Add patient components
│   │   ├── patient-search.tsx
│   │   ├── patient-card.tsx
│   │   ├── patient-detail.tsx
│   │   └── pdf-viewer.tsx
│   └── dashboard/           # 🆕 Add dashboard widgets
├── lib/
│   ├── auth/                # ✅ Already exists
│   ├── db.ts                # ✅ Already exists (Prisma)
│   └── validations/         # ✅ Already exists (extend)
└── prisma/
    └── schema.prisma        # 🔄 Extend with hospital models
```

---

## Phase 2: Database Schema Design (Day 2-3)

### Extend Prisma Schema

**File**: `prisma/schema.prisma`

```prisma
// ✅ Keep existing User model from starter
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  email     String?  @unique
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
  SUPER_ADMIN
  DOCTOR          // 🆕 Hospital role
  NURSE           // 🆕 Hospital role
  RECEPTIONIST    // 🆕 Hospital role
  PHARMACIST      // 🆕 Hospital role
  LAB_TECH        // 🆕 Hospital role
}

// 🆕 Hospital Models

model Patient {
  id              String   @id @default(cuid())
  patientNo       String   @unique  // e.g., VR-A01-AAA0001
  nhisNumber      String?
  firstName       String
  middleName      String?
  lastName        String
  fullName        String
  dateOfBirth     DateTime?
  gender          String?  // Male, Female, Other
  mobilePhone     String?
  address         String?

  // Metadata
  importedFromLhims Boolean  @default(true)
  lhimsImportedAt   DateTime @default(now())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  visits          Visit[]
  diagnoses       Diagnosis[]
  medications     Medication[]
  labOrders       LabOrder[]
  pdfs            PatientPdf[]

  @@index([patientNo])
  @@index([nhisNumber])
  @@index([firstName, lastName])
}

model Visit {
  id              String   @id @default(cuid())
  patientId       String
  patient         Patient  @relation(fields: [patientId], references: [id])

  visitDate       DateTime
  visitType       String   // OPD, IPD, ANC, Lab, Consulting
  sourceFile      String?  // Original Excel file
  sourceCategory  String?  // Category from import

  // Visit data
  age             String?
  locality        String?
  nhisStatus      String?
  rawData         Json?    // Store original Excel row

  createdAt       DateTime @default(now())

  @@index([patientId])
  @@index([visitDate])
  @@index([visitType])
}

model Diagnosis {
  id              String   @id @default(cuid())
  patientId       String
  patient         Patient  @relation(fields: [patientId], references: [id])

  visitDate       DateTime
  diagnosisType   String   // Principal, Additional, Provisional
  caseType        String?  // New, Old, Recurring
  diagnosisText   String
  icd10Code       String?
  sourceFile      String?

  createdAt       DateTime @default(now())

  @@index([patientId])
  @@index([visitDate])
}

model Medication {
  id              String   @id @default(cuid())
  patientId       String
  patient         Patient  @relation(fields: [patientId], references: [id])

  visitDate       DateTime
  medicationType  String   // Prescribed, Dispensed
  medicationText  String
  sourceFile      String?

  createdAt       DateTime @default(now())

  @@index([patientId])
  @@index([visitDate])
}

model LabOrder {
  id                String   @id @default(cuid())
  patientId         String
  patient           Patient  @relation(fields: [patientId], references: [id])

  visitNo           String?
  scheduleDate      DateTime
  testRequested     String?
  specimenType      String?
  collectionDatetime String?
  pathologyBarcode  String?
  clinicianName     String?
  clinicianContact  String?
  sourceOfRequest   String?  // IPD, OPD
  sourceFile        String?

  createdAt         DateTime @default(now())

  @@index([patientId])
  @@index([scheduleDate])
}

model PatientPdf {
  id              String   @id @default(cuid())
  patientId       String
  patient         Patient  @relation(fields: [patientId], references: [id])

  pdfType         String   // OPD, IPD
  filePath        String   // Relative path to PDF
  fileSize        Int?     // Bytes
  pageCount       Int?

  createdAt       DateTime @default(now())

  @@index([patientId])
}

model ImportLog {
  id                  String   @id @default(cuid())
  sourceFile          String
  sourceCategory      String
  fileDate            String?
  recordsImported     Int      @default(0)
  recordsSkipped      Int      @default(0)
  recordsFailed       Int      @default(0)
  importStartedAt     DateTime @default(now())
  importCompletedAt   DateTime?
  importStatus        String   // Started, Completed, Failed
  errorMessage        String?
}
```

### Run Migration

```bash
# Create and apply migration
npm run db:migrate -- --name add_hospital_models

# Verify in Prisma Studio
npx prisma studio
```

---

## Phase 3: Data Migration (Day 3-4)

### Strategy: SQLite → PostgreSQL

**Create migration script**: `scripts/migrate-to-postgres.ts`

```typescript
import { PrismaClient as SqlitePrisma } from '@prisma/client/sqlite'
import { PrismaClient as PostgresPrisma } from '@prisma/client'

const sqlite = new SqlitePrisma({
  datasources: { db: { url: 'file:./data/database/patient-care-system.db' } }
})

const postgres = new PostgresPrisma()

async function migratePatients() {
  console.log('🔄 Migrating patients from SQLite to PostgreSQL...')

  const sqlitePatients = await sqlite.patients.findMany()
  const batchSize = 1000

  for (let i = 0; i < sqlitePatients.length; i += batchSize) {
    const batch = sqlitePatients.slice(i, i + batchSize)

    await postgres.patient.createMany({
      data: batch.map(p => ({
        patientNo: p.patient_no,
        nhisNumber: p.nhis_number,
        firstName: p.first_name,
        middleName: p.middle_name,
        lastName: p.last_name,
        fullName: p.full_name,
        dateOfBirth: p.date_of_birth ? new Date(p.date_of_birth) : null,
        gender: p.gender,
        mobilePhone: p.mobile_phone,
        address: p.address,
        importedFromLhims: true,
        lhimsImportedAt: new Date(p.lhims_imported_at || Date.now())
      })),
      skipDuplicates: true
    })

    console.log(`✓ Migrated ${Math.min((i + batchSize), sqlitePatients.length)}/${sqlitePatients.length} patients`)
  }

  console.log('✅ Patient migration complete!')
}

async function migrateVisits() {
  console.log('🔄 Migrating visits...')

  const visits = await sqlite.excel_visits.findMany()
  const batchSize = 1000

  for (let i = 0; i < visits.length; i += batchSize) {
    const batch = visits.slice(i, i + batchSize)

    // Get patient IDs mapping
    const patientNos = batch.map(v => v.patient_no)
    const patients = await postgres.patient.findMany({
      where: { patientNo: { in: patientNos } },
      select: { id: true, patientNo: true }
    })

    const patientMap = new Map(patients.map(p => [p.patientNo, p.id]))

    const visitData = batch
      .filter(v => patientMap.has(v.patient_no))
      .map(v => ({
        patientId: patientMap.get(v.patient_no)!,
        visitDate: new Date(v.visit_date),
        visitType: v.source_category,
        sourceFile: v.source_file,
        sourceCategory: v.source_category,
        age: v.age,
        locality: v.locality,
        nhisStatus: v.nhis_status,
        rawData: v.raw_data as any
      }))

    if (visitData.length > 0) {
      await postgres.visit.createMany({
        data: visitData,
        skipDuplicates: true
      })
    }

    console.log(`✓ Migrated ${Math.min((i + batchSize), visits.length)}/${visits.length} visits`)
  }

  console.log('✅ Visit migration complete!')
}

async function linkPdfs() {
  console.log('🔄 Linking PDFs to patients...')

  const fs = require('fs')
  const path = require('path')

  const pdfDir = path.join(__dirname, '../data/patient-pdfs')

  if (!fs.existsSync(pdfDir)) {
    console.log('⚠️ PDF directory not found, skipping...')
    return
  }

  const files = fs.readdirSync(pdfDir)
  const opdPdfs = files.filter(f => f.includes('_opd_') && f.endsWith('.pdf'))
  const ipdPdfs = files.filter(f => f.includes('_ipd_') && f.endsWith('.pdf'))

  // Link OPD PDFs
  for (const file of opdPdfs) {
    const match = file.match(/^(.+?)_opd_/)
    if (match) {
      const patientNo = match[1]
      const patient = await postgres.patient.findUnique({
        where: { patientNo }
      })

      if (patient) {
        const filePath = `patient-pdfs/${file}`
        const stats = fs.statSync(path.join(pdfDir, file))

        await postgres.patientPdf.create({
          data: {
            patientId: patient.id,
            pdfType: 'OPD',
            filePath,
            fileSize: stats.size
          }
        })
      }
    }
  }

  console.log(`✓ Linked ${opdPdfs.length} OPD PDFs`)

  // Link IPD PDFs (similar logic)
  for (const file of ipdPdfs) {
    const match = file.match(/^(.+?)_ipd_/)
    if (match) {
      const patientNo = match[1]
      const patient = await postgres.patient.findUnique({
        where: { patientNo }
      })

      if (patient) {
        const filePath = `patient-pdfs/${file}`
        const stats = fs.statSync(path.join(pdfDir, file))

        await postgres.patientPdf.create({
          data: {
            patientId: patient.id,
            pdfType: 'IPD',
            filePath,
            fileSize: stats.size
          }
        })
      }
    }
  }

  console.log(`✓ Linked ${ipdPdfs.length} IPD PDFs`)
  console.log('✅ PDF linking complete!')
}

async function main() {
  try {
    await migratePatients()
    await migrateVisits()
    // Diagnoses, medications, lab orders similar to visits
    await linkPdfs()

    console.log('\n🎉 All data migrated successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
  } finally {
    await sqlite.$disconnect()
    await postgres.$disconnect()
  }
}

main()
```

**Run migration:**
```bash
# Add script to package.json
npm run migrate:sqlite-to-postgres
```

---

## Phase 4: Build Core Features (Day 5-10)

### Feature 1: Patient Search & List

**File**: `app/(dashboard)/patients/page.tsx`

```typescript
import { Suspense } from 'react'
import { PatientSearch } from '@/components/patients/patient-search'
import { PatientList } from '@/components/patients/patient-list'
import { db } from '@/lib/db'

export default async function PatientsPage({
  searchParams
}: {
  searchParams: { q?: string }
}) {
  const query = searchParams.q || ''

  const patients = query
    ? await db.patient.findMany({
        where: {
          OR: [
            { patientNo: { contains: query, mode: 'insensitive' } },
            { fullName: { contains: query, mode: 'insensitive' } },
            { nhisNumber: { contains: query, mode: 'insensitive' } },
            { mobilePhone: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: 50,
        orderBy: { patientNo: 'asc' },
        include: {
          visits: {
            select: { visitDate: true },
            orderBy: { visitDate: 'desc' },
            take: 1
          },
          _count: {
            select: { visits: true, pdfs: true }
          }
        }
      })
    : []

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Patient Management</h1>

      <PatientSearch initialQuery={query} />

      <Suspense fallback={<div>Loading patients...</div>}>
        <PatientList patients={patients} />
      </Suspense>
    </div>
  )
}
```

**File**: `components/patients/patient-search.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

export function PatientSearch({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/patients?q=${encodeURIComponent(query)}`)
  }

  return (
    <form onSubmit={handleSearch} className="mb-6">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by Patient No, Name, NHIS, or Phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
      </div>
    </form>
  )
}
```

**File**: `components/patients/patient-list.tsx`

```typescript
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Calendar } from 'lucide-react'

export function PatientList({ patients }: { patients: any[] }) {
  if (patients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No patients found. Try a different search.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {patients.map((patient) => (
        <Link
          key={patient.id}
          href={`/patients/${patient.patientNo}`}
          className="block hover:scale-[1.01] transition-transform"
        >
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{patient.fullName}</h3>
                  <Badge variant="outline">{patient.patientNo}</Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Gender:</span> {patient.gender || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">NHIS:</span> {patient.nhisNumber || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span> {patient.mobilePhone || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>{patient._count.pdfs} PDF(s)</span>
                  </div>
                </div>
              </div>

              {patient.visits[0] && (
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Last visit: {new Date(patient.visits[0].visitDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
```

### Feature 2: Patient Detail with PDF Viewer

**File**: `app/(dashboard)/patients/[patientNo]/page.tsx`

```typescript
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { PatientHeader } from '@/components/patients/patient-header'
import { PatientStats } from '@/components/patients/patient-stats'
import { PatientPdfViewer } from '@/components/patients/patient-pdf-viewer'
import { VisitTimeline } from '@/components/patients/visit-timeline'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function PatientDetailPage({
  params
}: {
  params: { patientNo: string }
}) {
  const patient = await db.patient.findUnique({
    where: { patientNo: params.patientNo },
    include: {
      visits: {
        orderBy: { visitDate: 'desc' },
        take: 50
      },
      diagnoses: {
        orderBy: { visitDate: 'desc' },
        take: 20
      },
      medications: {
        orderBy: { visitDate: 'desc' },
        take: 20
      },
      pdfs: true,
      _count: {
        select: {
          visits: true,
          diagnoses: true,
          medications: true,
          labOrders: true
        }
      }
    }
  })

  if (!patient) notFound()

  return (
    <div className="container mx-auto py-8">
      <PatientHeader patient={patient} />

      <PatientStats
        visitsCount={patient._count.visits}
        diagnosesCount={patient._count.diagnoses}
        medicationsCount={patient._count.medications}
        labOrdersCount={patient._count.labOrders}
      />

      <Tabs defaultValue="pdfs" className="mt-8">
        <TabsList>
          <TabsTrigger value="pdfs">Medical Records (PDFs)</TabsTrigger>
          <TabsTrigger value="visits">Visit History</TabsTrigger>
          <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
        </TabsList>

        <TabsContent value="pdfs">
          <PatientPdfViewer pdfs={patient.pdfs} patientNo={patient.patientNo} />
        </TabsContent>

        <TabsContent value="visits">
          <VisitTimeline visits={patient.visits} />
        </TabsContent>

        <TabsContent value="diagnoses">
          {/* Diagnoses table */}
        </TabsContent>

        <TabsContent value="medications">
          {/* Medications table */}
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**File**: `components/patients/patient-pdf-viewer.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, ExternalLink } from 'lucide-react'

export function PatientPdfViewer({
  pdfs,
  patientNo
}: {
  pdfs: any[]
  patientNo: string
}) {
  const [selectedPdf, setSelectedPdf] = useState(pdfs[0]?.filePath || null)

  if (pdfs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No PDF records available for this patient.</p>
      </Card>
    )
  }

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-6">
      {/* PDF List */}
      <div className="space-y-2">
        <h3 className="font-semibold mb-4">Available Records</h3>
        {pdfs.map((pdf) => (
          <Button
            key={pdf.id}
            variant={selectedPdf === pdf.filePath ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={() => setSelectedPdf(pdf.filePath)}
          >
            <FileText className="h-4 w-4 mr-2" />
            {pdf.pdfType} Record
            <span className="ml-auto text-xs">
              {(pdf.fileSize / 1024 / 1024).toFixed(1)} MB
            </span>
          </Button>
        ))}
      </div>

      {/* PDF Viewer */}
      <Card className="p-4">
        {selectedPdf ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Medical Record Viewer</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/data/${selectedPdf}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = `/data/${selectedPdf}`
                    link.download = selectedPdf.split('/').pop() || 'record.pdf'
                    link.click()
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden bg-gray-50">
              <iframe
                src={`/data/${selectedPdf}`}
                className="w-full h-[800px]"
                title="Patient PDF Record"
              />
            </div>
          </div>
        ) : (
          <div className="h-[800px] flex items-center justify-center text-muted-foreground">
            Select a PDF to view
          </div>
        )}
      </Card>
    </div>
  )
}
```

### Feature 3: Dashboard

**File**: `app/(dashboard)/dashboard/page.tsx`

```typescript
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, Activity, Calendar } from 'lucide-react'

export default async function DashboardPage() {
  const stats = await db.$transaction([
    db.patient.count(),
    db.visit.count(),
    db.patientPdf.count(),
    db.visit.findMany({
      where: {
        visitDate: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30))
        }
      },
      select: { visitDate: true }
    })
  ])

  const [totalPatients, totalVisits, totalPdfs, recentVisits] = stats

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Hospital Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPatients.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVisits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All time visits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">PDF Records</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPdfs.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Medical records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Visits</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentVisits.length.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

---

## Phase 5: Deployment (Day 11-14)

### Production Checklist

- [ ] Environment variables configured
- [ ] PostgreSQL database backed up
- [ ] PDFs accessible via static file serving
- [ ] User accounts created (doctors, nurses, admin)
- [ ] Performance tested with full dataset
- [ ] User training documentation written

### Next.js Static File Serving

**Update `next.config.js`:**

```javascript
module.exports = {
  async rewrites() {
    return [
      {
        source: '/data/patient-pdfs/:path*',
        destination: '/api/pdfs/:path*' // Protect PDFs with auth
      }
    ]
  }
}
```

**Create PDF API**: `app/api/pdfs/[...path]/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { getServerSession } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Verify authentication
  const session = await getServerSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const filePath = join(process.cwd(), 'data', 'patient-pdfs', ...params.path)
    const file = await readFile(filePath)

    return new Response(file, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${params.path.join('/')}"`,
      },
    })
  } catch (error) {
    return new Response('PDF not found', { status: 404 })
  }
}
```

---

## Summary

**What You Get:**

✅ **Week 1-2**: Full patient search system with PDF viewing
✅ **Authentication**: Already built-in from your starter
✅ **Database**: PostgreSQL with 70K patients migrated
✅ **Performance**: Fast Next.js app with optimized queries
✅ **Security**: Role-based access, protected PDF routes
✅ **Scalability**: Can add OPD, IPD, Pharmacy modules later

**Next Steps After MVP:**

1. Add patient registration forms
2. Build OPD consultation module
3. Add IPD admission/discharge
4. Implement pharmacy dispensing
5. Add laboratory results entry
6. Build reporting module

**This gives you a production-ready hospital system in 2 weeks, using your existing infrastructure!**
