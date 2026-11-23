import type { APIRoute } from 'astro';
import { buildIndex } from '../lib/search-index.mjs';

const base = import.meta.env.BASE_URL;
const pages = import.meta.glob(['./*.md', './docs/*.md'], { eager: true });

// Astro pages are not Markdown; describe them by hand.
const extra = [
  {
    title: 'Reading status',
    description: 'Read the whole situation: your Git checkout, its pull request, review and check results, shared-branch builds, and what still needs attention.',
    heading: '',
    url: `${base}docs/status/`,
    text: 'taba status pull request checks review builds runtime services freshness closed declined PR retirement blockers',
  },
];

export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildIndex(pages, extra)), {
    headers: { 'Content-Type': 'application/json' },
  });
