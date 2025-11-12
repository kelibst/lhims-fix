/**
 * LHIMS UI Pattern Analysis Script
 *
 * This script analyzes captured LHIMS pages to extract:
 * - Color schemes and styling patterns
 * - Common UI components
 * - Form validation rules
 * - Layout patterns
 * - Interaction patterns
 *
 * Usage: node scripts/analyze-lhims-ui.js
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Optional sharp module for image analysis
let sharp;
try {
    sharp = require('sharp');
} catch (error) {
    // Sharp is optional, continue without it
    console.log('Note: sharp module not found. Image analysis will be skipped.');
}

// Configuration
const CONFIG = {
    baseUrl: process.env.LHIMS_URL || 'http://10.10.0.59/lhims_182',
    username: process.env.LHIMS_USERNAME || '',
    password: process.env.LHIMS_PASSWORD || '',

    outputDir: path.join(__dirname, '..', 'plan', 'lhims-documentation'),
    screenshotDir: path.join(__dirname, '..', 'plan', 'lhims-documentation', 'screenshots'),

    headless: false,
    slowMo: 100,
    timeout: 30000,

    // Sample pages to analyze for UI patterns
    samplePages: [
        '/dashboard',
        '/patients/search',
        '/opd/consultation',
        '/pharmacy/dispense',
        '/reports/opd-morbidity'
    ]
};

// UI Analysis Functions

async function extractColorScheme(page) {
    return await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const colors = new Set();
        const backgroundColors = new Set();
        const borderColors = new Set();

        elements.forEach(el => {
            const styles = window.getComputedStyle(el);

            if (styles.color) colors.add(styles.color);
            if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                backgroundColors.add(styles.backgroundColor);
            }
            if (styles.borderColor && styles.borderColor !== 'rgba(0, 0, 0, 0)') {
                borderColors.add(styles.borderColor);
            }
        });

        return {
            textColors: Array.from(colors).slice(0, 10),
            backgroundColors: Array.from(backgroundColors).slice(0, 10),
            borderColors: Array.from(borderColors).slice(0, 10)
        };
    });
}

async function extractTypography(page) {
    return await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const fonts = new Set();
        const fontSizes = new Set();
        const lineHeights = new Set();

        elements.forEach(el => {
            const styles = window.getComputedStyle(el);

            if (styles.fontFamily) fonts.add(styles.fontFamily);
            if (styles.fontSize) fontSizes.add(styles.fontSize);
            if (styles.lineHeight) lineHeights.add(styles.lineHeight);
        });

        // Get heading styles
        const headingStyles = {};
        for (let i = 1; i <= 6; i++) {
            const heading = document.querySelector(`h${i}`);
            if (heading) {
                const styles = window.getComputedStyle(heading);
                headingStyles[`h${i}`] = {
                    fontSize: styles.fontSize,
                    fontWeight: styles.fontWeight,
                    fontFamily: styles.fontFamily,
                    color: styles.color,
                    marginTop: styles.marginTop,
                    marginBottom: styles.marginBottom
                };
            }
        }

        return {
            fontFamilies: Array.from(fonts).slice(0, 5),
            fontSizes: Array.from(fontSizes).slice(0, 10),
            lineHeights: Array.from(lineHeights).slice(0, 5),
            headingStyles
        };
    });
}

async function extractFormPatterns(page) {
    return await page.evaluate(() => {
        const forms = document.querySelectorAll('form');
        const patterns = [];

        forms.forEach((form, index) => {
            const inputs = form.querySelectorAll('input, select, textarea');
            const buttons = form.querySelectorAll('button, input[type="submit"]');
            const labels = form.querySelectorAll('label');

            // Extract form layout
            const formStyles = window.getComputedStyle(form);

            // Extract common input styles
            let inputStyle = null;
            if (inputs.length > 0) {
                const firstInput = inputs[0];
                const styles = window.getComputedStyle(firstInput);
                inputStyle = {
                    padding: styles.padding,
                    border: styles.border,
                    borderRadius: styles.borderRadius,
                    fontSize: styles.fontSize,
                    height: styles.height,
                    backgroundColor: styles.backgroundColor
                };
            }

            // Extract button styles
            let buttonStyle = null;
            if (buttons.length > 0) {
                const firstButton = buttons[0];
                const styles = window.getComputedStyle(firstButton);
                buttonStyle = {
                    padding: styles.padding,
                    backgroundColor: styles.backgroundColor,
                    color: styles.color,
                    border: styles.border,
                    borderRadius: styles.borderRadius,
                    fontSize: styles.fontSize,
                    fontWeight: styles.fontWeight
                };
            }

            patterns.push({
                formIndex: index,
                action: form.action,
                method: form.method,
                inputCount: inputs.length,
                buttonCount: buttons.length,
                labelCount: labels.length,
                hasRequiredFields: Array.from(inputs).some(i => i.required),
                layout: {
                    display: formStyles.display,
                    padding: formStyles.padding,
                    margin: formStyles.margin,
                    backgroundColor: formStyles.backgroundColor
                },
                inputStyle,
                buttonStyle
            });
        });

        return patterns;
    });
}

async function extractLayoutPatterns(page) {
    return await page.evaluate(() => {
        // Check for common layout elements
        const header = document.querySelector('header, .header, #header');
        const sidebar = document.querySelector('aside, .sidebar, #sidebar, .navigation, nav');
        const mainContent = document.querySelector('main, .main-content, #content, .content');
        const footer = document.querySelector('footer, .footer, #footer');

        const layout = {
            hasHeader: !!header,
            hasSidebar: !!sidebar,
            hasMainContent: !!mainContent,
            hasFooter: !!footer
        };

        // Get dimensions and positions if elements exist
        if (header) {
            const rect = header.getBoundingClientRect();
            const styles = window.getComputedStyle(header);
            layout.header = {
                height: rect.height,
                position: styles.position,
                backgroundColor: styles.backgroundColor,
                zIndex: styles.zIndex
            };
        }

        if (sidebar) {
            const rect = sidebar.getBoundingClientRect();
            const styles = window.getComputedStyle(sidebar);
            layout.sidebar = {
                width: rect.width,
                position: styles.position,
                backgroundColor: styles.backgroundColor,
                float: styles.float
            };
        }

        if (mainContent) {
            const styles = window.getComputedStyle(mainContent);
            layout.mainContent = {
                padding: styles.padding,
                margin: styles.margin,
                backgroundColor: styles.backgroundColor,
                minHeight: styles.minHeight
            };
        }

        // Check for grid or flex layouts
        const body = document.body;
        const bodyStyles = window.getComputedStyle(body);
        layout.containerLayout = {
            display: bodyStyles.display,
            gridTemplateColumns: bodyStyles.gridTemplateColumns,
            flexDirection: bodyStyles.flexDirection
        };

        return layout;
    });
}

async function extractButtonPatterns(page) {
    return await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, .btn, input[type="submit"], input[type="button"], a.button');
        const patterns = {};

        buttons.forEach(button => {
            const styles = window.getComputedStyle(button);
            const text = button.textContent?.trim() || button.value || '';

            // Categorize button by appearance or purpose
            let category = 'default';
            if (text.toLowerCase().includes('save') || styles.backgroundColor?.includes('green')) {
                category = 'primary/save';
            } else if (text.toLowerCase().includes('cancel') || text.toLowerCase().includes('close')) {
                category = 'cancel';
            } else if (text.toLowerCase().includes('delete') || styles.backgroundColor?.includes('red')) {
                category = 'danger/delete';
            } else if (text.toLowerCase().includes('edit') || text.toLowerCase().includes('update')) {
                category = 'edit';
            }

            if (!patterns[category]) {
                patterns[category] = {
                    count: 0,
                    examples: [],
                    commonStyles: {
                        padding: styles.padding,
                        backgroundColor: styles.backgroundColor,
                        color: styles.color,
                        border: styles.border,
                        borderRadius: styles.borderRadius,
                        fontSize: styles.fontSize,
                        fontWeight: styles.fontWeight,
                        textTransform: styles.textTransform,
                        cursor: styles.cursor,
                        minWidth: styles.minWidth,
                        height: styles.height
                    }
                };
            }

            patterns[category].count++;
            if (patterns[category].examples.length < 3) {
                patterns[category].examples.push(text);
            }
        });

        return patterns;
    });
}

async function extractTablePatterns(page) {
    return await page.evaluate(() => {
        const tables = document.querySelectorAll('table');
        const patterns = [];

        tables.forEach((table, index) => {
            const styles = window.getComputedStyle(table);
            const thead = table.querySelector('thead');
            const tbody = table.querySelector('tbody');
            const headers = table.querySelectorAll('th');
            const rows = tbody ? tbody.querySelectorAll('tr') : [];

            // Get header styles
            let headerStyle = null;
            if (headers.length > 0) {
                const firstHeader = headers[0];
                const hStyles = window.getComputedStyle(firstHeader);
                headerStyle = {
                    backgroundColor: hStyles.backgroundColor,
                    color: hStyles.color,
                    fontWeight: hStyles.fontWeight,
                    padding: hStyles.padding,
                    textAlign: hStyles.textAlign
                };
            }

            // Get row styles
            let rowStyle = null;
            if (rows.length > 0) {
                const firstRow = rows[0];
                const rStyles = window.getComputedStyle(firstRow);
                rowStyle = {
                    backgroundColor: rStyles.backgroundColor,
                    borderBottom: rStyles.borderBottom,
                    hover: firstRow.matches(':hover') ? 'has-hover' : 'no-hover'
                };
            }

            // Check for striped pattern
            let isStriped = false;
            if (rows.length > 1) {
                const row1BG = window.getComputedStyle(rows[0]).backgroundColor;
                const row2BG = window.getComputedStyle(rows[1]).backgroundColor;
                isStriped = row1BG !== row2BG;
            }

            patterns.push({
                tableIndex: index,
                columnCount: headers.length,
                rowCount: rows.length,
                hasHeader: !!thead,
                isStriped,
                hasBorder: styles.border !== 'none',
                borderCollapse: styles.borderCollapse,
                width: styles.width,
                tableStyles: {
                    backgroundColor: styles.backgroundColor,
                    border: styles.border,
                    borderRadius: styles.borderRadius,
                    boxShadow: styles.boxShadow
                },
                headerStyle,
                rowStyle
            });
        });

        return patterns;
    });
}

async function extractNavigationPatterns(page) {
    return await page.evaluate(() => {
        // Find navigation elements
        const navElements = document.querySelectorAll('nav, .nav, .navigation, .menu, #menu, .sidebar ul');
        const patterns = [];

        navElements.forEach((nav, index) => {
            const styles = window.getComputedStyle(nav);
            const links = nav.querySelectorAll('a');
            const listItems = nav.querySelectorAll('li');

            // Check if vertical or horizontal
            let orientation = 'horizontal';
            if (listItems.length > 1) {
                const item1Rect = listItems[0].getBoundingClientRect();
                const item2Rect = listItems[1].getBoundingClientRect();
                if (item2Rect.top > item1Rect.bottom) {
                    orientation = 'vertical';
                }
            }

            // Get link styles
            let linkStyle = null;
            if (links.length > 0) {
                const firstLink = links[0];
                const lStyles = window.getComputedStyle(firstLink);
                linkStyle = {
                    color: lStyles.color,
                    textDecoration: lStyles.textDecoration,
                    padding: lStyles.padding,
                    display: lStyles.display,
                    fontSize: lStyles.fontSize,
                    fontWeight: lStyles.fontWeight
                };

                // Try to get hover state (approximate)
                firstLink.classList.add('hover-test');
                const hoverStyles = window.getComputedStyle(firstLink, ':hover');
                linkStyle.hoverColor = hoverStyles.color;
                firstLink.classList.remove('hover-test');
            }

            patterns.push({
                navIndex: index,
                orientation,
                linkCount: links.length,
                listItemCount: listItems.length,
                navStyles: {
                    display: styles.display,
                    backgroundColor: styles.backgroundColor,
                    padding: styles.padding,
                    margin: styles.margin,
                    position: styles.position,
                    width: styles.width,
                    height: styles.height
                },
                linkStyle
            });
        });

        return patterns;
    });
}

async function extractIconsAndImages(page) {
    return await page.evaluate(() => {
        // Find icon usage
        const fontAwesome = document.querySelector('link[href*="font-awesome"], link[href*="fontawesome"]');
        const materialIcons = document.querySelector('link[href*="material-icons"]');
        const iconElements = document.querySelectorAll('[class*="icon"], [class*="fa-"], [class*="material-icons"], .icon, i');

        // Find images
        const images = document.querySelectorAll('img');
        const logos = Array.from(images).filter(img =>
            img.src.toLowerCase().includes('logo') ||
            img.alt?.toLowerCase().includes('logo') ||
            img.className?.toLowerCase().includes('logo')
        );

        return {
            iconLibraries: {
                fontAwesome: !!fontAwesome,
                materialIcons: !!materialIcons,
                customIcons: iconElements.length > 0
            },
            iconCount: iconElements.length,
            imageCount: images.length,
            logos: logos.map(logo => ({
                src: logo.src,
                alt: logo.alt,
                width: logo.width,
                height: logo.height
            }))
        };
    });
}

async function analyzePageResponsiveness(page) {
    const breakpoints = [
        { name: 'mobile', width: 375 },
        { name: 'tablet', width: 768 },
        { name: 'desktop', width: 1366 },
        { name: 'wide', width: 1920 }
    ];

    const responsiveness = {};

    for (const breakpoint of breakpoints) {
        await page.setViewportSize({ width: breakpoint.width, height: 768 });
        await page.waitForTimeout(500);

        responsiveness[breakpoint.name] = await page.evaluate(() => {
            const body = document.body;
            const mainContent = document.querySelector('main, .main-content, #content');
            const sidebar = document.querySelector('aside, .sidebar, nav');

            return {
                bodyWidth: body.scrollWidth,
                hasHorizontalScroll: body.scrollWidth > window.innerWidth,
                contentWidth: mainContent ? mainContent.offsetWidth : null,
                sidebarVisible: sidebar ? window.getComputedStyle(sidebar).display !== 'none' : false,
                fontSize: window.getComputedStyle(body).fontSize
            };
        });
    }

    return responsiveness;
}

async function generateUIReport(analysis) {
    const report = `# LHIMS UI Pattern Analysis Report

Generated: ${new Date().toISOString()}

## 1. Color Scheme

### Primary Colors
\`\`\`css
/* Text Colors */
${analysis.colors.textColors.map(c => `color: ${c};`).join('\n')}

