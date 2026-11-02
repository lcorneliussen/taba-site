// Developer-only measurements and guides. Never mounted by the product renderer.
export function inspectVisualMeasurements(measurements, tolerance = 0.75) {
  const errors = [...(measurements.missing ?? [])], warnings = [];
  const groups = measurements.groups.map(group => {
    const values = group.members.map(item => item.value).filter(Number.isFinite);
    const spread = values.length ? Math.max(...values) - Math.min(...values) : 0;
    if (values.length > 1 && spread > tolerance) errors.push(`${group.name}: ${spread.toFixed(2)}px spread`);
    return { ...group, spread };
  });
  for (const pair of measurements.opticalPairs) {
    if (Math.abs(pair.capDelta) > 1.25) errors.push(`${pair.name}: icon ${pair.capDelta.toFixed(2)}px from cap midline`);
  }
  for (const edge of measurements.edges ?? []) if (Math.abs(edge.actual - edge.expected) > tolerance) errors.push(`${edge.name}: ${(edge.actual - edge.expected).toFixed(2)}px from declared edge`);
  for (const row of measurements.rows) {
    if (row.width < 400 && row.height > 66) warnings.push(`${row.name}: ${row.height.toFixed(1)}px per repository`);
    if (row.emptyFactBand) errors.push(`${row.name}: empty fact band without a reservation`);
  }
  for (const item of measurements.hierarchy) {
    if (item.clipped && !item.disclosure) warnings.push(`${item.role}: label is ellipsized (${item.text})`);
  }
  const filledActions = measurements.hierarchy.filter(item => item.role === 'action' && item.filled);
  if (filledActions.length) warnings.push(`${filledActions.length} filled per-repository actions: review their prominence against section headings`);
  return { ...measurements, groups, errors, warnings };
}

