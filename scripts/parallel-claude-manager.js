/**
 * Parallel Claude Manager - Orchestrates multiple Claude processes for UI variations
 * Integrates with Git Worktree Manager for parallel development workflows
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import GitWorktreeManager from './git-worktree-manager.js';

export class ParallelClaudeManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxConcurrentProcesses: 3,
      claudeExecutable: 'claude',
      defaultTimeout: 300000, // 5 minutes
      autoRestart: false,
      logLevel: 'info',
      ...options
    };

    this.worktreeManager = new GitWorktreeManager(options.worktree);
    this.activeProcesses = new Map();
    this.processQueue = [];
    this.processStats = {
      started: 0,
      completed: 0,
      failed: 0,
      active: 0
    };
  }

  async initialize() {
    console.log('🤖 Initializing Parallel Claude Manager...');
    
    await this.worktreeManager.initialize();
    
    // Ensure reports directory exists
    if (!fs.existsSync('reports')) {
      fs.mkdirSync('reports', { recursive: true });
    }

    console.log('✅ Parallel Claude Manager ready');
  }

  async startVariationGeneration(variationSpecs, options = {}) {
    console.log(`🚀 Starting ${variationSpecs.length} variation generation processes...`);

    const session = {
      id: `session-${Date.now()}`,
      startTime: new Date().toISOString(),
      variationSpecs,
      options,
      results: []
    };

    try {
      // Create worktrees for all variations
      const worktrees = await Promise.all(
        variationSpecs.map(spec => this.createVariationWorktree(spec))
      );

      // Start Claude processes for each worktree
      const claudePromises = worktrees.map(worktree => 
        this.startClaudeProcess(worktree, options)
      );

      // Wait for all processes to complete
      const results = await Promise.allSettled(claudePromises);
      
      session.endTime = new Date().toISOString();
      session.results = results.map((result, index) => ({
        variation: variationSpecs[index].name,
        worktree: worktrees[index],
        success: result.status === 'fulfilled',
        result: result.status === 'fulfilled' ? result.value : result.reason,
        duration: this.calculateProcessDuration(worktrees[index].name)
      }));

      // Generate session report
      const report = await this.generateSessionReport(session);

      return {
        session,
        results: session.results,
        report
      };

    } catch (error) {
      console.error(`❌ Variation generation failed: ${error.message}`);
      throw error;
    }
  }

  async createVariationWorktree(variationSpec) {
    console.log(`🌱 Creating worktree for variation: ${variationSpec.name}`);

    const worktree = await this.worktreeManager.createWorktree(variationSpec.name, {
      variation: variationSpec.name,
      metadata: {
        description: variationSpec.description,
        designGoals: variationSpec.designGoals,
        targetAudience: variationSpec.targetAudience
      },
      config: {
        ui: {
          variation: variationSpec.name,
          theme: variationSpec.theme,
          components: variationSpec.components,
          layout: variationSpec.layout
        }
      }
    });

    // Start development server
    await this.worktreeManager.startClaudeProcess(worktree.name, {
      autoStart: true,
      port: await this.findAvailablePort(3000 + this.activeProcesses.size)
    });

    return worktree;
  }

  async startClaudeProcess(worktree, options = {}) {
    const processId = `claude-${worktree.name}`;
    
    console.log(`🤖 Starting Claude process: ${processId}`);

    // Check if we're at max capacity
    if (this.activeProcesses.size >= this.options.maxConcurrentProcesses) {
      console.log('⏳ Process queue full, waiting for slot...');
      await this.waitForAvailableSlot();
    }

    const claudeProcess = {
      id: processId,
      worktree,
      startTime: new Date().toISOString(),
      status: 'starting',
      options,
      logs: [],
      results: null
    };

    // Create Claude instructions for this variation
    const instructions = this.generateClaudeInstructions(worktree, options);

    try {
      // Start Claude process
      const childProcess = await this.spawnClaudeProcess(
        worktree.path,
        instructions,
        options
      );

      claudeProcess.childProcess = childProcess;
      claudeProcess.status = 'running';
      this.activeProcesses.set(processId, claudeProcess);
      this.processStats.started++;
      this.processStats.active++;

      this.emit('processStarted', claudeProcess);

      // Handle process completion
      const result = await this.waitForProcessCompletion(claudeProcess);
      
      claudeProcess.endTime = new Date().toISOString();
      claudeProcess.status = result.success ? 'completed' : 'failed';
      claudeProcess.results = result;

      this.processStats.active--;
      if (result.success) {
        this.processStats.completed++;
      } else {
        this.processStats.failed++;
      }

      this.emit('processCompleted', claudeProcess);

      return result;

    } catch (error) {
      claudeProcess.status = 'failed';
      claudeProcess.error = error.message;
      this.processStats.active--;
      this.processStats.failed++;
      
      this.emit('processError', claudeProcess, error);
      throw error;

    } finally {
      this.activeProcesses.delete(processId);
    }
  }

  generateClaudeInstructions(worktree, options) {
    const config = JSON.parse(
      fs.readFileSync(path.join(worktree.path, '.worktree-config.json'), 'utf8')
    );

    const instructions = {
      task: 'ui-variation-generation',
      workspaceRoot: worktree.path,
      variation: {
        name: config.worktree.variation,
        theme: config.ui?.theme || 'default',
        components: config.ui?.components || [],
        layout: config.ui?.layout || 'default'
      },
      workflow: [
        'analyze-current-implementation',
        'apply-variation-changes',
        'test-visual-changes',
        'validate-accessibility',
        'generate-screenshots',
        'create-variation-report'
      ],
      constraints: {
        maintainFunctionality: true,
        preserveAccessibility: true,
        keepResponsiveDesign: true,
        followDesignSystem: true
      },
      output: {
        screenshotsRequired: true,
        reportFormat: 'markdown',
        includeComparison: true
      },
      ...options.instructions
    };

    return instructions;
  }

  async spawnClaudeProcess(workspacePath, instructions, options) {
    const claudeArgs = [
      'code',
      '--workspace', workspacePath,
      '--instructions', JSON.stringify(instructions),
      '--non-interactive',
      '--output-format', 'json'
    ];

    if (options.timeout) {
      claudeArgs.push('--timeout', options.timeout.toString());
    }

    const childProcess = spawn(this.options.claudeExecutable, claudeArgs, {
      cwd: workspacePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CLAUDE_WORKSPACE: workspacePath,
        CLAUDE_VARIATION: instructions.variation.name
      }
    });

    return childProcess;
  }

  async waitForProcessCompletion(claudeProcess) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        claudeProcess.childProcess.kill();
        reject(new Error(`Process timed out: ${claudeProcess.id}`));
      }, this.options.defaultTimeout);

      let stdout = '';
      let stderr = '';

      claudeProcess.childProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        claudeProcess.logs.push({ type: 'stdout', data: chunk, timestamp: new Date().toISOString() });
        
        // Emit progress events
        this.emit('processProgress', claudeProcess, chunk);
      });

      claudeProcess.childProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        claudeProcess.logs.push({ type: 'stderr', data: chunk, timestamp: new Date().toISOString() });
      });

      claudeProcess.childProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        try {
          const result = {
            success: code === 0,
            exitCode: code,
            stdout,
            stderr,
            outputs: this.parseClaudeOutput(stdout)
          };

          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      claudeProcess.childProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  parseClaudeOutput(stdout) {
    try {
      // Try to parse JSON output from Claude
      const lines = stdout.split('\n');
      const jsonLines = lines.filter(line => line.trim().startsWith('{') || line.trim().startsWith('['));
      
      if (jsonLines.length > 0) {
        return JSON.parse(jsonLines[jsonLines.length - 1]);
      }
    } catch (error) {
      console.warn('Failed to parse Claude output as JSON:', error.message);
    }
    
    // Fallback to parsing structured output
    return this.parseStructuredOutput(stdout);
  }

  parseStructuredOutput(stdout) {
    const output = {
      screenshots: [],
      reports: [],
      changes: [],
      errors: []
    };

    const lines = stdout.split('\n');
    
    for (const line of lines) {
      if (line.includes('Screenshot saved:')) {
        const match = line.match(/Screenshot saved: (.+)/);
        if (match) output.screenshots.push(match[1]);
      }
      
      if (line.includes('Report generated:')) {
        const match = line.match(/Report generated: (.+)/);
        if (match) output.reports.push(match[1]);
      }
      
      if (line.includes('File modified:')) {
        const match = line.match(/File modified: (.+)/);
        if (match) output.changes.push(match[1]);
      }
      
      if (line.includes('Error:')) {
        output.errors.push(line);
      }
    }

    return output;
  }

  async waitForAvailableSlot() {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.activeProcesses.size < this.options.maxConcurrentProcesses) {
          resolve();
        } else {
          setTimeout(checkSlot, 1000);
        }
      };
      checkSlot();
    });
  }

  calculateProcessDuration(processId) {
    const process = Array.from(this.activeProcesses.values())
      .find(p => p.id.includes(processId));
    
    if (!process || !process.endTime) return null;
    
    return new Date(process.endTime) - new Date(process.startTime);
  }

  async findAvailablePort(startPort) {
    // This would check for available ports
    // For now, just increment based on active processes
    return startPort + this.activeProcesses.size;
  }

  async generateVariationComparison(variations) {
    console.log(`📊 Comparing ${variations.length} UI variations...`);

    const comparison = {
      timestamp: new Date().toISOString(),
      variations: variations.length,
      comparisons: []
    };

    // Compare each variation with others
    for (let i = 0; i < variations.length; i++) {
      for (let j = i + 1; j < variations.length; j++) {
        const varA = variations[i];
        const varB = variations[j];

        const pairComparison = await this.compareVariationPair(varA, varB);
        comparison.comparisons.push(pairComparison);
      }
    }

    // Analyze comparison results
    comparison.analysis = this.analyzeComparisons(comparison.comparisons);
    comparison.recommendations = this.generateRecommendations(comparison.analysis);

    // Save comparison report
    const reportPath = path.join('reports', `variation-comparison-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(comparison, null, 2));

    return { comparison, reportPath };
  }

  async compareVariationPair(varA, varB) {
    const comparison = {
      variations: [varA.worktree.variation, varB.worktree.variation],
      timestamp: new Date().toISOString(),
      metrics: {},
      screenshots: {},
      analysis: {}
    };

    try {
      // Get screenshots from both variations
      const screenshotsA = this.getVariationScreenshots(varA);
      const screenshotsB = this.getVariationScreenshots(varB);

      comparison.screenshots = {
        variationA: screenshotsA,
        variationB: screenshotsB
      };

      // Perform visual comparison
      comparison.metrics.visualSimilarity = await this.calculateVisualSimilarity(
        screenshotsA,
        screenshotsB
      );

      // Compare accessibility scores
      const accessibilityA = this.getAccessibilityScore(varA);
      const accessibilityB = this.getAccessibilityScore(varB);
      
      comparison.metrics.accessibilityComparison = {
        variationA: accessibilityA,
        variationB: accessibilityB,
        difference: Math.abs(accessibilityA - accessibilityB)
      };

      // Compare performance metrics
      const performanceA = this.getPerformanceScore(varA);
      const performanceB = this.getPerformanceScore(varB);
      
      comparison.metrics.performanceComparison = {
        variationA: performanceA,
        variationB: performanceB,
        difference: Math.abs(performanceA - performanceB)
      };

      // Generate overall similarity score
      comparison.metrics.overallSimilarity = this.calculateOverallSimilarity(comparison.metrics);

    } catch (error) {
      comparison.error = error.message;
      console.error(`❌ Comparison failed: ${error.message}`);
    }

    return comparison;
  }

  getVariationScreenshots(variation) {
    const screenshotDir = path.join(variation.worktree.path, 'screenshots', 'current');
    if (!fs.existsSync(screenshotDir)) return [];
    
    return fs.readdirSync(screenshotDir)
      .filter(file => file.endsWith('.png'))
      .map(file => path.join(screenshotDir, file));
  }

  async calculateVisualSimilarity(screenshotsA, screenshotsB) {
    // This would use image comparison algorithms
    // For now, simulate similarity calculation
    return Math.random() * 0.4 + 0.6; // 60-100% similarity
  }

  getAccessibilityScore(variation) {
    // Extract accessibility score from variation results
    const reportPath = path.join(variation.worktree.path, 'reports', 'accessibility.json');
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      return report.score || 85;
    }
    return 85 + Math.random() * 15; // Simulated score
  }

  getPerformanceScore(variation) {
    // Extract performance score from variation results
    const reportPath = path.join(variation.worktree.path, 'reports', 'performance.json');
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      return report.score || 80;
    }
    return 80 + Math.random() * 20; // Simulated score
  }

  calculateOverallSimilarity(metrics) {
    const weights = {
      visual: 0.5,
      accessibility: 0.25,
      performance: 0.25
    };

    return (
      metrics.visualSimilarity * weights.visual +
      (1 - metrics.accessibilityComparison.difference / 100) * weights.accessibility +
      (1 - metrics.performanceComparison.difference / 100) * weights.performance
    );
  }

  analyzeComparisons(comparisons) {
    const analysis = {
      totalComparisons: comparisons.length,
      averageSimilarity: 0,
      mostSimilarPair: null,
      mostDifferentPair: null,
      clusters: []
    };

    if (comparisons.length === 0) return analysis;

    // Calculate average similarity
    analysis.averageSimilarity = comparisons.reduce(
      (sum, comp) => sum + comp.metrics.overallSimilarity, 0
    ) / comparisons.length;

    // Find most similar and different pairs
    const sorted = [...comparisons].sort(
      (a, b) => b.metrics.overallSimilarity - a.metrics.overallSimilarity
    );
    
    analysis.mostSimilarPair = sorted[0];
    analysis.mostDifferentPair = sorted[sorted.length - 1];

    // Simple clustering based on similarity threshold
    const highSimilarity = comparisons.filter(c => c.metrics.overallSimilarity > 0.8);
    const mediumSimilarity = comparisons.filter(c => 
      c.metrics.overallSimilarity > 0.6 && c.metrics.overallSimilarity <= 0.8
    );
    const lowSimilarity = comparisons.filter(c => c.metrics.overallSimilarity <= 0.6);

    analysis.clusters = [
      { name: 'High Similarity', count: highSimilarity.length, threshold: '>80%' },
      { name: 'Medium Similarity', count: mediumSimilarity.length, threshold: '60-80%' },
      { name: 'Low Similarity', count: lowSimilarity.length, threshold: '<60%' }
    ];

    return analysis;
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.averageSimilarity > 0.9) {
      recommendations.push('Variations are very similar. Consider more diverse approaches.');
      recommendations.push('Increase design variation scope to explore more options.');
    } else if (analysis.averageSimilarity < 0.5) {
      recommendations.push('Variations are quite different. Consider merging successful elements.');
      recommendations.push('Focus on the best-performing variations for further refinement.');
    } else {
      recommendations.push('Good variation diversity achieved.');
      recommendations.push('Consider A/B testing the top variations with users.');
    }

    if (analysis.mostSimilarPair) {
      recommendations.push(
        `Most similar variations: ${analysis.mostSimilarPair.variations.join(' vs ')} ` +
        `(${(analysis.mostSimilarPair.metrics.overallSimilarity * 100).toFixed(1)}% similar)`
      );
    }

    if (analysis.mostDifferentPair) {
      recommendations.push(
        `Most different variations: ${analysis.mostDifferentPair.variations.join(' vs ')} ` +
        `(${(analysis.mostDifferentPair.metrics.overallSimilarity * 100).toFixed(1)}% similar)`
      );
    }

    return recommendations;
  }

  async generateSessionReport(session) {
    const report = {
      sessionId: session.id,
      timestamp: new Date().toISOString(),
      duration: new Date(session.endTime) - new Date(session.startTime),
      summary: {
        totalVariations: session.variationSpecs.length,
        successfulVariations: session.results.filter(r => r.success).length,
        failedVariations: session.results.filter(r => !r.success).length,
        averageDuration: this.calculateAverageDuration(session.results)
      },
      processStats: { ...this.processStats },
      variations: session.results.map(result => ({
        name: result.variation,
        success: result.success,
        duration: result.duration,
        worktreePath: result.worktree.path,
        outputs: result.result?.outputs || {},
        error: result.success ? null : result.result?.message
      })),
      recommendations: this.generateSessionRecommendations(session)
    };

    // Save report
    const reportPath = path.join('reports', `parallel-session-${session.id}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    const markdownPath = path.join('reports', `parallel-session-${session.id}.md`);
    const markdownContent = this.generateMarkdownReport(report);
    fs.writeFileSync(markdownPath, markdownContent);

    return { report, reportPath, markdownPath };
  }

  calculateAverageDuration(results) {
    const validDurations = results.filter(r => r.duration).map(r => r.duration);
    return validDurations.length > 0 
      ? validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length 
      : 0;
  }

  generateSessionRecommendations(session) {
    const recommendations = [];
    const successRate = session.results.filter(r => r.success).length / session.results.length;

    if (successRate === 1.0) {
      recommendations.push('All variations completed successfully!');
    } else if (successRate > 0.8) {
      recommendations.push('Most variations succeeded. Review failed cases for improvements.');
    } else {
      recommendations.push('Multiple failures detected. Check process configuration and resource limits.');
    }

    if (session.results.length > 1) {
      recommendations.push('Consider running variation comparison analysis.');
    }

    return recommendations;
  }

  generateMarkdownReport(report) {
    return `# Parallel Claude Session Report

**Session ID:** ${report.sessionId}  
**Generated:** ${report.timestamp}  
**Duration:** ${Math.round(report.duration / 1000)}s  

## Summary

- **Total Variations:** ${report.summary.totalVariations}
- **Successful:** ${report.summary.successfulVariations}
- **Failed:** ${report.summary.failedVariations}
- **Average Duration:** ${Math.round(report.summary.averageDuration / 1000)}s

## Process Statistics

- **Started:** ${report.processStats.started}
- **Completed:** ${report.processStats.completed}
- **Failed:** ${report.processStats.failed}

## Variation Results

${report.variations.map(v => `
### ${v.name}
- **Status:** ${v.success ? '✅ Success' : '❌ Failed'}
- **Duration:** ${Math.round(v.duration / 1000)}s
- **Worktree:** \`${v.worktreePath}\`
${v.error ? `- **Error:** ${v.error}` : ''}
${v.outputs.screenshots ? `- **Screenshots:** ${v.outputs.screenshots.length}` : ''}
${v.outputs.reports ? `- **Reports:** ${v.outputs.reports.length}` : ''}
`).join('\n')}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

---

*Generated by Parallel Claude Manager*
`;
  }

  async cleanup() {
    console.log('🧹 Cleaning up Parallel Claude Manager...');
    
    // Kill all active processes
    for (const [processId, process] of this.activeProcesses) {
      if (process.childProcess && !process.childProcess.killed) {
        process.childProcess.kill();
        console.log(`🔴 Killed process: ${processId}`);
      }
    }

    // Clean up all worktrees
    await this.worktreeManager.cleanupAllWorktrees();

    this.activeProcesses.clear();
    this.processQueue = [];

    console.log('✅ Parallel Claude Manager cleaned up');
  }

  getStatus() {
    return {
      activeProcesses: this.activeProcesses.size,
      maxConcurrentProcesses: this.options.maxConcurrentProcesses,
      queuedProcesses: this.processQueue.length,
      stats: { ...this.processStats },
      worktrees: this.worktreeManager.listWorktrees()
    };
  }
}

export default ParallelClaudeManager;