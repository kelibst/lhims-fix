# [Page Name] Documentation

## Overview
- **Module**: [e.g., OPD, IPD, Pharmacy]
- **URL Path**: `/lhims_182/modules/[path]`
- **Access Level**: [Doctor, Nurse, Pharmacist, Admin, etc.]
- **Primary Function**: [Brief description of what this page does]
- **Documentation Date**: [Date captured]
- **LHIMS Version**: 182

## Screenshots

### Full Page View
![Full Page](./screenshots/[module]-[page]-full.png)
*Caption: Complete page layout showing all sections*

### Key Sections
![Header Section](./screenshots/[module]-[page]-header.png)
*Caption: Page header with patient information*

![Main Form](./screenshots/[module]-[page]-form.png)
*Caption: Primary data entry form*

![Action Buttons](./screenshots/[module]-[page]-actions.png)
*Caption: Available actions and navigation*

## UI Components

### Page Layout
- **Header**:
  - Logo and system title
  - User info and logout
  - Navigation breadcrumb

- **Sidebar**:
  - Main navigation menu
  - Quick links
  - Module shortcuts

- **Main Content Area**:
  - Page title
  - Form sections
  - Data tables
  - Action buttons

### Form Sections

#### Section 1: [Section Name]
| Field Name | Type | Required | Validation | Default | Notes |
|------------|------|----------|------------|---------|-------|
| Field 1 | Text | Yes | Alphanumeric | - | Max 50 chars |
| Field 2 | Dropdown | Yes | From list | - | Populated from API |
| Field 3 | Date | No | Past dates only | Today | Format: DD/MM/YYYY |
| Field 4 | Number | Yes | Range: 0-200 | - | Integer only |
| Field 5 | Textarea | No | Max 500 chars | - | Supports line breaks |

#### Section 2: [Section Name]
| Field Name | Type | Required | Validation | Default | Notes |
|------------|------|----------|------------|---------|-------|
| Field 1 | Checkbox | No | - | Unchecked | Multiple selection |
| Field 2 | Radio | Yes | One required | - | Options: A, B, C |
| Field 3 | File Upload | No | PDF, JPG only | - | Max 5MB |

### Data Tables (if applicable)
- **Columns**:
  - Column 1 (sortable)
  - Column 2 (filterable)
  - Column 3
  - Actions (Edit, Delete, View)

- **Features**:
  - Pagination (10, 25, 50, 100 rows)
  - Search box
  - Export to Excel
  - Print view

### Action Buttons
- **Primary Actions**:
  - Save (Green) - Saves and stays on page
  - Save & Close (Blue) - Saves and returns to list
  - Cancel (Gray) - Discards changes

- **Secondary Actions**:
  - Print (Icon)
  - Export (Icon)
  - Help (Icon)

## API Endpoints Used

### On Page Load
```http
GET /api/[module]/[entity]?id={id}
Authorization: Bearer {token}
Response: 200 OK
{
  "status": "success",
  "data": {
    // Entity data
  }
}
```

### Form Submission
```http
POST /api/[module]/[entity]/save
Content-Type: application/json
Authorization: Bearer {token}

Request Body:
{
  "field1": "value1",
  "field2": "value2"
}

Response: 200 OK
{
  "status": "success",
  "id": "generated-id",
  "message": "Record saved successfully"
}
```

### Dropdown Population
```http
GET /api/[module]/lookup/[field]
Authorization: Bearer {token}
Response: 200 OK
{
  "options": [
    {"id": 1, "value": "Option 1"},
    {"id": 2, "value": "Option 2"}
  ]
}
```

### Data Table Loading
```http
GET /api/[module]/[entity]/list?page=1&limit=10&search=
Authorization: Bearer {token}
Response: 200 OK
{
  "data": [...],
  "total": 100,
  "page": 1,
  "pages": 10
}
```

## Navigation Flow

### How to Reach This Page
1. **From Dashboard**: Dashboard → [Module] Menu → [Page Name]
2. **From Patient Profile**: Patient Profile → Actions → [Action Name]
3. **From Related Page**: [Previous Page] → [Button/Link] → This Page
4. **Direct URL**: Bookmarkable at `/lhims_182/modules/[path]`

### Where This Page Leads
- **On Success**:
  - Redirects to [Next Page]
  - Shows success message
  - Updates related records

- **On Cancel**:
  - Returns to [Previous Page]
  - No changes saved

- **Related Actions**:
  - Can trigger [Related Process]
  - May open [Modal/Popup]
  - Links to [Related Module]

