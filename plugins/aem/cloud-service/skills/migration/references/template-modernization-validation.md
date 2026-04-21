# Template Modernization — Post-Generation Validation

**Agent:** Run these checks after every generation pass (editable templates, structure rules, component rules, policy rules). This replaces the free-form "Critical rules" sections previously in `editable-template-creation.md` and `aem-modernization.md`. Each rule below is a **machine-checkable assertion** — run the listed `rg` command, confirm the expected result, and fail the generation step if any assertion fails.

**Why this file exists:** Prose rules an LLM has to remember are unreliable. A forgotten `cq:copyChildren` flag silently deletes production content. A forgotten `editable` flag makes the template uneditable. These failure modes are cheap to detect mechanically and catastrophic to miss. Every rule here is expressible as a grep.

Validation is **not optional**. If a check fails, stop, report the failing file and the expected shape, and fix before any commit.

---

## How to run validation

From the workspace root, run each check below and expect the documented output. If the repo has no generated file for a given artifact (e.g., no component rewrite rules were generated this pass), skip the corresponding check.

All `rg` commands below use ripgrep. The agent should use the Grep tool (which wraps `rg`) rather than shelling out.

---

## 1. Editable template assertions

### 1.1 Template root: `cq:Template` + required attributes

```
rg -l 'jcr:primaryType="cq:Template"' <uiContent>/src/main/content/jcr_root/conf/*/settings/wcm/templates/*/.content.xml
```

For each file found:

- Must contain `jcr:primaryType="cq:Template"` on the root node.
- Must contain `allowedPaths="[...]"` on the root node (non-empty array).
- Must contain `status="enabled"` on `<jcr:content>`.
- Must contain `cq:templateType="/conf/<appId>/settings/wcm/template-types/page"` on `<jcr:content>`.
- Must **NOT** contain `cq:lastModified` or `cq:lastModifiedBy` (those are author-set and must not be committed).

**Failure example:** missing `status="enabled"` — template shows as "draft" and authors cannot create pages from it.

### 1.2 `structure/.content.xml`: editable container + self-referencing `cq:template`

```
rg -c 'editable="\{Boolean\}true"' <uiContent>/src/main/content/jcr_root/conf/*/settings/wcm/templates/*/structure/.content.xml
```

For each structure file:

- Must contain **exactly one** occurrence of `editable="{Boolean}true"` by default. (If the user has confirmed multiple editable zones per the context, verify the count matches that confirmation.)
- `cq:template` attribute on `<jcr:content>` must equal the template's own `/conf/<appId>/settings/wcm/templates/<templateName>` path (self-reference).
- `sling:resourceType` on `<jcr:content>` must match `structureComponent.path` from the context block for that template.
- Must contain `cq:deviceGroups="[/etc/mobile/groups/responsive]"`.
- Must contain `<cq:responsive>/breakpoints` with the breakpoints from `conventions.breakpoints` in the context block — the agent must **not** invent values.

### 1.3 `initial/.content.xml`: must NOT be editable

```
rg 'editable="\{Boolean\}true"' <uiContent>/src/main/content/jcr_root/conf/*/settings/wcm/templates/*/initial/.content.xml
```

**Expected: zero matches.** `editable="{Boolean}true"` belongs on `structure`, never on `initial`. Also:

- Must NOT contain `<cq:responsive>` or `cq:deviceGroups`.
- Must contain the same `cq:template` self-reference as `structure`.
- Must include every child marked `placement: initial` or `structure+initial` in the context block for that template.
- Must **exclude** every child marked `placement: structure` only (locked components). Including them here would cause existing pages to render a duplicate or lose the component on structure updates.

### 1.4 `policies/.content.xml`: mapping tree shape

```
rg 'sling:resourceType="wcm/core/components/policies/mappings"' <uiContent>/src/main/content/jcr_root/conf/*/settings/wcm/templates/*/policies/.content.xml
```

For each policy file:

