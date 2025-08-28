/**
 * Claude Code Integration for UI Testing Slash Commands
 * Integrates slash commands with Claude Code's command system
 */

import { slashCommands } from './slash-commands.js';

/**
 * Register UI testing commands with Claude Code
 * This function should be called during Claude Code initialization
 */
export function registerUITestingCommands() {
  // Register each command individually for better integration
  const commands = {
    'ui-review': {
      description: 'Start comprehensive UI review workflow',
      usage: '/ui-review <url> [review-type]',
      category: 'UI Testing',
      handler: async (args, context) => {
        return await slashCommands.executeCommand(`/ui-review ${args.join(' ')}`, context);
      }
    },
    
    'screenshot': {
      description: 'Capture screenshots for visual testing',
      usage: '/screenshot [name] [type] [selector]',
      category: 'UI Testing',
      handler: async (args, context) => {
        return await slashCommands.executeCommand(`/screenshot ${args.join(' ')}`, context);
      }
    },
    
    'visual-diff': {
      description: 'Compare current UI state with baseline',
      usage: '/visual-diff [name]',
      category: 'UI Testing',
      handler: async (args, context) => {
        return await slashCommands.executeCommand(`/visual-diff ${args.join(' ')}`, context);
      }
    },
    
    'accessibility': {
      description: 'Run accessibility analysis on current page',
      usage: '/accessibility',
      category: 'UI Testing',
      handler: async (args, context) => {
        return await slashCommands.executeCommand('/accessibility', context);
      }
    },
    
    'responsive': {
      description: 'Test responsive behavior across viewports',
      usage: '/responsive [name]',
      category: 'UI Testing',
      handler: async (args, context) => {
        return await slashCommands.executeCommand(`/responsive ${args.join(' ')}`, context);
      }
    },
    
    'performance': {
      description: 'Check performance metrics and Core Web Vitals',
      usage: '/performance',
      category: 'UI Testing',
      handler: async (args, context) => {
        return await slashCommands.executeCommand('/performance', context);
      }
    },
    
    'ui-session': {
      description: 'Manage UI testing sessions',
      usage: '/ui-session <start|end> [browser] [device]',
      category: 'UI Testing',
      handler: async (args, context) => {
        const [action, ...sessionArgs] = args;
        if (action === 'start') {
          return await slashCommands.executeCommand(`/start-session ${sessionArgs.join(' ')}`, context);
        } else if (action === 'end') {
          return await slashCommands.executeCommand('/end-session', context);
        } else {
          return slashCommands.getSessionStatus();
        }
      }
    }
  };

  return commands;
}

/**
 * Claude Code command processor for UI testing workflows
 * Handles command parsing and context management
 */
export class ClaudeUITestingProcessor {
  constructor() {
    this.activeWorkflow = null;
    this.workflowHistory = [];
  }

  async processCommand(input, context = {}) {
    // Parse command and arguments
    const [command, ...args] = input.trim().split(' ');
    
    // Add Claude Code specific context
    const enhancedContext = {
      ...context,
      claudeCode: true,
      workspaceRoot: process.cwd(),
      timestamp: new Date().toISOString()
    };

    try {
      const result = await slashCommands.executeCommand(input, enhancedContext);
      
      // Track workflow for reporting
      if (result.success) {
        this.workflowHistory.push({
          command: input,
          result,
          timestamp: enhancedContext.timestamp
        });
      }

      return this.formatResultForClaude(result, command);
      
    } catch (error) {
      return {
        success: false,
        message: `Command execution failed: ${error.message}`,
        error: error.stack
      };
    }
  }

  formatResultForClaude(result, command) {
    // Format results for Claude Code's output system
    const formatted = {
      ...result,
      display: {
        type: 'ui-testing-result',
        command,
        timestamp: new Date().toISOString()
      }
    };

    // Add file references for Claude Code navigation
    if (result.screenshot?.path) {
      formatted.display.files = [result.screenshot.path];
    }
    
    if (result.reportPath) {
      formatted.display.files = [
        ...(formatted.display.files || []),
        result.reportPath
      ];
    }

    // Add summary for display
    if (result.analysis) {
      formatted.display.summary = {
        severity: result.analysis.severity,
        issues: result.analysis.findings?.length || 0
      };
    }

    return formatted;
  }

