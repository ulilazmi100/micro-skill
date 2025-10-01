// prompts/demo_fixture.js
// Single-source demo fixture used when DEMO_MODE=true.
// Each lesson contains title, difficulty, tip, hints (array), practice_task, example_output, and full_guide (Markdown).

const DEMO_FIXTURE = {
  micro_lessons: [
    {
      title: 'Reproduce quickly',
      difficulty: 'Beginner',
      tip: 'Reproduce the issue locally using a minimal test or reproduction steps; keep it short and focused.',
      hints: ['Check console logs and network requests first; take a screenshot where possible.'],
      practice_task: 'Create a minimal reproduction case demonstrating the bug in one file.',
      example_output: 'Reproduction steps documented',
      full_guide: `### Reproduce quickly

**Objective —** Reproduce the failing UI behavior quickly and reliably so you can reason about the root cause.

**Why it matters —** Having a minimal reproduction makes debugging and sharing much faster and reduces wasted effort.

**Steps**
1. Open the app and follow the exact steps that produce the bug; record each action.
2. Inspect browser console and network panel for errors or failing requests.
3. Copy the component or page to a single new file and remove unrelated code.
4. Reduce inputs and props until the failure still occurs — this identifies the minimal surface area.
5. Save console logs and a screenshot; add short reproduction steps.

**Pro tip**: Keep the reproduction as tiny as possible — a one-file repro is ideal.

**Practice routine**
- Repeat 1 (5–10 minutes): Reproduce and write steps.
- Repeat 2 (5–10 minutes): Reduce to a minimal file.
- Repeat 3 (3–5 minutes): Save artifacts and prepare notes.

**Time estimate**: 10–20 minutes.

**Example output**
- Short reproduction steps and console logs.

**Further reads**
- [How to create a minimal reproducible example](https://www.google.com/search?q=minimal+reproducible+example+frontend) — searches and guides.
- [Browser devtools debugging tips](https://www.google.com/search?q=browser+devtools+debugging+tips) — curated searches.
`
    },
    {
      title: 'Write a failing test',
      difficulty: 'Intermediate',
      tip: 'Capture the bug with a focused automated test so your fix is verifiable and prevents regressions.',
      hints: ['If using Jest, mock external dependencies and assert DOM behavior.'],
      practice_task: 'Write a single unit or integration test that fails on the bug scenario.',
      example_output: 'Test fails on bug',
      full_guide: `### Write a failing test

**Objective —** Create a focused failing test that reproduces the bug and documents the expected behavior.

**Why it matters —** A failing test serves as documentation for the bug and prevents regressions.

**Steps**
1. Identify the smallest module or component affected by the bug.
2. Set up test environment and mock external services as needed.
3. Write a single assertion that fails due to the bug.
4. Run the test to confirm it fails consistently.
5. Commit the failing test so the fix can be validated.

**Pro tip**: Keep the test deterministic — avoid time or network flakiness.

**Practice routine**
- Repeat 1 (10 minutes): Write the minimal failing test.
- Repeat 2 (10 minutes): Harden mocks and ensure determinism.
- Repeat 3 (5 minutes): Commit and document the test.

**Time estimate**: 15–30 minutes.

**Example output**
- A single failing unit/integration test.

**Further reads**
- [How to write focused unit tests](https://www.google.com/search?q=how+to+write+focused+unit+tests) — searches for best practices.
- [Testing React components with Jest and Testing Library](https://www.google.com/search?q=testing+react+components+jest+testing+library) — learning resources.
`
    },
    {
      title: 'Implement a minimal fix',
      difficulty: 'Beginner',
      tip: 'Make the smallest change that fixes the test and keep changes focused to one area to ease review.',
      hints: ['Prefer a targeted hotfix that is easy to revert if it introduces regressions.'],
      practice_task: 'Modify a single function or component to make the test pass.',
      example_output: 'All tests pass',
      full_guide: `### Implement a minimal fix

**Objective —** Apply a small, focused change to make the failing test pass without unnecessary refactors.

**Why it matters —** Small fixes are easier to review and less likely to introduce regressions.

**Steps**
1. Locate the smallest function or component that causes the failing assertion.
2. Make a minimal code change to address the issue.
3. Run the targeted test and the affected test suite to confirm the fix.
4. Add a short comment explaining the reasoning and update changelog if needed.
5. Push a small PR for review.

**Pro tip**: Avoid wide refactors in the hotfix — keep the change atomic.

**Practice routine**
- Repeat 1 (10 minutes): Implement the minimal change and run tests.
- Repeat 2 (10 minutes): Add comments and re-run suite.
- Repeat 3 (5 minutes): Prepare PR description.

**Time estimate**: 10–30 minutes.

**Example output**
- All tests pass and a short PR description.

**Further reads**
- [How to write minimal fixes](https://www.google.com/search?q=minimal+fixes+software+engineering) — guidelines and examples.
- [Good PR descriptions](https://www.google.com/search?q=how+to+write+good+pull+request+description) — tips for concise PRs.
`
    },
    {
      title: 'Run full suite & lint',
      difficulty: 'Experienced',
      tip: 'Run the full test suite and linter to avoid introducing regressions or style issues before merging.',
      hints: ['If CI fails with unrelated errors, address the earliest failing test first.'],
      practice_task: 'Run project tests and fix any incidental failures or linter warnings.',
      example_output: 'Tests green, lint clean',
      full_guide: `### Run full suite & lint

**Objective —** Ensure your change does not break the wider codebase by running all tests and linting.

**Why it matters —** Prevents regressions and maintains code quality.

**Steps**
1. Run the full test suite locally or in a reproducible CI environment.
2. Fix incidental failures surfaced by the change.
3. Run the linter and address warnings or style issues.
4. Re-run tests and commit fixes before creating a PR.

**Pro tip**: If CI shows unrelated failures, check logs and address the earliest failure first.

**Practice routine**
- Repeat 1 (15–30 minutes): Run full suite and fix failures.
- Repeat 2 (15 minutes): Run linter and apply fixes.
- Repeat 3 (5–10 minutes): Re-run tests and finalize.

**Time estimate**: 15–60 minutes.

**Example output**
- CI green and linter clean.

**Further reads**
- [CI debugging tips](https://www.google.com/search?q=ci+debugging+tips) — search-based resources.
- [Common linting rules and fixes](https://www.google.com/search?q=eslint+common+rules+fixes) — learning links.
`
    },
    {
      title: 'Document & deliver',
      difficulty: 'Beginner',
      tip: 'Write a concise PR description, include reproduction steps, tests, and a 20–30s demo or screenshots.',
      hints: ['Use a short checklist: Reproduce, Test, Fix, Verify.'],
      practice_task: 'Prepare a short PR description and attach demo artifacts (screenshots or GIF).',
      example_output: 'PR ready with demo',
      full_guide: `### Document & deliver

**Objective —** Prepare a concise PR so reviewers can quickly verify your fix.

**Why it matters —** Clear documentation accelerates reviews and reduces back-and-forth.

**Steps**
1. Add a one-line PR title and a short description with reproduction steps.
2. Include the failing test and the fix summary.
3. Attach a short demo GIF or screenshots showing the fix.
4. Provide a checklist: Reproduce, Test, Fix, Verify.
5. Add reviewers and request quick feedback.

**Pro tip**: Keep the PR focused — reviewers appreciate short, verifiable changes.

**Practice routine**
- Repeat 1 (10 minutes): Write PR title & description.
- Repeat 2 (10 minutes): Attach demo and test summary.
- Repeat 3 (5 minutes): Add reviewers and checklist.

**Time estimate**: 10–20 minutes.

**Example output**
- PR ready with demo and checklist.

**Further reads**
- [How to write good PR descriptions](https://www.google.com/search?q=how+to+write+good+pull+request+descriptions) — search results and examples.
- [Recording short demo GIFs](https://www.google.com/search?q=how+to+record+short+demo+gif) — tips and tools.
`}
  ],
  profile_short: 'Quick-fix frontend engineer focused on reproducible, tested bug fixes.',
  profile_long: 'I rapidly reproduce bugs, add minimal tests, and implement targeted fixes with clear demos. I prioritize small, verifiable changes and fast delivery.',
  cover_message: 'Hi — I can reproduce and fix this issue quickly. I will create a minimal reproduction, add a failing test, implement a small fix, run the full test suite, and send a short demo and PR description. Can you share the repo or a reproduction link?'
};

module.exports = DEMO_FIXTURE;