// Serializable for page.evaluate. Text is measured without inserting baseline probes.
export function collectVisualMeasurements(selector) {
  const root = document.querySelector(selector);
  if (!root) throw Error(`Missing audit surface: ${selector}`);
  const visible = node => {
    const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && node.checkVisibility() && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const all = (selector, scope = root) => [...scope.querySelectorAll(selector)].filter(visible);
  const box = node => {
    const r = node.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  };
  const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
  const rgba = color => {
    context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data];
  };
  const luminance = color => color.slice(0, 3).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
  const contrast = node => {
    let background = [255, 255, 255, 255], parent = node;
    while (parent) {
      const color = rgba(getComputedStyle(parent).backgroundColor);
      if (color[3] === 255) { background = color; break; }
      parent = parent.parentElement;
    }
    const color = rgba(getComputedStyle(node).color), alpha = color[3] / 255;
    const foreground = color.slice(0, 3).map((n, i) => n * alpha + background[i] * (1 - alpha));
    const a = luminance(foreground), b = luminance(background);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  };
  const text = node => {
    if (!node || !visible(node)) return null;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let leaf;
    while (leaf = walker.nextNode()) {
      if (leaf.textContent.trim() && !leaf.parentElement.closest('[aria-hidden="true"]') && visible(leaf.parentElement)) break;
    }
    if (!leaf) return null;
    const offset = leaf.textContent.search(/\S/), range = document.createRange();
    range.setStart(leaf, offset); range.setEnd(leaf, offset + 1);
    const rect = range.getBoundingClientRect(), style = getComputedStyle(leaf.parentElement);
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const glyph = context.measureText(leaf.textContent[offset]), cap = context.measureText('H'), x = context.measureText('x');
    if (!Number.isFinite(glyph.fontBoundingBoxAscent) || !Number.isFinite(cap.actualBoundingBoxAscent)) throw Error('Font ink metrics unavailable');
    const baseline = rect.y + glyph.fontBoundingBoxAscent;
    return {
      text: node.textContent.trim(), ...box(node), baseline,
      capMiddle: baseline - cap.actualBoundingBoxAscent / 2,
      xMiddle: baseline - x.actualBoundingBoxAscent / 2,
      inkMiddle: baseline + (glyph.actualBoundingBoxDescent - glyph.actualBoundingBoxAscent) / 2,
      glyphCenterX: rect.x + (glyph.actualBoundingBoxRight - glyph.actualBoundingBoxLeft) / 2,
      fontSize: parseFloat(style.fontSize), fontWeight: Number(style.fontWeight), color: style.color,
      clipped: node.scrollWidth > node.clientWidth + 1 || [...node.children].some(child => visible(child) && child.scrollWidth > child.clientWidth + 1),
      disclosure: node.hasAttribute('aria-expanded'),
    };
  };
  const groups = [], opticalPairs = [], hierarchy = [], rows = [], edges = [];
  const group = (name, axis, nodes, value) => {
    const members = nodes.map(text).filter(item => item && (axis !== 'y' || /[\p{L}\p{N}]/u.test(item.text))).map(item => ({ ...item, value: value(item) }));
    if (members.length) groups.push({ name, axis, members });
  };
  group('primary name rail', 'x', all('.wtc-brand-word,.wtc-repo-label,.wtc-service-label'), item => item.x);
  for (const header of all('.wtc-collection-card>summary,.wtc-collection>header>div:first-child')) {
    const controls = header.querySelector('.wtc-header-controls');
    if (controls) edges.push({ name: 'header trailing controls', actual: box(controls).right, expected: box(header).right - parseFloat(getComputedStyle(header).paddingRight) });
    group('header text baseline', 'y', [...header.querySelectorAll('.wtc-brand-word,.wtc-brand-suffix,.wtc-header-feedback,.wtc-action-toolbar button')], item => item.baseline);
    const reference = text(header.querySelector('.wtc-brand-word'));
    if (!reference) continue;
    const icons = [...header.querySelectorAll('.wtc-header-controls>button,.wtc-header-controls>span:last-child')];
    if (header.closest('.wtc-collection')) icons.push(...header.querySelectorAll('button'));
    for (const node of icons) {
      const svg = node.querySelector('svg'), ink = text(node);
      if (!svg && (!ink || !/^[↻⤢⌃⌄]$/.test(ink.text))) continue;
      const b = svg?.getBBox(), middle = svg ? new DOMPoint(b.x + b.width / 2, b.y + b.height / 2).matrixTransform(svg.getScreenCTM()).y : ink.inkMiddle;
      opticalPairs.push({ name: `header icon ${node.title || ink?.text || 'collapse'}`, ...box(node), middle, capMiddle: reference.capMiddle, xMiddle: reference.xMiddle, capDelta: middle - reference.capMiddle, xDelta: middle - reference.xMiddle });
    }
  }
  for (const [i, row] of all('.wtc-repo-identity').entries()) {
    const identity = row.parentElement, label = row.querySelector('.wtc-repo-label');
    group(`repository ${i + 1} baseline`, 'y', [...row.children], item => item.baseline);
    const facts = identity.querySelector('.wtc-repo-facts');
    rows.push({ name: label?.textContent ?? `repository ${i + 1}`, ...box(identity), emptyFactBand: !!facts && !facts.textContent.trim() });
  }
  for (const [i, icon] of all('.wtc-lead-icon').entries()) {
    const grid = icon.closest('.wtc-table');
    let cell = icon;
    while (grid && cell.parentElement !== grid) cell = cell.parentElement;
    const cells = grid ? [...grid.children] : [], cols = Number(grid?.getAttribute('data-columns'));
    const start = grid ? Math.floor(cells.indexOf(cell) / cols) * cols : 0;
    const service = cells.slice(start, start + cols).map(node => node.querySelector('.wtc-service-label')).find(Boolean);
    const label = icon.closest('a[aria-label="taba home"]')?.querySelector('.wtc-brand-word')
      ?? icon.closest('.wtc-repo-identity')?.querySelector('.wtc-repo-label') ?? service;
    const metrics = text(label);
    if (!metrics) continue;
    const bounds = box(icon), svg = icon.querySelector('svg'), glyph = text(icon);
    let middle = glyph?.inkMiddle ?? bounds.y + bounds.height / 2;
    if (svg) {
      const ink = svg.getBBox(), matrix = svg.getScreenCTM();
      middle = new DOMPoint(ink.x + ink.width / 2, ink.y + ink.height / 2).matrixTransform(matrix).y;
    }
    opticalPairs.push({ name: `leading icon ${i + 1} (${metrics.text})`, ...bounds, middle, capMiddle: metrics.capMiddle, xMiddle: metrics.xMiddle, capDelta: middle - metrics.capMiddle, xDelta: middle - metrics.xMiddle });
  }
  for (const [i, repositories] of all('.wtc-repositories').entries()) {
    for (const glyph of ['↑', '↓']) {
      const icons = all('.wtc-count-icon', repositories).filter(node => node.textContent.trim() === glyph);
      group(`repository table ${i + 1} ${glyph} ink rail`, 'x', icons, item => item.glyphCenterX);
    }
  }
  for (const [i, grid] of all('.wtc-table').entries()) {
    const cols = Number(grid.getAttribute('data-columns')), cells = [...grid.children];
    for (let start = cols; start < cells.length; start += cols) {
      const firstLine = cells.slice(start, start + cols);
      group(`table ${i + 1} row ${start / cols} baseline`, 'y', firstLine, item => item.baseline);
    }
  }
  for (const [role, selector] of [
    ['brand', '.wtc-brand-word'], ['collection', '.wtc-collection>header>div:nth-child(2)'], ['section', 'h3'], ['repository', '.wtc-repo-label'], ['service', '.wtc-service-label'],
    ['branch', '.wtc-repo-branch'], ['fact', '.wtc-count-value'], ['action', '.wtc-next-step button'],
  ]) for (const node of all(selector)) {
    const metrics = text(node); if (!metrics) continue;
    const style = getComputedStyle(node);
    hierarchy.push({ role, ...metrics, contrastRatio: contrast(node), background: style.backgroundColor, filled: rgba(style.backgroundColor)[3] > 0 });
  }
  const sections = [];
  const addSection = (id, label, parent, node) => {
    if (node && visible(node)) sections.push({ id, label, parent, bounds: box(node) });
  };
  addSection('collection', 'Collection', null, root.querySelector('.wtc-collection-card,.wtc-collection'));
  addSection('header', 'Collection controls', 'collection', root.querySelector('.wtc-collection-card>summary,.wtc-collection>header'));
  addSection('repositories', 'Repositories', 'collection', root.querySelector('.wtc-repo-section,.wtc-repositories'));
  addSection('bulk-actions', 'Actions across all repositories', 'repositories', root.querySelector('.wtc-bulk-actions'));
  for (const [index, label] of all('.wtc-repo-label').entries()) {
    const grid = label.closest('.wtc-table');
    let cell = label;
    while (grid && cell.parentElement !== grid) cell = cell.parentElement;
    if (!grid) continue;
    const cells = [...grid.children], cols = Number(grid.getAttribute('data-columns'));
    const start = Math.floor(cells.indexOf(cell) / cols) * cols;
    const bounds = cells.slice(start, start + cols).filter(visible).map(box);
    const y = Math.min(...bounds.map(b => b.y)), bottom = Math.max(...bounds.map(b => b.bottom));
    sections.push({ id: `repo:${index}:${label.textContent}`, label: label.textContent, parent: 'repositories', bounds: { x: box(grid).x, y, width: box(grid).width, height: bottom - y } });
  }
  addSection('services', 'Collection services', 'collection', root.querySelector('.wtc-base-services'));
  addSection('activity', 'Action log', 'collection', root.querySelector('.wtc-activity-log'));
  addSection('pull-requests', 'Pull requests', 'collection', root.querySelector('div.wtc-pr-history'));
  addSection('composer', 'Conversation composer', null, root.querySelector('.composer'));
  const missing = all('.wtc-repositories').length && !all('.wtc-repo-label').length ? ['Visible repository table has no semantic name anchors'] : [];
  return { groups, opticalPairs, rows, hierarchy, sections, missing, edges, bounds: box(root) };
}

