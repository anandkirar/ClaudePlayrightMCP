/**
 * Analysis Agent - Handles AI-powered visual analysis and accessibility testing
 * Part of the AI-driven front-end design workflow
 */

import fs from 'fs';
import path from 'path';
import { injectAxe, checkA11y } from 'axe-playwright';

export class AnalysisAgent {
  constructor(navigationAgent, options = {}) {
    this.navigationAgent = navigationAgent;
    this.options = {
      aiModel: 'claude-sonnet-4',
      analysisTypes: [
        'visual_differences',
        'accessibility_issues',
        'design_consistency', 
        'responsive_behavior'
      ],
      reportFormat: 'markdown',
      includeScreenshots: true,
      severityLevels: ['critical', 'major', 'minor', 'info'],
      ...options
    };

    this.analysisResults = [];
    this.loadAnalysisPrompts();
  }

  loadAnalysisPrompts() {
    const promptsPath = path.join('temp', 'analysis-prompts.json');
    if (fs.existsSync(promptsPath)) {
      this.analysisPrompts = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
    } else {
      this.analysisPrompts = this.getDefaultPrompts();
    }
  }

  getDefaultPrompts() {
    return {
      visual_differences: `
        Analyze these screenshots for visual differences:
        1. Compare layout, typography, colors, and spacing
        2. Identify any elements that have moved, changed size, or color
        3. Rate severity: critical (breaks functionality), major (significant visual impact), minor (small differences), info (negligible)
        4. Provide specific recommendations for each issue
        5. Focus on user-facing changes that affect usability or accessibility
      `,
      accessibility_issues: `
        Review this interface for accessibility compliance:
        1. Check color contrast ratios (minimum 4.5:1 for normal text, 3:1 for large text)
        2. Identify missing or inadequate focus indicators
        3. Assess touch target sizes (minimum 44px for mobile)
        4. Look for text readability and font size issues
        5. Check for proper heading hierarchy and semantic structure
        6. Identify any elements that may be difficult for screen readers
      `,
      design_consistency: `
        Evaluate design system compliance and consistency:
        1. Verify typography follows established scale and hierarchy
        2. Check color usage against defined palette
        3. Assess spacing and grid alignment
        4. Review component styling for consistency
        5. Identify deviations from established design patterns
        6. Check for proper use of shadows, borders, and visual effects
      `,
      responsive_behavior: `
        Analyze responsive design implementation:
        1. Check layout adaptation across different screen sizes
        2. Verify content remains accessible and readable at all breakpoints
        3. Assess navigation patterns for mobile vs desktop
        4. Identify any overflow, clipping, or layout breaking issues
        5. Ensure interactive elements are appropriately sized for touch
        6. Check for proper handling of long content and text wrapping
      `
    };
  }

  async analyzeVisualDifferences(currentScreenshot, baselineScreenshot, metadata = {}) {
    console.log('🔍 Analyzing visual differences...');
    
    const analysis = {
      type: 'visual_differences',
      timestamp: new Date().toISOString(),
      metadata,
      findings: []
    };

    // This would integrate with Claude's vision capabilities
    // For now, we'll simulate the analysis structure
    const prompt = this.analysisPrompts.visual_differences;
    
    // In a real implementation, you would send both screenshots to Claude
    const aiAnalysis = await this.performAIAnalysis(prompt, {
      current: currentScreenshot,
      baseline: baselineScreenshot,
      type: 'visual_comparison'
    });

    analysis.findings = aiAnalysis.findings || [];
    analysis.summary = aiAnalysis.summary || 'No significant differences detected';
    analysis.severity = this.calculateOverallSeverity(analysis.findings);

    this.analysisResults.push(analysis);
    return analysis;
  }

