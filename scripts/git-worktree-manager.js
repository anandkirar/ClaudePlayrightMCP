/**
 * Git Worktree Manager for Parallel UI Design Generation
 * Enables multiple parallel Claude processes for UI variation testing
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GitWorktreeManager {
  constructor(options = {}) {
    this.options = {
      baseDir: './worktrees',
      branchPrefix: 'ui-variation',
      maxWorktrees: 5,
      autoCleanup: true,
      preserveNodeModules: true,
      ...options
    };

    this.activeWorktrees = new Map();
    this.processRegistry = new Map();
  }

  async initialize() {
    console.log('🌿 Initializing Git Worktree Manager...');
    
    // Ensure base directory exists
    if (!fs.existsSync(this.options.baseDir)) {
      fs.mkdirSync(this.options.baseDir, { recursive: true });
    }

    // Check if we're in a git repository
    try {
      await execAsync('git status');
    } catch (error) {
      throw new Error('Not in a git repository. Initialize git first.');
    }

    // Get current branch and commit
    const { stdout: currentBranch } = await execAsync('git branch --show-current');
    const { stdout: currentCommit } = await execAsync('git rev-parse HEAD');

    this.baseBranch = currentBranch.trim();
    this.baseCommit = currentCommit.trim();

    console.log(`✅ Git Worktree Manager initialized (base: ${this.baseBranch})`);
  }

  async createWorktree(variationName, options = {}) {
    const worktreeName = `${this.options.branchPrefix}-${variationName}-${Date.now()}`;
    const worktreePath = path.join(this.options.baseDir, worktreeName);
    const branchName = `${worktreeName}`;

    console.log(`🌱 Creating worktree: ${worktreeName}`);

    try {
      // Create the worktree with a new branch
      await execAsync(`git worktree add -b ${branchName} ${worktreePath} ${this.baseCommit}`);

      // Setup the worktree environment
      await this.setupWorktreeEnvironment(worktreePath, options);

      const worktree = {
        name: worktreeName,
        path: worktreePath,
        branch: branchName,
        variation: variationName,
        created: new Date().toISOString(),
        status: 'active',
        metadata: options.metadata || {}
      };

      this.activeWorktrees.set(worktreeName, worktree);

      console.log(`✅ Worktree created: ${worktreePath}`);
      return worktree;

    } catch (error) {
      console.error(`❌ Failed to create worktree: ${error.message}`);
      throw error;
    }
  }

  async setupWorktreeEnvironment(worktreePath, options = {}) {
    console.log('⚙️ Setting up worktree environment...');

    // Copy package.json and package-lock.json
    const packageFiles = ['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
    
    for (const file of packageFiles) {
      if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(worktreePath, file));
      }
    }

    // Symlink node_modules if preserveNodeModules is enabled
    if (this.options.preserveNodeModules && fs.existsSync('node_modules')) {
      const nodeModulesTarget = path.join(worktreePath, 'node_modules');
      const nodeModulesSource = path.resolve('node_modules');
      
      try {
        await execAsync(`mklink /D "${nodeModulesTarget}" "${nodeModulesSource}"`, { shell: 'cmd' });
        console.log('🔗 Node modules symlinked');
      } catch (error) {
        console.log('⚠️ Failed to symlink node_modules, will install dependencies');
        await this.installDependencies(worktreePath);
      }
    } else {
      await this.installDependencies(worktreePath);
    }

    // Copy configuration files
    const configFiles = [
      '.env',
      '.env.local',
      'tsconfig.json',
      'next.config.js',
      'vite.config.js',
      'webpack.config.js',
      'tailwind.config.js',
      'postcss.config.js'
    ];

    for (const file of configFiles) {
      if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(worktreePath, file));
      }
    }

    // Create worktree-specific configuration
    await this.createWorktreeConfig(worktreePath, options);
  }

  async installDependencies(worktreePath) {
    console.log('📦 Installing dependencies in worktree...');
    
    const packageManager = this.detectPackageManager();
    const installCommand = {
      npm: 'npm install',
      yarn: 'yarn install',
      pnpm: 'pnpm install'
    };

    try {
      await execAsync(installCommand[packageManager], { 
        cwd: worktreePath,
        timeout: 300000 // 5 minutes timeout
      });
      console.log('✅ Dependencies installed');
    } catch (error) {
      console.warn('⚠️ Failed to install dependencies:', error.message);
    }
  }

  detectPackageManager() {
    if (fs.existsSync('yarn.lock')) return 'yarn';
    if (fs.existsSync('pnpm-lock.yaml')) return 'pnpm';
    return 'npm';
  }

  async createWorktreeConfig(worktreePath, options) {
    const config = {
      worktree: {
        name: path.basename(worktreePath),
        created: new Date().toISOString(),
        variation: options.variation || 'default',
        port: options.port || await this.findAvailablePort(3000),
        devServer: {
          host: 'localhost',
          port: options.port || await this.findAvailablePort(3000)
        }
      },
      ui: {
        testing: {
          enabled: true,
          screenshotDir: path.join('screenshots', path.basename(worktreePath)),
          baselineDir: path.join('screenshots', 'baseline'),
          reportDir: path.join('reports', path.basename(worktreePath))
        }
      },
      ...options.config
    };

    fs.writeFileSync(
      path.join(worktreePath, '.worktree-config.json'),
      JSON.stringify(config, null, 2)
    );

    // Create worktree-specific environment variables
    const envContent = `# Worktree-specific environment variables
PORT=${config.worktree.port}
WORKTREE_NAME=${config.worktree.name}
WORKTREE_VARIATION=${config.worktree.variation}
`;

    fs.writeFileSync(path.join(worktreePath, '.env.worktree'), envContent);
  }

  async findAvailablePort(startPort = 3000) {
    for (let port = startPort; port < startPort + 100; port++) {
      try {
        await execAsync(`netstat -ano | find ":${port}"`);
      } catch (error) {
        // Port is available if netstat throws error
        return port;
      }
    }
    return startPort + Math.floor(Math.random() * 1000);
  }

  async startClaudeProcess(worktreeName, claudeConfig = {}) {
    const worktree = this.activeWorktrees.get(worktreeName);
    if (!worktree) {
      throw new Error(`Worktree not found: ${worktreeName}`);
    }

    console.log(`🤖 Starting Claude process for worktree: ${worktreeName}`);

    const config = JSON.parse(
      fs.readFileSync(path.join(worktree.path, '.worktree-config.json'), 'utf8')
    );

    // Create Claude-specific configuration
    const claudeProcessConfig = {
      workspaceRoot: worktree.path,
      variation: worktree.variation,
      port: config.worktree.port,
      branch: worktree.branch,
      ...claudeConfig
    };

    // Start development server if needed
    const devServerProcess = await this.startDevServer(worktree.path, config.worktree.port);

    // Register the process
    this.processRegistry.set(worktreeName, {
      worktree,
      config: claudeProcessConfig,
      devServer: devServerProcess,
      status: 'running',
      startTime: new Date().toISOString()
    });

    return claudeProcessConfig;
  }

  async startDevServer(worktreePath, port) {
    console.log(`🚀 Starting dev server on port ${port}...`);

    const packageManager = this.detectPackageManager();
    const startCommand = {
      npm: 'npm run dev',
      yarn: 'yarn dev',
      pnpm: 'pnpm dev'
    };

    try {
      const devProcess = exec(startCommand[packageManager], {
        cwd: worktreePath,
        env: { ...process.env, PORT: port.toString() }
      });

      // Wait for server to be ready
      await this.waitForServer(`http://localhost:${port}`, 30000);

      console.log(`✅ Dev server ready on port ${port}`);
      return devProcess;

    } catch (error) {
      console.error(`❌ Failed to start dev server: ${error.message}`);
      return null;
    }
  }

  async waitForServer(url, timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) return true;
      } catch (error) {
        // Server not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Server did not start within ${timeout}ms`);
  }

  async createUIVariations(baseUrl, variations) {
    console.log(`🎨 Creating ${variations.length} UI variations...`);

    const results = [];

    for (const variation of variations) {
      try {
        // Create worktree for this variation
        const worktree = await this.createWorktree(variation.name, {
          variation: variation.name,
          metadata: variation.metadata
        });

        // Start Claude process
        const claudeConfig = await this.startClaudeProcess(worktree.name, {
          instructions: variation.instructions,
          designSpecs: variation.designSpecs,
          autoApplyChanges: variation.autoApplyChanges || false
        });

        results.push({
          variation: variation.name,
          worktree,
          claudeConfig,
          status: 'created'
        });

      } catch (error) {
        console.error(`❌ Failed to create variation ${variation.name}: ${error.message}`);
        results.push({
          variation: variation.name,
          status: 'failed',
          error: error.message
        });
      }
    }

    return results;
  }

  async compareVariations(variations, comparisonConfig = {}) {
    console.log('🔍 Comparing UI variations...');

    const comparisons = [];

    for (let i = 0; i < variations.length; i++) {
      for (let j = i + 1; j < variations.length; j++) {
        const varA = variations[i];
        const varB = variations[j];

        console.log(`📊 Comparing ${varA.variation} vs ${varB.variation}`);

        try {
          const comparison = await this.performVariationComparison(varA, varB, comparisonConfig);
          comparisons.push(comparison);
        } catch (error) {
          console.error(`❌ Comparison failed: ${error.message}`);
        }
      }
    }

    // Generate comparison report
    const report = await this.generateComparisonReport(comparisons, variations);
    
    return { comparisons, report };
  }

  async performVariationComparison(varA, varB, config) {
    const comparison = {
      variationA: varA.variation,
      variationB: varB.variation,
      timestamp: new Date().toISOString(),
      screenshots: {},
      analysis: {},
      scores: {}
    };

    // Capture screenshots from both variations
    const portA = varA.claudeConfig.port;
    const portB = varB.claudeConfig.port;

    // This would integrate with the screenshot agents
    comparison.screenshots = {
      variationA: `http://localhost:${portA}`,
      variationB: `http://localhost:${portB}`
    };

    // Simulate analysis results
    comparison.analysis = {
      visualSimilarity: Math.random() * 0.3 + 0.7, // 70-100%
      accessibilityComparison: {
        varA: 85 + Math.random() * 15,
        varB: 85 + Math.random() * 15
      },
      performanceComparison: {
        varA: 80 + Math.random() * 20,
        varB: 80 + Math.random() * 20
      }
    };

    comparison.scores = {
      overall: (comparison.analysis.visualSimilarity + 
               comparison.analysis.accessibilityComparison.varA / 100 +
               comparison.analysis.performanceComparison.varA / 100) / 3,
      recommendation: comparison.analysis.visualSimilarity < 0.8 ? 
        'Significant differences detected' : 'Variations are similar'
    };

    return comparison;
  }

  async generateComparisonReport(comparisons, variations) {
    const report = {
      timestamp: new Date().toISOString(),
      totalVariations: variations.length,
      totalComparisons: comparisons.length,
      summary: {
        mostSimilar: null,
        mostDifferent: null,
        averageSimilarity: 0
      },
      recommendations: []
    };

    if (comparisons.length > 0) {
      // Find most similar and different pairs
      const sorted = [...comparisons].sort((a, b) => b.analysis.visualSimilarity - a.analysis.visualSimilarity);
      report.summary.mostSimilar = sorted[0];
      report.summary.mostDifferent = sorted[sorted.length - 1];

      // Calculate average similarity
      report.summary.averageSimilarity = comparisons.reduce(
        (sum, comp) => sum + comp.analysis.visualSimilarity, 0
      ) / comparisons.length;

      // Generate recommendations
      if (report.summary.averageSimilarity > 0.9) {
        report.recommendations.push('Variations are very similar - consider more diverse approaches');
      } else if (report.summary.averageSimilarity < 0.7) {
        report.recommendations.push('Variations are quite different - consider converging on best elements');
      }
    }

    // Save report
    const reportPath = path.join('reports', `variation-comparison-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📊 Comparison report saved: ${reportPath}`);
    return { report, reportPath };
  }

  async mergeVariation(worktreeName, targetBranch = null) {
    const worktree = this.activeWorktrees.get(worktreeName);
    if (!worktree) {
      throw new Error(`Worktree not found: ${worktreeName}`);
    }

    const target = targetBranch || this.baseBranch;
    console.log(`🔄 Merging ${worktree.branch} into ${target}...`);

    try {
      // Switch to target branch
      await execAsync(`git checkout ${target}`);

      // Merge the variation branch
      await execAsync(`git merge ${worktree.branch} --no-ff -m "Merge UI variation: ${worktree.variation}"`);

      console.log(`✅ Successfully merged ${worktree.variation}`);
      
      // Clean up worktree after successful merge
      if (this.options.autoCleanup) {
        await this.cleanupWorktree(worktreeName);
      }

      return { success: true, merged: true };

    } catch (error) {
      console.error(`❌ Merge failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async cleanupWorktree(worktreeName) {
    const worktree = this.activeWorktrees.get(worktreeName);
    if (!worktree) {
      console.warn(`Worktree not found for cleanup: ${worktreeName}`);
      return;
    }

    console.log(`🧹 Cleaning up worktree: ${worktreeName}`);

    try {
      // Stop dev server if running
      const process = this.processRegistry.get(worktreeName);
      if (process?.devServer) {
        process.devServer.kill();
      }

      // Remove worktree
      await execAsync(`git worktree remove --force ${worktree.path}`);

      // Delete branch
      await execAsync(`git branch -D ${worktree.branch}`);

      // Remove from registries
      this.activeWorktrees.delete(worktreeName);
      this.processRegistry.delete(worktreeName);

      console.log(`✅ Cleaned up worktree: ${worktreeName}`);

    } catch (error) {
      console.error(`❌ Cleanup failed: ${error.message}`);
    }
  }

  async cleanupAllWorktrees() {
    console.log('🧹 Cleaning up all active worktrees...');

    const cleanupPromises = Array.from(this.activeWorktrees.keys()).map(
      worktreeName => this.cleanupWorktree(worktreeName)
    );

    await Promise.allSettled(cleanupPromises);
    console.log('✅ All worktrees cleaned up');
  }

  async listWorktrees() {
    return {
      active: Array.from(this.activeWorktrees.values()),
      processes: Array.from(this.processRegistry.values()),
      baseInfo: {
        baseBranch: this.baseBranch,
        baseCommit: this.baseCommit
      }
    };
  }

  async getWorktreeStatus(worktreeName) {
    const worktree = this.activeWorktrees.get(worktreeName);
    const process = this.processRegistry.get(worktreeName);

    if (!worktree) {
      return { exists: false };
    }

    return {
      exists: true,
      worktree,
      process,
      isRunning: process?.status === 'running'
    };
  }

  // Utility method for external integrations
  async createVariationWorkflow(variationSpecs) {
    console.log(`🚀 Starting variation workflow with ${variationSpecs.length} variations...`);

    // Create all variations
    const variations = await this.createUIVariations(variationSpecs[0].baseUrl, variationSpecs);

    // Wait for all variations to be ready
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Compare variations
    const { comparisons, report } = await this.compareVariations(
      variations.filter(v => v.status === 'created')
    );

    // Generate workflow report
    const workflowReport = {
      timestamp: new Date().toISOString(),
      specifications: variationSpecs,
      createdVariations: variations.length,
      successfulVariations: variations.filter(v => v.status === 'created').length,
      comparisons: comparisons.length,
      comparisonReport: report
    };

    const workflowReportPath = path.join('reports', `variation-workflow-${Date.now()}.json`);
    fs.writeFileSync(workflowReportPath, JSON.stringify(workflowReport, null, 2));

    return {
      variations,
      comparisons,
      report: workflowReport,
      reportPath: workflowReportPath
    };
  }
}

export default GitWorktreeManager;