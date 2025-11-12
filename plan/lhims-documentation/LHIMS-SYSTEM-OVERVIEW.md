# LHIMS System Overview - Documentation Summary

## System Information
- **System Name**: LHIMS (Lightwave Health Information Management System)
- **Version**: 182
- **Vendor**: Lightwave Healthcare Solutions
- **Facility**: Volta Regional Hospital, Hohoe, Ghana
- **URL**: http://10.10.0.59/lhims_182
- **Documented By**: Kekeli Jiresse Dogbevi (Biostatistics Officer)
- **Documentation Date**: November 12, 2024

## System Architecture

### Technology Stack (Observed)
- **Frontend**: HTML, JavaScript, CSS
- **Backend**: PHP (.php extensions throughout)
- **Database**: Unknown (likely MySQL/MariaDB)
- **Session Management**: Cookie-based with timeout features
- **Network**: Local network only (10.10.0.59)

### User Interface Design
- **Color Scheme**:
  - Primary Blue: #2196F3 (headers)
  - Red: #FF0000 (module titles)
  - White: #FFFFFF (backgrounds)
  - Orange: #FFA500 (action buttons)
- **Layout**:
  - Sidebar navigation (left)
  - Main content area (center)
  - Patient search panel (right)
  - Grid-based module selection (dashboard)
- **Responsive**: Limited/None observed

## System Modules

### 1. Core Clinical Modules

#### Patient Management
- **Patient Search**: Multiple search criteria (name, number, NHIS, phone, DOB)
- **Patient Registration**: Add new patients
- **Patient Records**: Complete patient history and documents

#### Outpatient Department (OPD)
- Out-Patient Register
- Consulting Room Register
- Appointment Calendar
- OPD Queue Management

#### Inpatient Department (IPD)
- **Bed Management**: Wards, Rooms and Bed Status
- **Admission & Discharge**: Complete admission workflow
- **Ward Management**: General Ward, Maternity Ward
- **Current Patient Access**: Active inpatient management
- **Virtual Bed Admission**: Overflow management
- **IPD Registers**: Various IPD documentation

#### Laboratory/Investigations
- IPD Lab Tests
- Medical Laboratory Register
- Specimen Collection & Verification
- MIS Reports for Lab

#### Pharmacy
- Not fully explored yet
- Likely includes dispensing and stock management

### 2. Specialized Services

#### Maternal & Child Health
- **ANC (Antenatal Care)**: Complete ANC register
- **Maternity Ward**: Dedicated maternity management
- **Post Natal Care**: Separate registers for mother and child
- **Child Welfare Clinic**: Pediatric services
- **Family Planning**: Contraceptive services

#### Support Services
- **Mortuary Management**: Death records and mortuary services
- **Transfusion Medicine Unit**: Blood bank management
- **Confidential Modality**: Special confidential services

### 3. Administrative Modules

#### Reporting Systems
- **LHIMS Reports**: System-specific reports
- **DHIMS Reports**: District Health Information Management System (Ghana standard)
- **MIS (Management Information System)**: Statistical reports
- Multiple specialized registers (12+ types identified)

#### System Administration
- User Management
- Change Password
- System Settings
- Help, Support & Feedback

### 4. Communication & Workflow
- **Messaging System**: Internal messaging with unread indicators
- **Alerts Management**: System alerts and notifications
- **Task Management**: Task tracking system
- **Action Plans**: Clinical action plan management
- **Communication Groups**: Group messaging

## Available Registers (Reports)

### Clinical Registers
1. Out-Patient Register
2. Consulting Room Register
3. Admission & Discharge Register
4. In-Patient Morbidity & Mortality Register
5. General Ward Register
6. Maternity Ward Register
7. Medical Laboratory Register

### Maternal & Child Health Registers
8. ANC (Antenatal Care) Register
9. Family Planning Register
10. Post Natal Care Mother Register
11. Post Natal Care Child Register
12. Child Welfare Clinic Register

## Key Features

