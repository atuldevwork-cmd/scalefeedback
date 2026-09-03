# Marker.io Feature Research

Source pages: https://marker.io/ai · https://marker.io/website-monitoring

## 1. AI Features (marker.io/ai)

### Core AI

**AI Magic Rewrite**
- Transforms messy comments into structured bug reports
- Structures content for easier bug triaging
- Improves clarity for developers and QA teams
- Fixes grammar and spelling while preserving tone and language
- Works alongside automatically populated bug tracking context

**AI Title Generation**
- Automatically generates concise, actionable issue titles from descriptions
- Uses key phrases to help teams prioritize bugs, feature requests, support tickets, and critical issues
- Stays faithful to original report content

**AI Translation**
- Detects and translates bug reports from 200+ languages
- Optimized for English, Spanish, French, Dutch, and Polish team languages
- Translates issue titles and descriptions into team's preferred language
- Automatically marks translations with source language attribution

### Marker.io MCP (Model Context Protocol)

- Connects Claude, Cursor, and other AI tools to incoming bug reports
- Synthesizes duplicate reports automatically
- Automates testing procedures
- Summarizes test results
- Suggests code fixes or pull requests
- Pulls full bug context for AI agents
- Reviews code changes and opens pull requests
- Analyzes incoming reports to spot duplicates, recurring bugs, and critical issues
- Pipes bug data into GitHub Issues, Linear, and ClickUp

### Control & Customization

- Enable/disable each AI tool independently on the account
- Edit AI-generated titles while preserving descriptions
- Revert to original description with one click
- Keep specific phrases untouched by wrapping them in quotation marks
- Detects bug reports in 200+ languages

### Security & Privacy

- Powered by Amazon Bedrock for enterprise-grade security
- Data never used to train AI models
- Requests processed independently and not retained
- Encrypted in transit and at rest
- GDPR compliant, SOC 2 Type II certified

---

## 2. Website Monitoring Features (marker.io/website-monitoring)

### Core Functionality

**Automated Scanning**
- Scans every page automatically to catch accessibility issues a manual review would miss
- Runs on selected pages on a schedule (weekly, monthly, or on-demand)
- Checks entire sitemaps or hand-picked page lists
- Can exclude irrelevant pages

**Issue Detection & Documentation**
- Screenshots of broken elements with code and plain-English fix guidance
- Automatic grouping of duplicate issues across pages
- WCAG A, AA, or AAA compliance level selection
- Each issue is screenshotted, grouped, and explained

### Accessibility Checks (In Beta)

- Missing alt text on images
- Poor text color contrast for AA compliance
- ARIA roles and required attributes
- Skip to content links

### Workflow Integration

**Issue Management**
- Issues automatically populate the Marker.io platform
- Assignment of ownership by area
- Direct integration with issue trackers: Jira, ClickUp, Asana, and others

**Fix Tracking**
- Historical logging with dates and owners
- Single issue resolution applies across all instances
- Rescan capability for individual page verification

### Compliance & Auditing

- GDPR readiness
- SOC 2 Type II compliance
- Historical data tracking for progress
- Legal documentation of good-faith efforts

### Roadmap (Coming Soon)

**Content Quality**
- Spelling and grammar error detection
- Broken links and missing images
- Lorem Ipsum placeholder removal
- Unclear link text identification

**Compliance Monitoring**
- Cookie and privacy policy reviews
- Form field GDPR compliance
- Gender and disability language assessment

**SEO & AI Search**
- Page title and meta description optimization
- Structured sitemap definition
- Thin page detection
- Analytics implementation verification

**Data Privacy**
- Public address and contact information detection
- Insecure cookie flag identification
- HSTS implementation for SSL pages

**AI-Assisted Policies**
- Custom policy generation
- Visual page inspection
- Brand guideline enforcement

### User Control

- Schedule customization
- Scope selection (whole sitemap or specific pages)
- Issue resolution or dismissal with reasoning
- False positive flagging
- On-demand rescanning
- No automatic data transmission

### Enterprise Capabilities

- Multiple website monitoring with individual scores
- Owner assignment by department
- Compliance history across team transitions
- Pre-launch issue detection for agencies
- Cross-market compliance maintenance
