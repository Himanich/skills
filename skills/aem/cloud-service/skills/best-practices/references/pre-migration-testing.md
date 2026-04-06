# Pre-Migration JUnit Testing

Lightweight tests that lock **business logic** before transformation and verify it after. Uses **Mockito stubs only** — no heavyweight AEM context boot — so test generation and execution add minimal time.

**When to read:** Before processing migration target files. Referenced from [`migration/SKILL.md`](../../migration/SKILL.md) Step 5 and from each pattern module's validation checklist.

---

## Strategy

1. **Before transforming** a file, generate a JUnit 5 test class targeting its business logic.
2. Run `mvn test` to confirm the tests **pass against the original code**.
3. **Transform** the file per the pattern module.
4. Run `mvn test` again — same tests must still pass.

Tests lock the **behavioral contract** (inputs → outputs / side-effects). The migration only changes infrastructure wiring; business logic must be identical.

---

## When tests fail

Handle failures by **phase** — the cause and the fix differ. Full detail stays here; other skills only point here.

### Pre-migration failure (`mvn test` fails on **unchanged** production code)

The migration **must not start** for that file until tests pass or the user explicitly overrides (see below).

| Likely cause | What to do |
|----------------|------------|
| Wrong or incomplete mocks / stubs | Fix the test only — adjust `when(...)` / `lenient()` / missing `@Mock` for `@Reference` fields. Re-run `mvn test -pl <module>`. |
| Assertion does not match real behavior | Align the assertion with what the source code actually does (visible in the method body). Do not change production code to satisfy a mistaken test. |
| `InjectMocks` cannot construct the class | Add a no-arg or use `@InjectMocks` with manual `@BeforeEach` construction, or test a package-visible helper if the class is not mock-friendly — still without refactoring production **business** logic. |
| Failure is in **existing** tests unrelated to this file | Run tests scoped to the new test class only, e.g. `mvn test -pl <module> -Dtest=MyClassTest`. If the new test passes in isolation, fix or exclude unrelated failing tests with the user — do not migrate on a red module unless agreed. |
| Production code is already broken | Stop migration for this file; report the failure and stack trace to the user. They fix the bug first, then re-run. |

**Stop rule:** After **two** fix attempts on the generated test still fail on original code, **stop** automated iteration. Summarize: command run, failing assertion, first lines of stack trace. Ask the user to choose: (1) fix the test or source manually, (2) provide a corrected expectation, or (3) **explicit opt-out** for this file only (see below).

### Post-migration failure (tests passed **before** transform, fail **after**)

The transformation or the mechanical test update is wrong — **not** the business-logic assertions (do not weaken assertions to go green).

| Likely cause | What to do |
|----------------|------------|
| Wrong mechanical test update (wrong method/class) | Fix the test call site only — same assertions as pre-migration. Re-run tests. |
| Bug in the migration edit | Re-read the pattern module; revert the file under migration to the last committed version if needed; re-apply steps. |
| Accidental business-logic edit | Undo that edit; migration must only change infrastructure per the module. |

**Stop rule:** After **two** correction attempts still red, **revert** the migrated source for that file to pre-change state (or ask the user to revert), keep the passing pre-migration test as the spec, and report. Do not ship a failing post-migration test.

### Explicit opt-out (single file, user only)

If the user **explicitly** says to skip behavioral tests for a named file (e.g. untestable legacy, time pressure):

1. Document in the session report: *"No pre-migration tests — user opt-out for `path/File.java`."*
2. Run **`mvn clean compile`** for that module (no `test` gate for that file’s migration).
3. Do **not** extend opt-out to other files without a new explicit instruction.

Default remains: **no migration without green pre-migration tests** (or successful scoped test run for the new class).

---

## Scope — What to Test

Test **only** the business logic methods, not OSGi/Sling wiring.

| Pattern | Method(s) to test |
|---------|-------------------|
| `scheduler` (Path A) | Body of `run()` — the logic inside the resolver block |
| `scheduler` (Path B) | Body of `execute()` / `run()` → becomes `JobConsumer.process()` |
| `eventListener` | Processing logic inside `onEvent()` that moves to `JobConsumer.process()` |
| `eventHandler` | Processing logic inside `handleEvent()` that moves to `JobConsumer.process()` |
| `resourceChangeListener` | Processing logic inside `onChange()` that moves to `JobConsumer.process()` |
| `replication` | Replication/distribution trigger logic |
| `assetApi` | Asset create/delete orchestration logic |

**Skip** lifecycle methods (`@Activate`, `@Deactivate`, `@Modified`) and annotation wiring — those are validated by the structural checklist and compile step.

---

## Rules

