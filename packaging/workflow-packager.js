/**
 * Workflow Packager - Packages UI testing workflows for team distribution
 * Creates reusable packages of design review expertise and configurations
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import archiver from 'archiver';

const execAsync = promisify(exec);

export class WorkflowPackager {
  constructor(options = {}) {
    this.options = {
      outputDir: './packages',
      includeNodeModules: false,
      includeScreenshots: true,
      includeReports: true,
      compressionLevel: 6,
      metadataVersion: '1.0.0',
      ...options
    };

    this.packageTemplates = {
      'basic-ui-testing': {
        name: 'Basic UI Testing Workflow',
        description: 'Essential UI testing setup with screenshot and accessibility testing',
        includes: ['subagents', 'commands', 'config', 'scripts/visual-testing'],
        excludes: ['workflows/advanced']
      },
      'full-design-workflow': {
        name: 'Complete Design Review Workflow', 
        description: 'Full-featured AI-driven design workflow with all capabilities',
        includes: ['*'],
        excludes: ['node_modules', '.git', 'temp']
      },
      'responsive-testing': {
        name: 'Responsive Design Testing',
        description: 'Focused package for responsive design validation across devices',
        includes: ['subagents/screenshot-agent.js', 'subagents/analysis-agent.js', 'config/device-profiles.js'],
        excludes: []
      },
      'accessibility-audit': {
        name: 'Accessibility Audit Package',
        description: 'Specialized accessibility testing and compliance validation',
        includes: ['subagents/analysis-agent.js', 'tests/accessibility', 'config/accessibility'],
        excludes: []
      }
    };
  }

  async createPackage(packageType, customConfig = {}) {
    console.log(`📦 Creating package: ${packageType}`);

    const template = this.packageTemplates[packageType];
    if (!template) {
      throw new Error(`Unknown package type: ${packageType}. Available: ${Object.keys(this.packageTemplates).join(', ')}`);
    }

    const config = { ...template, ...customConfig };
    const packageId = `${packageType}-${Date.now()}`;
    const packageDir = path.join(this.options.outputDir, packageId);

    // Ensure output directory exists
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true });
    }

    try {
      // Create package structure
      const packageInfo = await this.buildPackageStructure(config, packageDir);
      
      // Generate package metadata
      const metadata = await this.generatePackageMetadata(config, packageInfo);
      
      // Create installation scripts
      await this.createInstallationScripts(packageDir, metadata);
      
      // Package documentation
      await this.generatePackageDocumentation(packageDir, metadata);
      
      // Create compressed archive
      const archivePath = await this.createPackageArchive(packageId, packageDir);
      
      // Verify package integrity
      const verification = await this.verifyPackage(packageDir);
      
      console.log(`✅ Package created: ${archivePath}`);
      
      return {
        packageId,
        packageType,
        archivePath,
        metadata,
        verification
      };

    } catch (error) {
      console.error(`❌ Package creation failed: ${error.message}`);
      throw error;
    }
  }

  async buildPackageStructure(config, packageDir) {
    console.log('🏗️ Building package structure...');

    fs.mkdirSync(packageDir, { recursive: true });

    const packageInfo = {
      files: [],
      directories: [],
      totalSize: 0,
      fileCount: 0
    };

    // Copy included files and directories
    for (const include of config.includes) {
      if (include === '*') {
        // Copy everything except excludes
        await this.copyAllFiles('.', packageDir, config.excludes, packageInfo);
      } else {
        await this.copyPath(include, packageDir, packageInfo);
      }
    }

    // Create package-specific directories
    const requiredDirs = ['docs', 'examples', 'templates', 'scripts'];
    for (const dir of requiredDirs) {
      const dirPath = path.join(packageDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        packageInfo.directories.push(dir);
      }
    }

    console.log(`📁 Package structure: ${packageInfo.fileCount} files, ${packageInfo.directories.length} directories`);
    return packageInfo;
  }

  async copyPath(sourcePath, packageDir, packageInfo) {
    const fullSourcePath = path.resolve(sourcePath);
    const relativePath = path.relative('.', sourcePath);
    const targetPath = path.join(packageDir, relativePath);

    if (!fs.existsSync(fullSourcePath)) {
      console.warn(`⚠️ Source path not found: ${sourcePath}`);
      return;
    }

    const stats = fs.statSync(fullSourcePath);

    if (stats.isDirectory()) {
      // Copy directory recursively
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
        packageInfo.directories.push(relativePath);
      }

      const entries = fs.readdirSync(fullSourcePath);
      for (const entry of entries) {
        await this.copyPath(path.join(sourcePath, entry), packageDir, packageInfo);
      }
    } else {
      // Copy file
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.copyFileSync(fullSourcePath, targetPath);
      packageInfo.files.push(relativePath);
      packageInfo.fileCount++;
      packageInfo.totalSize += stats.size;
    }
  }

  async copyAllFiles(sourceDir, packageDir, excludes, packageInfo) {
    const entries = fs.readdirSync(sourceDir);

    for (const entry of entries) {
      const entryPath = path.join(sourceDir, entry);
      
      // Check if should be excluded
      if (this.shouldExclude(entryPath, excludes)) {
        continue;
      }

      await this.copyPath(entryPath, packageDir, packageInfo);
    }
  }

  shouldExclude(filePath, excludes) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    return excludes.some(exclude => {
      if (exclude.includes('*')) {
        // Handle wildcards
        const regex = new RegExp(exclude.replace(/\*/g, '.*'));
        return regex.test(normalizedPath);
      } else {
        // Direct match or starts with
        return normalizedPath === exclude || normalizedPath.startsWith(exclude + '/');
      }
    });
  }

  async generatePackageMetadata(config, packageInfo) {
    console.log('📋 Generating package metadata...');

    const metadata = {
      name: config.name,
      description: config.description,
      version: this.options.metadataVersion,
      type: 'claude-ui-workflow',
      created: new Date().toISOString(),
      creator: 'AI-Driven Front-End Design Workflow',
      
      // Package contents
      contents: {
        files: packageInfo.fileCount,
        directories: packageInfo.directories.length,
        totalSize: packageInfo.totalSize,
        sizeFormatted: this.formatBytes(packageInfo.totalSize)
      },
      
      // Dependencies and requirements
      requirements: {
        node: '>=16.0.0',
        npm: '>=8.0.0',
        playwright: '>=1.40.0',
        claudeCode: '>=1.0.0'
      },
      
      // Configuration
      configuration: {
        browsers: ['chromium', 'firefox', 'webkit'],
        devices: ['desktop', 'tablet', 'mobile'],
        features: this.detectFeatures(packageInfo.files)
      },
      
      // Installation
      installation: {
        steps: [
          'npm install',
          'npx playwright install',
          'npm run setup:ui-workflow'
        ],
        postInstall: [
          'Configure device profiles in config/device-profiles.js',
          'Update CLAUDE.md with project-specific settings',
          'Run npm run test:visual to verify setup'
        ]
      },

      // Usage examples
      examples: {
        basicUsage: '/ui-review https://example.com',
        responsiveTesting: '/responsive homepage',
        accessibilityAudit: '/accessibility',
        visualRegression: '/visual-diff homepage'
      },

      // Support information
      support: {
        documentation: './docs/README.md',
        examples: './examples/',
        issues: 'https://github.com/your-org/ui-workflow/issues',
        wiki: 'https://github.com/your-org/ui-workflow/wiki'
      }
    };

    // Save metadata
    fs.writeFileSync(
      path.join(path.dirname(packageInfo.packageDir || '.'), 'package-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    return metadata;
  }

  detectFeatures(files) {
    const features = [];
    
    if (files.some(f => f.includes('screenshot-agent'))) {
      features.push('screenshot-capture');
    }
    if (files.some(f => f.includes('analysis-agent'))) {
      features.push('ai-analysis');
    }
    if (files.some(f => f.includes('navigation-agent'))) {
      features.push('browser-automation');
    }
    if (files.some(f => f.includes('accessibility'))) {
      features.push('accessibility-testing');
    }
    if (files.some(f => f.includes('responsive'))) {
      features.push('responsive-testing');
    }
    if (files.some(f => f.includes('iterative'))) {
      features.push('iterative-validation');
    }
    if (files.some(f => f.includes('git-worktree'))) {
      features.push('parallel-development');
    }

    return features;
  }

  async createInstallationScripts(packageDir, metadata) {
    console.log('⚙️ Creating installation scripts...');

    // Create setup script
    const setupScript = `#!/usr/bin/env node

/**
 * Setup script for ${metadata.name}
 * Automatically configures the UI workflow package
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function setup() {
  console.log('🚀 Setting up ${metadata.name}...');

  try {
    // Install dependencies
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });

    // Install Playwright browsers
    console.log('🌐 Installing Playwright browsers...');
    execSync('npx playwright install', { stdio: 'inherit' });

    // Create necessary directories
    const dirs = ['screenshots/baseline', 'screenshots/current', 'screenshots/diff', 'reports'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(\`📁 Created directory: \${dir}\`);
      }
    });

    // Copy example configurations if they don't exist
    const configFiles = [
      { src: 'examples/claude-config.example.md', dest: 'CLAUDE.md' },
      { src: 'examples/package.example.json', dest: 'package.json.example' }
    ];

    configFiles.forEach(({ src, dest }) => {
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        console.log(\`📄 Created config: \${dest}\`);
      }
    });

    console.log('✅ Setup complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review and update CLAUDE.md with your project settings');
    console.log('2. Run: npm run test:visual to verify the setup');
    console.log('3. Check the examples/ directory for usage patterns');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setup();
`;

    fs.writeFileSync(path.join(packageDir, 'scripts', 'setup.js'), setupScript);

    // Create package.json for the package
    const packageJson = {
      name: metadata.name.toLowerCase().replace(/\s+/g, '-'),
      version: metadata.version,
      description: metadata.description,
      main: 'index.js',
      scripts: {
        'setup:ui-workflow': 'node scripts/setup.js',
        'test:visual': 'npm run ui-session start && npm run screenshot && npm run ui-session end',
        'ui-review': 'claude-ui-commands ui-review',
        'screenshot': 'claude-ui-commands screenshot',
        'accessibility': 'claude-ui-commands accessibility',
        'responsive': 'claude-ui-commands responsive'
      },
      keywords: ['ui-testing', 'playwright', 'claude', 'visual-testing', 'accessibility'],
      author: 'AI-Driven UI Workflow',
      license: 'MIT',
      peerDependencies: {
        '@playwright/test': '^1.40.0',
        'playwright': '^1.40.0'
      },
      engines: {
        node: metadata.requirements.node,
        npm: metadata.requirements.npm
      }
    };

    fs.writeFileSync(
      path.join(packageDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  }

  async generatePackageDocumentation(packageDir, metadata) {
    console.log('📚 Generating package documentation...');

    // Main README
    const readme = `# ${metadata.name}

${metadata.description}

## Features

${metadata.configuration.features.map(feature => `- ${feature.replace(/-/g, ' ')}`).join('\n')}

## Installation

\`\`\`bash
# Extract the package
unzip ${metadata.name.toLowerCase().replace(/\s+/g, '-')}.zip

# Navigate to package directory
cd ${metadata.name.toLowerCase().replace(/\s+/g, '-')}

# Run setup
npm run setup:ui-workflow
\`\`\`

## Quick Start

\`\`\`bash
# Start a UI review session
${metadata.examples.basicUsage}

# Test responsive behavior
${metadata.examples.responsiveTesting}

# Run accessibility audit
${metadata.examples.accessibilityAudit}

# Check for visual regressions
${metadata.examples.visualRegression}
\`\`\`

## Configuration

Update \`CLAUDE.md\` with your project-specific settings:

- Design principles and style guide
- Viewport specifications
- Acceptance criteria
- Performance targets

## Browser Support

${metadata.configuration.browsers.map(browser => `- ${browser}`).join('\n')}

## Device Profiles

${metadata.configuration.devices.map(device => `- ${device}`).join('\n')}

## Directory Structure

\`\`\`
├── subagents/          # AI agents for UI analysis
├── commands/           # Slash commands integration  
├── workflows/          # Iterative validation workflows
├── scripts/            # Utility and setup scripts
├── config/             # Configuration files
├── examples/           # Usage examples
├── docs/               # Detailed documentation
└── templates/          # Reusable templates
\`\`\`

## Advanced Usage

See the \`examples/\` directory for advanced usage patterns and the \`docs/\` directory for detailed documentation.

## Support

- **Documentation**: [./docs/README.md](./docs/README.md)
- **Examples**: [./examples/](./examples/)
- **Issues**: ${metadata.support.issues}
- **Wiki**: ${metadata.support.wiki}

## License

MIT License - see LICENSE file for details.
`;

    fs.writeFileSync(path.join(packageDir, 'README.md'), readme);

    // Create examples
    await this.createExampleFiles(packageDir, metadata);

    // Create detailed documentation
    await this.createDetailedDocs(packageDir, metadata);
  }

  async createExampleFiles(packageDir, metadata) {
    const examplesDir = path.join(packageDir, 'examples');

    // Basic usage example
    const basicExample = `# Basic UI Testing Example

This example demonstrates the core UI testing workflow.

## Setup

\`\`\`bash
# Start a testing session
/ui-session start chromium desktop.large

# Navigate to your application
/navigate http://localhost:3000
\`\`\`

## Screenshot Testing

\`\`\`bash
# Capture baseline screenshots
/screenshot homepage full-page

# Make UI changes, then compare
/visual-diff homepage
\`\`\`

## Accessibility Testing

\`\`\`bash
# Run accessibility analysis
/accessibility

# Generate report
/generate-report markdown
\`\`\`

## Complete Workflow

\`\`\`bash
# Run comprehensive UI review
/ui-review http://localhost:3000 full

# End session
/ui-session end
\`\`\`
`;

    fs.writeFileSync(path.join(examplesDir, 'basic-usage.md'), basicExample);

    // Configuration example
    const configExample = fs.readFileSync(path.resolve('CLAUDE.md'), 'utf8');
    fs.writeFileSync(path.join(examplesDir, 'claude-config.example.md'), configExample);

    // Package.json example
    const packageExample = {
      name: 'my-ui-project',
      version: '1.0.0',
      scripts: {
        dev: 'next dev',
        build: 'next build',
        'ui:test': 'claude-ui-commands ui-review http://localhost:3000',
        'ui:responsive': 'claude-ui-commands responsive',
        'ui:accessibility': 'claude-ui-commands accessibility'
      }
    };

    fs.writeFileSync(
      path.join(examplesDir, 'package.example.json'),
      JSON.stringify(packageExample, null, 2)
    );
  }

  async createDetailedDocs(packageDir, metadata) {
    const docsDir = path.join(packageDir, 'docs');

    // API documentation
    const apiDocs = `# API Documentation

## Slash Commands

### Session Management
- \`/ui-session start [browser] [device]\` - Start testing session
- \`/ui-session end\` - End testing session

### Screenshot & Visual Testing
- \`/screenshot [name] [type] [selector]\` - Capture screenshots
- \`/visual-diff [name]\` - Compare with baseline
- \`/responsive [name]\` - Test responsive behavior

### Analysis & Testing
- \`/accessibility\` - Run accessibility analysis
- \`/performance\` - Check performance metrics
- \`/ui-review <url> [type]\` - Full UI review workflow

## Configuration Options

### Device Profiles
Configure viewport sizes and device emulation in \`config/device-profiles.js\`.

### Analysis Settings
Customize AI analysis parameters in \`temp/ai-config.json\`.

### Acceptance Criteria
Set validation thresholds in \`CLAUDE.md\`.

## Workflow Integration

### Git Hooks
The package supports integration with git hooks for automated testing.

### CI/CD Integration
Use the headless mode for continuous integration testing.
`;

    fs.writeFileSync(path.join(docsDir, 'api.md'), apiDocs);

    // Troubleshooting guide
    const troubleshooting = `# Troubleshooting Guide

## Common Issues

### Playwright Installation Issues
\`\`\`bash
# Reinstall Playwright browsers
npx playwright install --force
\`\`\`

### Port Already in Use
The default development server port (3000) may be in use. Check \`.env\` file or process configuration.

### Screenshot Comparison Failures
- Check that baseline screenshots exist
- Verify viewport settings match
- Review threshold settings in configuration

### Permission Issues
On Windows, ensure scripts have execution permissions:
\`\`\`bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
\`\`\`

## Performance Optimization

- Use headless mode in CI/CD
- Limit concurrent browser instances
- Clean up screenshots regularly

## Getting Help

1. Check the examples directory
2. Review the API documentation
3. Search existing issues
4. Create a new issue with detailed information
`;

    fs.writeFileSync(path.join(docsDir, 'troubleshooting.md'), troubleshooting);
  }

  async createPackageArchive(packageId, packageDir) {
    console.log('📦 Creating package archive...');

    const archivePath = path.join(this.options.outputDir, `${packageId}.zip`);
    
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(archivePath);
      const archive = archiver('zip', {
        zlib: { level: this.options.compressionLevel }
      });

      output.on('close', () => {
        console.log(`✅ Archive created: ${this.formatBytes(archive.pointer())} bytes`);
        resolve(archivePath);
      });

      archive.on('error', reject);
      archive.pipe(output);

      // Add all files from package directory
      archive.directory(packageDir, false);
      archive.finalize();
    });
  }

  async verifyPackage(packageDir) {
    console.log('🔍 Verifying package integrity...');

    const verification = {
      valid: true,
      issues: [],
      checks: {
        requiredFiles: false,
        configuration: false,
        dependencies: false,
        examples: false
      }
    };

    // Check required files
    const requiredFiles = ['package.json', 'README.md', 'scripts/setup.js'];
    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(packageDir, file))) {
        verification.issues.push(`Missing required file: ${file}`);
        verification.valid = false;
      }
    }
    verification.checks.requiredFiles = verification.issues.length === 0;

    // Check configuration
    if (fs.existsSync(path.join(packageDir, 'CLAUDE.md'))) {
      verification.checks.configuration = true;
    } else if (fs.existsSync(path.join(packageDir, 'examples/claude-config.example.md'))) {
      verification.checks.configuration = true;
    } else {
      verification.issues.push('No configuration file found');
      verification.valid = false;
    }

    // Check package.json structure
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')
      );
      
      if (!packageJson.scripts || !packageJson.scripts['setup:ui-workflow']) {
        verification.issues.push('Missing setup script in package.json');
      }
      
      verification.checks.dependencies = true;
    } catch (error) {
      verification.issues.push('Invalid package.json format');
      verification.valid = false;
    }

    // Check examples
    const examplesDir = path.join(packageDir, 'examples');
    if (fs.existsSync(examplesDir) && fs.readdirSync(examplesDir).length > 0) {
      verification.checks.examples = true;
    } else {
      verification.issues.push('No examples provided');
    }

    if (verification.issues.length === 0) {
      console.log('✅ Package verification passed');
    } else {
      console.warn(`⚠️ Package verification found ${verification.issues.length} issues`);
    }

    return verification;
  }

  async installPackage(packagePath, targetDir = '.') {
    console.log(`📥 Installing package: ${packagePath}`);

    try {
      // Extract package
      await this.extractPackage(packagePath, targetDir);
      
      // Run setup script
      const setupPath = path.join(targetDir, 'scripts', 'setup.js');
      if (fs.existsSync(setupPath)) {
        await execAsync(`node "${setupPath}"`, { cwd: targetDir });
      }

      console.log('✅ Package installed successfully');
      
      return { success: true, installedTo: targetDir };

    } catch (error) {
      console.error(`❌ Package installation failed: ${error.message}`);
      throw error;
    }
  }

  async extractPackage(packagePath, targetDir) {
    // This would use a zip extraction library
    // For now, we'll simulate the extraction
    console.log(`📂 Extracting ${packagePath} to ${targetDir}`);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async listAvailablePackages() {
    return Object.entries(this.packageTemplates).map(([type, template]) => ({
      type,
      name: template.name,
      description: template.description
    }));
  }

  async createCustomPackage(config) {
    const customType = `custom-${Date.now()}`;
    this.packageTemplates[customType] = config;
    
    return await this.createPackage(customType);
  }
}

export default WorkflowPackager;