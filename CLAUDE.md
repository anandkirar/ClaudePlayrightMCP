# AI-Driven Front-End Design Workflow Configuration

## Project Overview

This project implements a complete AI-driven front-end design workflow using Playwright Model Control Plane (MCP) with iterative agentic loops and visual intelligence for automated UI validation and design review.

## Design Principles & Style Guide

### Core Design Philosophy
- **Mobile-First Responsive Design**: Start with mobile layouts and progressively enhance for larger screens
- **Accessibility-First**: WCAG 2.1 AA compliance is mandatory for all UI components
- **Performance-Optimized**: Target <3s load times and Core Web Vitals thresholds
- **Visual Consistency**: Maintain consistent spacing, typography, and color schemes across all breakpoints

### Typography Standards
- **Primary Font**: System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
- **Font Sizes**: Use rem units with 16px base (1rem = 16px)
- **Line Heights**: 1.5 for body text, 1.2 for headings
- **Font Weights**: 400 (normal), 600 (semi-bold), 700 (bold)

### Color Palette
```css
:root {
  /* Primary Colors */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-primary-light: #dbeafe;
  
  /* Semantic Colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #06b6d4;
  
  /* Neutral Colors */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-500: #6b7280;
  --color-gray-900: #111827;
}
```

### Spacing System
- **Base Unit**: 4px (0.25rem)
- **Scale**: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, 96px
- **Component Padding**: Minimum 16px internal padding
- **Section Margins**: Minimum 32px between major sections

## Viewport Specifications

### Desktop
- **Large Desktop**: 1440px+ (primary design target)
- **Standard Desktop**: 1024px - 1439px
- **Small Desktop**: 768px - 1023px

### Tablet
- **Tablet Landscape**: 1024px x 768px
- **Tablet Portrait**: 768px x 1024px
- **iPad Pro**: 1366px x 1024px

### Mobile
- **iPhone 15 Pro**: 393px x 852px
- **iPhone 15**: 393px x 852px
- **Standard Mobile**: 375px x 667px
- **Small Mobile**: 320px x 568px

## Playwright MCP Configuration

### Browser Setup
- **Primary Browser**: Chromium (latest stable)
- **Secondary Browsers**: Firefox, WebKit for cross-browser testing
- **Device Emulation**: iPhone 15, iPad, Desktop 1440p
- **Mode**: Both headed (for development) and headless (for CI/CD)

### Screenshot Requirements
- **Format**: PNG with high quality
- **Full Page**: Capture entire page height
- **Element Screenshots**: For component-level validation
- **Comparison**: Before/after screenshots for change validation

### Console Error Monitoring
- **Error Types**: JavaScript errors, network failures, accessibility violations
- **Severity Levels**: Error (blocking), Warning (review required), Info (optional)
- **Reporting**: Detailed error logs with stack traces and context

## Validation Criteria

### UI Mock Compliance
1. **Pixel-Perfect Matching**: ±2px tolerance for spacing and alignment
2. **Color Accuracy**: Exact hex color matches required
3. **Typography**: Font size, weight, and line height matching
4. **Interactive States**: Hover, focus, active, and disabled states

### Accessibility Checklist
- [ ] Keyboard navigation support
- [ ] Screen reader compatibility
- [ ] Color contrast ratios (minimum 4.5:1)
- [ ] Focus indicators visible
- [ ] ARIA labels and roles present
- [ ] Form validation and error messages

### Performance Targets
- [ ] Largest Contentful Paint < 2.5s
- [ ] First Input Delay < 100ms
- [ ] Cumulative Layout Shift < 0.1
- [ ] Time to Interactive < 3.5s

## Automated Testing Commands

### Lint and Type Check
```bash
# Run before committing changes
npm run lint
npm run typecheck
npm run test:accessibility
```

### Screenshot Comparison
```bash
# Generate baseline screenshots
npm run screenshots:baseline

# Compare current implementation
npm run screenshots:compare

# Update approved screenshots
npm run screenshots:approve
```

### Performance Testing
```bash
# Lighthouse CI integration
npm run performance:test
npm run performance:report
```

## Iterative Design Process

### Phase 1: Initial Implementation
1. Create UI component based on design specs
2. Capture baseline screenshots across all viewports
3. Run accessibility and console error checks
4. Generate initial validation report

### Phase 2: Comparison & Analysis
1. Compare screenshots with design mocks
2. Identify visual discrepancies using AI vision
3. Generate detailed difference reports
4. Prioritize issues by severity and impact

### Phase 3: Iterative Refinement
1. Apply code fixes for identified issues
2. Re-capture screenshots and run validation
3. Compare improvements against previous iteration
4. Repeat until acceptance criteria met

### Phase 4: Final Validation
1. Cross-browser compatibility testing
2. Performance optimization verification
3. Accessibility audit completion
4. Stakeholder approval workflow

## Quality Gates

### Pre-Commit Requirements
- All lint and type checks pass
- No console errors in development build
- Accessibility violations resolved
- Screenshots match approved baselines

### Pre-Deployment Requirements  
- Cross-browser testing completed
- Performance targets achieved
- Manual stakeholder review approved
- Documentation updated

## Team Workflow Integration

### Git Worktree Usage
- **Feature Branches**: Separate worktrees for parallel UI variations
- **Review Process**: Automated screenshot comparison in PRs
- **Approval Workflow**: Visual diff approval before merge

### Collaboration Guidelines
- Use descriptive commit messages for UI changes
- Include screenshot diffs in pull request descriptions
- Tag design team for visual review on breaking changes
- Document design decisions in commit messages

## Subagent Integration Points

### Navigation Agent
- Automatically navigate to specified URLs or local development servers
- Handle authentication and session management
- Support for single-page applications and dynamic routing

### Screenshot Agent  
- Capture full-page and element-specific screenshots
- Generate comparison reports with highlighted differences
- Support for multiple viewport and browser combinations

### Analysis Agent
- AI-powered visual difference detection
- Accessibility compliance verification
- Performance metric analysis and reporting

### Correction Agent
- Suggest code fixes for identified visual issues
- Apply automated corrections where safe
- Generate follow-up tasks for manual review