  async executeWorkflow(workflowName, parameters = {}) {
    console.log(`🔄 Executing workflow: ${workflowName}`);
    
    const workflows = {
      'full-ui-review': async (params) => {
        const commands = [
          `/start-session ${params.browser || 'chromium'} ${params.device || 'desktop.large'}`,
          `/navigate ${params.url}`,
          `/ui-review ${params.url} full`,
          `/generate-report markdown`,
          `/end-session`
        ];
        
        return await slashCommands.batchExecute(commands, { stopOnFailure: true });
      },
      
      'responsive-check': async (params) => {
        const commands = [
          `/start-session chromium desktop.large`,
          `/navigate ${params.url}`,
          `/responsive ${params.name || 'responsive-test'}`,
          `/generate-report markdown`,
          `/end-session`
        ];
        
        return await slashCommands.batchExecute(commands, { stopOnFailure: true });
      },
      
      'accessibility-audit': async (params) => {
        const commands = [
          `/start-session chromium desktop.large`,
          `/navigate ${params.url}`,
          `/accessibility`,
          `/generate-report markdown`,
          `/end-session`
        ];
        
        return await slashCommands.batchExecute(commands, { stopOnFailure: true });
      },
      
      'visual-regression': async (params) => {
        const commands = [
          `/start-session chromium desktop.large`,
          `/navigate ${params.url}`,
          `/visual-diff ${params.name || 'regression-test'}`,
          `/generate-report markdown`,
          `/end-session`
        ];
        
        return await slashCommands.batchExecute(commands, { stopOnFailure: true });
      }
    };

    if (!workflows[workflowName]) {
      throw new Error(`Unknown workflow: ${workflowName}`);
    }

    this.activeWorkflow = {
      name: workflowName,
      parameters,
      startTime: Date.now()
    };

    try {
      const results = await workflows[workflowName](parameters);
      
      this.activeWorkflow.endTime = Date.now();
      this.activeWorkflow.duration = this.activeWorkflow.endTime - this.activeWorkflow.startTime;
      this.activeWorkflow.results = results;
      
      return {
        success: true,
        workflow: workflowName,
        results,
        duration: this.activeWorkflow.duration
      };
      
    } catch (error) {
      return {
        success: false,
        workflow: workflowName,
        error: error.message
      };
    } finally {
      this.workflowHistory.push({ ...this.activeWorkflow });
      this.activeWorkflow = null;
    }
  }

  getWorkflowHistory() {
    return [...this.workflowHistory];
  }

  async generateWorkflowReport(format = 'markdown') {
    const report = {
      timestamp: new Date().toISOString(),
      totalWorkflows: this.workflowHistory.length,
      totalCommands: this.workflowHistory.reduce((sum, wf) => sum + (wf.results?.length || 0), 0),
      workflows: this.workflowHistory.map(wf => ({
        name: wf.name,
        parameters: wf.parameters,
        duration: wf.duration,
        success: wf.results?.every(r => r.result.success) || false,
        commands: wf.results?.length || 0
      }))
    };

    const reportPath = path.join('reports', `workflow-report-${Date.now()}.${format}`);
    
    if (format === 'markdown') {
      const markdown = this.generateWorkflowMarkdown(report);
      fs.writeFileSync(reportPath, markdown);
    } else {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    }

    return { report, reportPath };
  }

  generateWorkflowMarkdown(report) {
    return `# UI Testing Workflow Report

Generated: ${report.timestamp}

## Summary
- Total Workflows: ${report.totalWorkflows}
- Total Commands: ${report.totalCommands}
- Success Rate: ${report.workflows.filter(w => w.success).length}/${report.totalWorkflows}

## Workflows

${report.workflows.map(wf => `
### ${wf.name}
- **Duration**: ${wf.duration}ms
- **Commands**: ${wf.commands}
- **Status**: ${wf.success ? '✅ Success' : '❌ Failed'}
- **Parameters**: ${JSON.stringify(wf.parameters, null, 2)}
`).join('\n')}

---
*Generated by Claude Code UI Testing Integration*
`;
  }
}

// Export processor instance
export const claudeUIProcessor = new ClaudeUITestingProcessor();

/**
 * Claude Code hook integration
 * Allows commands to be triggered from Claude Code events
 */
export function setupClaudeCodeHooks() {
  return {
    // Trigger UI review on file changes in specific directories
    onFileChange: async (filePath, context) => {
      if (filePath.includes('/src/') || filePath.includes('/components/')) {
        console.log(`🔄 File changed: ${filePath}, considering UI review...`);
        
        // Auto-trigger visual regression test if configured
        if (process.env.AUTO_VISUAL_REGRESSION === 'true') {
          return await claudeUIProcessor.processCommand(
            `/visual-diff ${path.basename(filePath, path.extname(filePath))}`,
            { trigger: 'file-change', file: filePath }
          );
        }
      }
    },
    
    // Trigger accessibility check on deploy
    onDeploy: async (deployUrl, context) => {
      console.log(`🚀 Deployment detected: ${deployUrl}`);
      
      return await claudeUIProcessor.executeWorkflow('accessibility-audit', {
        url: deployUrl,
        trigger: 'deployment'
      });
    },
    
    // Trigger responsive check on PR
    onPullRequest: async (prUrl, context) => {
      console.log(`🔄 Pull request event: ${prUrl}`);
      
      return await claudeUIProcessor.executeWorkflow('responsive-check', {
        url: prUrl,
        trigger: 'pull-request'
      });
    }
  };
}