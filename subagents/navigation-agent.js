/**
 * Navigation Agent - Handles automated navigation and page management
 * Part of the AI-driven front-end design workflow
 */

import { chromium, firefox, webkit } from '@playwright/test';
import { deviceProfiles } from '../config/device-profiles.js';

export class NavigationAgent {
  constructor(options = {}) {
    this.options = {
      browser: 'chromium',
      device: 'desktop.large',
      headless: process.env.HEADLESS !== 'false',
      timeout: 30000,
      ...options
    };
    
    this.browser = null;
    this.context = null;
    this.page = null;
    this.currentUrl = null;
  }

  async initialize() {
    console.log(`🌐 Initializing Navigation Agent (${this.options.browser})...`);
    
    // Launch browser based on configuration
    const browserType = this.getBrowserType();
    this.browser = await browserType.launch({
      headless: this.options.headless,
      args: ['--disable-web-security', '--allow-running-insecure-content']
    });

    // Create context with device configuration
    const deviceConfig = this.getDeviceConfig();
    this.context = await this.browser.newContext({
      ...deviceConfig,
      ignoreHTTPSErrors: true,
      bypassCSP: true
    });

    // Create new page
    this.page = await this.context.newPage();
    
    // Setup error handling
    await this.setupErrorHandling();
    
    console.log(`✅ Navigation Agent ready`);
    return this;
  }

  getBrowserType() {
    switch (this.options.browser.toLowerCase()) {
      case 'firefox':
        return firefox;
      case 'webkit':
      case 'safari':
        return webkit;
      default:
        return chromium;
    }
  }

  getDeviceConfig() {
    const [category, device] = this.options.device.split('.');
    const profile = deviceProfiles[category]?.[device] || deviceProfiles.desktop.large;
    
    return {
      viewport: { width: profile.width, height: profile.height },
      deviceScaleFactor: profile.deviceScaleFactor || 1,
      isMobile: profile.isMobile || false,
      hasTouch: profile.hasTouch || false,
      userAgent: profile.userAgent || undefined
    };
  }

  async setupErrorHandling() {
    this.errors = [];
    
    // Capture console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.errors.push({
          type: 'console',
          message: msg.text(),
          url: this.currentUrl,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Capture JavaScript errors
    this.page.on('pageerror', error => {
      this.errors.push({
        type: 'javascript',
        message: error.message,
        stack: error.stack,
        url: this.currentUrl,
        timestamp: new Date().toISOString()
      });
    });

    // Capture network failures
    this.page.on('requestfailed', request => {
      this.errors.push({
        type: 'network',
        message: `Failed to load: ${request.url()}`,
        failure: request.failure()?.errorText,
        url: this.currentUrl,
        timestamp: new Date().toISOString()
      });
    });
  }