- Root `jcr:content` must have `sling:resourceType="wcm/core/components/policies/mappings"` (plural `mappings`).
- Child container nodes must have `sling:resourceType="wcm/core/components/policies/mapping"` (singular `mapping`).
- If `cq:policy` is present on any node, the referenced policy path must exist under `/conf/<appId>/settings/wcm/policies/` in the repo. Report missing references as warnings (not blockers — policies may live in a separate module).

### 1.5 `templates/.content.xml`: preservation

Before generation, hash the existing `<uiContent>/.../conf/<appId>/settings/wcm/templates/.content.xml`. After generation:

- Every `<childName/>` entry from the pre-hash must still be present (no deletions, no renames, no reorders).
- Only new template names added by this pass may appear as additional entries.

If any pre-existing entry is missing, the generation has corrupted the registration index and must be reverted.

---

## 2. Structure rewrite rule assertions

### 2.1 XML rule shape

```
rg -l 'staticTemplate=' <uiApps>/src/main/content/jcr_root/apps/*/modernization/structure-rewrite-rules/*.xml
```

For each rule file:

- Root `jcr:primaryType="nt:unstructured"`.
- `staticTemplate` attribute equals a valid path under `/apps/<appId>/templates/<name>` — the path must exist in the repo (cross-check against `templates[*].static.path` in context).
- `editableTemplate` attribute equals a valid path under `/conf/<appId>/settings/wcm/templates/<name>` — the path must exist in the repo (cross-check against `templates[*].editable.path` with `editable.exists == true`).
- File name (without `.xml`) matches the template name used in both `staticTemplate` and `editableTemplate`.

**Failure example:** `editableTemplate` points to a template that does not exist in `/conf` — the modernization job will fail at runtime with an empty conversion.

### 2.2 OSGi factory config: required keys

```
rg -l 'com\.adobe\.aem\.modernize\.structure\.rule\.PageRewriteRule' <uiConfig>/src/main/content/jcr_root/apps/*/osgiconfig/config.author/
```

For each config JSON:

- Keys present: `static.template`, `sling.resourceType`, `editable.template`, `container.resourceType`.
- `static.template` matches the rule XML's `staticTemplate`.
- `editable.template` matches the rule XML's `editableTemplate`.
- `sling.resourceType` equals `<appId>/components/structure/<templateName>` and the folder exists in `ui.apps` (cross-check against `templates[*].static.pageResourceTypeExists == true`).
- `container.resourceType` equals `wcm/foundation/components/responsivegrid` (this is the WCM foundation grid — it is NOT the app's content container).

### 2.3 Service registration

```
rg -l 'StructureRewriteRuleService' <uiConfig>/src/main/content/jcr_root/apps/*/osgiconfig/config.author/
```

- Exactly one `StructureRewriteRuleService.cfg.json` per app (or one file per project listing all app paths in `search.paths`).
- Every path in `search.paths` must exist as a folder in `ui.apps` (cross-check against the generated rule folders).

---

## 3. Component rewrite rule assertions

### 3.1 `cq:copyChildren` is mandatory

**This is the single highest-impact check in this file.** Omitting this flag destroys the children of every parsys converted by the rule.

```
rg -L 'cq:copyChildren="\{Boolean\}true"' <uiApps>/src/main/content/jcr_root/apps/*/modernization/component-rewrite-rules/*.xml
```

**Expected: zero files output** (the `-L` flag inverts matching, listing files that do NOT contain the pattern). Any file listed must have `cq:copyChildren="{Boolean}true"` added to its `<replacement>/<container>` node before the rule is committed.

### 3.2 Replacement resourceType is the app container

For each component rewrite rule:

- `<replacement>/<container>/@sling:resourceType` equals the app's content container from `conventions.contentContainerResourceType` in the context block (typically `<appId>/components/content/container`).
- It is **NOT** `wcm/foundation/components/responsivegrid` — that would create an orphan grid with no policies.

### 3.3 Pattern matches source

For each rule:

- Root `@sling:resourceType` equals `<patterns>/<parsys>/@sling:resourceType` (both describe the node being matched).
- Both equal `wcm/foundation/components/parsys` for the standard parsys-to-container rule.

### 3.4 Service registration

```
rg -l 'ComponentRewriteRuleService' <uiConfig>/src/main/content/jcr_root/apps/*/osgiconfig/config.author/
```

- If both the PID-style and `Impl` config files already exist, both must have identical `search.paths`.
- If starting fresh, use only the non-`Impl` PID (`com.adobe.aem.modernize.component.ComponentRewriteRuleService.cfg.json`).

---

## 4. Policy import rule assertions

### 4.1 XML rule shape

For each file in `<uiApps>/.../apps/*/modernization/policy-import-rules/*.xml`:

- `design` attribute equals a path under `/etc/designs/<name>` that appears in `designs[*].path` in the context block.
- `policyPath` attribute equals a path under `/conf/<appId>/settings/wcm/policies/`.
- One rule file per design node. No rule file may list more than one design.

### 4.2 Service registration (both PIDs)

Two config files required, with identical `search.paths`:
- `com.adobe.aem.modernize.policy.PolicyImportRuleService.cfg.json`
- `com.adobe.aem.modernize.policy.impl.PolicyImportRuleServiceImpl.cfg.json`

```
rg -l 'PolicyImportRuleService' <uiConfig>/src/main/content/jcr_root/apps/*/osgiconfig/config.author/
```

Both files present, both with the same `search.paths` array.

---

## 5. Repoinit initializer (once per project)

```
rg -l 'RepositoryInitializer-aem-modernize' <uiConfig>/src/main/content/jcr_root/apps/*/osgiconfig/config.author/
```

- Exactly one file project-wide (not per app).
- `scripts` array contains `create path (sling:Folder) /var/aem-modernize` and the four `/var/aem-modernize/job-data/*` subpaths.
- Must NOT contain `$[secret:]`, `$[env:]`, or any placeholder syntax — repoinit does not support interpolation.

---

## 6. Filter coverage

For each app with generated content:

```
rg 'filter root="/conf/.*/settings/wcm/templates"' <uiContent>/src/main/content/META-INF/vault/filter.xml
rg 'filter root="/apps/.*/modernization"'          <uiApps>/src/main/content/META-INF/vault/filter.xml
```

- If editable templates were generated, the first filter must exist in `ui.content`'s `filter.xml`.
- If any modernization rules were generated, the second filter must exist in `ui.apps`'s `filter.xml`.

Missing filters mean the generated files won't be packaged into the CRX deployment — the rules won't take effect in AEM.

---

## 7. Cross-reference integrity

The context block's `templates[*]` entries must stay consistent across generated artifacts. After generation, re-load `.migration/template-context.yml` and verify:

- Every `templates[*]` where `editable.exists` became `true` (newly generated) has all four files present: `.content.xml`, `structure/.content.xml`, `initial/.content.xml`, `policies/.content.xml`.
- Every `templates[*]` where `existingRules.structure.exists` became `true` has both the XML rule and the OSGi factory config generated in the matching pass.
- Every `namedChildren` entry with `placement: structure` appears as a child of `<root>` in the structure XML.
- Every `namedChildren` entry with `placement: initial` appears as a child of `<jcr:content>` (or `<root>`, depending on its own resource type) in the initial XML.
- No `namedChildren` entry with `placement: structure` (locked) appears in the initial XML.

This is the only step that catches the "locked component placed in initial" bug automatically. Without this cross-reference pass, the bug only surfaces after deployment when existing pages render incorrectly.

---

## Validation report

After running all checks, emit:

```
Validation report — <ISO timestamp>

Editable templates          : <N checked> pass / <N> fail
Structure rewrite rules     : <N checked> pass / <N> fail
Component rewrite rules     : <N checked> pass / <N> fail — cq:copyChildren verified
Policy import rules         : <N checked> pass / <N> fail
Repoinit initializer        : pass / fail / n-a
Filter coverage             : pass / fail
Cross-reference integrity   : pass / fail

Failures:
  <file path> : <rule number> : <expected vs actual>
  ...

Blocking: <yes | no>
```

If any assertion fails, the agent must fix the failure before proceeding. Do not commit files that fail validation.
