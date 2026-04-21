# Editable Template Creation — Static Template → `/conf` Editable Template

**Agent:** The parent skill loads this file when the user asks to create editable templates from existing static templates. **This file only defines the generation mechanics.** Discovery, context, per-template planning, and validation live in dedicated files:

- **Before this file:** [template-modernization-context.md](template-modernization-context.md) — discovery steps 1–9 and the structured context block. Every input this file consumes is sourced from the confirmed `.migration/template-context.yml` produced there.
- **After this file:** [template-modernization-validation.md](template-modernization-validation.md) — post-generation assertions (required attributes, `editable` flag placement, cross-reference integrity).

This file is **not** a prerequisite for `aem-modernization.md`. The plan table in the context file decides, per template, whether an editable template needs generating — both skills execute against the same plan.

No BPA pattern ID required.

---

## What This Pattern Does

Generates the JCR node tree for each editable template under:
```
ui.content/.../jcr_root/conf/<appId>/settings/wcm/templates/<templateName>/
```

Each editable template is a 4-node set:

| Node | File | Purpose |
|------|------|---------|
| Template root | `.content.xml` | Declares the `cq:Template`, title, status, allowed content paths |
| `structure/` | `structure/.content.xml` | Page structure with responsive grid layout — what authors see in the template editor |
| `initial/` | `initial/.content.xml` | Content copied into new pages created from this template |
| `policies/` | `policies/.content.xml` | Policy mapping tree — maps container nodes to content policies |

Also updates the parent `templates/.content.xml` index node to register each new template name.

---

## Inputs — from the confirmed context block

Before generating any file, verify `.migration/template-context.yml` exists and the user has replied `confirmed` on both the context block and the per-template plan table. If either is missing, **stop** and point the user at [template-modernization-context.md](template-modernization-context.md).

