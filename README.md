# AI-Driven Front-End Design Workflow

A complete AI-powered front-end design workflow using Playwright Model Control Plane (MCP) with iterative agentic loops and visual intelligence for automated UI validation and design review.

## 🌟 Features

### Core Capabilities
- **AI-Powered Visual Analysis** - Advanced screenshot comparison and visual intelligence
- **Iterative Design Validation** - Self-correcting loops that refine UI until acceptance criteria are met
- **Automated Accessibility Testing** - WCAG compliance validation with actionable insights
- **Responsive Design Testing** - Cross-device validation and consistency checking
- **Performance Monitoring** - Core Web Vitals tracking and optimization suggestions

### Advanced Workflow Features
- **Parallel UI Variations** - Generate and compare multiple design variations simultaneously
- **Git Worktree Integration** - Run multiple parallel Claude processes for variation testing
- **Self-Correction Agents** - Automatically fix detected UI issues with AI-generated code patches
- **Comprehensive Reporting** - Detailed analysis reports with screenshots and recommendations

### Claude Code Integration
- **Slash Commands** - Intuitive command interface (`/ui-review`, `/screenshot`, `/accessibility`)
- **Workflow Packaging** - Distribute expertise as reusable packages across teams
- **Hook Integration** - Automatic triggers on file changes, deployments, and PR events

## 🚀 Quick Start

### Installation

```bash
# Install the workflow package
npm install

# Run setup (installs Playwright and configures environment)
npm run setup
```

### Basic Usage

```bash
# Start a UI testing session
/ui-session start chromium desktop.large

# Run comprehensive UI review
/ui-review https://your-app.com full

# Test responsive behavior
/responsive homepage

# Check accessibility compliance
/accessibility

# Generate comparison report
/generate-report markdown

# End session
/ui-session end
```

## 📋 Project Structure

```
claude-ui-workflow/
├── CLAUDE.md                 # Configuration and design principles
├── subagents/                # AI agents for specialized tasks
│   ├── navigation-agent.js   # Browser automation and navigation
│   ├── screenshot-agent.js   # Screenshot capture and comparison
│   └── analysis-agent.js     # AI-powered visual and accessibility analysis
├── commands/                 # Slash command system
│   ├── slash-commands.js     # Command definitions and handlers
│   └── claude-integration.js # Claude Code integration layer
├── workflows/                # Advanced workflow orchestration
│   ├── iterative-validation.js # Self-correcting validation loops
│   └── self-correction-agent.js # Automatic issue resolution
├── scripts/                  # Utility scripts and managers
│   ├── git-worktree-manager.js # Git worktree management for parallel processes
│   ├── parallel-claude-manager.js # Orchestrates multiple Claude instances
│   └── visual-testing/       # Visual testing utilities
├── config/                   # Configuration files
│   ├── device-profiles.js    # Viewport and device configurations
│   └── playwright/           # Playwright-specific settings
├── packaging/                # Workflow distribution system
│   └── workflow-packager.js  # Package creation and distribution
└── setup/                    # Installation and setup scripts
    └── install-playwright-mcp.js
```

## 🎯 Workflow Examples

### Comprehensive UI Review
```javascript
import { quickUIReview } from './index.js';

const result = await quickUIReview('https://your-app.com', {
  reviewType: 'full',
  includeResponsive: true,
  includeAccessibility: true,
  includePerformance: true
});

console.log(result.recommendations);
```

### Parallel Variation Testing
```javascript
import { UIWorkflowOrchestrator } from './index.js';

const orchestrator = new UIWorkflowOrchestrator({
  enableParallelProcessing: true,
  maxConcurrentProcesses: 3
});

await orchestrator.initialize();

const variations = await orchestrator.createUIVariations('https://your-app.com', [
  { name: 'modern-theme', theme: 'modern', components: ['button', 'card'] },
  { name: 'classic-theme', theme: 'classic', components: ['button', 'card'] },
  { name: 'minimal-theme', theme: 'minimal', components: ['button', 'card'] }
]);

console.log(variations.comparison);
```

