/**
 * Slash Commands for AI-Driven Front-End Design Workflow
 * Provides intuitive command interface for Claude Code integration
 */

import fs from 'fs';
import path from 'path';
import NavigationAgent from '../subagents/navigation-agent.js';
import ScreenshotAgent from '../subagents/screenshot-agent.js';
import AnalysisAgent from '../subagents/analysis-agent.js';
import { deviceProfiles } from '../config/device-profiles.js';

export class SlashCommands {
  constructor() {
    this.navigationAgent = null;
    this.screenshotAgent = null;
    this.analysisAgent = null;
    this.activeSession = null;
    
    this.commands = {
      '/ui-review': this.startUIReview.bind(this),
      '/screenshot': this.takeScreenshot.bind(this),
      '/compare': this.compareScreenshots.bind(this),
      '/accessibility': this.runAccessibilityCheck.bind(this),
      '/performance': this.runPerformanceCheck.bind(this),
      '/responsive': this.testResponsive.bind(this),
      '/navigate': this.navigateToUrl.bind(this),
      '/visual-diff': this.runVisualDiff.bind(this),
      '/generate-report': this.generateReport.bind(this),
      '/start-session': this.startSession.bind(this),
      '/end-session': this.endSession.bind(this),
      '/help': this.showHelp.bind(this)
    };
  }

  async executeCommand(commandLine, context = {}) {
    const [command, ...args] = commandLine.trim().split(' ');
    
    if (!this.commands[command]) {
      return {
        success: false,
        message: `Unknown command: ${command}. Type /help for available commands.`
      };
    }

    try {
      console.log(`⚡ Executing command: ${command}`);
      const result = await this.commands[command](args, context);
      return { success: true, ...result };
    } catch (error) {
      console.error(`❌ Command failed: ${error.message}`);
      return {
        success: false,
        message: `Command failed: ${error.message}`,
        error: error.stack
      };
    }
  }

  async startSession(args, context) {
    const [browser = 'chromium', device = 'desktop.large'] = args;
    
    console.log(`🚀 Starting UI testing session (${browser}, ${device})...`);
    
    // Initialize agents
    this.navigationAgent = new NavigationAgent({ browser, device });
    await this.navigationAgent.initialize();
    
    this.screenshotAgent = new ScreenshotAgent(this.navigationAgent);
    this.analysisAgent = new AnalysisAgent(this.navigationAgent);
    
    this.activeSession = {
      id: `session-${Date.now()}`,
      browser,
      device,
      startTime: new Date().toISOString(),
      screenshots: [],
      analyses: []
    };

    return {
      message: `UI testing session started with ${browser} on ${device}`,
      sessionId: this.activeSession.id,
      browser,
      device
    };
  }

  async endSession(args, context) {
    if (!this.activeSession) {
      return { message: 'No active session to end' };
    }

    console.log('🔚 Ending UI testing session...');
    
    // Clean up agents
    if (this.navigationAgent) {
      await this.navigationAgent.close();
    }
    
    const sessionSummary = {
      ...this.activeSession,
      endTime: new Date().toISOString(),
      duration: Date.now() - new Date(this.activeSession.startTime).getTime(),
      screenshots: this.activeSession.screenshots.length,
      analyses: this.activeSession.analyses.length
    };

    // Save session data
    const sessionPath = path.join('reports', `session-${this.activeSession.id}.json`);
    fs.writeFileSync(sessionPath, JSON.stringify(sessionSummary, null, 2));

    this.navigationAgent = null;
    this.screenshotAgent = null;
    this.analysisAgent = null;
    this.activeSession = null;

    return {
      message: 'UI testing session ended',
      summary: sessionSummary,
      reportPath: sessionPath
    };
  }

  async navigateToUrl(args, context) {
    if (!this.navigationAgent) {
      return { message: 'No active session. Use /start-session first.' };
    }

    const [url, ...options] = args;
    if (!url) {
      return { message: 'URL required. Usage: /navigate <url>' };
    }

    const result = await this.navigationAgent.navigateToUrl(url);
    
    return {
      message: result.success ? `Navigated to ${url}` : `Navigation failed: ${result.error}`,
      url,
      success: result.success,
      pageInfo: result.success ? await this.navigationAgent.getPageInfo() : null
    };
  }

