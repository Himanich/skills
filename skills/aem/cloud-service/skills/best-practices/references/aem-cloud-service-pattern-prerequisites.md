# Java / OSGi prerequisites (same skill)

Before **pattern-specific** steps in other `references/*.md` pattern files, apply these modules when the code touches SCR, `ResourceResolver`, or logging. **Do not paste** their full procedures into other reference files — link here or to the modules below.

| Topic | Module |
|-------|--------|
| Felix SCR → OSGi Declarative Services (includes **POM cleanup**: remove deprecated deps & plugins) | [scr-to-osgi-ds.md](scr-to-osgi-ds.md) |
| `ResourceResolver` + SLF4J logging | [resource-resolver-logging.md](resource-resolver-logging.md) |

**POM cleanup is part of SCR→DS.** When migrating any pattern, the agent must also remove deprecated dependencies and plugins from the module `pom.xml` — see **Step 0** in [scr-to-osgi-ds.md](scr-to-osgi-ds.md).

**Repository-root paths** (workspace resolution):

- `skills/aem/cloud-service/skills/best-practices/references/scr-to-osgi-ds.md`
- `skills/aem/cloud-service/skills/best-practices/references/resource-resolver-logging.md`

Main skill hub: [`../SKILL.md`](../SKILL.md).

**Asset API (`assetApi`):** [asset-manager.md](asset-manager.md) and path files only.
