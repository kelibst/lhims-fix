# LHIMS Data Extraction Project

**Volta Regional Hospital Hohoe - Contingency Data Extraction**

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Connect to hospital network (10.10.0.59)

# 3. Capture network traffic while downloading a report
npm run capture

# 4. Analyze the captured traffic to find API endpoints
npm run analyze

# 5. Run automated extraction (after creating the script)
node scripts/extract-opd-morbidity.js
```

## Project Status

- ✅ Project setup complete
- ✅ Network capture script ready
- ✅ Analysis script ready
- ⏳ Awaiting first HAR capture
- ⏳ Endpoint discovery pending
- ⏳ Automation script pending

## Current Priority

**Extract OPD Morbidity Reports** - Monthly data for all departments, historical from 2023-present

## Documentation

- **[USAGE.md](USAGE.md)** - Detailed step-by-step instructions
- **[@CLAUDE.md](@CLAUDE.md)** - Project memory and technical documentation

## Files

- `scripts/playwright-har-capture.js` - Captures browser network traffic
- `scripts/analyze-requests.js` - Analyzes HAR files to find API endpoints
- `scripts/extract-opd-morbidity.js` - (To be created) Automated extraction

## LHIMS Access

- **URL**: http://10.10.0.59/lhims_182
- **Network**: Hospital local network only
- **Status**: Currently accessible (risk of lockout)

## Security

⚠️ **Do NOT share or commit:**
- HAR files (contain session cookies)
- Downloaded Excel files (patient data)
- Database files (patient data)
- Credentials

All sensitive data is automatically excluded via `.gitignore`

## Next Steps

1. Run network capture to get first HAR file
2. Analyze HAR to discover OPD report endpoint
3. Create automation script based on discovered endpoint
4. Extract historical OPD data
5. Apply same technique to other report types

---

**Hospital**: Volta Regional Hospital, Hohoe, Ghana
**System**: LHIMS (Lightwave Health Information Management System)
**Started**: November 7, 2025