const escapeMarkup = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

// Observations come from a separate pixels-only reviewer, never from this DOM collector.
// Geometry proposes correspondences; the report keeps ambiguity and unmatched regions visible.
export function compareVisualSections(audit, observations) {
  if (!observations) return { state: 'not-assessed', matches: [], mismatches: [], warnings: ['No independent pixel grouping attached. Model regions alone cannot assess perceived hierarchy.'] };
  if (!audit.image || ![audit.image.width,audit.image.height].every(n=>Number.isInteger(n)&&n>0) || !/^[a-f0-9]{64}$/.test(audit.image.sha256 ?? '') || observations.imageSha256 !== audit.image.sha256 || observations.canvas?.width !== audit.image.width || observations.canvas?.height !== audit.image.height) throw Error('Section observations must identify the same screenshot and canvas');
  const expected = audit.sections ?? [], perceived = observations.groups;
  const validate = items => {
    if (!Array.isArray(items)) throw Error('Section groups must be an array');
    const ids = new Set();
    for (const item of items) {
      const b = item.bounds;
      if (typeof item.id!=='string' || !item.id || ids.has(item.id) || (item.parent!=null && typeof item.parent!=='string') || !b || ![b.x,b.y,b.width,b.height].every(Number.isFinite) || b.width <= 0 || b.height <= 0) throw Error('Invalid or duplicate section region');
      ids.add(item.id);
    }
    for (const item of items) {
      const seen = new Set([item.id]); let parent = item.parent;
      while (parent != null) {
        if (!ids.has(parent) || seen.has(parent)) throw Error('Unknown or cyclic section parent');
        seen.add(parent); parent = items.find(node => node.id === parent).parent;
      }
    }
  };
  validate(expected); validate(perceived);
  const ancestor = (items, a, b) => {
    let parent = items.find(item => item.id === b)?.parent;
    while (parent != null) { if (parent === a) return true; parent = items.find(item => item.id === parent)?.parent; }
    return false;
  };
  const matches = expected.map(item => {
    const a = item.bounds, area = a.width * a.height;
    const candidates = perceived.map(group => {
      const b = group.bounds;
      const overlap = Math.max(0, Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)) * Math.max(0, Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
      return { group, coverage: overlap / area, score: overlap / (area + b.width*b.height - overlap) };
    }).filter(candidate => candidate.coverage >= .5 && candidate.score >= .25).sort((a,b) => b.score-a.score);
    return { expected: item.id, perceived: candidates[0]?.group.id ?? null, coverage: candidates[0]?.coverage ?? 0, score: candidates[0]?.score ?? 0 };
  });
  const mismatches = [], warnings = matches.filter(item => !item.perceived).map(item => `Unmatched model region: ${item.expected}`);
  for (let i=0;i<matches.length;i++) for (let j=i+1;j<matches.length;j++) {
    const a=matches[i],b=matches[j];
    if (!a.perceived || !b.perceived || ancestor(expected,a.expected,b.expected) || ancestor(expected,b.expected,a.expected)) continue;
    if (a.perceived===b.perceived || ancestor(perceived,a.perceived,b.perceived) || ancestor(perceived,b.perceived,a.perceived)) mismatches.push({ first: a.expected, second: b.expected, observed: a.perceived===b.perceived ? 'merged group' : 'nested groups' });
  }
  return { state: 'compared', matches, mismatches, warnings, ambiguities: observations.ambiguities ?? [] };
}

