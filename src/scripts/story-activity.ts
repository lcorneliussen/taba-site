import activity from '../data/story-activity.json';

type Slot = { numbers: HTMLElement[]; targets: number[] };
const numberFormat = new Intl.NumberFormat('en-GB', {maximumFractionDigits: 1, useGrouping: false});

export function setupStoryActivity(problems: HTMLElement[], cards: HTMLElement[], reducedMotion: MediaQueryList) {
  const phases = new Map(activity.phases.map(phase => [phase.section, phase]));
  const dialog = document.querySelector<HTMLDialogElement>('#activity-method');
  const slots = problems.map((problem, index): Slot | null => {
    const phase = phases.get(problem.id);
    if (!phase) return null;
    const isBaseline = phase.section === activity.phases[0].section;
    const panel = document.createElement('aside');
    panel.className = 'story-metrics';
    panel.setAttribute('aria-label', `Activity during ${phase.label}`);
    const caption = document.createElement('p');
    caption.className = 'metrics-week';
    caption.textContent = phase.label;
    caption.title = `${phase.start} to ${phase.end}; PR median across ${phase.completeWeeks} complete weeks`;
    panel.append(caption);
    const list = document.createElement('dl');
    const numbers: HTMLElement[] = [];
    const targets: number[] = [];
    const measures: [string, number, number, string][] = [
      ['Median PRs merged / week', phase.medianMergedPRs, activity.baseline.medianMergedPRs, '<circle cx="6" cy="5" r="2.5"/><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M6 7.5v9M18 16.5v-4a5 5 0 0 0-5-5H6m4-4-4 4 4 4"/>'],
      ['Checkouts', phase.checkouts, activity.baseline.checkouts, '<path d="M12 4v6M5 15v-5h14v5"/><rect x="8.5" y="1" width="7" height="5" rx="1"/><rect x="1.5" y="15" width="7" height="7" rx="1"/><rect x="15.5" y="15" width="7" height="7" rx="1"/>'],
    ];
    for (const [label, rawValue, baseline, paths] of measures) {
      if (baseline <= 0) continue;
      const value = isBaseline ? rawValue : Math.round(rawValue / baseline * 10) / 10;
      const multiple = numberFormat.format(rawValue / baseline);
      const group = document.createElement('div');
      const term = document.createElement('dt');
      term.className = 'sr-only';
      term.textContent = label;
      const explanation = label === 'Checkouts'
        ? `Checkouts are ordinary repository working folders plus linked worktrees, counted through ${phase.end}. Cleaned-up folders are not included.`
        : `PRs are my authored pull requests merged on GitHub and Bitbucket. This is the median per complete week across ${phase.completeWeeks} weeks.`;
      group.title = explanation + ` ${rawValue}${label === 'Checkouts' ? ' checkouts' : '/week'}.` + (isBaseline ? '' : ` ${multiple}× the ${activity.baseline.label} baseline (${baseline}).`);
      const definition = document.createElement('dd');
      definition.className = 'metric-absolute';
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('fill', 'none');
      icon.setAttribute('stroke', 'currentColor');
      icon.setAttribute('stroke-width', '1.5');
      icon.setAttribute('stroke-linecap', 'round');
      icon.setAttribute('stroke-linejoin', 'round');
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = paths;
      const visual = document.createElement('span');
      visual.setAttribute('aria-hidden', 'true');
      visual.textContent = numberFormat.format(value);
      const accessible = document.createElement('span');
      accessible.className = 'sr-only';
      accessible.textContent = `${rawValue}` + (isBaseline ? '' : `; approximately ${multiple} times the ${activity.baseline.label} baseline of ${baseline}`);
      const readout = document.createElement('span');
      readout.className = 'metric-readout';
      readout.append(visual);
      if (!isBaseline) {
        const unit = document.createElement('span');
        unit.className = 'metric-unit';
        unit.setAttribute('aria-hidden', 'true');
        unit.textContent = '×';
        readout.append(unit);
      }
      definition.append(icon, readout, accessible);
      if (!isBaseline || label !== 'Checkouts') {
        const detail = document.createElement('span');
        detail.className = 'metric-detail';
        detail.setAttribute('aria-hidden', 'true');
        detail.textContent = label === 'Checkouts' ? String(rawValue) : `${isBaseline ? '' : rawValue}/week`;
        definition.append(detail);
      }
      group.append(term, definition);
      list.append(group);
      numbers.push(visual);
      targets.push(value);
    }
    panel.append(list);
    if (dialog) {
      const info = document.createElement('button');
      info.type = 'button';
      info.className = 'metrics-info';
      info.textContent = 'About the numbers';
      info.addEventListener('click', () => dialog.showModal());
      panel.append(info);
    }
    cards[index].append(panel);
    return isBaseline ? null : {numbers, targets};
  });

  dialog?.querySelector('button')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  let active = -1;
  let previous: number[] = [];
  let animation = 0;
  let current: Slot | null = null;
  return (index: number) => {
    if (index === active) return;
    active = index;
    cancelAnimationFrame(animation);
    current?.numbers.forEach((number, i) => { number.textContent = numberFormat.format(current!.targets[i]); });
    current = slots[index];
    const slot = current;
    if (!slot) return;
    const from = slot.targets.map((_, i) => previous[i] ?? 1);
    previous = slot.targets;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = reducedMotion.matches ? 1 : Math.min(1, (now - started) / 550);
      const eased = 1 - Math.pow(1 - progress, 3);
      slot.numbers.forEach((number, i) => {
        const value = from[i] + (slot.targets[i] - from[i]) * eased;
        number.textContent = numberFormat.format(Number.isInteger(slot.targets[i]) ? Math.round(value) : value);
      });
      if (progress < 1) animation = requestAnimationFrame(tick);
    };
    if (reducedMotion.matches) tick(started);
    else animation = requestAnimationFrame(tick);
  };
}
