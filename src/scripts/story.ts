import { setupStoryPosts } from './story-posts';
import { setupStoryActivity } from './story-activity';

const timeline = document.querySelector<HTMLElement>('.problem-timeline');

if (timeline) {
  const problems = [...timeline.querySelectorAll<HTMLElement>('.problem:not([hidden])')];
  const headings = problems.map(problem => problem.querySelector<HTMLElement>('h2')!);
  const dates = problems.map(problem => problem.querySelector<HTMLElement>('.problem-date')!);
  const cards = dates.map((date, index) => {
    const column = document.createElement('div');
    column.className = 'date-column';
    problems[index].prepend(column);
    const card = document.createElement('div');
    card.className = 'date-card';
    column.append(card);
    card.append(date);
    return card;
  });
  const links = dates.map((date, index) => {
    const link = document.createElement('a');
    link.href = `#${problems[index].id}`;
    link.setAttribute('aria-label', `${date.textContent}. ${headings[index].textContent}`);
    link.append(...date.childNodes);
    date.append(link);
    return link;
  });
  const artworks = problems.map(problem => problem.querySelector<HTMLElement>('.scene-art'));
  const compactLayout = window.matchMedia('(max-width: 700px)');
  const postColumns = problems.flatMap(problem => {
    const art = problem.querySelector<HTMLElement>('.scene-art');
    const posts = [...problem.querySelectorAll<HTMLElement>('.x-post, [data-scene-records]')];
    if (!art || !posts.length) return [];
    const column = document.createElement('div');
    column.className = 'scene-column';
    art.before(column);
    column.append(art);
    const mentions = document.createElement('aside');
    mentions.className = 'scene-posts';
    mentions.setAttribute('aria-label', 'Related posts and references');
    mentions.append(...posts);
    column.append(mentions);
    const alignmentTarget = problem.querySelector<HTMLElement>('.workspace-tree');
    const detailArt = problem.querySelector<HTMLElement>('.scene-detail-art');
    const detailTarget = detailArt?.dataset.alignWith ? document.getElementById(detailArt.dataset.alignWith) : null;
    const detailBeforePosts = detailArt?.dataset.scenePlacement === 'before-posts';
    if (detailArt) {
      const originalPosition = document.createComment('Inline illustration position');
      detailArt.before(originalPosition);
      const placeDetail = () => {
        if (compactLayout.matches) originalPosition.before(detailArt);
        else column.insertBefore(detailArt, detailBeforePosts ? mentions : null);
      };
      placeDetail();
      compactLayout.addEventListener('change', placeDetail);
    }
    return [{ problem, mentions, art, column, alignmentTarget, detailArt, detailTarget, detailBeforePosts }];
  });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isPreviewHash = (hash: string) => hash === '#herdr-workspace' || hash === '#herdr-workspace-full-size';
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const restoreBrowserPosition = navigation?.type === 'reload' || navigation?.type === 'back_forward';
  const savedReadingY = history.state?.whyTabaReadingY;
  const saveReadingPosition = () => {
    history.replaceState({...history.state, whyTabaReadingY: window.scrollY}, '');
  };
  window.addEventListener('beforeunload', saveReadingPosition);
  window.addEventListener('pagehide', saveReadingPosition);
  const setActivity = setupStoryActivity(problems, cards, reducedMotion);
  const readingLine = () => Math.max(80, window.innerHeight * .28);
  let scheduled = false;
  let locationReady = document.readyState === 'complete';

  const update = () => {
    scheduled = false;
    const bounds = timeline.getBoundingClientRect();
    const inset = parseFloat(getComputedStyle(timeline).getPropertyValue('--timeline-inset'));
    const firstDot = problems[0].getBoundingClientRect().top + inset + 10;
    const lastDot = problems[problems.length - 1].getBoundingClientRect().bottom - inset - cards[cards.length - 1].offsetHeight + 10;
    const length = Math.max(1, lastDot - firstDot);
    timeline.style.setProperty('--timeline-start', `${firstDot - bounds.top}px`);
    timeline.style.setProperty('--timeline-length', `${length}px`);
    timeline.style.setProperty('--story-progress', String(Math.max(0, Math.min(1, (readingLine() - firstDot) / length))));

    let active = 0;
    headings.forEach((heading, index) => {
      if (heading.getBoundingClientRect().top <= readingLine()) active = index;
    });
    setActivity(active);
    const previewLink = isPreviewHash(location.hash);
    if (locationReady && !previewLink && !document.querySelector('dialog[open]')) {
      const hash = window.scrollY > 0 && headings[0].getBoundingClientRect().top <= readingLine() ? `#${problems[active].id}` : '';
      if (location.hash !== hash) history.replaceState(history.state, '', `${location.pathname}${location.search}${hash}`);
    }
    postColumns.forEach(({ problem, mentions, art, column, alignmentTarget, detailArt, detailTarget, detailBeforePosts }) => {
      if (alignmentTarget && window.innerWidth > 700) {
        const gap = alignmentTarget.getBoundingClientRect().top - column.getBoundingClientRect().top - art.offsetHeight;
        mentions.style.setProperty('--posts-gap', `${Math.max(36, gap)}px`);
      }
      if (detailArt && detailTarget && window.innerWidth > 700) {
        const previousBottom = detailBeforePosts ? art.offsetHeight : mentions.offsetTop + mentions.offsetHeight;
        const gap = detailTarget.getBoundingClientRect().top - column.getBoundingClientRect().top - previousBottom;
        detailArt.style.setProperty('--detail-gap', `${Math.max(28, gap)}px`);
      }
      const entered = problem.getBoundingClientRect().top <= -Math.min(120, window.innerHeight * .15);
      mentions.classList.toggle('is-revealed', entered);
    });
    problems.forEach((problem, index) => {
      problem.classList.toggle('is-active', index === active);
      problem.classList.toggle('is-past', index < active);
      if (index === active) links[index].setAttribute('aria-current', 'step');
      else links[index].removeAttribute('aria-current');
    });
    artworks.forEach((art, index) => {
      if (!art) return;
      const bounds = problems[index].getBoundingClientRect();
      const phase = Math.max(-1, Math.min(1, (window.innerHeight * .5 - bounds.top - Math.min(bounds.height, window.innerHeight) * .5) / window.innerHeight));
      art.style.setProperty('--art-y', `${reducedMotion.matches ? 0 : phase * (window.innerWidth <= 700 ? 22 : 50)}px`);
      art.style.setProperty('--art-tilt', `${reducedMotion.matches ? 0 : phase * 1.5}deg`);
    });
  };
  const schedule = () => {
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(update);
    }
  };
  const scrollToHashTarget = () => {
    const index = problems.findIndex(problem => `#${problem.id}` === location.hash);
    if (index < 0) return;
    const top = headings[index].getBoundingClientRect().top + window.scrollY - 50;
    window.scrollTo({top, behavior: 'instant'});
  };
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', schedule, {passive: true});
  reducedMotion.addEventListener('change', schedule);
  window.addEventListener('hashchange', event => {
    if (isPreviewHash(new URL(event.oldURL).hash)) schedule();
    else scrollToHashTarget();
  });
  const finishInitialLocation = () => {
    void document.fonts.ready.then(() => window.requestAnimationFrame(() => {
      if (restoreBrowserPosition && Number.isFinite(savedReadingY) && !isPreviewHash(location.hash)) {
        window.scrollTo({top: savedReadingY, behavior: 'instant'});
      } else if (!restoreBrowserPosition) scrollToHashTarget();
      locationReady = true;
      schedule();
    }));
  };
  window.addEventListener('load', finishInitialLocation, {once: true});
  if (document.readyState === 'complete') finishInitialLocation();
  document.fonts.ready.then(schedule);
  const observer = new ResizeObserver(schedule);
  observer.observe(timeline);
  cards.forEach(card => observer.observe(card));
  postColumns.forEach(({ alignmentTarget, detailTarget }) => {
    const body = (alignmentTarget ?? detailTarget)?.closest('.problem-body');
    if (body) observer.observe(body);
  });
  setupStoryPosts(schedule);
  schedule();
  if (!restoreBrowserPosition) scrollToHashTarget();
}
