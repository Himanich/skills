# Adobe Skills for AI Coding Agents

Repository of Adobe skills for AI coding agents.

## Installation

### Claude Code Plugins

```bash
# Add the Adobe Skills marketplace
/plugin marketplace add adobe/skills

# Install AEM Edge Delivery Services plugin (all 17 skills)
/plugin install aem-edge-delivery-services@adobe-skills

# Install AEM Project Management plugin (6 skills)
/plugin install aem-project-management@adobe-skills
```

### Vercel Skills (npx skills)

```bash
# Install all AEM Edge Delivery Services skills
npx skills add https://github.com/adobe/skills/tree/main/skills/aem/edge-delivery-services --all

# Install specific skill(s)
npx skills add adobe/skills -s content-driven-development
npx skills add adobe/skills -s content-driven-development building-blocks testing-blocks

# Install all Adobe skills (all products)
npx skills add adobe/skills --all

# List available skills
npx skills add adobe/skills --list
```

### upskill (GitHub CLI Extension)

```bash
gh extension install trieloff/gh-upskill

# Install all skills from this repo
gh upskill adobe/skills --all

# Install only AEM Edge Delivery Services skills
gh upskill adobe/skills --path skills/aem/edge-delivery-services --all

# Install a specific skill
gh upskill adobe/skills --path skills/aem/edge-delivery-services --skill content-driven-development

# List available skills in a subfolder
gh upskill adobe/skills --path skills/aem/edge-delivery-services --list
```

## Available Skills

### AEM Edge Delivery Services

#### Core Development

| Skill | Description |
|-------|-------------|
| `content-driven-development` | Orchestrates the CDD workflow for all code changes |
| `analyze-and-plan` | Analyze requirements and define acceptance criteria |
| `building-blocks` | Implement blocks and core functionality |
| `testing-blocks` | Browser testing and validation |
| `content-modeling` | Design author-friendly content models |
| `code-review` | Self-review and PR review |

#### Discovery

| Skill | Description |
|-------|-------------|
| `block-inventory` | Survey available blocks in project and Block Collection |
| `block-collection-and-party` | Search reference implementations |
| `docs-search` | Search aem.live documentation |
| `find-test-content` | Find existing content for testing |

#### Migration

| Skill | Description |
|-------|-------------|
| `page-import` | Import webpages (orchestrator) |
| `scrape-webpage` | Scrape and analyze webpage content |
| `identify-page-structure` | Analyze page sections |
| `page-decomposition` | Analyze content sequences |
| `authoring-analysis` | Determine authoring approach |
| `generate-import-html` | Generate structured HTML |
| `preview-import` | Preview imported content |

### AEM Project Management

Project lifecycle management for AEM Edge Delivery Services including handover documentation, PDF generation, and authentication.

> **Usage Note:** This plugin is designed to run at the root of an AEM Edge Delivery Services project in an isolated workspace. Clone your Edge Delivery Services repository and run the plugin from the project root to ensure the PDF lifecycle hooks correctly track only your project's documentation files.

**Quick Start:**
```bash
cd your-eds-project
# Say: "generate handover docs"
```

**Setup:** You will be prompted for your Config Service organization name (the `{org}` in `https://main--site--{org}.aem.page`). A browser window will then open for authentication - sign in and **close the browser window** to continue. The org name and auth token are saved locally for guide generation.

**Output:** Professional PDFs generated in `project-guides/` folder:
- `project-guides/AUTHOR-GUIDE.pdf` - For content authors
- `project-guides/DEVELOPER-GUIDE.pdf` - For developers
- `project-guides/ADMIN-GUIDE.pdf` - For administrators

| Skill | Description |
|-------|-------------|
| `handover` | Orchestrates project handover documentation generation |
| `authoring` | Generate comprehensive authoring guide for content authors |
| `development` | Generate technical documentation for developers |
| `admin` | Generate admin guide for site administrators |
| `whitepaper` | Create professional PDF whitepapers from Markdown |
| `auth` | Authenticate with AEM Config Service API |

## Repository Structure

```
skills/
└── aem/
    ├── edge-delivery-services/
    │   ├── .claude-plugin/
    │   │   └── plugin.json
    │   └── skills/
    │       ├── content-driven-development/
    │       ├── building-blocks/
    │       └── ...
    └── project-management/
        ├── .claude-plugin/
        │   └── plugin.json
        ├── fonts/
        ├── hooks/
        │   └── pdf-lifecycle.js
        ├── templates/
        │   └── whitepaper.typ
        └── skills/
            ├── handover/
            ├── authoring/
            ├── development/
            ├── admin/
            ├── whitepaper/
            └── auth/
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding or updating skills.

## Resources

- [agentskills.io Specification](https://agentskills.io)
- [Claude Code Plugins](https://code.claude.com/docs/en/discover-plugins)
- [Vercel Skills](https://github.com/vercel-labs/skills)
- [upskill GitHub Extension](https://github.com/trieloff/gh-upskill)

## License

Apache 2.0 - see [LICENSE](LICENSE) for details.
