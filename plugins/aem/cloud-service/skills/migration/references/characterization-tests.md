# Characterization tests (behavior pinning for migration)

A characterization test **pins the current observable behavior** of a class before it is migrated,
then proves the transformed class still behaves the same. It is a regression net, not a design
exercise — the pattern guide's own `mvn clean compile` / `mvn clean install` step proves the code
*builds*; this proves it still *does the same thing* across the migration.

This is a **migration-only policy** — it applies to the per-finding apply loop (**Step 5**) of a
migration session. A standalone `code-assessment` run on the same pattern does **not** pin behavior;
migrations are the riskier, cross-version change where a behavioral regression is worth catching.

This module is **bounded on purpose**: nominal authoring effort, no rerun loops. Follow the
efficiency contract exactly — when anything costs more than one fill-in skeleton and one green run,
**skip and record the reason** instead of spending effort.

## Eligibility — only these patterns, only before the edit

Pin a test **only** for a pattern marked **before-eligible**. These are the migration Java-cascade
patterns that preserve a behavioral seam a single test can bind to on both sides of the edit.

| Pattern (BPA id) | Before-eligible? | Seam the test binds to |
|---|---|---|
| `guavaCache` (Guava → Caffeine) | ✅ | The cache-owner service's public method — near 1:1 swap, public API unchanged |
| `scheduler` | ✅ | The job's **work method** (`run()` body / extracted `doJob()`) — only registration changes |
| `resourceChangeListener` | ✅ *(conditional)* | The **business method the callback delegates to** — only when a stable delegate exists |
| `eventListener` / `eventHandler` | ✅ *(conditional)* | The delegated handler method / `JobConsumer#process` outcome |
| `replication` (Replicator → Distribution) | ❌ | Sync → **async** model change — a before-test pins behavior that no longer exists |
| `assetApi` (AssetManager → external) | ❌ | In-JVM → out-of-process — no surviving in-process seam |

Non-Java migration patterns (`htlLint`, `vault-package-dependencies`, `osgiConfig`, `lui`, `cdw`,
`templateModernization`, `dispatcherConversion`) are **out of scope** — no Java unit under test.
For `replication` and `assetApi`, do **not** write a test: rely on the guide's compile/build step
plus a dev-deploy check before merge.

## Efficiency contract (non-negotiable — this is what keeps it cheap)

1. **One test per finding**, ≤ ~25 lines, one assertion of the behavioral outcome, from a skeleton
   below. No suites, edge cases, or parameterized variants. A migration batch is at most **5
   findings** (Step 5), so a batch pins at most 5 tests — no separate cap needed.
2. **Reuse the existing test harness only.** Skeleton A needs JUnit 5 (`org.junit.jupiter`) +
   Mockito (`org.mockito:mockito-core`); skeletons B/C additionally need `io.wcm.testing.mock.aem`
   (AemContext) — all `<scope>test</scope>` in the module's pom. **If the deps a given skeleton
   requires are absent → skip** (`no-test-harness`); a missing `io.wcm.testing.mock.aem` blocks only
   B/C, not the Mockito-only skeleton A. Never add dependencies (that costs a build + reruns).
3. **Stable seam required.** Bind to a method that exists **unchanged** after the migration (a work
   method or a delegated business method). If the logic is inline in the framework callback with no
   stable delegate → **skip** (`no-stable-seam`). This is the single most important rule: it is what
   prevents a test that cannot span both sides and the rerun loop that follows.
4. **One attempt, then skip.** Run the new test once **before** the edit. If it is not green on the
   first run → **discard it and skip** (`baseline-red`). Do **not** debug or rewrite the test.
   Continue the migration for that finding compile-only.
5. **Exactly two runs total.** Green before the edit (pins behavior), green after the edit (same
   Step 5 iteration). Nothing in between.

**Expected yield is low on legacy code — that is by design, not a failure.** Many legacy jobs and
listeners inline their logic in the framework callback (no delegate to bind to), and services build
their cache internally or won't activate under `registerInjectActivateService` without every
`@Reference` mocked. Expect to skip more often than you pin; a handful of pinned `guavaCache` /
`scheduler` tests is a good outcome. Do not chase coverage or reshape the target code to make it
testable — that is exactly the effort this module refuses to spend.

