# Template Modernization — Shared Discovery & Context

**Agent:** Load this file **first** when the user asks to create editable templates, convert static templates, or generate AEM Modernize Tools rules. Both `editable-template-creation.md` and `aem-modernization.md` consume the structured context produced here.

**Why this file exists:** Editable-template creation and modernization-rule generation share most inputs (app IDs, static templates, structure components, breakpoints, design paths). Gathering them twice with free-form "report findings" wastes work, duplicates prompts, and produces inconsistent answers across references. Discover once, emit a structured context block, consume it everywhere.

---

## Output: the structured context block

Discovery produces one YAML block and writes it to `.migration/template-context.yml` (session-local — add `.migration/` to `.gitignore` if not already). The agent also echoes the full block to the user and asks for confirmation before any file generation runs.

```yaml
generated: <ISO-8601 timestamp>
workspaceRoot: <absolute path>
apps:
  - id: <appId>
    paths:
      uiApps: <relative path to ui.apps>
      uiContent: <relative path to ui.content>
      uiConfig: <relative path to ui.config>
    conventions:
      # Each field is either discovered or explicitly marked "needs-user-confirm"
      contentContainerResourceType: <appId>/components/content/container | needs-user-confirm
      breakpoints:
        - { name: phone,  width: 768,  title: "Smaller Screen" }
        - { name: tablet, width: 1200, title: "Tablet" }
        # Or: source: needs-user-confirm (when no existing template provides them)
      templateType: /conf/<appId>/settings/wcm/template-types/page | missing
    templates:
      - name: <templateName>
        static:
          path: /apps/<appId>/templates/<templateName>
          jcrTitle: <title>
          allowedPaths: <pattern> | needs-user-confirm
          pageResourceType: <appId>/components/structure/<templateName>
          pageResourceTypeExists: true | false
        editable:
          path: /conf/<appId>/settings/wcm/templates/<templateName>
          exists: true | false
        structureComponent:
          path: <relative path> | missing
          namedChildren:
            - name: <nodeName>
              source: "<file>:<line>"          # data-sly-resource / sling:include site
              resourceType: <sling:resourceType>
              classification: parsys | locked | required-runtime | initial-only
              presentOnExistingPages: true | false | unknown
              placement: structure | structure+initial | initial | runtime-only
              reason: <one line provenance — how this classification was derived>
        existingRules:
          structure: { exists: bool, path: <relative> }
          component: { exists: bool, path: <relative> }
          policy:    { exists: bool, path: <relative> }
    designs:
      - path: /etc/designs/<designName>
        referencedBy: [<templateName>, ...]
    contentScan:
      performed: true | false
      sampledPagesPerTemplate: <N>
      notes: <e.g., "no /content subtree in workspace — classification needs user confirm">
```

**Every field is required.** If a value cannot be determined, record the literal `needs-user-confirm` (or the relevant variant such as `missing`, `unknown`). Do not silently default.

---

## Discovery steps

Execute these in order. Each step populates a specific slice of the context block.

### 1. App roots

Glob `**/pom.xml` and `**/filevault-package-maven-plugin` configurations. For each discovered app, record:

- `apps[*].id` — from the `appId` property (or `group` / `name` if that convention is used in the repo)
- `apps[*].paths.uiApps` — module whose packaging is `content-package` and which writes to `/apps/<appId>`
- `apps[*].paths.uiContent` — module that writes to `/content/<appId>` and/or `/conf/<appId>`
- `apps[*].paths.uiConfig` — module that writes to `/apps/<appId>/osgiconfig/`

If no `pom.xml` is present (Gradle / non-Maven), fall back to globbing `**/jcr_root/apps/*/` and take the first directory name as the app ID. Record the detection source in the context block as a comment.

### 2. Conventions (breakpoints, container resourceType, template type)

For each `apps[*].id`:

- **Breakpoints:** Glob `**/jcr_root/conf/<appId>/settings/wcm/templates/*/structure/.content.xml`. Extract `cq:responsive/breakpoints/*` nodes. If at least one editable template exists, use those values for every new template. If none exist, record `source: needs-user-confirm` — do not default to `phone=768, tablet=1200`.
- **Content container resourceType:** Grep `ui.apps` for `layout="responsiveGrid"` in component `.content.xml` files. The component whose resourceType is `<appId>/components/content/<something>` and extends `wcm/foundation/components/responsivegrid` or `core/wcm/components/container` is the content container. If multiple candidates match, record both and mark `needs-user-confirm`.
- **Template type:** Check `**/jcr_root/conf/<appId>/settings/wcm/template-types/page/.content.xml`. If present, record the path. If absent, record `missing` — the user must create or install a template type before template generation can proceed.

### 3. Static templates

Glob `**/jcr_root/apps/<appId>/templates/*/.content.xml`. For each match, record:

- `templates[*].name` — the containing folder name
- `templates[*].static.path` — the JCR path
- `templates[*].static.jcrTitle` — from `jcr:content/@jcr:title`
- `templates[*].static.allowedPaths` — from the root node's `@allowedPaths`. If empty, record `needs-user-confirm`.
- `templates[*].static.pageResourceType` — from `jcr:content/@sling:resourceType`
- `templates[*].static.pageResourceTypeExists` — check that the folder at `ui.apps/.../apps/<appId>/components/<path-from-resourceType>/` exists; record the boolean.

