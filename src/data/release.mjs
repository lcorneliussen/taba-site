const repository = 'https://github.com/lcorneliussen/taba';
const api = 'https://api.github.com/repos/lcorneliussen/taba/releases/latest';

// Verified against the published release API; this is a dated fallback, not latest.
const fallback = { tag: 'v0.2.3', checked: '2026-11-12', live: false };

export async function publishedRelease(fetchRelease = fetch) {
  let release = fallback;
  try {
    const response = await fetchRelease(api, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Release lookup unavailable');
    const data = await response.json();
    if (data.draft !== false || data.prerelease !== false || !/^v\d+\.\d+\.\d+$/.test(data.tag_name)
      || data.html_url !== `${repository}/releases/tag/${data.tag_name}`) {
      throw new Error('Not a published stable release');
    }
    release = { tag: data.tag_name, checked: new Date().toISOString().slice(0, 10), live: true };
  } catch {
    // Any lookup or validation failure uses the dated fallback above.
    // Update that constant by hand after verifying a published stable release.
  }
  return {
    ...release,
    command: `mise use -g github:lcorneliussen/taba@${release.tag.slice(1)}`,
    notes: `${repository}/releases/tag/${release.tag}`,
  };
}
