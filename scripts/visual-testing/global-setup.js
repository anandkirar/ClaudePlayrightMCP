/**
 * Global Setup for Playwright Visual Testing
 * Initializes test environment and prepares for AI-driven analysis
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalSetup(config) {
  console.log('🚀 Starting Playwright Visual Testing Global Setup...\n');

  try {
    // Ensure required directories exist
    await ensureDirectories();
    
    // Setup test environment
    await setupTestEnvironment();
    
    // Initialize baseline screenshots if needed
    await initializeBaselines();
    
    // Setup AI analysis environment
    await setupAIAnalysis();
    
    console.log('✅ Global setup completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

async function ensureDirectories() {
  console.log('📁 Ensuring required directories exist...');
  
  const directories = [
    'screenshots/baseline',
    'screenshots/current', 
    'screenshots/diff',
    'reports/visual',
    'reports/accessibility',
    'reports/performance',
    'test-results',
    'temp/ai-analysis'
  ];

  for (const dir of directories) {
    const fullPath = path.resolve(dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`  ✓ Created ${dir}`);
    }
  }
}

async function setupTestEnvironment() {
  console.log('⚙️ Setting up test environment...');
  
  // Create environment configuration
  const envConfig = {
    startTime: new Date().toISOString(),
    testRun: `visual-test-${Date.now()}`,
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    ci: !!process.env.CI,
    headless: process.env.HEADLESS !== 'false'
  };

  fs.writeFileSync(
    path.resolve('temp/test-environment.json'),
    JSON.stringify(envConfig, null, 2)
  );
  
  console.log(`  ✓ Test environment configured`);
  console.log(`  ✓ Base URL: ${envConfig.baseURL}`);
  console.log(`  ✓ Headless mode: ${envConfig.headless}`);
}

async function initializeBaselines() {
  console.log('📸 Checking baseline screenshots...');
  
  const baselineDir = path.resolve('screenshots/baseline');
  const baselineFiles = fs.existsSync(baselineDir) 
    ? fs.readdirSync(baselineDir).filter(f => f.endsWith('.png'))
    : [];

  if (baselineFiles.length === 0) {
    console.log('  ⚠️ No baseline screenshots found');
    console.log('  ℹ️ Run `npm run screenshots:baseline` to generate baselines');
  } else {
    console.log(`  ✓ Found ${baselineFiles.length} baseline screenshots`);
  }
}

async function setupAIAnalysis() {
  console.log('🤖 Setting up AI analysis environment...');
  
  // Create AI analysis configuration
  const aiConfig = {
    enabled: true,
    model: 'claude-sonnet-4',
    analysisTypes: [
      'visual_differences',
      'accessibility_issues', 
      'design_consistency',
      'responsive_behavior'
    ],
    reportFormat: 'markdown',
    includeScreenshots: true,
    severityLevels: ['critical', 'major', 'minor', 'info']
  };

  fs.writeFileSync(
    path.resolve('temp/ai-config.json'),
    JSON.stringify(aiConfig, null, 2)
  );
  
  // Prepare analysis templates
  const analysisPrompts = {
    visual_differences: `
      Analyze these two screenshots for visual differences:
      1. Identify any layout changes, color differences, or text modifications
      2. Rate the severity of each difference (critical/major/minor/info)
      3. Provide specific recommendations for fixes
      4. Focus on user-visible changes that affect usability
    `,
    accessibility_issues: `
      Review this screenshot for accessibility concerns:
      1. Check color contrast ratios
      2. Identify missing focus indicators
      3. Look for text readability issues
      4. Assess button and link visibility
      5. Verify proper spacing and touch targets
    `,
    design_consistency: `
      Evaluate design consistency across this interface:
      1. Check typography consistency (fonts, sizes, weights)
      2. Verify color palette adherence
      3. Assess spacing and alignment patterns
      4. Review component styling consistency
      5. Identify any design system violations
    `,
    responsive_behavior: `
      Analyze responsive behavior across different viewports:
      1. Check layout adaptation at different screen sizes
      2. Verify content remains accessible and readable
      3. Assess navigation and interaction patterns
      4. Identify any overflow or layout breaking issues
      5. Ensure touch targets are appropriately sized for mobile
    `
  };

  fs.writeFileSync(
    path.resolve('temp/analysis-prompts.json'),
    JSON.stringify(analysisPrompts, null, 2)
  );
  
  console.log('  ✓ AI analysis configuration ready');
}

export default globalSetup;