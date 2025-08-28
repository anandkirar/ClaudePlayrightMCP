#!/usr/bin/env node

/**
 * Playwright MCP Installation Script for Claude Code
 * Sets up Playwright with MCP integration for AI-driven UI testing
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class PlaywrightMCPInstaller {
  constructor() {
    this.projectRoot = process.cwd();
    this.configDir = path.join(this.projectRoot, 'config');
    this.scriptsDir = path.join(this.projectRoot, 'scripts');
  }

  async install() {
    console.log('🚀 Installing Playwright MCP for Claude Code...\n');

    try {
      await this.installDependencies();
      await this.setupDirectories();
      await this.createPlaywrightConfig();
      await this.createMCPConfig();
      await this.setupDeviceProfiles();
      await this.createUtilityScripts();
      await this.updatePackageJson();
      
      console.log('✅ Playwright MCP installation completed successfully!\n');
      console.log('Next steps:');
      console.log('1. Run: npm run playwright:install');
      console.log('2. Start development server: npm run dev');
      console.log('3. Run visual tests: npm run test:visual');
      
    } catch (error) {
      console.error('❌ Installation failed:', error.message);
      process.exit(1);
    }
  }

  async installDependencies() {
    console.log('📦 Installing Playwright and MCP dependencies...');
    
    const dependencies = [
      '@playwright/test@latest',
      'playwright@latest',
      '@playwright/experimental-ct-react@latest',
      'pixelmatch@latest',
      'sharp@latest'
    ];

    const devDependencies = [
      'playwright-lighthouse@latest',
      'axe-playwright@latest',
      '@axe-core/playwright@latest'
    ];

    execSync(`npm install ${dependencies.join(' ')}`, { stdio: 'inherit' });
    execSync(`npm install -D ${devDependencies.join(' ')}`, { stdio: 'inherit' });
    
    console.log('✓ Dependencies installed\n');
  }

  async setupDirectories() {
    console.log('📁 Creating project directories...');
    
    const directories = [
      'tests/visual',
      'tests/accessibility', 
      'tests/performance',
      'screenshots/baseline',
      'screenshots/current',
      'screenshots/diff',
      'config/playwright',
      'scripts/visual-testing',
      'subagents',
      'reports'
    ];

    directories.forEach(dir => {
      const fullPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`  ✓ Created ${dir}`);
      }
    });
    
    console.log('✓ Directories created\n');
  }

  async createPlaywrightConfig() {
    console.log('⚙️ Creating Playwright configuration...');
    
    const configContent = `import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for AI-Driven UI Testing
 * Supports multiple browsers, device emulation, and visual testing
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Global test settings
  timeout: 30000,
  expect: {
    timeout: 10000,
    // Visual comparison threshold
    threshold: 0.2,
    // Screenshot comparison mode
    mode: 'pixel'
  },

  use: {
    // Base URL for testing
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Browser settings
    headless: process.env.HEADLESS !== 'false',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Enable vision mode for AI analysis
    ignoreHTTPSErrors: true,
    bypassCSP: true,
  },

  projects: [
    // Desktop Browsers
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      },
    },
    {
      name: 'firefox-desktop', 
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 }
      },
    },
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 }
      },
    },

    // Mobile Devices
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 15 Pro'] },
    },

    // Tablet Devices  
    {
      name: 'tablet-chrome',
      use: { ...devices['iPad Pro'] },
    },
    {
      name: 'tablet-safari',
      use: { ...devices['iPad Pro landscape'] },
    },

    // Custom AI Testing Profile
    {
      name: 'ai-visual-testing',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        // Enable additional features for AI analysis
        reducedMotion: 'reduce',
        forcedColors: 'none',
        colorScheme: 'light'
      }
    }
  ],

  // Development server setup
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Reporting
  reporter: [
    ['html', { outputFolder: 'reports/html' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
    // Custom reporter for AI analysis
    ['./scripts/visual-testing/ai-reporter.js']
  ],

  // Output directories
  outputDir: 'test-results/',
  
  // Global setup and teardown
  globalSetup: './scripts/visual-testing/global-setup.js',
  globalTeardown: './scripts/visual-testing/global-teardown.js'
});`;

    fs.writeFileSync(
      path.join(this.projectRoot, 'playwright.config.js'), 
      configContent
    );
    
    console.log('✓ Playwright config created\n');
  }

  async createMCPConfig() {
    console.log('🤖 Creating MCP configuration...');
    
    const mcpConfig = {
      "name": "playwright-visual-testing-mcp",
      "version": "1.0.0",
      "description": "AI-driven visual testing with Playwright MCP integration",
      "capabilities": {
        "browser_automation": true,
        "screenshot_capture": true,
        "visual_comparison": true,
        "accessibility_testing": true,
        "performance_monitoring": true,
        "ai_analysis": true
      },
      "playwright": {
        "browsers": ["chromium", "firefox", "webkit"],
        "devices": {
          "desktop": ["Desktop Chrome", "Desktop Firefox", "Desktop Safari"],
          "mobile": ["iPhone 15 Pro", "Pixel 7"],
          "tablet": ["iPad Pro", "iPad Pro landscape"]
        },
        "viewports": {
          "desktop_large": { "width": 1440, "height": 900 },
          "desktop_standard": { "width": 1024, "height": 768 },
          "tablet": { "width": 768, "height": 1024 },
          "mobile": { "width": 393, "height": 852 }
        }
      },
      "visual_testing": {
        "screenshot_options": {
          "fullPage": true,
          "animations": "disabled",
          "clip": null,
          "mask": [],
          "omitBackground": false
        },
        "comparison_options": {
          "threshold": 0.2,
          "maxDiffPixels": 1000,
          "ignoreAntialiasing": true
        }
      },
      "ai_integration": {
        "vision_model": "claude-sonnet-4",
        "analysis_types": [
          "visual_differences", 
          "accessibility_issues",
          "design_consistency",
          "responsive_behavior"
        ],
        "reporting": {
          "format": "markdown",
          "include_screenshots": true,
          "severity_levels": ["critical", "major", "minor", "info"]
        }
      }
    };

    fs.writeFileSync(
      path.join(this.configDir, 'mcp-config.json'),
      JSON.stringify(mcpConfig, null, 2)
    );
    
    console.log('✓ MCP configuration created\n');
  }

  async setupDeviceProfiles() {
    console.log('📱 Setting up device profiles...');
    
    const deviceProfiles = `export const deviceProfiles = {
  // Desktop Configurations
  desktop: {
    large: { width: 1440, height: 900, deviceScaleFactor: 1 },
    standard: { width: 1024, height: 768, deviceScaleFactor: 1 },
    small: { width: 768, height: 1024, deviceScaleFactor: 1 }
  },

  // Mobile Configurations  
  mobile: {
    iphone15Pro: {
      width: 393,
      height: 852,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
    },
    pixel7: {
      width: 412,
      height: 915, 
      deviceScaleFactor: 2.625,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36'
    }
  },

  // Tablet Configurations
  tablet: {
    ipadPro: {
      width: 1366,
      height: 1024,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
    },
    ipadProPortrait: {
      width: 1024,
      height: 1366,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    }
  }
};

export const getDeviceProfile = (category, device) => {
  return deviceProfiles[category]?.[device] || deviceProfiles.desktop.large;
};`;

    fs.writeFileSync(
      path.join(this.configDir, 'device-profiles.js'),
      deviceProfiles
    );
    
    console.log('✓ Device profiles created\n');
  }

  async createUtilityScripts() {
    console.log('🛠️ Creating utility scripts...');
    
    // Visual testing utilities
    const visualUtils = `import { expect } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

export class VisualTestingUtils {
  constructor(page, testInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.screenshotDir = 'screenshots';
  }

  async captureFullPageScreenshot(name, options = {}) {
    const screenshotPath = path.join(
      this.screenshotDir,
      'current',
      \`\${this.testInfo.project.name}-\${name}.png\`
    );

    await this.page.screenshot({
      path: screenshotPath,
      fullPage: true,
      animations: 'disabled',
      ...options
    });

    return screenshotPath;
  }

  async captureElementScreenshot(selector, name, options = {}) {
    const element = this.page.locator(selector);
    const screenshotPath = path.join(
      this.screenshotDir,
      'current', 
      \`\${this.testInfo.project.name}-\${name}-element.png\`
    );

    await element.screenshot({
      path: screenshotPath,
      animations: 'disabled',
      ...options
    });

    return screenshotPath;
  }

  async compareWithBaseline(currentPath, baselineName) {
    const baselinePath = path.join(
      this.screenshotDir,
      'baseline',
      \`\${this.testInfo.project.name}-\${baselineName}.png\`
    );

    if (!fs.existsSync(baselinePath)) {
      // Create baseline if it doesn't exist
      fs.copyFileSync(currentPath, baselinePath);
      return { match: true, isNewBaseline: true };
    }

    const diffPath = path.join(
      this.screenshotDir,
      'diff',
      \`\${this.testInfo.project.name}-\${baselineName}-diff.png\`
    );

    const current = PNG.sync.read(fs.readFileSync(currentPath));
    const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
    const { width, height } = current;
    const diff = new PNG({ width, height });

    const mismatchedPixels = pixelmatch(
      current.data,
      baseline.data,
      diff.data,
      width,
      height,
      { threshold: 0.1 }
    );

    if (mismatchedPixels > 0) {
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
    }

    return {
      match: mismatchedPixels === 0,
      mismatchedPixels,
      totalPixels: width * height,
      diffPath: mismatchedPixels > 0 ? diffPath : null
    };
  }

  async waitForStableLayout(timeout = 5000) {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
    
    // Wait for any animations to complete
    await this.page.evaluate(() => {
      return new Promise(resolve => {
        let lastHeight = document.body.scrollHeight;
        const checkStability = () => {
          const currentHeight = document.body.scrollHeight;
          if (currentHeight === lastHeight) {
            resolve();
          } else {
            lastHeight = currentHeight;
            setTimeout(checkStability, 100);
          }
        };
        setTimeout(checkStability, 100);
      });
    });
  }

  async disableAnimations() {
    await this.page.addStyleTag({
      content: \`
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      \`
    });
  }

  async checkConsoleErrors() {
    const errors = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({
          type: 'console',
          message: msg.text(),
          location: msg.location()
        });
      }
    });

    this.page.on('pageerror', error => {
      errors.push({
        type: 'javascript',
        message: error.message,
        stack: error.stack
      });
    });

    return errors;
  }
}`;

    fs.writeFileSync(
      path.join(this.scriptsDir, 'visual-testing', 'utils.js'),
      visualUtils
    );
    
    console.log('✓ Utility scripts created\n');
  }

  async updatePackageJson() {
    console.log('📝 Updating package.json scripts...');
    
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    let packageJson = {};
    
    if (fs.existsSync(packageJsonPath)) {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    }

    packageJson.scripts = {
      ...packageJson.scripts,
      // Playwright installation and setup
      "playwright:install": "playwright install",
      "playwright:install-deps": "playwright install-deps",
      
      // Visual testing commands
      "test:visual": "playwright test --project=ai-visual-testing",
      "test:visual:headed": "HEADLESS=false playwright test --project=ai-visual-testing",
      "test:visual:update": "playwright test --update-snapshots",
      
      // Cross-browser testing
      "test:cross-browser": "playwright test",
      "test:mobile": "playwright test --project=mobile-chrome --project=mobile-safari",
      "test:tablet": "playwright test --project=tablet-chrome --project=tablet-safari",
      
      // Screenshot management
      "screenshots:baseline": "node scripts/visual-testing/generate-baseline.js",
      "screenshots:compare": "node scripts/visual-testing/compare-screenshots.js",
      "screenshots:approve": "node scripts/visual-testing/approve-screenshots.js",
      
      // Accessibility testing
      "test:a11y": "playwright test tests/accessibility",
      
      // Performance testing
      "test:performance": "playwright test tests/performance",
      
      // AI-driven analysis
      "analyze:visual": "node scripts/visual-testing/ai-analysis.js",
      "report:generate": "node scripts/visual-testing/generate-report.js"
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    console.log('✓ Package.json updated\n');
  }
}

// Run installation if called directly
if (require.main === module) {
  const installer = new PlaywrightMCPInstaller();
  installer.install().catch(console.error);
}

module.exports = { PlaywrightMCPInstaller };