### 4. Editable templates (existing)

Glob `**/jcr_root/conf/<appId>/settings/wcm/templates/*/.content.xml`. Match each by folder name to the static template list. Populate `templates[*].editable.exists` accordingly. **Do not flag the branch as blocked when some are missing** — record per-template state and let the consumer decide (see "Per-template planning" below).

### 5. Structure components (named children)

For each template where `templates[*].static.pageResourceTypeExists == true`, read the component folder. Collect HTL files (`*.html`) and JSP files (`*.jsp`) and find every `data-sly-resource`, `sling:include`, or `cq:include` call. For each named child include, record one entry under `structureComponent.namedChildren`.

Leave `classification` and `placement` blank for now — step 6 computes them.

### 6. Classify named children (data-driven locked/initial decision)

For each named child found in step 5, determine its **classification** and **placement** using this decision table, in order:

| Signal | Classification | Placement |
|---|---|---|
| Resource type is `wcm/foundation/components/parsys`, `wcm/foundation/components/responsivegrid`, or `core/wcm/components/container` | `parsys` | `structure` (as editable container) |
| Named child appears on ≥ 1 existing page under `/content/<appId>` (see step 7) | `locked` | `structure` |
| Named child represents a runtime-only node (e.g. `targeting`, `LiveSyncConfig`, `cq:responsive` metadata) — detected by resource type prefix `cq/` or well-known name list | `required-runtime` | `initial` (as direct child of `jcr:content`) |
| Named child is **not** found on any existing page but IS present in the static template's `jcr:content` | `initial-only` | `initial` |
| No signal resolves | `unknown` | record `needs-user-confirm`; prompt the user once per distinct child before generation |

Record the **provenance** in `reason`: cite the exact file:line the decision came from (e.g., `"/content/<appId>/us/en/.content.xml contains 'header' → locked"`).

**This replaces the prose warning "do not put locked components in initial/"**. The classification is data-driven, not judgement-based.

### 7. Content scan (to drive the classifier)

For each app:

- Glob `**/jcr_root/content/<appId>/**/.content.xml` up to a sampling limit (default 20 pages per template, chosen to bound scan time).
- For each page whose `jcr:content/@cq:template` references a static template in scope, record which named children are present as direct children of `jcr:content`.
- Populate `presentOnExistingPages` on each `structureComponent.namedChildren` entry.
- If the workspace has no `/content/<appId>` subtree at all (template-only monorepo), set `contentScan.performed = false` and mark every `presentOnExistingPages` as `unknown`. Classification falls back to `needs-user-confirm` for anything not resolved by resource-type signal.

### 8. Existing rules & designs

For each app:

- Glob `**/jcr_root/apps/<appId>/modernization/structure-rewrite-rules/*.xml` and populate `templates[*].existingRules.structure`.
- Glob `**/jcr_root/apps/<appId>/modernization/component-rewrite-rules/*.xml` and populate `templates[*].existingRules.component`.
- Glob `**/jcr_root/apps/<appId>/modernization/policy-import-rules/*.xml` and populate `templates[*].existingRules.policy`.
- Grep both `ui.apps` content and `ui.config` OSGi configs for `/etc/designs/<name>` references. Populate `designs[*]`.

### 9. Write the context block

Write the final YAML to `.migration/template-context.yml`. Show the full block to the user. Ask:

> **"Confirm this context. Flag any field marked `needs-user-confirm` or `missing`. Reply `confirmed` to proceed, or correct specific fields."**

Do **not** proceed to any generation step until the user replies `confirmed` (or until every `needs-user-confirm` field has been resolved by their replies).

---

## Per-template planning

Once the context is confirmed, derive the **plan table** — one row per template, four boolean columns:

| Template | Create editable? | Create structure rule? | Create component rule? | Create policy rule? |
|---|---|---|---|---|
| `homepage` | `!editable.exists` | `!existingRules.structure.exists` | `!existingRules.component.exists && has-parsys` | `has-design && !existingRules.policy.exists` |
| … | … | … | … | … |

**Rules are per-template, not per-branch.** Template X can need only "create structure rule" while template Y needs "create editable + structure + component". Execute per-row, per-column — independently. A failure on template Y does not block template X.

**Echo the plan table** to the user before generating anything. This is the second (and final) confirmation gate before files are written.

---

## What this replaces

| Old location | Old content | New location |
|---|---|---|
| `editable-template-creation.md` → "Prerequisites — Read the Project First" | 8-step discovery checklist (with the duplicate step 8 bug) | **This file**, steps 1–9 |
| `aem-modernization.md` → "Prerequisites — Read the Project First" | 11-step discovery checklist | **This file**, steps 1–9 (superset) |
| `aem-modernization.md` → "C is a prerequisite for D" prose gating | whole-branch ordering enforced by prose | **This file**, per-template plan table |
| `editable-template-creation.md` → "If the template has a locked (always-present) component" paragraph warning | prose judgement rule | **This file**, step 6 data-driven classification |

The two downstream files now only own **generation mechanics** for their respective artifact sets. Discovery, classification, and planning live here.

---

## Relationship to validation

After the plan is executed, the agent **must** run the post-generation validation in [template-modernization-validation.md](template-modernization-validation.md). Validation is not optional and not covered by "critical rules" lists in the old reference files — those lists are deleted in favor of the machine-checkable assertions in the validation file.
