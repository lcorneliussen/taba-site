const base = import.meta.env.BASE_URL;
const collections = {
  login: { name: 'fix-login', api: 'Session & authentication', web: 'Sign-in experience', shared: 'Types & validation', ports: ['4100', '4101'] },
  checkout: { name: 'new-checkout', api: 'Orders & payments', web: 'Checkout experience', shared: 'Cart & order types', ports: ['4200', '4201'] },
};
for (const button of document.querySelectorAll('[data-collection]')) {
  button.addEventListener('click', () => {
    const collection = collections[button.dataset.collection];
    if (!collection) return;
    for (const choice of document.querySelectorAll('[data-collection]')) {
      const selected = choice === button;
      choice.classList.toggle('active', selected);
      choice.setAttribute('aria-pressed', String(selected));
    }
    document.querySelector('#collection-name').textContent = collection.name;
    document.querySelector('#api-detail').textContent = collection.api;
    document.querySelector('#web-detail').textContent = collection.web;
    document.querySelector('#shared-detail').textContent = collection.shared;
    document.querySelector('#api-port').textContent = `:${collection.ports[0]}`;
    document.querySelector('#web-port').textContent = `:${collection.ports[1]}`;
    document.querySelector('#demo-command').textContent = `cd ../${collection.name} && taba status`;
  });
}

const code = document.querySelector('#quickstart-code');
const guides = {
  local: { title: '01 — CREATE A COLLECTION', code: code.textContent, note: document.querySelector('#guide-note').textContent, link: 'getting-started', label: 'Read the getting-started guide' },
  team: {
    title: '02 — SHARE YOUR CONFIGURATION',
    code: `# Scaffold a small, project-owned harness
taba harness init agent-harness \\
  --remote git@github.com:example-org/agent-harness.git \\
  --cli-version 0.1.51

# Preview the scaffold without writing files
taba harness init another-harness \\
  --remote git@github.com:example-org/another-harness.git \\
  --cli-version 0.1.51 --dry-run`,
    note: 'Replace the example remote with your own. This creates configuration files, not a Git repository. Follow the team guide to version and bootstrap your harness.',
    link: 'team-harness', label: 'Set up a team harness',
  },
  openclaw: {
    title: '03 — WORK FROM A CONVERSATION',
    code: `# Agent workflow on an OpenClaw gateway
taba host

# Request a managed worktree (prints a tool plan)
taba add-repo your-org/api --worktree fix-login

# After the agent carries out that plan
taba status fix-login`,
    note: 'Ask your OpenClaw agent to carry out the printed plan. The gateway owns worktrees and publishing. Do not run taba init or taba new under OpenClaw.',
    link: 'openclaw', label: 'Read the OpenClaw workflow',
  },
};
for (const button of document.querySelectorAll('[data-guide]')) {
  button.addEventListener('click', () => {
    const guide = guides[button.dataset.guide];
    if (!guide) return;
    for (const choice of document.querySelectorAll('[data-guide]')) {
      const selected = choice === button;
      choice.classList.toggle('active', selected);
      choice.setAttribute('aria-pressed', String(selected));
    }
    code.textContent = guide.code;
    document.querySelector('#code-title').textContent = guide.title;
    document.querySelector('#guide-note').textContent = guide.note;
    const link = document.querySelector('#guide-link');
    link.href = `${base}docs/${guide.link}/`;
    link.textContent = `${guide.label} ↗`;
  });
}
const copy = document.querySelector('#copy-code');
copy.hidden = false;
copy.addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try {
    await navigator.clipboard.writeText(code.textContent);
    status.textContent = 'Commands copied to clipboard.';
    copy.textContent = 'Copied ✓';
  } catch {
    status.textContent = 'Clipboard unavailable. Select the commands and copy them manually.';
    copy.textContent = 'Select to copy';
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(code);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  setTimeout(() => { copy.textContent = 'Copy commands ⧉'; }, 2400);
});