  async takeScreenshot(args, context) {
    if (!this.screenshotAgent) {
      return { message: 'No active session. Use /start-session first.' };
    }

    const [name = 'unnamed', type = 'full-page', selector] = args;
    
    let screenshot;
    if (type === 'element' && selector) {
      screenshot = await this.screenshotAgent.captureElement(selector, name);
    } else {
      screenshot = await this.screenshotAgent.captureFullPage(name);
    }

    this.activeSession.screenshots.push(screenshot);

    return {
      message: `Screenshot captured: ${screenshot.name}`,
      screenshot,
      path: screenshot.path
    };
  }

  async compareScreenshots(args, context) {
    if (!this.screenshotAgent) {
      return { message: 'No active session. Use /start-session first.' };
    }

    const [currentPath, baselineName] = args;
    if (!currentPath || !baselineName) {
      return { 
        message: 'Usage: /compare <current-screenshot-path> <baseline-name>' 
      };
    }

    const comparison = await this.screenshotAgent.compareWithBaseline(currentPath, baselineName);
    
    return {
      message: comparison.match ? 
        `Screenshots match within threshold` : 
        `Screenshots differ: ${comparison.diffPercentage}% difference`,
      comparison,
      match: comparison.match,
      diffPath: comparison.diffPath
    };
  }

  async runAccessibilityCheck(args, context) {
    if (!this.analysisAgent) {
      return { message: 'No active session. Use /start-session first.' };
    }

    console.log('♿ Running accessibility analysis...');
    const analysis = await this.analysisAgent.analyzeAccessibility();
    
    this.activeSession.analyses.push(analysis);

    return {
      message: `Accessibility check completed (${analysis.severity})`,
      analysis,
      violations: analysis.automated.violations.length,
      severity: analysis.severity
    };
  }

  async runPerformanceCheck(args, context) {
    if (!this.analysisAgent) {
      return { message: 'No active session. Use /start-session first.' };
    }

    console.log('⚡ Running performance analysis...');
    const analysis = await this.analysisAgent.checkPerformanceMetrics();
    
    this.activeSession.analyses.push(analysis);

    return {
      message: 'Performance check completed',
      analysis,
      metrics: analysis.metrics,
      evaluation: analysis.evaluation
    };
  }