## Business Rules & Logic

### Validation Rules
1. **Rule 1**: Field X must be greater than Field Y
2. **Rule 2**: If Field A = "Value", then Field B is required
3. **Rule 3**: Date cannot be in the future
4. **Rule 4**: At least one diagnosis must be selected

### Business Logic
1. **Auto-calculations**:
   - BMI calculated from height and weight
   - Age calculated from date of birth

2. **Conditional Display**:
   - Section X only shows if condition met
   - Field Y disabled based on Field X value

3. **Dependencies**:
   - Selecting Option A loads different form
   - Changing Department updates available services

### Access Control
- **View Access**: [Roles that can view]
- **Edit Access**: [Roles that can edit]
- **Delete Access**: [Roles that can delete]
- **Special Permissions**: [Any special access rules]

## Data Fields Specification

### Database Table: `[table_name]`

| Database Field | UI Field Label | Data Type | Constraints | Index | Notes |
|----------------|---------------|-----------|-------------|-------|-------|
| id | - | UUID | PRIMARY KEY | Yes | Auto-generated |
| patient_id | Patient | UUID | FOREIGN KEY | Yes | Links to patients table |
| created_date | Date Created | TIMESTAMP | NOT NULL | Yes | Auto-set on creation |
| created_by | Created By | UUID | FOREIGN KEY | No | Links to users table |
| field_name | Display Name | VARCHAR(100) | NOT NULL | No | User-visible label |

## JavaScript Behaviors

### Client-Side Validation
```javascript
// Example validation function found in page
function validateForm() {
  // Check required fields
  // Validate formats
  // Show error messages
}
```

### AJAX Calls
```javascript
// Auto-save functionality
setInterval(function() {
  autoSaveForm();
}, 120000); // Every 2 minutes
```

### Event Handlers
- **onChange**: Fields that trigger updates
- **onBlur**: Validation triggers
- **onClick**: Button actions
- **onSubmit**: Form submission handling

## Performance Considerations

### Load Time
- **Average Load Time**: X seconds
- **Slow Elements**:
  - Large dropdowns (1000+ items)
  - Patient history loading

### Optimization Opportunities
- Pagination for large datasets
- Lazy loading for images
- Caching frequently used lookups

## Known Issues & Quirks

### Issues
1. **Issue 1**: Page timeout after 30 minutes of inactivity
2. **Issue 2**: Print function doesn't include all sections
3. **Issue 3**: Large forms may lose data if session expires

### Workarounds
1. **Workaround 1**: Save frequently to prevent data loss
2. **Workaround 2**: Use export instead of print for complete data

### Tips
- Use Tab key to navigate between fields quickly
- Ctrl+S shortcut saves the form
- Double-click on patient name to view full profile

## Recommendations for New System

### Improvements to Implement
1. **Better Auto-save**: Save draft every 30 seconds
2. **Improved Validation**: Real-time validation with clear messages
3. **Enhanced UI**: Better spacing and modern design
4. **Performance**: Implement virtual scrolling for large lists
5. **Accessibility**: Add keyboard shortcuts and screen reader support

### Features to Preserve
1. **Workflow**: Keep the same logical flow
2. **Field Order**: Maintain familiar field arrangement
3. **Terminology**: Use same labels and terms
4. **Shortcuts**: Preserve useful keyboard shortcuts

### Features to Add
1. **Search Within Page**: Ctrl+F functionality
2. **Bulk Actions**: Select multiple records
3. **Undo/Redo**: For data entry mistakes
4. **Templates**: Save frequently used entries

## Related Documentation

- [Related Page 1](./related-page-1.md)
- [Related Page 2](./related-page-2.md)
- [Module Overview](./module-overview.md)
- [API Documentation](../api-endpoints/module-api.md)

## Notes

### Additional Observations
- [Any specific behaviors noticed]
- [User feedback about this page]
- [Common user errors on this page]
- [Frequently asked questions]

### Security Considerations
- Sensitive data fields that need encryption
- Audit log requirements
- Session timeout handling
- CSRF token implementation

### Mobile Responsiveness
- Current state: [Responsive/Not responsive]
- Issues on mobile devices
- Touch interaction problems

---

**Documentation Status**:
- [ ] Screenshots captured
- [ ] All fields documented
- [ ] API endpoints verified
- [ ] Business rules documented
- [ ] Navigation flow confirmed
- [ ] Performance metrics recorded

**Last Review Date**: [Date]
**Reviewed By**: [Name]