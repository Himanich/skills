# CAM / MCP (Cloud Adoption Service)

Read this file when **fetching BPA targets via MCP** instead of a CSV or cached collection. Parent skill: `../SKILL.md`.

## Happy path (what the user should see)

1. Agent calls **`list-projects`** and shows **name**, **id**, and **description**.
2. **You pick** a project (even if only one is listed — confirms the right CAM context).
3. Agent calls **`fetch-cam-bpa-findings`** with that project and the **one pattern** for this session (`scheduler`, `assetApi`, etc., or `all` then filtered).
4. Agent maps returned targets to Java files and continues the migration workflow in `../SKILL.md`.

### Project name and ID — non-negotiable

- **Never** call **`fetch-cam-bpa-findings`** with a `projectId` or `projectName` that the user typed until it is **matched to a row** from the latest **`list-projects`** response, **or** the user has explicitly confirmed the intended project after you showed **name**, **id**, and **description** for all listed projects.
- If the user gave a name before you listed projects, still run **`list-projects`**, show the table, and **wait for them to confirm** which project (by id or unambiguous name) — do not assume a fuzzy match.
- **Do not** infer the CAM project from the open workspace, repository name, or sample code (e.g. WKND) when using MCP.

### MCP errors — stop first (especially project-not-found)

On **any** MCP failure, **stop the migration workflow immediately**. **Quote the tool error verbatim** in your reply to the user (including 404-style messages such as *No project found matching "…"*). **Do not** continue with BPA processing, manual file migration, or “local codebase” assumptions on your own.

**After** that verbatim report, you may briefly explain what went wrong (e.g. unknown project name) and show **relevant rows from `list-projects`** if you already have them. **Only** if the user **explicitly** asks to switch approach (e.g. provides a BPA CSV path, picks another project from the list, or names specific Java files for manual flow) may you proceed — that is a **new** user-directed step, not an automatic fallback.

For other failures (auth, timeout, 5xx), still quote errors verbatim; use retries only where the table below allows, then **stop** and ask how the user wants to continue (CSV, different project, or manual files) — do not silently pivot.

**Below:** tool shapes and maintainer notes for the agent. You can skip the TypeScript until you need parameter details.

---

## Rules before any tool call

1. Call **`list-projects`** first; show **name**, **id**, and **description** to the user.
2. **Wait for explicit project choice** (even if only one project), then call **`fetch-cam-bpa-findings`** using the **confirmed** `projectId` (preferred) or a name that the user affirmed against that list — do not pass an unconfirmed string the user guessed.
3. Map the session’s **single pattern** to the tool’s `pattern` argument (`scheduler`, `assetApi`, `eventListener`, `resourceChangeListener`, `eventHandler`, or `all`). If you used `all`, filter `targets` to the active pattern.

## REST (maintainer context)

The MCP server calls **Adobe AEM Cloud Adoption Service**, for example:

- `GET {base}/projects` — projects for the authenticated IMS org.
- `GET {base}/projects/{projectId}/bpaReportCodeTransformerData/subtype/{subtype}` — aggregated identifiers per BPA subtype (e.g. `sling.commons.scheduler` for scheduler).

Auth headers typically include `Authorization: Bearer …`, `x-api-key`, and `x-gw-ims-org-id` (often `ident@AdobeOrg`). Subtype mapping is implemented in the MCP server.

**Deeper docs:** `aemcs-migration-mcp/docs/cam-cloud-adoption-api-contract.md`; controllers `ProjectController`, `BpaReportCodeTransformerDataController` in `aem-cloud-adoption-service`.

---

## Tool: `list-projects`

Lists CAM projects. **Always call this before `fetch-cam-bpa-findings`.**

**Response (illustrative):**

```typescript
{
  success: true;
  projects: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}
```

---

## Tool: `fetch-cam-bpa-findings`

**Request (illustrative — confirm against live MCP tool schema):**

```typescript
{
  projectId: string;   // required after user confirms project (from list-projects)
  projectName?: string; // only if user affirmed this name against list-projects; never pass an unconfirmed guess
  pattern?: "scheduler" | "assetApi" | "eventListener" | "resourceChangeListener" | "eventHandler" | "all";
  environment?: "dev" | "stage" | "prod";
  apiToken?: string;
  imsOrgId?: string;
  apiKey?: string;
}
```

**Success response (shape may vary by server version):**

```typescript
{
  success: true;
  environment?: "dev" | "stage" | "prod";
  projectId: string;
  targets: Array<{
    pattern: string;
    className: string;
    identifier: string;
    issue: string;
    severity?: string;
  }>;
  summary?: Record<string, number>;
}
```

**Error response:**

```typescript
{
  success: false;
  error: string;
  errorDetails?: { message: string; name: string; code?: string };
  troubleshooting?: string[];
  suggestion?: string[];
}
```

**Example:**

```javascript
const result = await fetchCamBpaFindings({
  projectId: "<user-confirmed-cam-project-id>",
  pattern: "scheduler",
  environment: "prod"
});
```

---

## Retries and agent behavior

**MCP tool:** Often implements exponential backoff (e.g. up to 3 attempts, ~30s timeout, backoff 2s / 4s / 8s). **Confirm in server implementation** if behavior changes.

**Agent:**

1. Check `result.success` before using `result.targets`.
2. If `pattern` was `all`, filter `targets` to the **one pattern** chosen for this session.
3. Use `className` (and any file paths the server returns) to locate Java sources **only under the current IDE workspace root(s)**. If a path does not exist there, report it and ask the user — do not search outside the open project.
4. On failure, **stop**; quote the error **verbatim**. Use retries only per the table. **Do not** automatically continue with CSV or manual migration — wait for the user to choose the next step after they have seen the error.

| Situation | Retry? | Action |
|-----------|--------|--------|
| Auth 401 / 403 | No | Quote error verbatim; stop. Ask how to proceed (credentials, CSV, or named files) only after stopping. |
| 404 / “no project found” / unknown `projectId` | No | Quote error verbatim; stop. Show `list-projects` results again if available; **require** user to confirm the correct project or another source (CSV / explicit file list). **No** automatic “local workspace” migration. |
| Network / timeout | Once | Retry after ~2s, then quote error verbatim and stop if still failing. |
| 5xx | Once | Retry after ~2s, then quote error verbatim and stop if still failing. |
| 400 | No | Quote error verbatim; stop; ask user to fix parameters or pick another path. |
| 200 empty targets | No | Report honestly; stop. Offer options (other pattern, CSV, explicit files) **only** as choices for the user — do not start editing the repo without BPA targets unless the user picks manual files. |