/* Background Colors */
${analysis.colors.backgroundColors.map(c => `background-color: ${c};`).join('\n')}

/* Border Colors */
${analysis.colors.borderColors.map(c => `border-color: ${c};`).join('\n')}
\`\`\`

## 2. Typography

### Font Families
${analysis.typography.fontFamilies.map(f => `- ${f}`).join('\n')}

### Common Font Sizes
${analysis.typography.fontSizes.map(s => `- ${s}`).join('\n')}

### Heading Styles
${Object.entries(analysis.typography.headingStyles).map(([tag, styles]) => `
#### ${tag.toUpperCase()}
- Font Size: ${styles.fontSize}
- Font Weight: ${styles.fontWeight}
- Color: ${styles.color}
- Margin: ${styles.marginTop} 0 ${styles.marginBottom}`).join('\n')}

## 3. Layout Patterns

### Page Structure
- Has Header: ${analysis.layout.hasHeader}
- Has Sidebar: ${analysis.layout.hasSidebar}
- Has Main Content: ${analysis.layout.hasMainContent}
- Has Footer: ${analysis.layout.hasFooter}

${analysis.layout.header ? `
### Header Specifications
- Height: ${analysis.layout.header.height}px
- Position: ${analysis.layout.header.position}
- Background: ${analysis.layout.header.backgroundColor}
- Z-Index: ${analysis.layout.header.zIndex}
` : ''}

${analysis.layout.sidebar ? `
### Sidebar Specifications
- Width: ${analysis.layout.sidebar.width}px
- Position: ${analysis.layout.sidebar.position}
- Background: ${analysis.layout.sidebar.backgroundColor}
` : ''}

## 4. Form Patterns

${analysis.forms.map((form, i) => `
### Form ${i + 1}
- Input Count: ${form.inputCount}
- Button Count: ${form.buttonCount}
- Has Required Fields: ${form.hasRequiredFields}