  async analyzeAccessibility(url = null) {
    console.log('♿ Analyzing accessibility...');
    
    const page = this.navigationAgent.page;
    
    // Inject axe-core for automated accessibility testing
    await injectAxe(page);
    
    // Run accessibility checks
    const axeResults = await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });

    // Perform AI-powered visual accessibility analysis
    const screenshot = await page.screenshot({ fullPage: true });
    const aiAnalysis = await this.performAIAnalysis(
      this.analysisPrompts.accessibility_issues,
      {
        screenshot,
        type: 'accessibility_analysis',
        url: url || page.url()
      }
    );

    const analysis = {
      type: 'accessibility_issues',
      timestamp: new Date().toISOString(),
      url: url || page.url(),
      automated: {
        violations: axeResults.violations.map(violation => ({
          id: violation.id,
          impact: violation.impact,
          description: violation.description,
          help: violation.help,
          helpUrl: violation.helpUrl,
          nodes: violation.nodes.map(node => ({
            html: node.html,
            target: node.target,
            failureSummary: node.failureSummary
          }))
        })),
        passes: axeResults.passes.length,
        incomplete: axeResults.incomplete.length
      },
      aiAnalysis: {
        findings: aiAnalysis.findings || [],
        recommendations: aiAnalysis.recommendations || [],
        summary: aiAnalysis.summary || 'Accessibility analysis completed'
      },
      severity: this.calculateAccessibilitySeverity(axeResults.violations, aiAnalysis.findings)
    };

    this.analysisResults.push(analysis);
    return analysis;
  }

  async analyzeDesignConsistency(screenshots, designSpecs = {}) {
    console.log('🎨 Analyzing design consistency...');
    
    const analysis = {
      type: 'design_consistency',
      timestamp: new Date().toISOString(),
      screenshots: screenshots.length,
      designSpecs,
      findings: []
    };

    // Analyze each screenshot for design consistency
    for (const screenshot of screenshots) {
      const aiAnalysis = await this.performAIAnalysis(
        this.analysisPrompts.design_consistency,
        {
          screenshot: screenshot.path,
          viewport: screenshot.viewport,
          type: 'design_consistency',
          designSpecs
        }
      );

      analysis.findings.push({
        screenshot: screenshot.name,
        viewport: screenshot.viewport,
        issues: aiAnalysis.findings || [],
        consistency_score: aiAnalysis.consistency_score || 0
      });
    }

    analysis.overallScore = this.calculateOverallConsistencyScore(analysis.findings);
    analysis.severity = this.calculateOverallSeverity(
      analysis.findings.flatMap(f => f.issues)
    );

    this.analysisResults.push(analysis);
    return analysis;
  }

  async analyzeResponsiveBehavior(responsiveScreenshots) {
    console.log('📱 Analyzing responsive behavior...');
    
    const analysis = {
      type: 'responsive_behavior',
      timestamp: new Date().toISOString(),
      viewports: responsiveScreenshots.map(s => s.viewport),
      findings: []
    };

    // Compare responsive behavior across viewports
    for (let i = 0; i < responsiveScreenshots.length - 1; i++) {
      const current = responsiveScreenshots[i];
      const next = responsiveScreenshots[i + 1];

      const aiAnalysis = await this.performAIAnalysis(
        this.analysisPrompts.responsive_behavior,
        {
          screenshot1: current.path,
          screenshot2: next.path,
          viewport1: current.viewport,
          viewport2: next.viewport,
          type: 'responsive_comparison'
        }
      );

      analysis.findings.push({
        comparison: `${current.viewport.width}x${current.viewport.height} vs ${next.viewport.width}x${next.viewport.height}`,
        issues: aiAnalysis.findings || [],
        responsive_score: aiAnalysis.responsive_score || 0
      });
    }

    analysis.overallScore = this.calculateOverallResponsiveScore(analysis.findings);
    analysis.severity = this.calculateOverallSeverity(
      analysis.findings.flatMap(f => f.issues)
    );

    this.analysisResults.push(analysis);
    return analysis;
  }

  async performAIAnalysis(prompt, data) {
    // This would integrate with Claude's API for actual AI analysis
    // For now, we'll return a structured response format
    
    console.log(`🤖 Performing AI analysis with ${this.options.aiModel}...`);
    
    // Simulate AI analysis response
    return {
      findings: [
        {
          severity: 'minor',
          category: 'layout',
          description: 'Simulated finding for demonstration',
          recommendation: 'This would contain AI-generated recommendations',
          location: 'header section'
        }
      ],
      summary: 'AI analysis completed successfully',
      confidence: 0.85,
      consistency_score: 8.5,
      responsive_score: 9.0
    };
  }

  async checkPerformanceMetrics() {
    console.log('⚡ Checking performance metrics...');
    
    const page = this.navigationAgent.page;
    
    // Get Core Web Vitals and other performance metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const metrics = {
            lcp: null, // Largest Contentful Paint
            fid: null, // First Input Delay  
            cls: null, // Cumulative Layout Shift
            fcp: null, // First Contentful Paint
            ttfb: null // Time to First Byte
          };

          entries.forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              metrics.lcp = entry.startTime;
            } else if (entry.entryType === 'first-input') {
              metrics.fid = entry.processingStart - entry.startTime;
            } else if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              metrics.cls = (metrics.cls || 0) + entry.value;
            }
          });

          // Get navigation timing metrics
          const navigation = performance.getEntriesByType('navigation')[0];
          if (navigation) {
            metrics.fcp = navigation.responseStart - navigation.fetchStart;
            metrics.ttfb = navigation.responseStart - navigation.requestStart;
          }

          resolve(metrics);
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'navigation'] });

        // Fallback timeout
        setTimeout(() => {
          resolve({
            lcp: null,
            fid: null,
            cls: null,
            fcp: null,
            ttfb: null
          });
        }, 5000);
      });
    });

    const performanceAnalysis = {
      type: 'performance_metrics',
      timestamp: new Date().toISOString(),
      url: page.url(),
      metrics,
      thresholds: {
        lcp: { good: 2500, needsImprovement: 4000 },
        fid: { good: 100, needsImprovement: 300 },
        cls: { good: 0.1, needsImprovement: 0.25 },
        fcp: { good: 1800, needsImprovement: 3000 },
        ttfb: { good: 800, needsImprovement: 1800 }
      },
      evaluation: this.evaluatePerformanceMetrics(metrics)
    };

    this.analysisResults.push(performanceAnalysis);
    return performanceAnalysis;
  }

  evaluatePerformanceMetrics(metrics) {
    const evaluation = {};
    const thresholds = {
      lcp: { good: 2500, needsImprovement: 4000 },
      fid: { good: 100, needsImprovement: 300 },
      cls: { good: 0.1, needsImprovement: 0.25 }
    };

    Object.keys(thresholds).forEach(metric => {
      const value = metrics[metric];
      const threshold = thresholds[metric];
      
      if (value === null) {
        evaluation[metric] = 'unknown';
      } else if (value <= threshold.good) {
        evaluation[metric] = 'good';
      } else if (value <= threshold.needsImprovement) {
        evaluation[metric] = 'needs-improvement';
      } else {
        evaluation[metric] = 'poor';
      }
    });

    return evaluation;
  }

  calculateOverallSeverity(findings) {
    if (!findings || findings.length === 0) return 'info';
    
    const severityCounts = findings.reduce((counts, finding) => {
      counts[finding.severity] = (counts[finding.severity] || 0) + 1;
      return counts;
    }, {});

    if (severityCounts.critical > 0) return 'critical';
    if (severityCounts.major > 0) return 'major';
    if (severityCounts.minor > 0) return 'minor';
    return 'info';
  }

  calculateAccessibilitySeverity(violations, aiFindings) {
    const criticalViolations = violations.filter(v => v.impact === 'critical').length;
    const seriousViolations = violations.filter(v => v.impact === 'serious').length;
    const aiCritical = aiFindings.filter(f => f.severity === 'critical').length;

    if (criticalViolations > 0 || aiCritical > 0) return 'critical';
    if (seriousViolations > 0) return 'major';
    if (violations.length > 0) return 'minor';
    return 'info';
  }

  calculateOverallConsistencyScore(findings) {
    if (!findings || findings.length === 0) return 0;
    
    const scores = findings.map(f => f.consistency_score || 0);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  calculateOverallResponsiveScore(findings) {
    if (!findings || findings.length === 0) return 0;
    
    const scores = findings.map(f => f.responsive_score || 0);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  async generateAnalysisReport(format = 'markdown') {
    console.log(`📊 Generating analysis report (${format})...`);
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalAnalyses: this.analysisResults.length,
        criticalIssues: this.analysisResults.filter(a => a.severity === 'critical').length,
        majorIssues: this.analysisResults.filter(a => a.severity === 'major').length,
        minorIssues: this.analysisResults.filter(a => a.severity === 'minor').length
      },
      analyses: this.analysisResults
    };

    const reportPath = path.join('reports', `analysis-report-${Date.now()}.${format}`);
    
    if (format === 'markdown') {
      const markdownContent = this.generateMarkdownReport(report);
      fs.writeFileSync(reportPath, markdownContent);
    } else {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    }

    return { report, reportPath };
  }

  generateMarkdownReport(report) {
    return `# UI Analysis Report

Generated: ${report.timestamp}

## Summary

- Total Analyses: ${report.summary.totalAnalyses}
- Critical Issues: ${report.summary.criticalIssues}
- Major Issues: ${report.summary.majorIssues}
- Minor Issues: ${report.summary.minorIssues}

## Detailed Results

${report.analyses.map(analysis => this.formatAnalysisForMarkdown(analysis)).join('\n\n')}

---

*Generated by AI-Driven Front-End Design Workflow*
`;
  }

  formatAnalysisForMarkdown(analysis) {
    return `### ${analysis.type.replace(/_/g, ' ').toUpperCase()}

**Severity:** ${analysis.severity}  
**Timestamp:** ${analysis.timestamp}

${analysis.summary || 'No summary available'}

${analysis.findings && analysis.findings.length > 0 ? 
  `**Findings:**\n${analysis.findings.map(f => `- **${f.severity}**: ${f.description}`).join('\n')}` : 
  'No specific findings reported'
}`;
  }

  clearResults() {
    this.analysisResults = [];
  }

  getResults() {
    return [...this.analysisResults];
  }
}

export default AnalysisAgent;