- **Mock, don't boot.** Use `Mockito.mock()` / `@Mock` for `ResourceResolver`, `Resource`, `Session`, `Node`, services. Never spin up `SlingContext` or `AemContext` for migration tests.
- **Extract what exists.** Base assertions on values and paths visible in the original code — do not invent expected outputs.
- **One test class per source file.** Place in the mirrored `src/test/java` package.
- **Keep tests fast.** Target < 200 ms per test class. If a method has no testable return value or verifiable side-effect (pure logging), skip it.
- **Do not refactor the source to make it testable.** The source will be transformed by the pattern module steps; tests should work against the current method signatures.

---

## Maven Dependencies

If the project's `pom.xml` lacks test dependencies, add to the `core` (or bundle) module `<dependencies>`:

```xml
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>5.10.2</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.mockito</groupId>
    <artifactId>mockito-core</artifactId>
    <version>5.11.0</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.mockito</groupId>
    <artifactId>mockito-junit-jupiter</artifactId>
    <version>5.11.0</version>
    <scope>test</scope>
</dependency>
```

Do **not** add `aem-mock` or `sling-mock` — Mockito alone keeps startup instant.

---

## Test Template

```java
package <same.package.as.source>;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class <ClassName>Test {

    @InjectMocks
    private <ClassName> underTest;

    @Mock
    private ResourceResolverFactory resolverFactory;

    @Mock
    private ResourceResolver resolver;

    // Add @Mock for every @Reference / injected service the class uses.

    @BeforeEach
    void setUp() throws Exception {
        // Stub resolver acquisition if the method under test obtains one.
        lenient().when(resolverFactory.getServiceResourceResolver(anyMap()))
                 .thenReturn(resolver);
    }

    @Test
    void businessLogic_givenTypicalInput_producesExpectedResult() {
        // 1. Arrange — stub resources/nodes the method reads or writes.
        // 2. Act   — call the business logic method.
        // 3. Assert — verify return value or interactions (verify(...)).
    }
}
```

### Adapting the template per pattern

**Scheduler (Path A — `run()`):** Call `underTest.run()`. Assert via `verify(resolver).getResource(...)` or similar side-effect checks visible in the original body.

**Scheduler (Path B) / EventListener / EventHandler / ResourceChangeListener → JobConsumer:** Before migration the logic lives in `run()`, `execute()`, `onEvent()`, `handleEvent()`, or `onChange()`. Write tests against that method. After migration the same logic moves to `JobConsumer.process(Job)` — update the test to call `process()` with a mocked `Job` returning the same property values. Assertions stay identical.

**Replication:** Mock `DistributionAgent` (or legacy `Replicator`) and verify `distribute()` / `replicate()` is called with expected paths and action type.

**Asset API:** Mock the HTTP client or `AssetManager` and verify the create/delete call arguments.

---

## Post-Migration Test Update (Minimal)

After transformation, tests may need **only** these mechanical adjustments:

| Change | What to update in the test |
|--------|---------------------------|
| Method renamed (`execute` → `process`) | Update the method call |
| Class split (e.g., Scheduler + JobConsumer) | Move business-logic tests to `<JobConsumer>Test`; drop infra-only original test if empty |
| New parameter type (`Job job` instead of `JobContext`) | Mock `Job` instead of `JobContext`; stub same properties |

**Business-logic assertions must not change.** If they fail, the transformation broke something.

---

## Workflow Integration (for the agent)

This module is consumed **inside** Step 5 of the migration workflow:

```
For each target file:
  1. Read source
  2. Identify business-logic method(s) per the table above
  3. Check if a test class already exists in src/test/java — reuse/extend if so
  4. Generate test class (or skip if method is untestable — pure void + logging only)
  5. `mvn test -pl <module>` — confirm tests pass against ORIGINAL code
       → if red: [When tests fail](#when-tests-fail) (pre-migration branch); do not transform until green or user opt-out
  6. Classify & transform per pattern module
  7. Apply mechanical test updates (method rename / class split) if needed
  8. `mvn test -pl <module>` again — if red: [When tests fail](#when-tests-fail) (post-migration branch)
  9. Check lints
  → next file
```

After all files: single `mvn clean compile test` in Step 6 as final gate — if red, use post-migration branch of [When tests fail](#when-tests-fail).

**Time budget:** Test generation is agent-side text work (seconds). `mvn test -pl <module>` compiles only the bundle module, typically 5–15 s. The full `mvn clean compile test` at the end replaces the existing `mvn clean compile` — net cost is the test execution delta only.

---

## See also

- **Pattern index:** [`../SKILL.md`](../SKILL.md)
- **Prerequisites hub:** [aem-cloud-service-pattern-prerequisites.md](aem-cloud-service-pattern-prerequisites.md)
- **Orchestration:** [`../../migration/SKILL.md`](../../migration/SKILL.md) — Step 5 defers failure handling to this section