${form.inputStyle ? `
#### Input Styles
\`\`\`css
.input {
  padding: ${form.inputStyle.padding};
  border: ${form.inputStyle.border};
  border-radius: ${form.inputStyle.borderRadius};
  font-size: ${form.inputStyle.fontSize};
  height: ${form.inputStyle.height};
  background-color: ${form.inputStyle.backgroundColor};
}
\`\`\`
` : ''}

${form.buttonStyle ? `
#### Button Styles
\`\`\`css
.button {
  padding: ${form.buttonStyle.padding};
  background-color: ${form.buttonStyle.backgroundColor};
  color: ${form.buttonStyle.color};
  border: ${form.buttonStyle.border};
  border-radius: ${form.buttonStyle.borderRadius};
  font-size: ${form.buttonStyle.fontSize};
  font-weight: ${form.buttonStyle.fontWeight};
}
\`\`\`
` : ''}`).join('\n')}

## 5. Button Patterns

${Object.entries(analysis.buttons).map(([category, data]) => `
### ${category} Buttons
- Count: ${data.count}
- Examples: ${data.examples.join(', ')}

\`\`\`css
.btn-${category.toLowerCase().replace('/', '-')} {
  padding: ${data.commonStyles.padding};
  background-color: ${data.commonStyles.backgroundColor};
  color: ${data.commonStyles.color};
  border: ${data.commonStyles.border};
  border-radius: ${data.commonStyles.borderRadius};
  font-size: ${data.commonStyles.fontSize};
  font-weight: ${data.commonStyles.fontWeight};
}
\`\`\`
`).join('\n')}

