/**
 * AI-Driven Front-End Design Workflow - Main Entry Point
 * Complete integration of all components for Claude Code
 */

// Core Components
export { default as NavigationAgent } from './subagents/navigation-agent.js';
export { default as ScreenshotAgent } from './subagents/screenshot-agent.js';
export { default as AnalysisAgent } from './subagents/analysis-agent.js';

// Command System
export { default as SlashCommands, slashCommands } from './commands/slash-commands.js';
export { 
  registerUITestingCommands,
  ClaudeUITestingProcessor,
  claudeUIProcessor,
  setupClaudeCodeHooks
} from './commands/claude-integration.js';

// Workflow Orchestration
export { default as IterativeValidationWorkflow } from './workflows/iterative-validation.js';
export { default as SelfCorrectionAgent } from './workflows/self-correction-agent.js';

// Parallel Processing
export { default as GitWorktreeManager } from './scripts/git-worktree-manager.js';
export { default as ParallelClaudeManager } from './scripts/parallel-claude-manager.js';

// Packaging & Distribution
export { default as WorkflowPackager } from './packaging/workflow-packager.js';

// Utilities
export { VisualTestingUtils } from './scripts/visual-testing/utils.js';
export { deviceProfiles } from './config/device-profiles.js';

/**
 * Main Workflow Orchestrator - High-level API for external integrations
 */
export class UIWorkflowOrchestrator {
  constructor(options = {}) {
    this.options = {
      defaultBrowser: 'chromium',
      defaultDevice: 'desktop.large',
      autoStartSession: true,
      enableParallelProcessing: false,
      maxConcurrentProcesses: 3,
      ...options
    };

    this.slashCommands = slashCommands;
    this.parallelManager = null;
    this.activeSession = null;
  }

  async initialize() {
    console.log('🚀 Initializing UI Workflow Orchestrator...');

    // Initialize parallel processing if enabled
    if (this.options.enableParallelProcessing) {
      const { default: ParallelClaudeManager } = await import('./scripts/parallel-claude-manager.js');
      this.parallelManager = new ParallelClaudeManager({
        maxConcurrentProcesses: this.options.maxConcurrentProcesses
      });
      await this.parallelManager.initialize();
    }

    console.log('✅ UI Workflow Orchestrator ready');
  }

  // High-level workflow methods
  async runComprehensiveUIReview(url, options = {}) {
    const reviewOptions = {
      browser: this.options.defaultBrowser,
      device: this.options.defaultDevice,
      reviewType: 'full',
      ...options
    };

    console.log(`🔍 Starting comprehensive UI review: ${url}`);

    try {
      // Auto-start session if needed
      if (this.options.autoStartSession && !this.slashCommands.getSessionStatus().active) {
        await this.slashCommands.executeCommand(
          `/start-session ${reviewOptions.browser} ${reviewOptions.device}`
        );
      }

      // Execute comprehensive review
      const result = await this.slashCommands.executeCommand(`/ui-review ${url} ${reviewOptions.reviewType}`);

      return {
        success: result.success,
        url,
        result: result.results,
        recommendations: this.generateRecommendations(result.results)
      };

    } catch (error) {
      console.error(`❌ UI review failed: ${error.message}`);
      throw error;
    }
  }

  async createUIVariations(baseUrl, variations, options = {}) {
    if (!this.parallelManager) {
      throw new Error('Parallel processing not enabled. Set enableParallelProcessing: true');
    }

    console.log(`🎨 Creating ${variations.length} UI variations...`);

    const variationSpecs = variations.map(variation => ({
      name: variation.name,
      description: variation.description || `UI variation: ${variation.name}`,
      designGoals: variation.designGoals || [],
      theme: variation.theme || 'default',
      components: variation.components || [],
      layout: variation.layout || 'default',
      baseUrl
    }));

    try {
      const result = await this.parallelManager.startVariationGeneration(variationSpecs, options);
      
      // Generate comparison if successful variations > 1
      if (result.results.filter(r => r.success).length > 1) {
        const comparison = await this.parallelManager.generateVariationComparison(
          result.results.filter(r => r.success)
        );
        result.comparison = comparison;
      }

      return result;

    } catch (error) {
      console.error(`❌ Variation creation failed: ${error.message}`);
      throw error;
    }
  }

