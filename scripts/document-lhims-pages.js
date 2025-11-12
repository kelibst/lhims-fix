/**
 * LHIMS Automated Page Documentation Script
 *
 * This script systematically navigates through all LHIMS pages,
 * captures screenshots, documents form fields, and records API calls.
 *
 * Usage: node scripts/document-lhims-pages.js
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
    // LHIMS base URL
    baseUrl: process.env.LHIMS_URL || 'http://10.10.0.59/lhims_182',

    // Credentials
    username: process.env.LHIMS_USERNAME || '',
    password: process.env.LHIMS_PASSWORD || '',

    // Documentation output directory
    outputDir: path.join(__dirname, '..', 'plan', 'lhims-documentation'),
    screenshotDir: path.join(__dirname, '..', 'plan', 'lhims-documentation', 'screenshots'),

    // Browser settings
    headless: false,  // Set to false to watch the browser
    slowMo: 500,      // Slow down operations by 500ms for observation

    // Timeouts
    timeout: 30000,   // 30 seconds for page loads

    // Capture settings
    captureFullPage: true,
    captureNetworkRequests: true,
    captureFormFields: true
};

// Page catalog - Add all LHIMS pages to document
const PAGES_TO_DOCUMENT = [
    // Authentication
    {
        module: '01-authentication',
        pages: [
            { name: 'login-page', path: '/login', description: 'User login page' },
            { name: 'logout', path: '/logout', description: 'Logout endpoint' }
        ]
    },

    // Dashboard
    {
        module: '02-dashboard',
        pages: [
            { name: 'main-dashboard', path: '/dashboard', description: 'Main dashboard' },
            { name: 'opd-dashboard', path: '/dashboard/opd', description: 'OPD dashboard' }
        ]
    },

    // Patient Management
    {
        module: '03-patient-management',
        pages: [
            { name: 'patient-search', path: '/patients/search', description: 'Search for patients' },
            { name: 'patient-registration', path: '/patients/register', description: 'Register new patient' },
            { name: 'patient-profile', path: '/patients/profile', description: 'View patient profile' }
        ]
    },

    // OPD Module
    {
        module: '04-opd-module',
        pages: [
            { name: 'opd-queue', path: '/opd/queue', description: 'OPD patient queue' },
            { name: 'consultation', path: '/opd/consultation', description: 'OPD consultation form' },
            { name: 'vital-signs', path: '/opd/vitals', description: 'Capture vital signs' },
            { name: 'diagnosis', path: '/opd/diagnosis', description: 'Enter diagnosis' },
            { name: 'prescription', path: '/opd/prescription', description: 'Create prescription' }
        ]
    },

    // IPD Module
    {
        module: '05-ipd-module',
        pages: [
            { name: 'admission-form', path: '/ipd/admission', description: 'Patient admission' },
            { name: 'ward-management', path: '/ipd/wards', description: 'Ward overview' },
            { name: 'discharge', path: '/ipd/discharge', description: 'Patient discharge' }
        ]
    },

    // Pharmacy Module
    {
        module: '06-pharmacy-module',
        pages: [
            { name: 'dispensing', path: '/pharmacy/dispense', description: 'Drug dispensing' },
            { name: 'stock', path: '/pharmacy/stock', description: 'Stock management' }
        ]
    },

    // Laboratory Module
    {
        module: '07-laboratory-module',
        pages: [
            { name: 'test-order', path: '/lab/order', description: 'Order lab tests' },
            { name: 'results-entry', path: '/lab/results', description: 'Enter lab results' }
        ]
    },

    // Reports Module
    {
        module: '09-reports-module',
        pages: [
            { name: 'opd-morbidity', path: '/reports/opd-morbidity', description: 'OPD morbidity report' },
            { name: 'ipd-statistics', path: '/reports/ipd-stats', description: 'IPD statistics' }
        ]
    },

    // Administration
    {
        module: '10-administration',
        pages: [
            { name: 'user-management', path: '/admin/users', description: 'Manage users' },
            { name: 'system-settings', path: '/admin/settings', description: 'System configuration' }
        ]
    }
];

// Helper functions
async function ensureDirectoryExists(dirPath) {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

async function captureScreenshot(page, name) {
    const screenshotPath = path.join(CONFIG.screenshotDir, `${name}.png`);
    await page.screenshot({
        path: screenshotPath,
        fullPage: CONFIG.captureFullPage
    });
    console.log(`  ✓ Screenshot saved: ${name}.png`);
    return screenshotPath;
}

async function extractFormFields(page) {
    return await page.evaluate(() => {
        const fields = [];
        const inputs = document.querySelectorAll('input, select, textarea');

        inputs.forEach(input => {
            fields.push({
                type: input.type || input.tagName.toLowerCase(),
                name: input.name || input.id,
                id: input.id,
                required: input.required,
                placeholder: input.placeholder,
                value: input.value,
                options: input.tagName === 'SELECT'
                    ? Array.from(input.options).map(opt => ({ value: opt.value, text: opt.text }))
                    : null,
                className: input.className,
                disabled: input.disabled,
                readonly: input.readOnly,
                maxLength: input.maxLength,
                pattern: input.pattern
            });
        });

        return fields;
    });
}

async function extractPageStructure(page) {
    return await page.evaluate(() => {
        // Extract headings
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
            level: h.tagName,
            text: h.textContent.trim()
        }));

        // Extract buttons
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]')).map(btn => ({
            text: btn.textContent?.trim() || btn.value,
            type: btn.type,
            onclick: btn.onclick ? btn.onclick.toString() : null,
            className: btn.className,
            id: btn.id
        }));

        // Extract links
        const links = Array.from(document.querySelectorAll('a')).map(link => ({
            text: link.textContent.trim(),
            href: link.href,
            target: link.target
        }));

        // Extract tables
        const tables = Array.from(document.querySelectorAll('table')).map(table => {
            const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
            const rows = table.querySelectorAll('tbody tr').length;
            return { headers, rowCount: rows };
        });

        return { headings, buttons, links, tables };
    });
}

async function generatePageDocumentation(pageInfo, formFields, pageStructure, apiEndpoints) {
    const timestamp = new Date().toISOString();
    const documentation = `# ${pageInfo.name} Documentation

## Overview
- **Module**: ${pageInfo.module}
- **URL Path**: ${pageInfo.path}
- **Description**: ${pageInfo.description}
- **Documentation Date**: ${timestamp}
- **Auto-Generated**: Yes

## Screenshots
![Full Page](../../screenshots/${pageInfo.module}-${pageInfo.name}-full.png)

## Page Structure

### Headings
${pageStructure.headings.map(h => `- **${h.level}**: ${h.text}`).join('\n') || 'No headings found'}

### Navigation Links
${pageStructure.links.slice(0, 10).map(l => `- [${l.text}](${l.href})`).join('\n') || 'No links found'}

### Action Buttons
${pageStructure.buttons.map(b => `- **${b.text || b.id}** (${b.type})`).join('\n') || 'No buttons found'}

## Form Fields
${formFields.length > 0 ? `
| Field Name | Type | Required | ID | Notes |
|------------|------|----------|-----|-------|
${formFields.map(f => `| ${f.name || f.id || 'unnamed'} | ${f.type} | ${f.required ? 'Yes' : 'No'} | ${f.id || '-'} | ${f.placeholder || '-'} |`).join('\n')}
` : 'No form fields found on this page'}

## Data Tables
${pageStructure.tables.length > 0 ? pageStructure.tables.map((t, i) => `
### Table ${i + 1}
- **Columns**: ${t.headers.join(', ') || 'No headers'}
- **Row Count**: ${t.rowCount}
`).join('\n') : 'No tables found on this page'}

## API Endpoints Captured
${apiEndpoints.length > 0 ? `
| Method | URL | Status | Type |
|--------|-----|--------|------|
${apiEndpoints.map(e => `| ${e.method} | ${e.url} | ${e.status} | ${e.type} |`).join('\n')}
` : 'No API calls captured during page load'}

## Notes
- This documentation was auto-generated
- Manual review and enhancement recommended
- Update business rules and validation logic manually

---
*Auto-generated on ${timestamp}*
`;

    return documentation;
}

async function documentPage(browser, moduleInfo, pageInfo) {
    const page = await browser.newPage();
    const apiEndpoints = [];

    // Capture network requests if enabled
    if (CONFIG.captureNetworkRequests) {
        page.on('response', response => {
            const url = response.url();
            if (url.includes('/api/') || url.includes('.php')) {
                apiEndpoints.push({
                    url: url.replace(CONFIG.baseUrl, ''),
                    method: response.request().method(),
                    status: response.status(),
                    type: response.request().resourceType()
                });
            }
        });
    }

    try {
        console.log(`\n📄 Documenting: ${moduleInfo.module}/${pageInfo.name}`);

        // Navigate to page
        const fullUrl = CONFIG.baseUrl + pageInfo.path;
        console.log(`  → Navigating to: ${fullUrl}`);

        try {
            await page.goto(fullUrl, {
                waitUntil: 'networkidle',
                timeout: CONFIG.timeout
            });
        } catch (error) {
            console.log(`  ⚠ Page load timeout or error, continuing...`);
        }

        // Wait a bit for dynamic content
        await page.waitForTimeout(2000);

        // Capture screenshot
        const screenshotName = `${moduleInfo.module}-${pageInfo.name}-full`;
        await captureScreenshot(page, screenshotName);

        // Extract form fields
        const formFields = CONFIG.captureFormFields ? await extractFormFields(page) : [];
        console.log(`  ✓ Found ${formFields.length} form fields`);

        // Extract page structure
        const pageStructure = await extractPageStructure(page);
        console.log(`  ✓ Extracted page structure`);

        // Generate documentation
        const documentation = await generatePageDocumentation(
            { ...pageInfo, module: moduleInfo.module },
            formFields,
            pageStructure,
            apiEndpoints
        );

        // Save documentation
        const docPath = path.join(CONFIG.outputDir, moduleInfo.module, `${pageInfo.name}.md`);
        await ensureDirectoryExists(path.dirname(docPath));
        await fs.writeFile(docPath, documentation);
        console.log(`  ✓ Documentation saved: ${pageInfo.name}.md`);

        // Save API endpoints
        if (apiEndpoints.length > 0) {
            const apiPath = path.join(CONFIG.outputDir, 'api-endpoints', `${moduleInfo.module}-${pageInfo.name}.json`);
            await ensureDirectoryExists(path.dirname(apiPath));
            await fs.writeFile(apiPath, JSON.stringify(apiEndpoints, null, 2));
            console.log(`  ✓ API endpoints saved: ${apiEndpoints.length} endpoints`);
        }

    } catch (error) {
        console.error(`  ✗ Error documenting ${pageInfo.name}:`, error.message);
    } finally {
        await page.close();
    }
}

async function login(page) {
    console.log('🔐 Logging into LHIMS...');

    try {
        // Navigate to login page
        await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle' });

        // Look for login form
        const usernameField = await page.$('input[type="text"], input[name="username"], input[id="username"]');
        const passwordField = await page.$('input[type="password"], input[name="password"], input[id="password"]');

        if (usernameField && passwordField) {
            await usernameField.type(CONFIG.username);
            await passwordField.type(CONFIG.password);

            // Find and click login button
            const loginButton = await page.$('button[type="submit"], input[type="submit"], button:has-text("Login")');
            if (loginButton) {
                await loginButton.click();
                await page.waitForNavigation({ waitUntil: 'networkidle' });
                console.log('  ✓ Login successful');
                return true;
            }
        }

        console.log('  ⚠ Login form not found, continuing without authentication');
        return false;
    } catch (error) {
        console.error('  ✗ Login failed:', error.message);
        return false;
    }
}

async function main() {
    console.log('===========================================');
    console.log('    LHIMS Automated Documentation Tool     ');
    console.log('===========================================');
    console.log(`\n📁 Output Directory: ${CONFIG.outputDir}`);
    console.log(`🌐 LHIMS URL: ${CONFIG.baseUrl}`);

    // Check if credentials are provided
    if (!CONFIG.username || !CONFIG.password) {
        console.log('\n⚠️  WARNING: No credentials provided!');
        console.log('Set LHIMS_USERNAME and LHIMS_PASSWORD environment variables');
        console.log('Example: LHIMS_USERNAME=admin LHIMS_PASSWORD=pass123 node scripts/document-lhims-pages.js\n');
    }

    // Create output directories
    await ensureDirectoryExists(CONFIG.outputDir);
    await ensureDirectoryExists(CONFIG.screenshotDir);
    await ensureDirectoryExists(path.join(CONFIG.outputDir, 'api-endpoints'));

    // Launch browser
    console.log('\n🌐 Launching browser...');
    const browser = await chromium.launch({
        headless: CONFIG.headless,
        slowMo: CONFIG.slowMo
    });

    try {
        // Create initial page for login
        const loginPage = await browser.newPage();

        // Attempt login if credentials provided
        if (CONFIG.username && CONFIG.password) {
            const loginSuccess = await login(loginPage);
            if (!loginSuccess) {
                console.log('⚠️  Proceeding without authentication...');
            }
        }

        // Keep login page open for session

        // Document each page
        let totalPages = 0;
        let successCount = 0;

        for (const module of PAGES_TO_DOCUMENT) {
            console.log(`\n📂 Module: ${module.module}`);
            console.log('─'.repeat(40));

            for (const pageInfo of module.pages) {
                totalPages++;
                try {
                    await documentPage(browser, module, pageInfo);
                    successCount++;
                } catch (error) {
                    console.error(`  ✗ Failed to document ${pageInfo.name}:`, error.message);
                }

                // Small delay between pages
                await loginPage.waitForTimeout(1000);
            }
        }

        // Generate summary report
        const summaryReport = {
            timestamp: new Date().toISOString(),
            lhimsUrl: CONFIG.baseUrl,
            totalModules: PAGES_TO_DOCUMENT.length,
            totalPages: totalPages,
            successfullyDocumented: successCount,
            failedPages: totalPages - successCount,
            modules: PAGES_TO_DOCUMENT.map(m => ({
                name: m.module,
                pages: m.pages.length
            }))
        };

        const summaryPath = path.join(CONFIG.outputDir, 'documentation-summary.json');
        await fs.writeFile(summaryPath, JSON.stringify(summaryReport, null, 2));

        // Print summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 Documentation Summary');
        console.log('='.repeat(50));
        console.log(`✅ Successfully documented: ${successCount}/${totalPages} pages`);
        console.log(`📁 Output directory: ${CONFIG.outputDir}`);
        console.log(`📸 Screenshots saved: ${successCount}`);
        console.log(`📄 Documentation files created: ${successCount}`);

        if (totalPages - successCount > 0) {
            console.log(`\n⚠️  ${totalPages - successCount} pages could not be documented`);
            console.log('Please check the URLs and try again for failed pages');
        }

        await loginPage.close();

    } catch (error) {
        console.error('\n❌ Critical error:', error);
    } finally {
        await browser.close();
    }

    console.log('\n✨ Documentation process complete!');
    console.log('\nNext steps:');
    console.log('1. Review generated documentation in:', CONFIG.outputDir);
    console.log('2. Manually enhance with business rules and validation logic');
    console.log('3. Run analyze-lhims-ui.js to extract UI patterns');
    console.log('4. Update 00-INDEX.md with actual page paths discovered');
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { documentPage, extractFormFields, extractPageStructure };