## 6. Table Patterns

${analysis.tables.map((table, i) => `
### Table ${i + 1}
- Columns: ${table.columnCount}
- Rows: ${table.rowCount}
- Has Header: ${table.hasHeader}
- Is Striped: ${table.isStriped}
- Has Border: ${table.hasBorder}

${table.headerStyle ? `
#### Header Style
\`\`\`css
th {
  background-color: ${table.headerStyle.backgroundColor};
  color: ${table.headerStyle.color};
  font-weight: ${table.headerStyle.fontWeight};
  padding: ${table.headerStyle.padding};
  text-align: ${table.headerStyle.textAlign};
}
\`\`\`
` : ''}`).join('\n')}

## 7. Navigation Patterns

${analysis.navigation.map((nav, i) => `
### Navigation ${i + 1}
- Orientation: ${nav.orientation}
- Link Count: ${nav.linkCount}
- Display: ${nav.navStyles.display}
- Background: ${nav.navStyles.backgroundColor}

${nav.linkStyle ? `
#### Link Styles
\`\`\`css
a {
  color: ${nav.linkStyle.color};
  text-decoration: ${nav.linkStyle.textDecoration};
  padding: ${nav.linkStyle.padding};
  font-size: ${nav.linkStyle.fontSize};
  font-weight: ${nav.linkStyle.fontWeight};
}
a:hover {
  color: ${nav.linkStyle.hoverColor};
}
\`\`\`
` : ''}`).join('\n')}

## 8. Icons and Images

### Icon Libraries
- Font Awesome: ${analysis.icons.iconLibraries.fontAwesome}
- Material Icons: ${analysis.icons.iconLibraries.materialIcons}
- Custom Icons: ${analysis.icons.iconLibraries.customIcons}

### Statistics
- Total Icons: ${analysis.icons.iconCount}
- Total Images: ${analysis.icons.imageCount}
- Logo Images: ${analysis.icons.logos.length}

## 9. Responsiveness

${Object.entries(analysis.responsiveness).map(([breakpoint, data]) => `
### ${breakpoint.charAt(0).toUpperCase() + breakpoint.slice(1)} (${data.width || 'N/A'}px)
- Has Horizontal Scroll: ${data.hasHorizontalScroll}
- Sidebar Visible: ${data.sidebarVisible}
- Font Size: ${data.fontSize}
`).join('\n')}

## 10. CSS Framework Detection

Based on the analysis, LHIMS appears to use:
${analysis.cssFramework}

## 11. Recommendations for New System

### Maintain These Patterns
1. Color scheme for familiarity
2. Button placement and styling categories
3. Form field ordering and validation patterns
4. Navigation structure and hierarchy
5. Table layouts and data presentation

### Improve These Areas
1. Add proper responsive design for mobile devices
2. Improve color contrast for accessibility
3. Standardize spacing and padding
4. Add loading states and animations
5. Implement consistent icon usage

### Modern Equivalents
- Use Tailwind CSS classes to replicate styles
- Implement shadcn/ui components with similar styling
- Use CSS Grid/Flexbox for better layouts
- Add dark mode support while keeping light theme similar

---
*End of UI Analysis Report*
`;

    return report;
}