### Iterative Validation
```javascript
import { UIWorkflowOrchestrator } from './index.js';

const orchestrator = new UIWorkflowOrchestrator();
await orchestrator.initialize();

const result = await orchestrator.runIterativeValidation('https://your-app.com', {
  mockups: ['design-spec-1.png', 'design-spec-2.png'],
  responsive: {
    viewports: [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 }
    ]
  }
}, {
  maxIterations: 5,
  acceptanceCriteria: {
    visualAccuracy: 0.95,
    accessibilityScore: 90,
    performanceScore: 85
  }
});

console.log(`Converged: ${result.converged} after ${result.iterations} iterations`);
```

## 🛠️ Configuration

### Design Principles (CLAUDE.md)
The `CLAUDE.md` file contains your project's design system, acceptance criteria, and workflow configuration:

- Design principles and style guide
- Viewport specifications for testing
- Color palettes and typography standards
- Accessibility requirements (WCAG compliance levels)
- Performance targets (Core Web Vitals thresholds)
- Validation criteria and quality gates

### Device Profiles
Configure viewport sizes and device emulation in `config/device-profiles.js`:

```javascript
export const deviceProfiles = {
  desktop: {
    large: { width: 1440, height: 900 },
    standard: { width: 1024, height: 768 }
  },
  mobile: {
    iphone15Pro: { width: 393, height: 852, deviceScaleFactor: 3 }
  }
};
```

## 📊 Available Commands

### Session Management
- `/ui-session start [browser] [device]` - Start testing session
- `/ui-session end` - End session and save results

### Screenshot & Visual Testing
- `/screenshot [name] [type] [selector]` - Capture screenshots
- `/compare <current> <baseline>` - Compare screenshots
- `/visual-diff [name]` - Compare with baseline and analyze differences

### Analysis & Testing
- `/accessibility` - Run accessibility analysis (WCAG compliance)
- `/performance` - Check Core Web Vitals and performance metrics
- `/responsive [name]` - Test responsive behavior across viewports

### Comprehensive Workflows
- `/ui-review <url> [type]` - Full UI review (screenshots + analysis + testing)
- `/generate-report [format]` - Generate comprehensive analysis report

## 🔧 Advanced Features

### Git Worktree Support
Run multiple parallel Claude processes for UI variation testing:

```bash
# Create worktrees for parallel development
npm run worktree:create variation-1
npm run worktree:create variation-2

# Start parallel Claude processes
npm run parallel:start
```

### Workflow Packaging
Package and distribute workflow expertise across teams:

```bash
# Create a package for basic UI testing
npm run package:create basic-ui-testing

# Create a full-featured workflow package
npm run package:create full-design-workflow
```

### Self-Correction
Automatically fix detected UI issues:

```javascript
import { SelfCorrectionAgent } from './workflows/self-correction-agent.js';

const correctionAgent = new SelfCorrectionAgent({
  maxCorrectionAttempts: 5,
  safetyChecks: true,
  autoCommit: false
});

const fixes = await correctionAgent.executeIterativeFixes(
  analysisResults,
  designSpecs,
  './src'
);
```

## 📈 Performance & Optimization

### Headless Mode for CI/CD
```bash
# Run in headless mode for continuous integration
HEADLESS=true npm run test:visual
```

### Resource Management
- Limit concurrent browser instances for resource efficiency
- Use screenshot optimization to reduce storage requirements
- Implement cleanup routines for temporary files and processes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the existing code style
4. Add tests for new functionality
5. Run the test suite (`npm run test:visual`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Examples**: See `/examples` for usage patterns and templates
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join the community discussions for questions and ideas

## 🎯 Roadmap

- [ ] Integration with popular design tools (Figma, Sketch)
- [ ] Advanced AI models for more sophisticated visual analysis
- [ ] Real-time collaboration features for design reviews
- [ ] Integration with popular CI/CD platforms
- [ ] Mobile app testing capabilities
- [ ] Advanced performance profiling and optimization suggestions

---

**Built with ❤️ for the Claude Code community**

*Transform your UI development workflow with AI-powered design validation and iterative improvement loops.*