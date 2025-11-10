# Credentials Setup

## Security Notice

⚠️ **IMPORTANT**: Never commit your LHIMS credentials to git!

## Current Setup

The extraction scripts (`extract-opd-data.js` and `extract-ipd-data.js`) currently have credentials hardcoded in them for quick setup.

**Before committing to git, these credentials have been removed from the repository version.**

## How to Use Your Credentials

### Option 1: Edit the Scripts Locally (Current Method)

1. Open `scripts/extract-opd-data.js`
2. Find the `credentials` section:
   ```javascript
   credentials: {
     username: 'YOUR_USERNAME',
     password: 'YOUR_PASSWORD',
   },
   ```
3. Replace `YOUR_USERNAME` and `YOUR_PASSWORD` with your actual LHIMS credentials
4. **DO NOT commit these changes to git**

### Option 2: Use Environment Variables (Recommended for Future)

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```
   LHIMS_USERNAME=your-actual-username
   LHIMS_PASSWORD=your-actual-password
   ```

3. The `.env` file is already in `.gitignore` and will never be committed

## Files That Contain Sensitive Data (Already in .gitignore)

- ✅ `data/captures/*.json` - Network captures with session cookies
- ✅ `data/opd-register/*.xlsx` - Downloaded patient data
- ✅ `data/ipd-morbidity-mortality/*.xlsx` - Downloaded patient data
- ✅ `analysis/*.json` - May contain API endpoints and request details
- ✅ `.env` - Your credentials file

## Safe to Commit

- ✅ Script templates with placeholder credentials
- ✅ Documentation files
- ✅ `.gitignore` configuration
- ✅ `package.json`
- ✅ Empty data directories

---

**Remember**: Your local working copies of the scripts will have your real credentials. Git will ignore them, so you can keep working without worrying about accidentally committing sensitive data.
