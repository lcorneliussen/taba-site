type TweetWidgets = {
  createTweet(id: string, target: HTMLElement, options: Record<string, string | boolean | number>): Promise<HTMLElement | undefined>;
};
declare global {
  interface Window { twttr?: {widgets?: TweetWidgets} }
}

export function setupStoryPosts(onResize: () => void) {
  const slots = [...document.querySelectorAll<HTMLElement>('[data-x-post]')];
  if (!slots.length) return;
  let sdk: Promise<TweetWidgets> | undefined;
  const loadSdk = () => sdk ??= new Promise<TweetWidgets>((resolve, reject) => {
    if (window.twttr?.widgets) { resolve(window.twttr.widgets); return; }
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    const timeout = window.setTimeout(() => reject(new Error('Post embed unavailable')), 12000);
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.twttr?.widgets) resolve(window.twttr.widgets);
      else reject(new Error('Post embed unavailable'));
    };
    script.onerror = () => { window.clearTimeout(timeout); reject(new Error('Post embed unavailable')); };
    document.head.append(script);
  });
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      const slot = entry.target as HTMLElement;
      const mount = document.createElement('div');
      mount.className = 'x-post-mount';
      slot.append(mount);
      const width = Math.max(220, Math.min(550, slot.clientWidth));
      void loadSdk().then(api => api.createTweet(slot.dataset.xPost!, mount, {
        conversation: 'none', cards: slot.dataset.xMedia === 'visible' ? 'visible' : 'hidden',
        dnt: true, theme: 'light', align: 'left', width,
      })).then(tweet => {
        if (tweet) {
          const fallback = slot.querySelector<HTMLElement>('.post-card');
          if (fallback) fallback.hidden = true;
          slot.dataset.xState = 'ready';
          onResize();
        } else mount.remove();
      }).catch(() => { mount.remove(); slot.dataset.xState = 'fallback'; });
    }
  }, {rootMargin: '100px'});
  for (const slot of slots) observer.observe(slot);
}