// Render after recording has stopped. The original PNG remains untouched, and
// no diagnostic layer ever enters the screencast or changes product geometry.
export function visualGuideSvg(audit, imageDataUrl, viewport, crop, observations = null) {
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(imageDataUrl)) throw Error('Guides require an embedded PNG');
  if (![viewport.width,viewport.height,crop.x,crop.y,crop.width,crop.height].every(Number.isFinite) || viewport.width<=0 || viewport.height<=0 || crop.width<=0 || crop.height<=0) throw Error('Invalid guide viewport or crop');
  compareVisualSections(audit, observations);
  const lines = [];
  const line = (x1, y1, x2, y2, color, dashed = false) => {
    if (![x1, y1, x2, y2].every(Number.isFinite)) throw Error('Invalid guide coordinates');
    lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1"${dashed ? ' stroke-dasharray="3 3"' : ''}/>`);
  };
  for (const group of audit.groups) {
    if (group.axis === 'x' && group.members.length) {
      const x = group.members.reduce((sum, item) => sum + item.value, 0) / group.members.length;
      line(x, Math.min(...group.members.map(item => item.y)) - 5, x, Math.max(...group.members.map(item => item.bottom)) + 5, '#ff4f91');
    }
    for (const item of group.members) {
      if (group.axis === 'x' && group.spread > .75) line(item.value, item.y - 5, item.value, item.bottom + 5, '#ff6262', true);
      else if (group.axis === 'y') line(item.x, item.value, item.right, item.value, '#66b5ff');
    }
  }
  for (const pair of audit.opticalPairs) {
    line(pair.x - 3, pair.capMiddle, pair.right + 3, pair.capMiddle, '#64edb0');
    line(pair.x - 3, pair.middle, pair.right + 3, pair.middle, '#ffbf61', true);
  }
  const regions = (items, layer, color) => `<g data-section-layer="${layer}">${items.map(item => {
    const b = item.bounds;
    if (![b.x,b.y,b.width,b.height].every(Number.isFinite)) throw Error('Invalid section coordinates');
    let depth=0, parent=item.parent;
    const seen=new Set([item.id]);
    while(parent!=null && !seen.has(parent)){seen.add(parent);const node=items.find(candidate=>candidate.id===parent);if(!node)break;depth++;parent=node.parent;}
    return `<g data-section-depth="${depth}"${depth>1?' style="display:none"':''}><title>${escapeMarkup(layer+': '+(item.label ?? item.id)+(item.evidence?' — '+item.evidence:''))}</title><rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="${color}" fill-opacity=".035" stroke="${color}" stroke-width="1"${layer==='model'?' stroke-dasharray="5 4"':''}/><text class="section-label" style="display:none" x="${b.x+3}" y="${b.y+11}" fill="${color}" font-family="system-ui" font-size="10">${escapeMarkup(item.label ?? item.id)}</text></g>`;
  }).join('')}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}"><image width="${viewport.width}" height="${viewport.height}" href="${imageDataUrl}"/>${lines.join('')}${regions(audit.sections ?? [],'model','#5bd5ef')}${regions(observations?.groups ?? [],'perceived','#ed8ede')}</svg>`;
}