async function login(page) {
    console.log('🔐 Attempting to login to LHIMS...');

    try {
        await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle' });

        // Try to find and fill login form
        const usernameField = await page.$('input[type="text"], input[name="username"], input[id="username"]');
        const passwordField = await page.$('input[type="password"], input[name="password"], input[id="password"]');

        if (usernameField && passwordField) {
            await usernameField.type(CONFIG.username);
            await passwordField.type(CONFIG.password);

            const loginButton = await page.$('button[type="submit"], input[type="submit"]');
            if (loginButton) {
                await loginButton.click();
                await page.waitForNavigation({ waitUntil: 'networkidle' });
                console.log('  ✓ Login successful');
                return true;
            }
        }

        console.log('  ⚠ Could not find login form');
        return false;
    } catch (error) {
        console.error('  ✗ Login failed:', error.message);
        return false;
    }
}

async function main() {
    console.log('=========================================');
    console.log('    LHIMS UI Pattern Analysis Tool      ');
    console.log('=========================================');
    console.log(`\n📁 Output Directory: ${CONFIG.outputDir}`);
    console.log(`🌐 LHIMS URL: ${CONFIG.baseUrl}\n`);

    // Launch browser
    const browser = await chromium.launch({
        headless: CONFIG.headless,
        slowMo: CONFIG.slowMo
    });

    try {
        const page = await browser.newPage();

        // Login if credentials provided
        if (CONFIG.username && CONFIG.password) {
            await login(page);
        }

        // Collect analysis from all sample pages
        const fullAnalysis = {
            colors: null,
            typography: null,
            layout: null,
            forms: [],
            buttons: {},
            tables: [],
            navigation: [],
            icons: null,
            responsiveness: {},
            cssFramework: 'Custom CSS (No major framework detected)'
        };

        for (const pagePath of CONFIG.samplePages) {
            console.log(`\n📄 Analyzing: ${pagePath}`);

            try {
                const url = CONFIG.baseUrl + pagePath;
                await page.goto(url, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
                await page.waitForTimeout(2000);

                // Extract patterns
                if (!fullAnalysis.colors) {
                    fullAnalysis.colors = await extractColorScheme(page);
                    console.log('  ✓ Color scheme extracted');
                }

                if (!fullAnalysis.typography) {
                    fullAnalysis.typography = await extractTypography(page);
                    console.log('  ✓ Typography analyzed');
                }

                if (!fullAnalysis.layout) {
                    fullAnalysis.layout = await extractLayoutPatterns(page);
                    console.log('  ✓ Layout patterns extracted');
                }

                const formPatterns = await extractFormPatterns(page);
                fullAnalysis.forms.push(...formPatterns);
                if (formPatterns.length > 0) {
                    console.log(`  ✓ Found ${formPatterns.length} forms`);
                }

                const buttonPatterns = await extractButtonPatterns(page);
                Object.assign(fullAnalysis.buttons, buttonPatterns);
                console.log('  ✓ Button patterns analyzed');

                const tablePatterns = await extractTablePatterns(page);
                fullAnalysis.tables.push(...tablePatterns);
                if (tablePatterns.length > 0) {
                    console.log(`  ✓ Found ${tablePatterns.length} tables`);
                }

                const navPatterns = await extractNavigationPatterns(page);
                fullAnalysis.navigation.push(...navPatterns);
                if (navPatterns.length > 0) {
                    console.log(`  ✓ Found ${navPatterns.length} navigation elements`);
                }

                if (!fullAnalysis.icons) {
                    fullAnalysis.icons = await extractIconsAndImages(page);
                    console.log('  ✓ Icons and images analyzed');
                }

                // Check responsiveness on one page
                if (pagePath === CONFIG.samplePages[0]) {
                    console.log('  🔄 Testing responsiveness...');
                    fullAnalysis.responsiveness = await analyzePageResponsiveness(page);
                    console.log('  ✓ Responsiveness analyzed');
                }

            } catch (error) {
                console.error(`  ✗ Error analyzing ${pagePath}:`, error.message);
            }
        }

        // Detect CSS framework
        await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle' });
        const frameworkDetection = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
            const scripts = Array.from(document.querySelectorAll('script[src]'));

            const allSrcs = [...links.map(l => l.href), ...scripts.map(s => s.src)].join(' ').toLowerCase();

            if (allSrcs.includes('bootstrap')) return 'Bootstrap';
            if (allSrcs.includes('material')) return 'Material Design';
            if (allSrcs.includes('semantic')) return 'Semantic UI';
            if (allSrcs.includes('bulma')) return 'Bulma';
            if (allSrcs.includes('tailwind')) return 'Tailwind CSS';

            return 'Custom CSS (No major framework detected)';
        });
        fullAnalysis.cssFramework = frameworkDetection;

        // Generate report
        const report = await generateUIReport(fullAnalysis);

        // Save analysis results
        const analysisPath = path.join(CONFIG.outputDir, 'ui-analysis.json');
        await fs.writeFile(analysisPath, JSON.stringify(fullAnalysis, null, 2));
        console.log(`\n✅ Analysis saved to: ui-analysis.json`);

        // Save report
        const reportPath = path.join(CONFIG.outputDir, 'UI-PATTERNS-REPORT.md');
        await fs.writeFile(reportPath, report);
        console.log(`✅ Report saved to: UI-PATTERNS-REPORT.md`);

        // Generate CSS file with extracted styles
        const cssTemplate = `/* LHIMS Style Guide - Extracted Patterns */
/* Generated: ${new Date().toISOString()} */

:root {
  /* Primary Colors */
  ${fullAnalysis.colors.textColors.slice(0, 3).map((c, i) => `--text-color-${i + 1}: ${c};`).join('\n  ')}

  /* Background Colors */
  ${fullAnalysis.colors.backgroundColors.slice(0, 5).map((c, i) => `--bg-color-${i + 1}: ${c};`).join('\n  ')}

  /* Border Colors */
  ${fullAnalysis.colors.borderColors.slice(0, 3).map((c, i) => `--border-color-${i + 1}: ${c};`).join('\n  ')}

  /* Typography */
  --font-family: ${fullAnalysis.typography.fontFamilies[0] || 'sans-serif'};
  --font-size-base: ${fullAnalysis.typography.fontSizes[0] || '14px'};
}

/* Component Styles to Replicate in New System */

.btn-primary {
  /* Style from LHIMS primary buttons */
  ${fullAnalysis.buttons['primary/save'] ? Object.entries(fullAnalysis.buttons['primary/save'].commonStyles)
    .filter(([k, v]) => v && v !== 'none')
    .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`)
    .join('\n  ') : '/* No primary button styles found */'}
}

