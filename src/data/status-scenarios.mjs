const url = number => `https://example.invalid/widget/pull/${number}`;
const pr = (number, values = {}) => ({ number, url: url(number), checks: 'SUCCESS', merge: 'CLEAN', review: 'approved', draft: false, ...values });
const repo = (dir, values = {}) => ({ dir, repo: dir, collection: 'example', branch_kind: 'branch', branch: 'feature/topic', branch_display: 'feature/topic', tree: 'clean', ahead: 0, behind: 0, ...values });
const enlisted = (facts, values = {}) => ({ repo: 'widget', ...facts, state: facts.draft ? 'DRAFT' : 'OPEN', title: 'Improve the widget', ...values });
const build = (branch, number, checks = 'SUCCESS', head = true) => ({ branch, build: number, checks, head_in_build: head, url: `https://example.invalid/build/${number}` });
const snapshot = (repos, prs = [], extra = {}) => ({ schema: 1, collection: 'example', repos, prs, ...extra });
const single = (facts, values = {}, row = {}) => snapshot([repo('widget', { pr: facts, ...values })], [enlisted(facts, row)]);
const merged = (follow, tip, prod) => snapshot([
  repo('widget', { branch_kind: 'detached', branch: 'main', branch_display: '⌂ main', tip, prod }),
], [{ repo: 'widget', number: '48', url: url('48'), state: 'MERGED', merge: 'MERGED', merged_on: '2026-01-05T10:00:00Z', title: 'Improve the widget', follow }]);