### Patient Identification
- **Patient Number**: Hospital-specific ID (e.g., VR-A01-AAA0001)
- **NHIS Number**: National Health Insurance number
- **MOH Number**: Ministry of Health identifier
- **Patient Tags**: Additional categorization

### Security Features
- Role-based access control (observed: Biostatistics Officer)
- Session timeout with visual countdown
- Logout timer functionality
- Audit trail capabilities (implied)

### Workflow Support
- Appointment scheduling
- Queue management
- Referral tracking
- Incident reporting (IPD)
- Theatre/surgical reporting

## Navigation Structure

### Primary Navigation Methods
1. **Dashboard Grid**: Visual tile-based navigation
2. **Quick Links Sidebar**: Text-based quick access
3. **Breadcrumb Navigation**: Context-aware navigation
4. **Direct URLs**: Each module has specific PHP endpoints

### User Roles Observed
- Biostatistics Officer (current user)
- Doctor (implied)
- Nurse (implied)
- Pharmacist (implied)
- Lab Technician (implied)
- Administrator (implied)

## Data Management

### Data Entry Points
- Patient registration
- Clinical consultations
- Lab test ordering and results
- Prescription management
- Admission and discharge
- Various specialized forms

### Reporting Capabilities
- Pre-built registers for all major services
- MIS reports for management
- DHIMS integration for national reporting
- Custom report generation (implied)

## System Integration

### External Systems
- **DHIMS**: Ghana's national health information system
- **NHIS**: National Health Insurance System

### Internal Integration
- Cross-module patient data sharing
- Unified patient identification
- Integrated messaging system
- Centralized reporting

## Technical Observations

### URLs Pattern
- Base: `/lhims_182/`
- Modules: `[module]Management.php`
- Reports: `dhims[ReportName]V1.php`
- Actions: `[action][Entity].php` (e.g., `searchPatient.php`)

### Session Management
- Cookie-based authentication
- Visible session timer
- Manual session refresh option
- Automatic logout on timeout

### Performance Considerations
- Page loads appear synchronous
- No obvious AJAX/async operations
- Traditional form submission model

## Identified Gaps/Limitations

### From Documentation
1. Limited mobile responsiveness
2. No visible API documentation
3. Complex navigation structure
4. Multiple reporting systems (LHIMS vs DHIMS)
5. Password change in unexpected location (Lab module)

### Potential Improvements
1. Modern responsive design
2. Unified reporting system
3. Better search functionality
4. Mobile application
5. Real-time updates
6. Dashboard analytics

## Screenshots Captured
1. Login Page - `lhims-login-page.png`
2. Main Dashboard - `lhims-dashboard.png`
3. Patient Search - `patient-search-page.png`
4. IPD Management - `ipd-management-page.png`
5. Lab Management - `lab-management-page.png`
6. LHIMS Reports Dashboard - `lhims-reports-dashboard.png`
7. LHIMS Registers - `lhims-registers-page.png`

## Next Steps for Replacement System

### Priority 1: Core Functions
- Patient registration and search
- OPD consultation workflow
- IPD admission/discharge
- Basic reporting

### Priority 2: Clinical Support
- Laboratory integration
- Pharmacy management
- Appointment scheduling
- Queue management

### Priority 3: Specialized Services
- Maternal and child health
- Mortuary management
- Blood bank
- Advanced reporting

### Priority 4: Enhancement
- Mobile responsiveness
- Real-time updates
- Advanced analytics
- API development

## Summary

LHIMS is a comprehensive hospital information system covering all major hospital departments and services. It follows a traditional web application architecture with PHP backend and form-based interactions. The system is well-structured with clear module separation and extensive reporting capabilities.

The replacement system should maintain the familiar workflow and comprehensive coverage while modernizing the technology stack, improving performance, and adding mobile capabilities. The existing 70,079 patient records and established workflows provide a solid foundation for the new system.

---

*This overview is based on initial exploration. Further documentation of specific workflows and detailed module functionality is recommended.*