  async navigateToUrl(url, options = {}) {
    console.log(`🔗 Navigating to: ${url}`);
    this.currentUrl = url;
    
    try {
      const response = await this.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.options.timeout,
        ...options
      });

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }

      // Wait for page to be fully loaded and stable
      await this.waitForStableState();
      
      console.log(`✅ Successfully navigated to ${url}`);
      return {
        success: true,
        url,
        status: response.status(),
        loadTime: await this.measureLoadTime()
      };

    } catch (error) {
      console.error(`❌ Navigation failed: ${error.message}`);
      return {
        success: false,
        url,
        error: error.message
      };
    }
  }

  async navigateToLocalhost(port = 3000, path = '/', options = {}) {
    const url = `http://localhost:${port}${path}`;
    return await this.navigateToUrl(url, options);
  }

  async navigateToPullRequest(prUrl, options = {}) {
    console.log(`🔄 Navigating to Pull Request: ${prUrl}`);
    
    // Handle GitHub PR URLs and extract deployment URLs if available
    if (prUrl.includes('github.com') && prUrl.includes('/pull/')) {
      // Look for Vercel, Netlify, or other deployment previews
      const deploymentUrl = await this.findDeploymentPreview(prUrl);
      if (deploymentUrl) {
        console.log(`🚀 Found deployment preview: ${deploymentUrl}`);
        return await this.navigateToUrl(deploymentUrl, options);
      }
    }

    return await this.navigateToUrl(prUrl, options);
  }

  async findDeploymentPreview(prUrl) {
    // This would integrate with GitHub API to find deployment previews
    // For now, return null - implement based on your deployment setup
    return null;
  }

  async waitForStableState(timeout = 5000) {
    console.log('⏳ Waiting for stable page state...');
    
    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle');
    
    // Wait for any dynamic content to load
    await this.page.waitForTimeout(1000);
    
    // Check for layout stability
    let previousHeight = await this.page.evaluate(() => document.body.scrollHeight);
    let stableCount = 0;
    const maxChecks = 10;
    
    for (let i = 0; i < maxChecks; i++) {
      await this.page.waitForTimeout(500);
      const currentHeight = await this.page.evaluate(() => document.body.scrollHeight);
      
      if (currentHeight === previousHeight) {
        stableCount++;
        if (stableCount >= 3) break; // Stable for 1.5 seconds
      } else {
        stableCount = 0;
        previousHeight = currentHeight;
      }
    }
    
    console.log('✅ Page state is stable');
  }

  async measureLoadTime() {
    return await this.page.evaluate(() => {
      return performance.timing.loadEventEnd - performance.timing.navigationStart;
    });
  }

  async scrollToElement(selector, options = {}) {
    const element = this.page.locator(selector);
    await element.scrollIntoViewIfNeeded();
    
    if (options.waitFor) {
      await element.waitFor({ state: 'visible', timeout: 5000 });
    }
    
    return element;
  }

  async clickElement(selector, options = {}) {
    console.log(`🖱️ Clicking element: ${selector}`);
    
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: 5000 });
    await element.click(options);
    
    // Wait for any navigation or state changes
    await this.page.waitForTimeout(500);
    
    return element;
  }

  async fillForm(formData, options = {}) {
    console.log(`📝 Filling form with ${Object.keys(formData).length} fields`);
    
    for (const [selector, value] of Object.entries(formData)) {
      const element = this.page.locator(selector);
      await element.waitFor({ state: 'visible', timeout: 5000 });
      await element.fill(value);
    }
    
    if (options.submit) {
      await this.page.locator(options.submitSelector || 'button[type="submit"]').click();
      await this.waitForStableState();
    }
  }

  async handleAuthentication(authConfig) {
    console.log('🔐 Handling authentication...');
    
    if (authConfig.type === 'form') {
      await this.navigateToUrl(authConfig.loginUrl);
      await this.fillForm({
        [authConfig.usernameSelector]: authConfig.username,
        [authConfig.passwordSelector]: authConfig.password
      }, { submit: true, submitSelector: authConfig.submitSelector });
    }
    
    if (authConfig.type === 'token') {
      await this.context.addCookies([{
        name: authConfig.cookieName,
        value: authConfig.token,
        domain: new URL(this.currentUrl).hostname
      }]);
    }
    
    console.log('✅ Authentication completed');
  }

  async getPageInfo() {
    return {
      url: this.page.url(),
      title: await this.page.title(),
      viewport: this.page.viewportSize(),
      errors: this.errors.length,
      loadTime: await this.measureLoadTime()
    };
  }

  async getErrors() {
    return [...this.errors];
  }

  async clearErrors() {
    this.errors = [];
  }

  async takeScreenshot(options = {}) {
    return await this.page.screenshot({
      fullPage: true,
      animations: 'disabled',
      ...options
    });
  }

  async close() {
    console.log('🔚 Closing Navigation Agent...');
    
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    
    console.log('✅ Navigation Agent closed');
  }
}

export default NavigationAgent;