  async runIterativeValidation(url, designSpecs, options = {}) {
    const { default: IterativeValidationWorkflow } = await import('./workflows/iterative-validation.js');
    
    const validator = new IterativeValidationWorkflow({
      maxIterations: options.maxIterations || 10,
      acceptanceCriteria: options.acceptanceCriteria || {}
    });

    try {
      await validator.initialize(
        options.browser || this.options.defaultBrowser,
        options.device || this.options.defaultDevice
      );

      const result = await validator.validateAgainstSpecs(url, designSpecs, options);
      
      return {
        converged: result.converged,
        iterations: result.iterations,
        finalScores: result.session?.iterations?.slice(-1)?.[0]?.scores,
        report: result.report
      };

    } finally {
      await validator.cleanup();
    }
  }

  async packageWorkflow(packageType, options = {}) {
    const { default: WorkflowPackager } = await import('./packaging/workflow-packager.js');
    
    const packager = new WorkflowPackager(options);
    return await packager.createPackage(packageType, options);
  }

  generateRecommendations(reviewResults) {
    const recommendations = [];

    if (reviewResults?.accessibility?.severity === 'critical') {
      recommendations.push('🚨 Critical accessibility issues found - immediate attention required');
    }

    if (reviewResults?.performance?.evaluation?.lcp === 'poor') {
      recommendations.push('⚡ Poor Largest Contentful Paint - optimize images and server response');
    }

    if (reviewResults?.responsive?.score < 7) {
      recommendations.push('📱 Responsive design needs improvement - check mobile layouts');
    }

    if (reviewResults?.screenshot?.comparison && !reviewResults.screenshot.comparison.match) {
      recommendations.push('👀 Visual differences detected - review UI changes against baseline');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ UI review looks good - no major issues detected');
    }

    return recommendations;
  }

  // Utility methods
  async getSystemStatus() {
    return {
      orchestrator: {
        initialized: true,
        options: this.options
      },
      session: this.slashCommands.getSessionStatus(),
      parallelManager: this.parallelManager ? this.parallelManager.getStatus() : null
    };
  }

  async cleanup() {
    console.log('🧹 Cleaning up UI Workflow Orchestrator...');
    
    if (this.slashCommands.getSessionStatus().active) {
      await this.slashCommands.executeCommand('/end-session');
    }

    if (this.parallelManager) {
      await this.parallelManager.cleanup();
    }

    console.log('✅ Cleanup complete');
  }
}

// Export convenience functions for direct usage
export async function quickUIReview(url, options = {}) {
  const orchestrator = new UIWorkflowOrchestrator(options);
  await orchestrator.initialize();
  
  try {
    return await orchestrator.runComprehensiveUIReview(url, options);
  } finally {
    await orchestrator.cleanup();
  }
}

export async function createPackage(packageType, options = {}) {
  const packager = new WorkflowPackager(options);
  return await packager.createPackage(packageType, options);
}

// Claude Code Integration Hook
export function setupUIWorkflow(claudeOptions = {}) {
  const orchestrator = new UIWorkflowOrchestrator(claudeOptions);
  
  return {
    orchestrator,
    commands: registerUITestingCommands(),
    hooks: setupClaudeCodeHooks(),
    
    // Convenience methods for Claude Code
    async runUIReview(url, options = {}) {
      if (!orchestrator.initialized) {
        await orchestrator.initialize();
      }
      return await orchestrator.runComprehensiveUIReview(url, options);
    },
    
    async createVariations(baseUrl, variations, options = {}) {
      if (!orchestrator.initialized) {
        await orchestrator.initialize();
      }
      return await orchestrator.createUIVariations(baseUrl, variations, options);
    },
    
    async cleanup() {
      await orchestrator.cleanup();
    }
  };
}

export default UIWorkflowOrchestrator;