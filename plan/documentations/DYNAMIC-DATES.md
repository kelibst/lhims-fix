# Dynamic Date Range Feature

## ✅ Smart Date Calculation Implemented!

The extraction scripts now **automatically calculate** which months to extract based on today's date. No more manual updates needed!

---

## 🎯 How It Works

### **Automatic Date Range Generation**

Instead of hardcoding months, the script now:

1. **Checks today's date** (November 7, 2025)
2. **Calculates the last complete month** (October 2025)
3. **Generates date ranges** from start year to last complete month
4. **Prevents future month errors** automatically

### **Example Output**

```bash
npm run extract:opd

Generating date ranges from 1/2023 to 10/2025...
✓ Generated 34 date ranges

======================================================================
LHIMS OPD REGISTER DATA EXTRACTION
======================================================================

Configuration:
  LHIMS URL: http://10.10.0.59/lhims_182
  Username: sno-411
  Date Ranges: 34 periods  ← Automatically calculated!
  Output Directory: data/opd-register
```

---

## 📅 Configuration Options

### **In Both Scripts:**

```javascript
CONFIG = {
  // ... other settings ...

  // Date range configuration
  startYear: 2023,        // Start extracting from this year
  startMonth: 1,          // Start from this month (1 = January)

  // Auto-generate date ranges up to PREVIOUS month (current month may be incomplete)
  endAt: 'previous',      // 'previous' = last month, 'current' = this month
}
```

### **Configuration Values:**

| Setting | Default | Description |
|---------|---------|-------------|
| `startYear` | `2023` | Year to start extraction from |
| `startMonth` | `1` | Month to start extraction from (1-12) |
| `endAt` | `'previous'` | Stop at 'previous' or 'current' month |

---

## 🔧 How to Customize

### **Example 1: Extract from Different Start Date**

To start from June 2024 instead:

```javascript
startYear: 2024,
startMonth: 6,  // June
```

### **Example 2: Include Current Month**

If you want to include the current incomplete month:

```javascript
endAt: 'current',  // Include November 2025
```

⚠️ **Warning**: Current month data may be incomplete!

### **Example 3: Extract Specific Year Range**

To extract only 2024 data:

```javascript
startYear: 2024,
startMonth: 1,
// And run in December 2024 or later
```

---

## 📊 Examples by Date

### **If Today is November 7, 2025:**

**With `endAt: 'previous'` (default):**
- Extracts: January 2023 → October 2025
- Total: 34 months
- Skips: November 2025 (incomplete)

**With `endAt: 'current'`:**
- Extracts: January 2023 → November 2025
- Total: 35 months
- Includes: November 2025 (may be incomplete)

### **If Today is December 15, 2025:**

**With `endAt: 'previous'`:**
- Extracts: January 2023 → November 2025
- Total: 35 months
- Skips: December 2025 (incomplete)

**With `endAt: 'current'`:**
- Extracts: January 2023 → December 2025
- Total: 36 months
- Includes: December 2025 (may be incomplete)

---

## 🎉 Benefits

### **Before (Hardcoded Dates)**

❌ Had to manually update script each month
❌ Could try to download future months (errors)
❌ Easy to forget to add new months
❌ Script needed maintenance

### **After (Dynamic Dates)**

✅ Automatically calculates up to last complete month
✅ Never tries future months (no errors!)
✅ Works forever without updates
✅ Zero maintenance required

---

## 🔍 Technical Details

### **Date Calculation Logic**

```javascript
// Today: November 7, 2025
const currentMonth = 11;  // November
const currentYear = 2025;

if (endAt === 'previous') {
  endMonth = currentMonth - 1;  // 10 (October)
  endYear = 2025;
}

// Result: Extract until October 2025
```

### **Leap Year Handling**

The script automatically handles leap years:

```javascript
// February 2024 (leap year)
getDaysInMonth(2024, 2) = 29 days
toDate = '29-02-2024'

// February 2023 (not leap year)
getDaysInMonth(2023, 2) = 28 days
toDate = '28-02-2023'
```

### **Month Boundary Handling**

When current month is January:

```javascript
// Today: January 15, 2026
currentMonth = 1;
currentYear = 2026;

if (endAt === 'previous') {
  endMonth = 0;  // Would be 0
  // Fix: Roll back to December of previous year
  endMonth = 12;
  endYear = 2025;
}

// Result: Extract until December 2025
```

---

## 💡 Real-World Scenarios

### **Scenario 1: First Time Running (November 2025)**

```bash
npm run extract:opd

# Automatically generates:
# Jan 2023 - Oct 2025 (34 months)
# Skips Nov 2025 (incomplete)

✓ Downloaded: 34
⊙ Skipped: 0
✗ Errors: 0
```

### **Scenario 2: Running Again in December 2025**

```bash
npm run extract:opd

# Automatically generates:
# Jan 2023 - Nov 2025 (35 months)
# Skips Dec 2025 (incomplete)

✓ Downloaded: 1   ← Only November (new)
⊙ Skipped: 34     ← Jan 2023 - Oct 2025 (already have)
✗ Errors: 0
```

### **Scenario 3: Running in January 2026**

```bash
npm run extract:opd

# Automatically generates:
# Jan 2023 - Dec 2025 (36 months)
# Skips Jan 2026 (incomplete)

✓ Downloaded: 1   ← Only December 2025 (new)
⊙ Skipped: 35     ← All previous months
✗ Errors: 0
```

---

## 🔄 Future-Proof

### **No More Manual Updates!**

The script will continue to work correctly:

- ✅ **2026**: Automatically extracts until 2025 data
- ✅ **2027**: Automatically extracts until 2026 data
- ✅ **2030**: Automatically extracts until 2029 data
- ✅ **Forever**: Just keeps working!

### **Self-Adjusting**

Every time you run the script, it:

1. Checks today's date
2. Calculates appropriate date range
3. Generates month list
4. Extracts only what's needed

---

## 🎯 Summary

**What Changed:**
- ✅ Date ranges are now calculated dynamically
- ✅ Based on actual current date
- ✅ Automatically stops at last complete month
- ✅ Never tries to download future data
- ✅ Works forever without updates

**Configuration:**
```javascript
startYear: 2023,         // Start from here
startMonth: 1,           // January
endAt: 'previous',       // Stop at last complete month
```

**Default Behavior (November 7, 2025):**
- Extracts: January 2023 → October 2025
- Total: 34 months
- Zero errors from future months!

---

**The scripts are now fully automated and future-proof!** 🚀