  async testResponsive(args, context) {
    if (!this.screenshotAgent || !this.analysisAgent) {
      return { message: 'No active session. Use /start-session first.' };
    }

    const [name = 'responsive-test'] = args;
    
    console.log('📱 Testing responsive behavior...');
    
    // Define responsive viewports to test
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 }
    ];

    // Capture screenshots at different viewports
    const screenshots = await this.screenshotAgent.captureMultipleViewports(name, viewports);
    
    // Analyze responsive behavior
    const analysis = await this.analysisAgent.analyzeResponsiveBehavior(screenshots);
    
    this.activeSession.screenshots.push(...screenshots);
    this.activeSession.analyses.push(analysis);

    return {
      message: `Responsive test completed (score: ${analysis.overallScore}/10)`,
      screenshots: screenshots.length,
      analysis,
      score: analysis.overallScore
    };
  }

  async runVisualDiff(args, context) {
    if (!this.screenshotAgent || !this.analysisAgent) {
      return { message: 'No active session. Use /start-session first.' };
    }

    const [name = 'visual-diff'] = args;
    
    console.log('👀 Running visual difference analysis...');
    
    // Take current screenshot
    const currentScreenshot = await this.screenshotAgent.captureFullPage(name);
    
    // Compare with baseline
    const comparison = await this.screenshotAgent.compareWithBaseline(
      currentScreenshot.path,
      `${name}.png`
    );

    if (!comparison.match && !comparison.isNewBaseline) {
      // Run AI analysis on differences
      const analysis = await this.analysisAgent.analyzeVisualDifferences(
        currentScreenshot.path,
        comparison.baselinePath,
        { comparison }
      );
      
      this.activeSession.analyses.push(analysis);
      
      return {
        message: `Visual differences detected (${comparison.diffPercentage}%)`,
        screenshot: currentScreenshot,
        comparison,
        analysis,
        diffPath: comparison.diffPath
      };
    }

    return {
      message: comparison.isNewBaseline ? 
        'New baseline created' : 
        'No visual differences detected',
      screenshot: currentScreenshot,
      comparison
    };
  }

  async startUIReview(args, context) {
    const [url, reviewType = 'full'] = args;
    
    if (!url) {
      return { message: 'URL required. Usage: /ui-review <url> [review-type]' };
    }

    // Auto-start session if not active
    if (!this.activeSession) {
      await this.startSession(['chromium', 'desktop.large'], context);
    }

    console.log(`🔍 Starting comprehensive UI review of ${url}...`);
    
    const results = {
      url,
      reviewType,
      timestamp: new Date().toISOString(),
      steps: []
    };

    try {
      // Step 1: Navigate to URL
      results.steps.push('Navigating to URL...');
      const navigation = await this.navigateToUrl([url], context);
      if (!navigation.success) {
        throw new Error(`Navigation failed: ${navigation.message}`);
      }

      // Step 2: Take baseline screenshot
      results.steps.push('Capturing screenshots...');
      const screenshot = await this.takeScreenshot([`${reviewType}-review`], context);

      // Step 3: Run accessibility check
      results.steps.push('Running accessibility analysis...');
      const accessibility = await this.runAccessibilityCheck([], context);

      // Step 4: Check performance (if full review)
      let performance = null;
      if (reviewType === 'full') {
        results.steps.push('Checking performance metrics...');
        performance = await this.runPerformanceCheck([], context);
      }

      // Step 5: Test responsive behavior (if full review)
      let responsive = null;
      if (reviewType === 'full') {
        results.steps.push('Testing responsive behavior...');
        responsive = await this.testResponsive([`${reviewType}-responsive`], context);
      }

      // Step 6: Generate comprehensive report
      results.steps.push('Generating report...');
      const report = await this.generateReport([], context);

      return {
        message: `UI review completed for ${url}`,
        results: {
          navigation,
          screenshot,
          accessibility,
          performance,
          responsive,
          report
        },
        summary: {
          url,
          reviewType,
          steps: results.steps.length,
          criticalIssues: accessibility.analysis.severity === 'critical' ? 1 : 0,
          reportPath: report.reportPath
        }
      };

    } catch (error) {
      return {
        message: `UI review failed: ${error.message}`,
        error: error.message,
        completedSteps: results.steps
      };
    }
  }

  async generateReport(args, context) {
    if (!this.analysisAgent) {
      return { message: 'No active session. Use /start-session first.' };
    }

    const [format = 'markdown'] = args;
    
    console.log(`📊 Generating comprehensive report...`);
    
    const { report, reportPath } = await this.analysisAgent.generateAnalysisReport(format);
    
    return {
      message: `Report generated: ${reportPath}`,
      report,
      reportPath,
      format,
      analyses: report.analyses.length
    };
  }

  async showHelp(args, context) {
    const helpText = `
# UI Testing Slash Commands

## Session Management
- \`/start-session [browser] [device]\` - Start a new testing session
- \`/end-session\` - End current session and save results

## Navigation & Screenshots  
- \`/navigate <url>\` - Navigate to a URL
- \`/screenshot [name] [type] [selector]\` - Take screenshot (full-page or element)
- \`/compare <current-path> <baseline-name>\` - Compare screenshots

## Analysis & Testing
- \`/accessibility\` - Run accessibility analysis
- \`/performance\` - Check performance metrics
- \`/responsive [name]\` - Test responsive behavior across viewports
- \`/visual-diff [name]\` - Compare current state with baseline

## Comprehensive Reviews
- \`/ui-review <url> [review-type]\` - Full UI review workflow
- \`/generate-report [format]\` - Generate analysis report

## Examples
\`\`\`
/start-session chromium mobile.iphone15Pro
/navigate https://example.com
/ui-review https://example.com full
/screenshot homepage full-page
/accessibility
/responsive homepage
/generate-report markdown
/end-session
\`\`\`

## Browser Options
- chromium (default), firefox, webkit

## Device Profiles
- desktop.large, desktop.standard, desktop.small
- mobile.iphone15Pro, mobile.pixel7
- tablet.ipadPro, tablet.ipadProPortrait
`;

    return {
      message: 'Available commands:',
      help: helpText
    };
  }

  // Utility method for external integrations
  async batchExecute(commands, context = {}) {
    const results = [];
    
    for (const commandLine of commands) {
      const result = await this.executeCommand(commandLine, context);
      results.push({ command: commandLine, result });
      
      // Stop on first failure if specified
      if (!result.success && context.stopOnFailure) {
        break;
      }
    }
    
    return results;
  }

  // Get current session status
  getSessionStatus() {
    if (!this.activeSession) {
      return { active: false, message: 'No active session' };
    }

    return {
      active: true,
      session: {
        id: this.activeSession.id,
        browser: this.activeSession.browser,
        device: this.activeSession.device,
        startTime: this.activeSession.startTime,
        duration: Date.now() - new Date(this.activeSession.startTime).getTime(),
        screenshots: this.activeSession.screenshots.length,
        analyses: this.activeSession.analyses.length
      }
    };
  }
}

// Export singleton instance for use across Claude Code
export const slashCommands = new SlashCommands();
export default SlashCommands;