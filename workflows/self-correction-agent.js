/**
 * Self-Correction Agent - Implements AI-driven code correction loops
 * Automatically fixes UI issues based on visual feedback
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SelfCorrectionAgent {
  constructor(options = {}) {
    this.options = {
      maxCorrectionAttempts: 5,
      correctionThreshold: 0.8,
      backupChanges: true,
      autoCommit: false,
      safetyChecks: true,
      ...options
    };
    
    this.correctionHistory = [];
    this.appliedFixes = [];
    this.backupPaths = [];
  }

  async analyzeCorrectionNeeds(analysisResults, designSpecs = {}) {
    console.log('🔍 Analyzing correction needs...');
    
    const correctionPlan = {
      timestamp: new Date().toISOString(),
      priority: 'medium',
      corrections: [],
      estimatedComplexity: 0,
      safetyLevel: 'safe'
    };

    // Process each analysis result
    for (const analysis of analysisResults) {
      const corrections = await this.extractCorrectionsFromAnalysis(analysis, designSpecs);
      correctionPlan.corrections.push(...corrections);
    }

    // Sort corrections by priority and safety
    correctionPlan.corrections.sort((a, b) => {
      const priorityOrder = { critical: 3, major: 2, minor: 1, info: 0 };
      const safetyOrder = { safe: 2, moderate: 1, risky: 0 };
      
      const priorityDiff = priorityOrder[b.severity] - priorityOrder[a.severity];
      if (priorityDiff !== 0) return priorityDiff;
      
      return safetyOrder[b.safetyLevel] - safetyOrder[a.safetyLevel];
    });

    // Calculate overall plan metrics
    correctionPlan.priority = this.calculateOverallPriority(correctionPlan.corrections);
    correctionPlan.estimatedComplexity = this.calculateComplexity(correctionPlan.corrections);
    correctionPlan.safetyLevel = this.calculateSafetyLevel(correctionPlan.corrections);

    console.log(`📋 Generated correction plan with ${correctionPlan.corrections.length} items`);
    
    return correctionPlan;
  }

  async extractCorrectionsFromAnalysis(analysis, designSpecs) {
    const corrections = [];
    
    switch (analysis.type) {
      case 'visual_differences':
      case 'visual_compliance':
        corrections.push(...await this.extractVisualCorrections(analysis, designSpecs));
        break;
        
      case 'accessibility_issues':
        corrections.push(...await this.extractAccessibilityCorrections(analysis));
        break;
        
      case 'design_consistency':
        corrections.push(...await this.extractDesignCorrections(analysis, designSpecs));
        break;
        
      case 'responsive_behavior':
        corrections.push(...await this.extractResponsiveCorrections(analysis));
        break;
        
      case 'performance_metrics':
        corrections.push(...await this.extractPerformanceCorrections(analysis));
        break;
    }

    return corrections;
  }

  async extractVisualCorrections(analysis, designSpecs) {
    const corrections = [];
    
    if (analysis.issues) {
      for (const issue of analysis.issues) {
        if (issue.category === 'spacing' && issue.expectedValue && issue.actualValue) {
          corrections.push({
            type: 'css',
            severity: issue.severity,
            safetyLevel: 'safe',
            category: 'spacing',
            description: `Fix ${issue.location} spacing`,
            location: issue.location,
            change: {
              property: 'padding',
              currentValue: issue.actualValue,
              targetValue: issue.expectedValue,
              selector: this.generateCSSSelector(issue.location)
            },
            confidence: 0.9,
            estimatedImpact: 'low',
            reversible: true
          });
        }
        
        if (issue.category === 'color' && issue.expectedValue) {
          corrections.push({
            type: 'css',
            severity: issue.severity,
            safetyLevel: 'safe',
            category: 'color',
            description: `Fix ${issue.location} color`,
            location: issue.location,
            change: {
              property: 'color',
              currentValue: issue.actualValue,
              targetValue: issue.expectedValue,
              selector: this.generateCSSSelector(issue.location)
            },
            confidence: 0.85,
            estimatedImpact: 'low',
            reversible: true
          });
        }
      }
    }

    return corrections;
  }

  async extractAccessibilityCorrections(analysis) {
    const corrections = [];
    
    if (analysis.automated?.violations) {
      for (const violation of analysis.automated.violations) {
        for (const node of violation.nodes) {
          corrections.push({
            type: 'html',
            severity: violation.impact === 'critical' ? 'critical' : 'major',
            safetyLevel: 'safe',
            category: 'accessibility',
            description: `Fix ${violation.id}: ${violation.description}`,
            location: node.target.join(' '),
            change: {
              type: 'attribute',
              element: node.target[0],
              attribute: this.getAccessibilityFixAttribute(violation.id),
              value: this.getAccessibilityFixValue(violation.id, node)
            },
            confidence: 0.8,
            estimatedImpact: 'medium',
            reversible: true,
            help: violation.help,
            helpUrl: violation.helpUrl
          });
        }
      }
    }

    return corrections;
  }

  async extractDesignCorrections(analysis, designSpecs) {
    const corrections = [];
    
    if (analysis.findings) {
      for (const finding of analysis.findings) {
        if (finding.issues) {
          for (const issue of finding.issues) {
            if (issue.category === 'typography') {
              corrections.push({
                type: 'css',
                severity: issue.severity,
                safetyLevel: 'safe',
                category: 'typography',
                description: `Fix typography in ${issue.location}`,
                location: issue.location,
                change: {
                  properties: this.generateTypographyFix(issue, designSpecs.typography),
                  selector: this.generateCSSSelector(issue.location)
                },
                confidence: 0.75,
                estimatedImpact: 'medium',
                reversible: true
              });
            }
          }
        }
      }
    }

    return corrections;
  }

  async extractResponsiveCorrections(analysis) {
    const corrections = [];
    
    if (analysis.findings) {
      for (const finding of analysis.findings) {
        if (finding.issues) {
          for (const issue of finding.issues) {
            if (issue.category === 'layout' || issue.category === 'overflow') {
              corrections.push({
                type: 'css',
                severity: issue.severity,
                safetyLevel: 'moderate',
                category: 'responsive',
                description: `Fix responsive ${issue.category} in ${issue.location}`,
                location: issue.location,
                change: {
                  mediaQuery: finding.comparison,
                  properties: this.generateResponsiveFix(issue),
                  selector: this.generateCSSSelector(issue.location)
                },
                confidence: 0.7,
                estimatedImpact: 'high',
                reversible: true
              });
            }
          }
        }
      }
    }

    return corrections;
  }

  async extractPerformanceCorrections(analysis) {
    const corrections = [];
    
    if (analysis.evaluation) {
      Object.entries(analysis.evaluation).forEach(([metric, rating]) => {
        if (rating === 'poor' || rating === 'needs-improvement') {
          corrections.push({
            type: 'optimization',
            severity: rating === 'poor' ? 'major' : 'minor',
            safetyLevel: 'moderate',
            category: 'performance',
            description: `Optimize ${metric}`,
            location: 'global',
            change: {
              metric,
              currentRating: rating,
              suggestions: this.getPerformanceOptimizations(metric, analysis.metrics)
            },
            confidence: 0.6,
            estimatedImpact: 'high',
            reversible: false
          });
        }
      });
    }

    return corrections;
  }

  async applyCorrectionPlan(correctionPlan, projectPath = '.') {
    console.log(`🛠️ Applying correction plan with ${correctionPlan.corrections.length} corrections...`);
    
    const results = {
      timestamp: new Date().toISOString(),
      applied: [],
      failed: [],
      skipped: [],
      totalCorrections: correctionPlan.corrections.length
    };

    // Create backup before making changes
    if (this.options.backupChanges) {
      await this.createProjectBackup(projectPath);
    }

    // Apply corrections in order of priority
    for (const correction of correctionPlan.corrections) {
      try {
        // Skip risky corrections if safety checks enabled
        if (this.options.safetyChecks && correction.safetyLevel === 'risky') {
          results.skipped.push({
            correction,
            reason: 'Safety check - risky operation'
          });
          continue;
        }

        console.log(`  🔧 Applying: ${correction.description}`);
        
        const result = await this.applyIndividualCorrection(correction, projectPath);
        
        if (result.success) {
          results.applied.push({ correction, result });
          this.appliedFixes.push(correction);
        } else {
          results.failed.push({ correction, result });
        }

      } catch (error) {
        console.error(`  ❌ Failed to apply correction: ${error.message}`);
        results.failed.push({
          correction,
          result: { success: false, error: error.message }
        });
      }
    }

    console.log(`✅ Applied ${results.applied.length}/${results.totalCorrections} corrections`);
    
    // Auto-commit if enabled and successful
    if (this.options.autoCommit && results.applied.length > 0) {
      await this.commitChanges(results);
    }

    return results;
  }

  async applyIndividualCorrection(correction, projectPath) {
    switch (correction.type) {
      case 'css':
        return await this.applyCSSCorrection(correction, projectPath);
      case 'html':
        return await this.applyHTMLCorrection(correction, projectPath);
      case 'optimization':
        return await this.applyOptimizationCorrection(correction, projectPath);
      default:
        return { success: false, error: `Unknown correction type: ${correction.type}` };
    }
  }

  async applyCSSCorrection(correction, projectPath) {
    const cssFiles = await this.findCSSFiles(projectPath);
    const targetFile = await this.findBestCSSFile(cssFiles, correction.location);
    
    if (!targetFile) {
      return { success: false, error: 'Could not find appropriate CSS file' };
    }

    let cssContent = fs.readFileSync(targetFile, 'utf8');
    
    // Apply the CSS change
    if (correction.change.property && correction.change.targetValue) {
      const selector = correction.change.selector;
      const property = correction.change.property;
      const value = correction.change.targetValue;
      
      // Try to update existing rule or add new one
      const ruleRegex = new RegExp(`(${selector}\\s*{[^}]*)(${property}\\s*:[^;]*;?)([^}]*})`, 'g');
      
      if (ruleRegex.test(cssContent)) {
        // Update existing property
        cssContent = cssContent.replace(ruleRegex, `$1${property}: ${value};$3`);
      } else {
        // Add new rule
        cssContent += `\n\n${selector} {\n  ${property}: ${value};\n}`;
      }
    } else if (correction.change.properties) {
      // Handle multiple properties
      const selector = correction.change.selector;
      const properties = Object.entries(correction.change.properties)
        .map(([prop, val]) => `  ${prop}: ${val};`)
        .join('\n');
      
      cssContent += `\n\n${selector} {\n${properties}\n}`;
    }

    fs.writeFileSync(targetFile, cssContent);
    
    return {
      success: true,
      file: targetFile,
      change: correction.change,
      backup: await this.createFileBackup(targetFile)
    };
  }

  async applyHTMLCorrection(correction, projectPath) {
    const htmlFiles = await this.findHTMLFiles(projectPath);
    const targetFile = await this.findBestHTMLFile(htmlFiles, correction.location);
    
    if (!targetFile) {
      return { success: false, error: 'Could not find appropriate HTML file' };
    }

    let htmlContent = fs.readFileSync(targetFile, 'utf8');
    
    // Apply HTML change (add attribute)
    if (correction.change.type === 'attribute') {
      const element = correction.change.element;
      const attribute = correction.change.attribute;
      const value = correction.change.value;
      
      // Find and update the element
      const elementRegex = new RegExp(`(<${element}[^>]*?)(\\/?>)`, 'g');
      htmlContent = htmlContent.replace(elementRegex, `$1 ${attribute}="${value}"$2`);
    }

    fs.writeFileSync(targetFile, htmlContent);
    
    return {
      success: true,
      file: targetFile,
      change: correction.change,
      backup: await this.createFileBackup(targetFile)
    };
  }

  async applyOptimizationCorrection(correction, projectPath) {
    // Performance optimizations would be more complex
    // This is a placeholder for the structure
    console.log(`📈 Performance optimization for ${correction.change.metric} would be applied here`);
    
    return {
      success: true,
      applied: false,
      reason: 'Performance optimizations require manual implementation'
    };
  }

  // Utility methods
  generateCSSSelector(location) {
    // Convert location description to CSS selector
    const selectorMap = {
      'header': 'header',
      'navigation': 'nav',
      'main content': 'main',
      'footer': 'footer',
      'button': 'button',
      'form': 'form',
      'input': 'input'
    };
    
    return selectorMap[location.toLowerCase()] || `.${location.replace(/\s+/g, '-').toLowerCase()}`;
  }

  getAccessibilityFixAttribute(violationId) {
    const attributeMap = {
      'image-alt': 'alt',
      'button-name': 'aria-label',
      'form-field-multiple-labels': 'aria-labelledby',
      'color-contrast': 'style'
    };
    
    return attributeMap[violationId] || 'aria-label';
  }

  getAccessibilityFixValue(violationId, node) {
    // Generate appropriate values based on violation type
    switch (violationId) {
      case 'image-alt':
        return 'Descriptive alt text';
      case 'button-name':
        return 'Button description';
      default:
        return 'Accessibility improvement';
    }
  }

  generateTypographyFix(issue, typographySpecs) {
    const properties = {};
    
    if (typographySpecs?.fontFamily) {
      properties['font-family'] = typographySpecs.fontFamily;
    }
    if (typographySpecs?.fontSize) {
      properties['font-size'] = typographySpecs.fontSize;
    }
    if (typographySpecs?.lineHeight) {
      properties['line-height'] = typographySpecs.lineHeight;
    }
    
    return properties;
  }

  generateResponsiveFix(issue) {
    const fixes = {
      'overflow': {
        'overflow-x': 'auto',
        'max-width': '100%'
      },
      'layout': {
        'display': 'flex',
        'flex-wrap': 'wrap'
      }
    };
    
    return fixes[issue.category] || {};
  }

  getPerformanceOptimizations(metric, metrics) {
    const optimizations = {
      'lcp': ['Optimize images', 'Remove render-blocking resources', 'Improve server response times'],
      'fid': ['Minimize main thread work', 'Reduce third-party code impact'],
      'cls': ['Set size attributes on images and videos', 'Avoid inserting content above existing content'],
      'fcp': ['Eliminate render-blocking resources', 'Minify CSS'],
      'ttfb': ['Optimize server configuration', 'Use a CDN']
    };
    
    return optimizations[metric] || ['General performance optimization needed'];
  }

  async findCSSFiles(projectPath) {
    const { stdout } = await execAsync(`find ${projectPath} -name "*.css" -o -name "*.scss" -o -name "*.less"`, { cwd: projectPath });
    return stdout.trim().split('\n').filter(Boolean);
  }

  async findHTMLFiles(projectPath) {
    const { stdout } = await execAsync(`find ${projectPath} -name "*.html" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.vue"`, { cwd: projectPath });
    return stdout.trim().split('\n').filter(Boolean);
  }

  async findBestCSSFile(cssFiles, location) {
    // Simple heuristic: find file that might contain styles for the location
    const locationKeywords = location.toLowerCase().split(' ');
    
    for (const file of cssFiles) {
      const fileName = path.basename(file, path.extname(file)).toLowerCase();
      if (locationKeywords.some(keyword => fileName.includes(keyword))) {
        return file;
      }
    }
    
    // Fallback to main stylesheet
    return cssFiles.find(file => 
      file.includes('main') || 
      file.includes('app') || 
      file.includes('style')
    ) || cssFiles[0];
  }

  async findBestHTMLFile(htmlFiles, location) {
    // Similar heuristic for HTML files
    const locationKeywords = location.toLowerCase().split(' ');
    
    for (const file of htmlFiles) {
      const fileName = path.basename(file, path.extname(file)).toLowerCase();
      if (locationKeywords.some(keyword => fileName.includes(keyword))) {
        return file;
      }
    }
    
    return htmlFiles.find(file => 
      file.includes('index') || 
      file.includes('main') || 
      file.includes('app')
    ) || htmlFiles[0];
  }

  async createFileBackup(filePath) {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    this.backupPaths.push(backupPath);
    return backupPath;
  }

  async createProjectBackup(projectPath) {
    const backupDir = path.join(projectPath, '.ui-workflow-backups', Date.now().toString());
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Backup key files
    const { stdout } = await execAsync(`find ${projectPath} -name "*.css" -o -name "*.html" -o -name "*.jsx" -o -name "*.tsx"`, { cwd: projectPath });
    const files = stdout.trim().split('\n').filter(Boolean);
    
    for (const file of files) {
      const relativePath = path.relative(projectPath, file);
      const backupFile = path.join(backupDir, relativePath);
      fs.mkdirSync(path.dirname(backupFile), { recursive: true });
      fs.copyFileSync(file, backupFile);
    }
    
    console.log(`📁 Created project backup: ${backupDir}`);
    return backupDir;
  }

  async commitChanges(results) {
    try {
      const message = `AI UI Corrections: Applied ${results.applied.length} fixes\n\n${results.applied.map(r => `- ${r.correction.description}`).join('\n')}`;
      
      await execAsync('git add .');
      await execAsync(`git commit -m "${message}"`);
      
      console.log('📝 Changes committed to git');
    } catch (error) {
      console.error('❌ Failed to commit changes:', error.message);
    }
  }

  calculateOverallPriority(corrections) {
    const priorities = corrections.map(c => c.severity);
    if (priorities.includes('critical')) return 'critical';
    if (priorities.includes('major')) return 'major';
    if (priorities.includes('minor')) return 'minor';
    return 'info';
  }

  calculateComplexity(corrections) {
    return corrections.reduce((sum, correction) => {
      const complexityMap = { safe: 1, moderate: 2, risky: 3 };
      return sum + (complexityMap[correction.safetyLevel] || 1);
    }, 0);
  }

  calculateSafetyLevel(corrections) {
    const safetyLevels = corrections.map(c => c.safetyLevel);
    if (safetyLevels.includes('risky')) return 'risky';
    if (safetyLevels.includes('moderate')) return 'moderate';
    return 'safe';
  }

  // Public interface methods
  async executeIterativeFixes(analysisResults, designSpecs, projectPath) {
    let attempt = 0;
    let lastScore = 0;
    
    while (attempt < this.options.maxCorrectionAttempts) {
      attempt++;
      console.log(`\n🔄 Self-correction attempt ${attempt}/${this.options.maxCorrectionAttempts}`);
      
      // Analyze what needs to be corrected
      const correctionPlan = await this.analyzeCorrectionNeeds(analysisResults, designSpecs);
      
      // Skip if no corrections needed
      if (correctionPlan.corrections.length === 0) {
        console.log('✅ No corrections needed');
        break;
      }
      
      // Apply corrections
      const results = await this.applyCorrectionPlan(correctionPlan, projectPath);
      
      // Calculate improvement score
      const currentScore = this.calculateImprovementScore(results);
      
      if (currentScore >= this.options.correctionThreshold) {
        console.log(`✅ Correction threshold met: ${currentScore}`);
        break;
      }
      
      if (currentScore <= lastScore) {
        console.log('⚠️ No improvement detected, stopping corrections');
        break;
      }
      
      lastScore = currentScore;
      this.correctionHistory.push({ attempt, results, score: currentScore });
    }
    
    return {
      attempts: attempt,
      finalScore: lastScore,
      history: this.correctionHistory,
      appliedFixes: this.appliedFixes
    };
  }

  calculateImprovementScore(results) {
    const total = results.totalCorrections;
    const applied = results.applied.length;
    return total > 0 ? applied / total : 1.0;
  }

  getCorrectionsHistory() {
    return [...this.correctionHistory];
  }

  async rollbackChanges() {
    console.log('🔄 Rolling back applied changes...');
    
    for (const backupPath of this.backupPaths.reverse()) {
      const originalPath = backupPath.replace(/\.backup\.\d+$/, '');
      if (fs.existsSync(backupPath) && fs.existsSync(originalPath)) {
        fs.copyFileSync(backupPath, originalPath);
        console.log(`  ✅ Restored ${originalPath}`);
      }
    }
    
    this.backupPaths = [];
    this.appliedFixes = [];
    this.correctionHistory = [];
  }
}

export default SelfCorrectionAgent;