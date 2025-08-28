/**
 * Screenshot Agent - Handles automated screenshot capture and comparison
 * Part of the AI-driven front-end design workflow
 */

import fs from 'fs';
import path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import sharp from 'sharp';

export class ScreenshotAgent {
  constructor(navigationAgent, options = {}) {
    this.navigationAgent = navigationAgent;
    this.options = {
      screenshotDir: 'screenshots',
      baselineDir: 'baseline',
      currentDir: 'current',
      diffDir: 'diff',
      format: 'png',
      quality: 90,
      threshold: 0.1,
      maxDiffPixels: 1000,
      ...options
    };

    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = [
      path.join(this.options.screenshotDir, this.options.baselineDir),
      path.join(this.options.screenshotDir, this.options.currentDir),
      path.join(this.options.screenshotDir, this.options.diffDir)
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async captureFullPage(name, options = {}) {
    console.log(`📸 Capturing full page screenshot: ${name}`);
    
    const page = this.navigationAgent.page;
    if (!page) {
      throw new Error('Navigation agent not initialized');
    }

    // Disable animations for consistent screenshots
    await this.disableAnimations();
    
    // Wait for stable layout
    await this.waitForStableLayout();

    const filename = this.generateFilename(name, 'full-page');
    const screenshotPath = path.join(
      this.options.screenshotDir,
      this.options.currentDir,
      filename
    );

    const screenshotOptions = {
      path: screenshotPath,
      fullPage: true,
      animations: 'disabled',
      clip: options.clip,
      mask: options.mask || [],
      omitBackground: options.omitBackground || false,
      ...options
    };

    await page.screenshot(screenshotOptions);
    
    // Optimize screenshot if needed
    if (options.optimize !== false) {
      await this.optimizeScreenshot(screenshotPath);
    }

    console.log(`✅ Screenshot saved: ${screenshotPath}`);
    
    return {
      path: screenshotPath,
      name: filename,
      type: 'full-page',
      timestamp: new Date().toISOString()
    };
  }

  async captureViewport(name, viewportConfig, options = {}) {
    console.log(`📱 Capturing viewport screenshot: ${name} (${viewportConfig.width}x${viewportConfig.height})`);
    
    const page = this.navigationAgent.page;
    
    // Set viewport size
    await page.setViewportSize(viewportConfig);
    await this.waitForStableLayout();

    const filename = this.generateFilename(name, `viewport-${viewportConfig.width}x${viewportConfig.height}`);
    const screenshotPath = path.join(
      this.options.screenshotDir,
      this.options.currentDir,
      filename
    );

    await page.screenshot({
      path: screenshotPath,
      fullPage: options.fullPage !== false,
      animations: 'disabled',
      ...options
    });

    if (options.optimize !== false) {
      await this.optimizeScreenshot(screenshotPath);
    }

    return {
      path: screenshotPath,
      name: filename,
      type: 'viewport',
      viewport: viewportConfig,
      timestamp: new Date().toISOString()
    };
  }

  async captureElement(selector, name, options = {}) {
    console.log(`🎯 Capturing element screenshot: ${selector}`);
    
    const page = this.navigationAgent.page;
    const element = page.locator(selector);
    
    // Wait for element to be visible
    await element.waitFor({ state: 'visible', timeout: 5000 });
    
    // Scroll element into view
    await element.scrollIntoViewIfNeeded();
    
    const filename = this.generateFilename(name, 'element');
    const screenshotPath = path.join(
      this.options.screenshotDir,
      this.options.currentDir,
      filename
    );

    await element.screenshot({
      path: screenshotPath,
      animations: 'disabled',
      omitBackground: options.omitBackground || false,
      ...options
    });

    if (options.optimize !== false) {
      await this.optimizeScreenshot(screenshotPath);
    }

    return {
      path: screenshotPath,
      name: filename,
      type: 'element',
      selector,
      timestamp: new Date().toISOString()
    };
  }

  async captureMultipleViewports(name, viewports, options = {}) {
    console.log(`📊 Capturing multiple viewports for: ${name}`);
    
    const screenshots = [];
    
    for (const viewport of viewports) {
      const screenshot = await this.captureViewport(
        `${name}-${viewport.name}`,
        viewport,
        options
      );
      screenshots.push(screenshot);
    }

    // Create composite image if requested
    if (options.createComposite) {
      const compositePath = await this.createCompositeImage(screenshots, name);
      screenshots.push({
        path: compositePath,
        name: `${name}-composite.png`,
        type: 'composite',
        timestamp: new Date().toISOString()
      });
    }

    return screenshots;
  }

  async captureUserJourney(steps, name, options = {}) {
    console.log(`🛤️ Capturing user journey: ${name}`);
    
    const screenshots = [];
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Perform the step action
      if (step.action === 'navigate') {
        await this.navigationAgent.navigateToUrl(step.url);
      } else if (step.action === 'click') {
        await this.navigationAgent.clickElement(step.selector);
      } else if (step.action === 'fill') {
        await this.navigationAgent.fillForm(step.data);
      } else if (step.action === 'wait') {
        await this.navigationAgent.page.waitForTimeout(step.duration);
      }

      // Capture screenshot
      const stepName = `${name}-step-${i + 1}-${step.name}`;
      const screenshot = await this.captureFullPage(stepName, options);
      screenshots.push({
        ...screenshot,
        step: i + 1,
        stepName: step.name,
        action: step.action
      });
    }

    return screenshots;
  }

  async compareWithBaseline(currentScreenshotPath, baselineName, options = {}) {
    console.log(`🔍 Comparing with baseline: ${baselineName}`);
    
    const baselinePath = path.join(
      this.options.screenshotDir,
      this.options.baselineDir,
      baselineName
    );

    if (!fs.existsSync(baselinePath)) {
      console.log(`📋 Creating new baseline: ${baselineName}`);
      fs.copyFileSync(currentScreenshotPath, baselinePath);
      return {
        isNewBaseline: true,
        match: true,
        baselinePath
      };
    }

    const diffName = baselineName.replace('.png', '-diff.png');
    const diffPath = path.join(
      this.options.screenshotDir,
      this.options.diffDir,
      diffName
    );

    const result = await this.performPixelComparison(
      currentScreenshotPath,
      baselinePath,
      diffPath,
      options
    );

    return {
      ...result,
      baselinePath,
      diffPath: result.hasDifferences ? diffPath : null
    };
  }

  async performPixelComparison(currentPath, baselinePath, diffPath, options = {}) {
    const current = PNG.sync.read(fs.readFileSync(currentPath));
    const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
    
    const { width, height } = current;
    const diff = new PNG({ width, height });

    const threshold = options.threshold || this.options.threshold;
    const maxDiffPixels = options.maxDiffPixels || this.options.maxDiffPixels;

    const mismatchedPixels = pixelmatch(
      current.data,
      baseline.data,
      diff.data,
      width,
      height,
      {
        threshold,
        includeAA: options.includeAntialiasing !== false,
        alpha: options.alpha || 0.1,
        aaColor: options.aaColor || [255, 255, 0],
        diffColor: options.diffColor || [255, 0, 255],
        diffColorAlt: options.diffColorAlt || [0, 255, 255]
      }
    );

    const totalPixels = width * height;
    const diffPercentage = (mismatchedPixels / totalPixels) * 100;
    const hasDifferences = mismatchedPixels > maxDiffPixels;

    if (hasDifferences) {
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
    }

    return {
      match: !hasDifferences,
      hasDifferences,
      mismatchedPixels,
      totalPixels,
      diffPercentage: parseFloat(diffPercentage.toFixed(2)),
      threshold,
      maxDiffPixels
    };
  }

  async createCompositeImage(screenshots, name) {
    console.log(`🖼️ Creating composite image: ${name}`);
    
    const compositePath = path.join(
      this.options.screenshotDir,
      this.options.currentDir,
      `${name}-composite.png`
    );

    // Load all images
    const images = await Promise.all(
      screenshots.map(async (screenshot) => {
        const image = sharp(screenshot.path);
        const metadata = await image.metadata();
        return { image, metadata, screenshot };
      })
    );

    // Calculate composite dimensions
    const maxWidth = Math.max(...images.map(img => img.metadata.width));
    const totalHeight = images.reduce((sum, img) => sum + img.metadata.height, 0);

    // Create composite
    const composite = sharp({
      create: {
        width: maxWidth,
        height: totalHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    });

    const overlays = [];
    let currentTop = 0;

    for (const { image, metadata } of images) {
      overlays.push({
        input: await image.png().toBuffer(),
        top: currentTop,
        left: 0
      });
      currentTop += metadata.height;
    }

    await composite.composite(overlays).png().toFile(compositePath);
    
    return compositePath;
  }

  async disableAnimations() {
    const page = this.navigationAgent.page;
    
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          transform: none !important;
        }
        
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
          }
        }
      `
    });
  }

  async waitForStableLayout(timeout = 5000) {
    const page = this.navigationAgent.page;
    
    // Wait for network idle
    await page.waitForLoadState('networkidle');
    
    // Wait for layout stability
    let lastHeight = await page.evaluate(() => document.body.scrollHeight);
    let stableCount = 0;
    const maxChecks = 10;
    
    for (let i = 0; i < maxChecks; i++) {
      await page.waitForTimeout(500);
      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      
      if (currentHeight === lastHeight) {
        stableCount++;
        if (stableCount >= 3) break;
      } else {
        stableCount = 0;
        lastHeight = currentHeight;
      }
    }
  }

  async optimizeScreenshot(screenshotPath) {
    const optimized = await sharp(screenshotPath)
      .png({
        quality: this.options.quality,
        compressionLevel: 6,
        progressive: true
      })
      .toBuffer();

    fs.writeFileSync(screenshotPath, optimized);
  }

  generateFilename(name, type) {
    const sanitizedName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const timestamp = new Date().toISOString().split('T')[0];
    const device = this.navigationAgent.options.device.replace('.', '-');
    
    return `${sanitizedName}-${type}-${device}-${timestamp}.png`;
  }

  async generateReport(comparisons) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: comparisons.length,
        matches: comparisons.filter(c => c.match).length,
        differences: comparisons.filter(c => !c.match).length,
        newBaselines: comparisons.filter(c => c.isNewBaseline).length
      },
      comparisons: comparisons.map(comparison => ({
        name: comparison.name || 'unnamed',
        match: comparison.match,
        isNewBaseline: comparison.isNewBaseline || false,
        mismatchedPixels: comparison.mismatchedPixels || 0,
        diffPercentage: comparison.diffPercentage || 0,
        threshold: comparison.threshold,
        paths: {
          current: comparison.currentPath,
          baseline: comparison.baselinePath,
          diff: comparison.diffPath
        }
      }))
    };

    const reportPath = path.join('reports', `screenshot-comparison-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return { report, reportPath };
  }
}

export default ScreenshotAgent;