.form-input {
  /* Style from LHIMS form inputs */
  ${fullAnalysis.forms[0]?.inputStyle ? Object.entries(fullAnalysis.forms[0].inputStyle)
    .filter(([k, v]) => v && v !== 'none')
    .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`)
    .join('\n  ') : '/* No input styles found */'}
}

.data-table {
  /* Style from LHIMS tables */
  ${fullAnalysis.tables[0]?.tableStyles ? Object.entries(fullAnalysis.tables[0].tableStyles)
    .filter(([k, v]) => v && v !== 'none')
    .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`)
    .join('\n  ') : '/* No table styles found */'}
}
`;

        const cssPath = path.join(CONFIG.outputDir, 'lhims-styles.css');
        await fs.writeFile(cssPath, cssTemplate);
        console.log(`✅ CSS template saved to: lhims-styles.css`);

        console.log('\n' + '='.repeat(50));
        console.log('✨ UI Analysis Complete!');
        console.log('='.repeat(50));
        console.log('\nGenerated Files:');
        console.log('1. ui-analysis.json - Raw analysis data');
        console.log('2. UI-PATTERNS-REPORT.md - Human-readable report');
        console.log('3. lhims-styles.css - CSS template for new system');
        console.log('\nNext Steps:');
        console.log('1. Review the UI patterns report');
        console.log('2. Use lhims-styles.css as a base for your new system');
        console.log('3. Implement similar patterns in your Next.js app');

    } catch (error) {
        console.error('\n❌ Critical error:', error);
    } finally {
        await browser.close();
    }
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    extractColorScheme,
    extractTypography,
    extractFormPatterns,
    extractLayoutPatterns,
    extractButtonPatterns,
    extractTablePatterns,
    extractNavigationPatterns,
    extractIconsAndImages
};