export function visualAuditReport(audit, svg, observations = null) {
  if (!Array.isArray(audit.errors) || !Array.isArray(audit.warnings)) throw Error('Audit diagnostics must be arrays');
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const rows = audit.hierarchy.map(item => `<tr><td>${escape(item.role)}</td><td>${escape(item.text)}</td><td>${escape(item.fontSize)}</td><td>${escape(item.fontWeight)}</td><td>${item.contrastRatio.toFixed(2)}</td><td>${item.filled ? 'filled' : 'quiet'}${item.clipped ? ' · ellipsis' : ''}</td></tr>`).join('');
  const comparison = compareVisualSections(audit, observations);
  const matches = comparison.matches.map(item => `<tr><td>${escape(audit.sections.find(region=>region.id===item.expected)?.label ?? item.expected)}</td><td>${escape(observations.groups.find(region=>region.id===item.perceived)?.label ?? item.perceived ?? 'Unmatched')}</td><td>${item.score.toFixed(2)}</td></tr>`).join('');
  const sections = `<h2>Intended structure versus perceived grouping</h2><p>Cyan dashed boxes: model regions from DOM geometry. Magenta boxes: separately attached pixels-only observations. DOM regions do not establish what a person perceives. Correspondences use geometry, not label matching, and need human review. Zero relationship warnings does not establish semantic agreement: compare the labels and reasoning too.</p><p>${comparison.state==='not-assessed'?'Not independently assessed.':`${comparison.mismatches.length} potential relationship mismatches.`}</p><ul>${[...comparison.warnings,...(comparison.ambiguities ?? []),...comparison.mismatches.map(item=>`${item.first} / ${item.second}: perceived as ${item.observed}, although neither is a model descendant of the other`)].map(item=>`<li>${escape(item)}</li>`).join('')}</ul>${matches?`<table><thead><tr><th>Model region</th><th>Perceived region</th><th>Overlap (IoU)</th></tr></thead><tbody>${matches}</tbody></table>`:''}`;
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Visual rails and hierarchy</title><style>body{font:14px system-ui;margin:24px;background:#101318;color:#ddd}label{margin-right:16px}figure{margin:20px 0;overflow:auto}svg{display:block}table{border-collapse:collapse}td,th{text-align:left;padding:6px 12px;border-bottom:1px solid #30343c}th{color:#aaa}p{max-width:900px}</style><h1>Visual rails and hierarchy</h1><p>Separate diagnostic artifact. Pink: shared rails. Blue: text baselines. Green: declared cap-height middles. Amber: measured icon ink middles. Toggle the guides and compare the unannotated layout. These groups have explicit meanings; unrelated elements need not share a line.</p><label><input id="rails" type="checkbox" checked>Rails</label><label><input id="baselines" type="checkbox" checked>Baselines</label><label><input id="middles" type="checkbox" checked>Optical middles</label><label><input id="model" type="checkbox" checked>Model sections</label><label><input id="perceived" type="checkbox" checked>Perceived sections</label><label>Grouping depth <select id="depth"><option value="1">Sections</option><option value="2">Sections and rows</option><option value="99">All groups</option></select></label><label><input id="section-labels" type="checkbox">Group labels</label><figure>${svg}</figure>${sections}<p>${audit.errors.length} alignment errors · ${audit.warnings.length} hierarchy/density warnings</p><ul>${audit.errors.concat(audit.warnings).map(value => `<li>${escape(value)}</li>`).join('')}</ul><h2>Hierarchy evidence</h2><p>Font size, weight, contrast and filled surfaces are evidence for review, not a taste score. Check whether the right controls dominate and whether within-group spacing is smaller than spacing between groups.</p><table><thead><tr><th>Role</th><th>Text</th><th>Size</th><th>Weight</th><th>Contrast</th><th>Surface</th></tr></thead><tbody>${rows}</tbody></table><script>for(const [id,colors] of [['rails',['#ff4f91','#ff6262']],['baselines',['#66b5ff']],['middles',['#64edb0','#ffbf61']]])document.getElementById(id).onchange=event=>{for(const line of document.querySelectorAll('svg line'))if(colors.includes(line.getAttribute('stroke')))line.style.display=event.target.checked?'':'none'};for(const id of ['model','perceived'])document.getElementById(id).onchange=event=>{for(const group of document.querySelectorAll('g[data-section-layer="'+id+'"]'))group.style.display=event.target.checked?'':'none'};document.getElementById('depth').onchange=event=>{for(const group of document.querySelectorAll('g[data-section-depth]'))group.style.display=Number(group.dataset.sectionDepth)<=Number(event.target.value)?'':'none'};document.getElementById('section-labels').onchange=event=>{for(const label of document.querySelectorAll('svg .section-label'))label.style.display=event.target.checked?'':'none'};if(${!!observations})for(const id of ['rails','baselines','middles']){const toggle=document.getElementById(id);toggle.checked=false;toggle.onchange({target:toggle})}</script>`;
}

if (typeof process !== 'undefined' && process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  const { readFile, writeFile } = await import('node:fs/promises');
  const { createHash } = await import('node:crypto');
  const [auditPath, pngPath, observedPath, outputPath] = process.argv.slice(2);
  if (!auditPath || !pngPath || !observedPath || !outputPath) throw Error('Usage: node scripts/openclaw-visual-audit.mjs phase.visual.json phase.png observations.json report.html');
  const audit = JSON.parse(await readFile(auditPath, 'utf8')), png = await readFile(pngPath), observations = JSON.parse(await readFile(observedPath, 'utf8'));
  if (createHash('sha256').update(png).digest('hex') !== audit.image?.sha256) throw Error('Audit belongs to a different screenshot');
  if (png.length<24 || png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a' || png.toString('ascii',12,16)!=='IHDR' || png.readUInt32BE(16)!==audit.image.width || png.readUInt32BE(20)!==audit.image.height) throw Error('PNG dimensions do not match the audit');
  const svg = visualGuideSvg(audit, 'data:image/png;base64,'+png.toString('base64'), audit.image, { x:0,y:0,width:audit.image.width,height:audit.image.height }, observations);
  await writeFile(outputPath, visualAuditReport(audit, svg, observations), { flag:'wx' });
}

// A fixed crop for the whole clip preserves growth and never hides movement.
export function recordingCrop(samples, width, height, padding = 8) {
  if (!samples.length || !Number.isInteger(width) || !Number.isInteger(height)) throw Error('Crop requires measured content and integer viewport dimensions');
  const top = Math.max(0, Math.floor((Math.min(...samples) - padding) / 2) * 2);
  if (!Number.isFinite(top) || top >= height) throw Error('Invalid capture bounds');
  return { x: 0, y: top, width: width - width % 2, height: height - top - (height - top) % 2 };
}