export const scenarios = [
  {
    id: 'work-in-progress', group: 'Git and PRs', title: 'Local changes, checks running, review pending',
    summary: 'One row combines three independent observations: your checkout, its pull request, and builds of shared branches.',
    read: [
      ['Git', '±3 means three porcelain change entries, not three commits. ↑2 is relative to the configured upstream; ↓1 is relative to the development tip or PR base. They can use different refs.'],
      ['Pull request', '#7 identifies the PR. ● ✓ ● means checks are pending, mergeability is clean, and review is waiting. A clean merge prediction does not finish checks or review.'],
      ['Builds', 'T○#104 is build 104 of the configured development branch. It does not contain this checkout’s HEAD. That is normal for work that has not merged.'],
    ],
    inspect: 'Finish or preserve local work, then inspect the pending check and review on the forge. A refresh observes progress; it does not submit or merge work.',
    snapshot: single(pr('7', { checks: 'PENDING', review: 'waiting' }), { tree: '±3', changed: 3, ahead: 2, behind: 1, ahead_ref: 'origin/feature/topic', ahead_basis: 'upstream', tip: build('main', '104', 'SUCCESS', false) }),
    expect: ['±3', '● ✓ ●', 'T○#104'],
  },
  {
    id: 'checks-failed', group: 'Checks and reviews', title: 'Approved review, failing checks',
    summary: 'Approval and build health are separate. A positive review cannot turn a failed check green.',
    read: [['PR checks', '✗ in C reports a failed/error check result. Open the PR’s checks for the individual jobs and the head they tested.'], ['Mergeability', '✓ in M is a clean/mergeable observation, not a complete branch-protection decision.'], ['Review', '✓ in R is the provider’s approval summary. It says nothing about whether the checks passed.']],
    inspect: 'Read the failed job before changing code or retrying it. The status row is an aggregate, not the check log or an audit of every required rule.',
    snapshot: single(pr('7', { checks: 'FAILURE' })), expect: ['✗ ✓ ✓'],
  },
  {
    id: 'review-distinctions', group: 'Checks and reviews', title: 'Changes requested, comments, or no reviewers',
    summary: 'Three green check runs can coexist with three very different review situations.',
    read: [['#7', '✓ ✓ ✗: checks passed and mergeability is clean, but changes were requested.'], ['#48', '✓ ✓ ✎: a review was commented. A comment is not approval.'], ['#12345', '✓ ✓ ∅: GitHub reports no reviewers. This differs from waiting for an assigned or required review (●), and from absent/unknown review facts (·).']],
    inspect: 'Open the review conversation. R is the forge’s review summary; the separate local review gate and hosted reviewer activity are inspected with taba review status/activity.',
    snapshot: snapshot(
      ['changes', 'commented', 'noreviewers'].map((review, i) => repo(['widget', 'gadget', 'toolkit'][i], { pr: pr(['7', '48', '12345'][i], { review }) })),
      ['changes', 'commented', 'noreviewers'].map((review, i) => enlisted(pr(['7', '48', '12345'][i], { review }), { repo: ['widget', 'gadget', 'toolkit'][i] })),
    ), expect: ['✓ ✓ ✗', '✓ ✓ ✎', '✓ ✓ ∅'],
  },
  {
    id: 'pr-conflict', group: 'Git and PRs', title: 'Clean checkout, conflicting draft PR',
    summary: 'The proposed merge can conflict even while the worktree has no local changes or merge in progress.',
    read: [['Checkout', '· in ± means both working trees are clean. It does not predict a future merge.'], ['PR', 'Both proposed merges conflict. #12345 is a draft with passing checks and approval; #7 also has failed checks and requested changes. ◇ is draft status.'], ['Narrow view', 'At 39 columns, draft state fits beside the number and the aligned M signals retain conflict state on both rows. At still narrower widths, leading markers can preserve state and identity while optional signals yield. Hidden columns are not missing source facts.']],
    inspect: 'Inspect the PR’s base and source commits. GitHub supplies mergeability; Bitbucket can use a local prediction when the exact reported commit objects are already available.',
    snapshot: snapshot(
      [repo('widget', { pr: pr('12345', { merge: 'CONFLICTING', draft: true }) }), repo('gadget', { pr: pr('7', { url: 'https://example.invalid/gadget/pull/7', merge: 'DIRTY', checks: 'FAILURE', review: 'changes' }) })],
      [enlisted(pr('12345', { merge: 'CONFLICTING', draft: true })), enlisted(pr('7', { url: 'https://example.invalid/gadget/pull/7', merge: 'DIRTY', checks: 'FAILURE', review: 'changes' }), { repo: 'gadget', title: 'Improve the gadget' })],
    ), expect: ['conflict', '◇', '#12345', '#7', '✗ ✗ ✗'],
  },
  {
    id: 'checkout-conflict', group: 'Git and PRs', title: 'A merge conflict already exists in the checkout',
    summary: 'This is a local Git operation, distinct from a forge’s prediction for a PR.',
    read: [['± column', '✗ replaces the changed-entry count when Git has unmerged paths. ⚠ is used for an in-progress operation without that conflict flag.'], ['PR field', '· here means no PR is attached to this repository row. It does not clear the local Git conflict.'], ['Counts', 'The arrows count commits against their comparison refs. They are not a count of conflict paths or a prediction that a merge will be safe.']],
    inspect: 'Inspect git status and the active merge/rebase before continuing. A local Git conflict needs handling even if a different PR or build is green.',
    snapshot: snapshot([repo('widget', { tree: '±2', changed: 2, conflict: true, operation: 'MERGE_HEAD', behind: 2 })]), expect: ['✗'],
  },
  {
    id: 'merged-waiting', group: 'After merge', title: 'Merged, awaiting a build that contains the merge',
    summary: 'The latest successful branch build may predate the PR. The PR row follows the merge rather than celebrating an unrelated green run.',
    read: [['Repository', '⌂ main is a detached checkout. TEST and PROD describe the configured branch tiers, rather than the PR check run.'], ['PR state', '→ test means the observed test-tier build does not contain the merge. ● test means a containing build is pending; ✗ test means it failed.'], ['C/M/R', 'This merged PR is no longer on its retained branch, so these slots show ·. The relevant delivery observation moves to STATE. A retained on-branch PR instead keeps its recorded signals.']],
    inspect: 'Open the branch build and check its commit. If commit objects are unavailable, attribution stays unknown; a successful result alone cannot establish that it built the merge.',
    snapshot: merged({ stage: 'tip', checks: 'WAITING', build: '104' }, build('main', '104', 'SUCCESS', false), build('production', '52', 'SUCCESS', false)), expect: ['→ test', 'T○#104'],
  },
  {
    id: 'production-pending', group: 'After merge', title: 'Development build passed, production build running',
    summary: 'A merged PR can finish one configured tier while still waiting on another.',
    read: [['TEST', 'T✓#105 is the development-branch build. In this fixture it contains the checked-out HEAD.'], ['PROD', 'P●#53 is a pending production-branch build. #53 is a build/run number, not a PR number.'], ['PR state', '● prod identifies the remaining observed tier. The follow-up starts at the tier corresponding to the PR’s base branch.']],
    inspect: 'Inspect the production-tier run. These are configured build observations; a build passing does not independently verify a deployment or application health.',
    snapshot: merged({ stage: 'prod', checks: 'PENDING', build: '53' }, build('main', '105'), build('production', '53', 'PENDING')), expect: ['● prod', 'T✓#105', 'P●#53'],
  },
  {
    id: 'built', group: 'After merge', title: 'One shared branch, production-tier build complete',
    summary: 'With default_ref origin/main and no production/release ref, main maps to PROD only. ✓ built means the followed, available build passed with the merge contained.',
    read: [['PR state', '✓ built replaces the waiting/failing tier label once the followed builds pass.'], ['Tier mapping', 'P✓#105 is build 105 of main. There is no TEST tier when development and production resolve to the same branch; the missing TEST column is intentional.'], ['Scope of that result', 'A missing build provider or a tier that reports no build does not turn this into a universal release certificate. The collector follows available configured observations.']],
    inspect: 'Verify any required deployment or release separately. For the exact configured follow-up facts, inspect status JSON and the linked builds.',
    snapshot: merged({ stage: 'done', checks: 'SUCCESS' }, null, build('main', '105')), expect: ['✓ built', 'P✓#105'],
  },
  {
    id: 'retained-branch', group: 'After merge', title: 'Merged PR, retained branch, nonzero ahead count',
    summary: 'Commit identities can differ after squash landing. A residual count alone cannot establish unpublished work or data loss.',
    read: [['Branch', 'The checkout is still on the old feature branch. Wide views show its upstream as [gone]; compact branch text can clip while that observation remains known.'], ['PR state', '#48 shows ⚠ catch-up because full historical landing is established. #7 stays merged: its known merge is separate from uncertainty about landing this retained branch. The landing unknown; inspect branch hint remains visible when its long title is clipped. ⚠ extra would flag observed follow-up commits.'], ['C/M/R', 'The on-branch entry keeps its recorded checks and review: ✓ · ✓ here. MERGED uses the merge-slot fallback dot; this does not mean the PR’s merged state is unknown. These are retained observations, not a new post-merge gate.'], ['↑5', 'These are raw commits relative to origin/main in this fixture. They are not five changed files or proof that five commits must be pushed.']],
    inspect: 'Inspect ahead_ref, ahead_basis and landing in status JSON before returning to the development tip. The display does not authorize forced cleanup.',
    snapshot: snapshot([repo('widget', { branch_display: 'feature/topic [gone]', ahead: 5, ahead_ref: 'origin/main', ahead_basis: 'development-tip', upstream_state: 'gone', landing: { state: 'landed', reason: 'full historical landing established' } }), repo('gadget', { branch_display: 'feature/other', landing: { state: 'unknown' } })], [{ repo: 'widget', number: '48', url: url('48'), state: 'MERGED', merge: 'MERGED', checks: 'SUCCESS', review: 'approved', merged_on: '2026-01-05T10:00:00Z', on_branch: true, title: 'Improve the widget — fully landed; catch-up', landing: { state: 'landed', reason: 'full historical landing established' } }, { repo: 'gadget', number: '7', url: 'https://example.invalid/gadget/pull/7', state: 'MERGED', merge: 'MERGED', checks: 'SUCCESS', review: 'approved', merged_on: '2026-01-05T10:00:00Z', on_branch: true, title: 'A long retained pull-request title for the gadget', landing: { state: 'unknown' } }]),
    expect: ['[gone]', '⚠ catch-up', 'merged', 'landing unknown; inspect branch'],
  },
  {
    id: 'unavailable', group: 'Missing facts', title: 'Unknown facts, blocked merge, or branch behind',
    summary: 'A dot is intentionally inconclusive. Different columns can know different things about the same PR.',
    read: [['#7', '· · · and STATE unknown mean usable PR facts are unavailable in this fixture. Authentication, unsupported providers, missing data or stale caches may require inspection.'], ['#48', '✓ ⊘ ● means checks passed, GitHub reports blocked mergeability, and review is waiting. Blocked is not the same observation as a merge conflict.'], ['#12345', '✓ ↓ ✓ means checks and approval are positive, while mergeability reports behind its base. A behind count alone is not a conflict prediction.']],
    inspect: 'Use r and the refresh log (l) to investigate the collector. Inspect raw JSON for absent, unknown or unmapped values. The dot never means a guaranteed clean state.',
    snapshot: snapshot(
      [pr('7', { checks: 'UNKNOWN', merge: 'UNKNOWN', review: 'none' }), pr('48', { merge: 'BLOCKED', review: 'waiting' }), pr('12345', { merge: 'BEHIND' })].map((facts, i) => repo(['widget', 'gadget', 'toolkit'][i], { pr: facts })),
      [enlisted(pr('7', { checks: null, merge: null, review: null }), { state: 'UNKNOWN' }), enlisted(pr('48', { merge: 'BLOCKED', review: 'waiting' }), { repo: 'gadget' }), enlisted(pr('12345', { merge: 'BEHIND' }), { repo: 'toolkit' })],
    ), expect: ['✓ ⊘ ●', '✓ ↓ ✓', 'unknown'],
  },
  {
    id: 'closed-pr', group: 'Git and PRs', title: 'PR closed, local branch still present',
    summary: 'A closed or declined PR leaves a local checkout to inspect. It is not presented as an active open PR or as a completed build follow-up.',
    read: [['Repository', 'The named feature branch still exists locally, but there is no active PR attached to its repository cell.'], ['Warning', 'The line below the PR table identifies the retained branch and its PR CLOSED state. Declined or superseded enlisted PRs use the same kind of branch warning.'], ['Local work', 'Closure says nothing by itself about whether the branch’s changes landed or should be discarded.']],
    inspect: 'Inspect the branch and any remaining work before deciding how to catch up. A missing active PR row is different from a missing repository checkout.',
    snapshot: snapshot([repo('widget')], [], { orphans: [{ repo: 'widget', branch: 'feature/topic', state: 'CLOSED' }] }), expect: ['PR CLOSED; catch-up'],
  },
  {
    id: 'freshness', group: 'Missing facts', title: 'Deferred lookups and retained observations',
    summary: 'A lookup can be delayed or unavailable without erasing an earlier observation. PR identity, freshness and branch landing are separate facts.',
    read: [['#7', 'stale retains the last open observation and its timestamp; it is not a current confirmation that the PR remains open.'], ['#48 and #12345', 'deferred means the lookup waited for shared request limits; unavailable means no usable state was observed. Neither permits a branch action or retirement.'], ['#23', 'The confirmed merge remains merged while landing this retained branch is unknown. A missing branch-landing result does not undo the merge.']],
    inspect: 'Inspect freshness, observation_source and observed_at in status JSON and the refresh log. Wait for a confirmed state before a branch action; inspect branch landing separately.',
    snapshot: snapshot([
      repo('widget', { pr_unconfirmed: true, pr: pr('7', { freshness: 'stale', observation_source: 'cache', observed_at: '2026-01-05T10:00:00Z' }) }),
      repo('gadget', { pr_unconfirmed: true, pr: pr('48', { freshness: 'deferred', observation_source: 'cache', observed_at: '2026-01-05T10:00:00Z' }) }),
      repo('toolkit', { pr_unconfirmed: true, pr: pr('12345', { freshness: 'unavailable', checks: 'UNKNOWN', merge: 'UNKNOWN', review: 'none' }) }),
      repo('library', { landing: { state: 'unknown' } }),
    ], [
      enlisted(pr('7', { freshness: 'stale', observation_source: 'cache', observed_at: '2026-01-05T10:00:00Z' })),
      enlisted(pr('48', { freshness: 'deferred', observation_source: 'cache', observed_at: '2026-01-05T10:00:00Z' }), { repo: 'gadget' }),
      enlisted(pr('12345', { freshness: 'unavailable', checks: null, merge: null, review: null }), { repo: 'toolkit', state: 'UNKNOWN' }),
      { repo: 'library', number: '23', url: url('23'), state: 'MERGED', merge: 'MERGED', on_branch: true, title: 'Improve the library', landing: { state: 'unknown' } },
    ]), expect: ['stale', 'deferred', 'unavailable', 'merged', 'landing unknown; inspect branch'],
  },
  {
    id: 'runtime', group: 'Local services', title: 'A ready service, a public tunnel, and a failed worker',
    summary: 'Runtime marks identify tasks; their color and the SERVICES row describe state. They are separate from PR or CI status.',
    read: [['LOCAL', 'w/T groups the web service with its public tunnel. b identifies the background service. Marks can be configured; they are names, not universal status glyphs.'], ['SERVICES', 'The detail table shows the service name, the member needing attention, local address and tunnel provider. Public or unknown exposure is labeled explicitly.'], ['Readiness', 'ready starts with a successful startup probe. A later address or login problem can still appear as no answer or login. Provisioned resources are distinct from running services.']],
    inspect: 'Use taba svc and service logs for detail. Clicking an endpoint opens its address in the real TUI; this browser replay never starts or connects to the synthetic services.',
    snapshot: snapshot([repo('widget', { branch_kind: 'detached', branch_display: '⌂ main' })], [], { runtime: [
      { collection: 'example', repo: 'widget', dir: 'widget', group: 'widget/web', path: 'widget/web/main', kind: 'service', state: 'ready', url: 'http://127.0.0.1:3000', answering: 'yes' },
      { collection: 'example', repo: 'widget', dir: 'widget', group: 'widget/web', path: 'widget/web/tunnel', kind: 'endpoint', state: 'ready', provider: 'cloudflare', exposure: 'public', url: 'https://example.trycloudflare.com' },
      { collection: 'example', repo: 'widget', dir: 'widget', group: 'widget/background', path: 'widget/background/main', kind: 'service', state: 'failed', exit_code: 1 },
    ] }), expect: ['SERVICES', 'ready', 'failed'],
  },
];
