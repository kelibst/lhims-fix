/**
 * Interactive LHIMS Documentation Helper
 *
 * This script provides an interactive browser session with helper functions
 * to document LHIMS pages as you navigate through them.
 *
 * Usage: node scripts/lhims-interactive-documenter.js
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// Configuration
const CONFIG = {
    baseUrl: process.env.LHIMS_URL || 'http://10.10.0.59/lhims_182',
    username: process.env.LHIMS_USERNAME || '',
    password: process.env.LHIMS_PASSWORD || '',
    outputDir: path.join(__dirname, '..', 'plan', 'lhims-documentation'),
    screenshotDir: path.join(__dirname, '..', 'plan', 'lhims-documentation', 'screenshots'),
};

// Track documented pages
const documentedPages = new Set();
const pageHierarchy = {};
let currentModule = 'unknown';

// Create readline interface for interactive commands
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Helper to prompt user
const prompt = (question) => new Promise(resolve => rl.question(question, resolve));

// Ensure directory exists
async function ensureDir(dirPath) {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

// Extract page information
async function extractPageInfo(page) {
    return await page.evaluate(() => {
        // Get page title
        const title = document.title || 'Untitled Page';

        // Get all headings
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
            level: h.tagName,
            text: h.textContent.trim()
        }));

        // Get all forms and their fields
        const forms = Array.from(document.querySelectorAll('form')).map(form => {
            const fields = Array.from(form.querySelectorAll('input, select, textarea')).map(field => ({
                type: field.type || field.tagName.toLowerCase(),
                name: field.name,
                id: field.id,
                required: field.required,
                placeholder: field.placeholder,
                label: field.labels?.[0]?.textContent?.trim() ||
                       document.querySelector(`label[for="${field.id}"]`)?.textContent?.trim() || ''
            }));

            const buttons = Array.from(form.querySelectorAll('button, input[type="submit"], input[type="button"]')).map(btn => ({
                text: btn.textContent?.trim() || btn.value,
                type: btn.type,
                id: btn.id,
                className: btn.className
            }));

            return { fields, buttons, action: form.action, method: form.method };
        });

        // Get navigation links
        const navLinks = Array.from(document.querySelectorAll('nav a, .navigation a, .menu a, aside a')).map(link => ({
            text: link.textContent.trim(),
            href: link.href,
            isActive: link.classList.contains('active') || link.classList.contains('current')
        }));

        // Get data tables
        const tables = Array.from(document.querySelectorAll('table')).map(table => {
            const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
            const rowCount = table.querySelectorAll('tbody tr').length;
            return { headers, rowCount };
        });

        // Get buttons outside forms
        const standaloneButtons = Array.from(document.querySelectorAll('button, .btn, a.button')).filter(btn => !btn.closest('form')).map(btn => ({
            text: btn.textContent?.trim(),
            href: btn.href || '',
            onclick: btn.onclick?.toString() || '',
            className: btn.className
        }));

        return {
            title,
            url: window.location.href,
            headings,
            forms,
            navLinks,
            tables,
            standaloneButtons
        };
    });
}

// Extract color scheme
async function extractColors(page) {
    return await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const colors = {
            text: new Set(),
            background: new Set(),
            border: new Set(),
            primary: null,
            secondary: null
        };

        elements.forEach(el => {
            const styles = window.getComputedStyle(el);

            if (styles.color && styles.color !== 'rgba(0, 0, 0, 0)') {
                colors.text.add(styles.color);
            }
            if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                colors.background.add(styles.backgroundColor);
            }
            if (styles.borderColor && styles.borderColor !== 'rgba(0, 0, 0, 0)') {
                colors.border.add(styles.borderColor);
            }
        });

        // Try to identify primary button color
        const primaryBtn = document.querySelector('.btn-primary, button[type="submit"], .button-primary');
        if (primaryBtn) {
            colors.primary = window.getComputedStyle(primaryBtn).backgroundColor;
        }

        return {
            textColors: Array.from(colors.text).slice(0, 5),
            backgroundColors: Array.from(colors.background).slice(0, 5),
            borderColors: Array.from(colors.border).slice(0, 5),
            primary: colors.primary
        };
    });
}

// Generate markdown documentation
function generateMarkdown(pageInfo, colors, moduleName) {
    const timestamp = new Date().toISOString();

    let markdown = `# ${pageInfo.title}\n\n`;
    markdown += `## Page Information\n`;
    markdown += `- **URL**: ${pageInfo.url}\n`;
    markdown += `- **Module**: ${moduleName}\n`;
    markdown += `- **Documented**: ${timestamp}\n\n`;

    // Headings
    if (pageInfo.headings.length > 0) {
        markdown += `## Page Structure\n`;
        markdown += `### Headings\n`;
        pageInfo.headings.forEach(h => {
            markdown += `- **${h.level}**: ${h.text}\n`;
        });
        markdown += '\n';
    }

    // Navigation
    if (pageInfo.navLinks.length > 0) {
        markdown += `## Navigation Links\n`;
        pageInfo.navLinks.forEach(link => {
            markdown += `- [${link.text}](${link.href})${link.isActive ? ' *(active)*' : ''}\n`;
        });
        markdown += '\n';
    }

    // Forms
    if (pageInfo.forms.length > 0) {
        markdown += `## Forms\n`;
        pageInfo.forms.forEach((form, idx) => {
            markdown += `### Form ${idx + 1}\n`;
            markdown += `- **Action**: ${form.action || 'Not specified'}\n`;
            markdown += `- **Method**: ${form.method || 'GET'}\n\n`;

            if (form.fields.length > 0) {
                markdown += `#### Fields\n`;
                markdown += `| Field | Type | Name/ID | Required | Label |\n`;
                markdown += `|-------|------|---------|----------|-------|\n`;
                form.fields.forEach(field => {
                    markdown += `| ${field.label || field.name || field.id || 'Unnamed'} | ${field.type} | ${field.name || field.id || '-'} | ${field.required ? 'Yes' : 'No'} | ${field.label || '-'} |\n`;
                });
                markdown += '\n';
            }

            if (form.buttons.length > 0) {
                markdown += `#### Form Buttons\n`;
                form.buttons.forEach(btn => {
                    markdown += `- **${btn.text || 'Unnamed'}** (${btn.type})\n`;
                });
                markdown += '\n';
            }
        });
    }

    // Tables
    if (pageInfo.tables.length > 0) {
        markdown += `## Data Tables\n`;
        pageInfo.tables.forEach((table, idx) => {
            markdown += `### Table ${idx + 1}\n`;
            markdown += `- **Columns**: ${table.headers.join(', ') || 'No headers'}\n`;
            markdown += `- **Row Count**: ${table.rowCount}\n\n`;
        });
    }

    // Standalone Buttons
    if (pageInfo.standaloneButtons.length > 0) {
        markdown += `## Action Buttons\n`;
        pageInfo.standaloneButtons.forEach(btn => {
            markdown += `- **${btn.text}**${btn.href ? ` → [${btn.href}]` : ''}\n`;
        });
        markdown += '\n';
    }

    // Colors
    if (colors) {
        markdown += `## Color Scheme\n`;
        markdown += `### Text Colors\n`;
        colors.textColors.forEach(c => markdown += `- ${c}\n`);
        markdown += `\n### Background Colors\n`;
        colors.backgroundColors.forEach(c => markdown += `- ${c}\n`);
        if (colors.primary) {
            markdown += `\n### Primary Color\n- ${colors.primary}\n`;
        }
        markdown += '\n';
    }

    return markdown;
}

// Document current page
async function documentCurrentPage(page, moduleName) {
    console.log('📸 Documenting current page...');

    const pageInfo = await extractPageInfo(page);
    const colors = await extractColors(page);

    // Generate filename from title
    const safeTitle = pageInfo.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const fileName = `${moduleName}-${safeTitle}`;

    // Take screenshot
    const screenshotPath = path.join(CONFIG.screenshotDir, `${fileName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  ✓ Screenshot saved: ${fileName}.png`);

    // Generate documentation
    const markdown = generateMarkdown(pageInfo, colors, moduleName);
    const docPath = path.join(CONFIG.outputDir, moduleName, `${safeTitle}.md`);
    await ensureDir(path.dirname(docPath));
    await fs.writeFile(docPath, markdown);
    console.log(`  ✓ Documentation saved: ${moduleName}/${safeTitle}.md`);

    // Track documented page
    documentedPages.add(pageInfo.url);

    return { fileName, pageInfo };
}

// Show available commands
function showCommands() {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                  LHIMS Documentation Helper                  ║
╠════════════════════════════════════════════════════════════╣
║ Commands:                                                    ║
║   doc [module]  - Document current page (e.g., doc opd)     ║
║   module [name] - Set current module (e.g., module pharmacy)║
║   list          - List all documented pages                 ║
║   colors        - Extract color scheme from current page    ║
║   forms         - List all forms on current page           ║
║   links         - List all navigation links                ║
║   screenshot    - Take screenshot only                     ║
║   help          - Show this help message                   ║
║   exit          - Exit the documentation session           ║
╚════════════════════════════════════════════════════════════╝
    `);
}

// Main interactive session
async function main() {
    console.log('🚀 Starting LHIMS Interactive Documentation Helper');
    console.log('================================================');

    // Create output directories
    await ensureDir(CONFIG.outputDir);
    await ensureDir(CONFIG.screenshotDir);

    // Launch browser
    const browser = await chromium.launch({
        headless: false,
        slowMo: 100
    });

    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 }
    });

    const page = await context.newPage();

    // Navigate to LHIMS
    console.log(`\n📍 Navigating to: ${CONFIG.baseUrl}`);
    await page.goto(CONFIG.baseUrl);

    // Show available commands
    showCommands();

    // Interactive command loop
    let running = true;
    while (running) {
        const command = await prompt('\n> Enter command (or "help" for commands): ');
        const [cmd, ...args] = command.trim().split(' ');

        try {
            switch(cmd.toLowerCase()) {
                case 'doc':
                    const docModule = args[0] || currentModule;
                    await documentCurrentPage(page, docModule);
                    break;

                case 'module':
                    if (args[0]) {
                        currentModule = args[0];
                        console.log(`✓ Current module set to: ${currentModule}`);
                    } else {
                        console.log(`Current module: ${currentModule}`);
                    }
                    break;

                case 'list':
                    console.log('\n📋 Documented Pages:');
                    documentedPages.forEach(url => console.log(`  - ${url}`));
                    console.log(`\nTotal: ${documentedPages.size} pages`);
                    break;

                case 'colors':
                    const colors = await extractColors(page);
                    console.log('\n🎨 Color Scheme:');
                    console.log('Text Colors:', colors.textColors);
                    console.log('Background Colors:', colors.backgroundColors);
                    console.log('Primary Color:', colors.primary);
                    break;

                case 'forms':
                    const pageInfo = await extractPageInfo(page);
                    console.log(`\n📝 Forms on page: ${pageInfo.forms.length}`);
                    pageInfo.forms.forEach((form, idx) => {
                        console.log(`\nForm ${idx + 1}:`);
                        console.log(`  Fields: ${form.fields.length}`);
                        console.log(`  Buttons: ${form.buttons.length}`);
                        form.fields.forEach(f => console.log(`    - ${f.label || f.name}: ${f.type}`));
                    });
                    break;

                case 'links':
                    const linkInfo = await extractPageInfo(page);
                    console.log('\n🔗 Navigation Links:');
                    linkInfo.navLinks.forEach(link => {
                        console.log(`  - ${link.text}: ${link.href}`);
                    });
                    break;

                case 'screenshot':
                    const title = await page.title();
                    const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
                    const screenshotPath = path.join(CONFIG.screenshotDir, `${currentModule}-${safeTitle}.png`);
                    await page.screenshot({ path: screenshotPath, fullPage: true });
                    console.log(`✓ Screenshot saved: ${currentModule}-${safeTitle}.png`);
                    break;

                case 'help':
                    showCommands();
                    break;

                case 'exit':
                case 'quit':
                    running = false;
                    break;

                default:
                    console.log('❌ Unknown command. Type "help" for available commands.');
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }

    // Generate summary report
    const summaryPath = path.join(CONFIG.outputDir, 'documentation-summary.md');
    const summary = `# LHIMS Documentation Summary

**Generated**: ${new Date().toISOString()}
**Total Pages Documented**: ${documentedPages.size}

## Documented URLs
${Array.from(documentedPages).map(url => `- ${url}`).join('\n')}

## Next Steps
1. Review generated documentation in \`plan/lhims-documentation/\`
2. Update the navigation map in \`00-INDEX.md\`
3. Run UI analysis script on captured pages
`;

    await fs.writeFile(summaryPath, summary);
    console.log(`\n✓ Summary saved to: documentation-summary.md`);
    console.log(`\n📊 Session Complete!`);
    console.log(`   Documented ${documentedPages.size} pages`);
    console.log(`   Output directory: ${CONFIG.outputDir}`);

    // Close browser
    await browser.close();
    rl.close();
}

// Run the interactive documenter
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { extractPageInfo, extractColors, generateMarkdown };