For each template this pass will create (rows where `editable.exists == false` and the plan row's **Create editable?** column is true), the context block supplies every input the generator needs. Do not re-derive any of these — read them from the YAML.

| Generator input | Source field in `.migration/template-context.yml` |
|---|---|
| `<appId>` | `apps[*].id` |
| `<templateName>` | `apps[*].templates[*].name` |
| `<humanTitle>` (→ `jcr:title`) | `apps[*].templates[*].static.jcrTitle` |
| `<allowedPathsPattern>` | `apps[*].templates[*].static.allowedPaths` — must NOT be `needs-user-confirm` at this point |
| `<templateType>` | `apps[*].conventions.templateType` — must NOT be `missing` |
| `<pageStructureResourceType>` | `apps[*].templates[*].static.pageResourceType` — `pageResourceTypeExists` must be `true` |
| `<contentContainerResourceType>` | `apps[*].conventions.contentContainerResourceType` |
| Breakpoints (`phone`, `tablet`, …) | `apps[*].conventions.breakpoints` — use every entry, in order, as-is |
| Named children for `structure/` | `templates[*].structureComponent.namedChildren[]` where `placement` ∈ `{ structure, structure+initial }` |
| Named children for `initial/` | `templates[*].structureComponent.namedChildren[]` where `placement` ∈ `{ initial, structure+initial }` |

**If any required field is marked `needs-user-confirm` or `missing`, stop — the context is not ready.** Return to the context-gathering step.

---

## File 1: Template root — `.content.xml`

**Path:**
```
ui.content/src/main/content/jcr_root/conf/<appId>/settings/wcm/templates/<templateName>/.content.xml
```

**Format:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:cq="http://www.day.com/jcr/cq/1.0"
    jcr:primaryType="cq:Template"
    allowedPaths="[<allowedPathsPattern>]">
    <jcr:content
        cq:templateType="/conf/<appId>/settings/wcm/template-types/page"
        jcr:primaryType="cq:PageContent"
        jcr:title="<humanTitle>"
        status="enabled"/>
</jcr:root>
```

**Field mapping:**
| Field | Source |
|-------|--------|
| `allowedPaths` | Copied from static template's `allowedPaths`, or derived from content path pattern |
| `cq:templateType` | Always the discovered template-types path (`/conf/<appId>/settings/wcm/template-types/page`) |
| `jcr:title` | Copied from static template's `jcr:content/jcr:title` |
| `status` | Always `"enabled"` for active templates |

**Do not include** `cq:lastModified` or `cq:lastModifiedBy` — these are author-set timestamps, not source-controlled.

---

## File 2: Structure node — `structure/.content.xml`

The structure defines the fixed page layout authors see in the template editor. It mirrors the static template's page component structure.

**Path:**
```
ui.content/src/main/content/jcr_root/conf/<appId>/settings/wcm/templates/<templateName>/structure/.content.xml
```

**Format:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
    jcr:primaryType="cq:Page">
    <jcr:content
        cq:deviceGroups="[/etc/mobile/groups/responsive]"
        cq:template="/conf/<appId>/settings/wcm/templates/<templateName>"
        jcr:primaryType="cq:PageContent"
        sling:resourceType="<appId>/components/structure/<templateName>">
        <root
            jcr:primaryType="nt:unstructured"
            sling:resourceType="wcm/foundation/components/responsivegrid">
            <responsivegrid
                jcr:primaryType="nt:unstructured"
                sling:resourceType="<appId>/components/content/container"
                editable="{Boolean}true"
                layout="responsiveGrid"/>
        </root>
        <cq:responsive jcr:primaryType="nt:unstructured">
            <breakpoints jcr:primaryType="nt:unstructured">
                <phone
                    jcr:primaryType="nt:unstructured"
                    title="Smaller Screen"
                    width="{Long}768"/>
                <tablet
                    jcr:primaryType="nt:unstructured"
                    title="Tablet"
                    width="{Long}1200"/>
            </breakpoints>
        </cq:responsive>
    </jcr:content>
</jcr:root>
```

**Key rules:**
- `cq:template` points back to the template's own path (self-reference)
- `sling:resourceType` on `jcr:content` = `<appId>/components/structure/<templateName>` — must match the page structure component discovered in step 3
- `<root>` uses `wcm/foundation/components/responsivegrid` — the WCM layout container
- `<responsivegrid>` inside root uses the **app's own content container** (`<appId>/components/content/container`) with `editable="{Boolean}true"` — this marks it as the author-editable zone
- `<cq:responsive>` breakpoints: use values discovered from existing templates; default to phone=768, tablet=1200 if none found
- `cq:deviceGroups="[/etc/mobile/groups/responsive]"` — always include on structure

**Child node placement is driven by the context block, not by judgement.**

For each `namedChildren` entry whose `placement` is `structure` or `structure+initial`, emit a child node of `<root>`. The shape depends on its `classification`:

| Classification | Shape under `<root>` |
|---|---|
| `parsys` | `<name jcr:primaryType="nt:unstructured" sling:resourceType="<contentContainerResourceType>" editable="{Boolean}true" layout="responsiveGrid"/>` |
| `locked` | `<name jcr:primaryType="nt:unstructured" sling:resourceType="<entry.resourceType>"/>` — no `editable` flag |

**Never emit a node in `structure/` that is not listed with `placement: structure` or `structure+initial`.** The classifier in step 6 of the context file has already decided, per named child, whether it belongs in `structure` (appears on existing pages — must be locked there) or `initial` (only copied into new pages). Placing a locked component in `initial/` deletes it from pre-existing pages on the next template update; that classification is what the context block's `contentScan` step exists to prevent.

---

## File 3: Initial content node — `initial/.content.xml`

The initial content is copied into every new page created from this template. It should be structurally identical to `structure` but without `editable`, `cq:deviceGroups`, and `<cq:responsive>`.

**Path:**
```
ui.content/src/main/content/jcr_root/conf/<appId>/settings/wcm/templates/<templateName>/initial/.content.xml
```

**Format:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
    jcr:primaryType="cq:Page">
    <jcr:content
        cq:template="/conf/<appId>/settings/wcm/templates/<templateName>"
        jcr:primaryType="cq:PageContent"
        sling:resourceType="<appId>/components/structure/<templateName>">
        <root
            jcr:primaryType="nt:unstructured"
            sling:resourceType="wcm/foundation/components/responsivegrid">
            <responsivegrid
                jcr:primaryType="nt:unstructured"
                sling:resourceType="<appId>/components/content/container"
                layout="responsiveGrid"/>
        </root>
    </jcr:content>
</jcr:root>
```

**Differences from `structure`:**
- No `cq:deviceGroups`
- No `editable="{Boolean}true"` on any child node
- No `<cq:responsive>` breakpoints block

**Pre-placed components:**
For templates where new pages must start with a specific component already present (e.g. a single-artifact template where the primary component is always required), add the component as a child of `<responsivegrid>` in initial content:
```xml
<responsivegrid jcr:primaryType="nt:unstructured"
    sling:resourceType="<appId>/components/content/container"
    layout="responsiveGrid">
    <primarycomponent jcr:primaryType="nt:unstructured"
        sling:resourceType="<appId>/components/content/<componentName>"/>
</responsivegrid>
```
Only pre-place components that belong in the editable zone. Components locked in `structure` must **not** be duplicated here.

**Required runtime nodes (e.g. `targeting`):**
If the page structure component renders a named child via `data-sly-resource` that is not a parsys (discovered in checklist step 8), add it as a direct child of `jcr:content` in initial — not inside `<root>`:
```xml
<jcr:content ...>
    <targeting jcr:primaryType="nt:unstructured"
        sling:resourceType="<appId>/components/content/<targetingComponent>"/>
    <root ...>
        ...
    </root>
</jcr:content>
```

---

## File 4: Policies mapping node — `policies/.content.xml`

The policies node maps each container in the template to a content policy. For new templates this is a minimal placeholder — actual policy assignments are done after deployment via the template editor or can be copied from an existing template.

**Path:**
```
ui.content/src/main/content/jcr_root/conf/<appId>/settings/wcm/templates/<templateName>/policies/.content.xml
```

**Format:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:nt="http://www.jcp.org/jcr/nt/1.0"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
          xmlns:sling="http://sling.apache.org/jcr/sling/1.0"
    jcr:primaryType="cq:Page">
    <jcr:content
        jcr:primaryType="nt:unstructured"
        sling:resourceType="wcm/core/components/policies/mappings">
        <root
            jcr:primaryType="nt:unstructured"
            sling:resourceType="wcm/core/components/policies/mapping">
            <responsivegrid
                jcr:primaryType="nt:unstructured"
                sling:resourceType="wcm/core/components/policies/mapping"/>
        </root>
    </jcr:content>
</jcr:root>
```

**If copying an existing policy reference:** If the user has an existing template with a `cq:policy` value (e.g. `wcm/foundation/components/responsivegrid/policy_31297318674600`) on the `<root>` node, that policy can be referenced here. Only copy it if the user explicitly asks to inherit the same policy — otherwise leave the mapping empty (no `cq:policy` attribute).

---

## File 5: Templates index — `templates/.content.xml`

The parent `templates/` folder node lists all template names as empty child elements. **Read the existing file first** and add only the new template names.

**Path:**
```
ui.content/src/main/content/jcr_root/conf/<appId>/settings/wcm/templates/.content.xml
```

**Format (existing entries preserved, new names appended):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<jcr:root xmlns:jcr="http://www.jcp.org/jcr/1.0"
          xmlns:rep="internal"
          xmlns:cq="http://www.day.com/jcr/cq/1.0"
    jcr:mixinTypes="[rep:AccessControllable]"
    jcr:primaryType="cq:Page">
    <rep:policy/>
    <existing-template-1/>
    <existing-template-2/>
    <new-template-name/>
</jcr:root>
```

**Rule:** Preserve every existing `<childName/>` entry. Only append new ones. Do not remove or reorder existing entries.

---

## Packaging in `ui.content`

Confirm the `filter.xml` for `ui.content` includes the templates subtree:

```xml
<filter root="/conf/<appId>/settings/wcm/templates"/>
```

If missing, add it. Also verify the template-types path is filtered if it was just created:

```xml
<filter root="/conf/<appId>/settings/wcm/template-types"/>
```

---

## Pipeline position

This file is one step in the per-template pipeline defined by the context file's plan table. Both editable-template creation and rule generation read the same `.migration/template-context.yml` and execute the same plan; there is no branch-level ordering. For any given template row, the pipeline is:

```
context → per-template plan row → (generate editable template if plan says so)
                                → (generate structure rule if plan says so)
                                → (generate component rule if plan says so)
                                → (generate policy rule if plan says so)
                                → validation
```

A template row with all four plan columns true runs all four generators in one pass. Validation runs once at the end, covering every artifact generated this session.

---

## Output summary (report to user)

```
Editable templates created:
  <templateName>  →  conf/<appId>/settings/wcm/templates/<templateName>/
    .content.xml         (cq:Template root, status=enabled)
    structure/           (layout with responsive grid + locked children per context)
    initial/             (per-context initial content; locked children excluded)
    policies/            (policy mapping placeholder)

templates/.content.xml   updated — added: <list of new template names>
filter.xml               <added entry / already present>

Skipped (already exist):
  <list of templates where editable.exists was already true>

Plan defers to validation:
  Run the checks in template-modernization-validation.md before committing.
```

---

## Post-generation step

Run every applicable assertion in [template-modernization-validation.md](template-modernization-validation.md) — sections 1 (editable template) and 6 (filter coverage) always apply. Do not commit any file that fails validation; fix and re-run.

Rules previously listed as "Critical rules" in this file (self-reference, editable flag placement, breakpoint handling, `templates/.content.xml` preservation) are now expressed as machine-checkable assertions in the validation file. They are enforced post-generation, not by prose reminder.