## Reporting (Step 5 / Step 6)

There is no `.autofix` run log in a migration session. Record each finding's pin outcome inline in
the **Step 6 batch report**, one token per finding:

- `pinned` — green before **and** after (behavior preserved)
- `pin-skip: <no-stable-seam | no-test-harness | baseline-red>` — no test written
- `pin-fail → reverted` — green before, **red after** (real regression; the edit was reverted)

## Where the test file goes

`<module>/src/test/java/<same-package-as-target>/<TargetClass>MigrationTest.java`. If a test class
for the target already exists, add **one** method to it instead of a new file.

## Run command (scoped — never the whole suite)

Run only the generated test, from the reactor root:

```bash
mvn -pl <module> -am -Dtest=<TargetClass>MigrationTest -DfailIfNoTests=false -Dsurefire.failIfNoSpecifiedTests=false test
```

Do **not** add `-q`: on a *passing* build Maven prints neither `BUILD SUCCESS` nor the Surefire
`Tests run:` line (both are INFO-level, which `-q` suppresses), so a green run would look like a
failure and you would wrongly skip it. `-DfailIfNoTests=false -Dsurefire.failIfNoSpecifiedTests=false`
is required because `-am` also builds the target module's upstream **reactor** modules through the
`test` phase, where the `-Dtest` filter matches nothing — without those flags Surefire fails them
with *"No tests matching pattern"* before the target test ever runs.

- **Before the edit:** the run must end in `BUILD SUCCESS` (exit 0) with the target test green
  (`Tests run: N, Failures: 0, Errors: 0`) → behavior pinned.
- **After the edit:** re-run the identical command. `BUILD SUCCESS` with the target test green =
  behavior preserved. `BUILD FAILURE` with the target test failing = real regression → revert that
  finding's edit and record `pin-fail → reverted`.

## Skeletons (fill placeholders from the finding — do not extend)

### A. `guavaCache` — memoization outcome (cache hit calls the backend once)

```java
@ExtendWith(MockitoExtension.class)
class <TargetClass>MigrationTest {
  @Test
  void repeatedKeyHitsBackendOnce() {
    <Backend> backend = mock(<Backend>.class);
    when(backend.<load>(<KEY>)).thenReturn(<VALUE>);
    <TargetClass> sut = new <TargetClass>(backend);   // or inject the mocked collaborator

    assertEquals(<VALUE>, sut.<publicCacheMethod>(<KEY>));
    assertEquals(<VALUE>, sut.<publicCacheMethod>(<KEY>));   // second call served from cache

    verify(backend, times(1)).<load>(<KEY>);          // identical for Guava and Caffeine
  }
}
```

### B. `scheduler` — work method side effect (invoke the work directly, no scheduler)

```java
@ExtendWith(AemContextExtension.class)
class <TargetClass>MigrationTest {
  private final AemContext ctx = new AemContext();

  @Test
  void workMethodProducesExpectedSideEffect() throws Exception {
    <TargetClass> sut = ctx.registerInjectActivateService(new <TargetClass>());
    // arrange minimal input the work method reads (resource, service mock, etc.)

    sut.<workMethod>();   // the body that survives migration — NOT the scheduler registration

    // assert the observable outcome (resource written / collaborator called)
    assertEquals(<EXPECTED>, ctx.resourceResolver().getResource(<PATH>).getValueMap().get(<PROP>));
  }
}
```

### C. `resourceChangeListener` / `eventListener` / `eventHandler` — delegated-handler outcome

Only when the callback delegates to a stable business method. If it does not, skip
(`no-stable-seam`).

```java
@ExtendWith(AemContextExtension.class)
class <TargetClass>MigrationTest {
  private final AemContext ctx = new AemContext();

  @Test
  void handlingPathProducesExpectedSideEffect() throws Exception {
    <TargetClass> sut = ctx.registerInjectActivateService(new <TargetClass>());
    ctx.create().resource(<CHANGED_PATH>, <SEED_PROPS>);

    sut.<delegatedBusinessMethod>(<CHANGED_PATH>);   // the seam that survives the interface swap

    assertEquals(<EXPECTED>, ctx.resourceResolver().getResource(<TARGET_PATH>).getValueMap().get(<PROP>));
  }
}
```
