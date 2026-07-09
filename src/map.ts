/* ── Interactive SVG network map ───────────────────────────────────────
   Builds the Calder network from data.ts: four 45°-angle routes, station
   dots, interchange rings and labels. Stations are real focusable
   controls (role="button" + tabindex + aria-label). The line picker is a
   radiogroup that highlights one route and dims the rest. */

import { LINES, STATIONS, stationById, lineById, type LineId, type Station } from './data';
import { nextDepartures, formatEta } from './arrivals';

const SVG_NS = 'http://www.w3.org/2000/svg';
const LINE_LABELS: Record<LineId, string> = { R: 'Red', B: 'Blue', G: 'Green', A: 'Amber' };

type PickListener = (line: LineId | 'all') => void;

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function stationAriaLabel(s: Station): string {
  const lines = s.lines.map((id) => lineById.get(id)!.name).join(' and ');
  const kind = s.lines.length > 1 ? 'Interchange' : 'Station';
  const access = s.stepFree ? 'Step-free.' : 'Not step-free.';
  return `${s.name}. ${kind}, ${lines}. ${access} Press Enter for details.`;
}

export class NetworkMap {
  private svg: SVGSVGElement;
  private routeGroups = new Map<LineId, SVGGElement>();
  private stationGroups = new Map<string, SVGGElement>();
  private picked: LineId | 'all' = 'all';
  private selectedStation: string | null = null;
  private listeners: PickListener[] = [];
  private stationListeners: ((id: string) => void)[] = [];

  constructor(host: HTMLElement, private reducedMotion: boolean) {
    this.svg = el('svg', {
      viewBox: '0 24 680 552',
      role: 'group',
      'aria-label': 'Calder transit network map. Four lines, twenty-five stations. Stations are buttons.',
    });
    this.build();
    host.appendChild(this.svg);
  }

  private build(): void {
    // Routes (drawn first, under the dots)
    const routes = el('g', { class: 'map-routes' });
    for (const line of LINES) {
      const g = el('g', { class: `route route-${line.id}`, 'data-line': line.id });
      const casing = el('path', { d: line.d, class: 'route-casing' });
      const stroke = el('path', { d: line.d, class: `route-stroke stroke-${line.id}` });
      g.append(casing, stroke);
      routes.appendChild(g);
      this.routeGroups.set(line.id, g);
    }
    this.svg.appendChild(routes);

    // Stations + labels
    const stations = el('g', { class: 'map-stations' });
    for (const s of STATIONS) {
      const g = el('g', {
        class: `station ${s.lines.length > 1 ? 'is-interchange' : `is-stop on-${s.lines[0]}`}`,
        'data-station': s.id,
        role: 'button',
        tabindex: '0',
        'aria-label': stationAriaLabel(s),
      });
      // generous invisible hit area
      g.appendChild(el('circle', { cx: String(s.x), cy: String(s.y), r: '17', class: 'station-hit' }));
      if (s.lines.length > 1) {
        g.appendChild(el('circle', { cx: String(s.x), cy: String(s.y), r: '9', class: 'station-ring' }));
      } else {
        g.appendChild(el('circle', { cx: String(s.x), cy: String(s.y), r: '5.5', class: 'station-dot' }));
      }
      const label = el('text', {
        x: String(s.lx),
        y: String(s.ly),
        'text-anchor': s.anchor,
        class: 'station-label',
        'aria-hidden': 'true',
      });
      label.textContent = s.name;
      g.appendChild(label);

      g.addEventListener('click', () => this.selectStation(s.id));
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectStation(s.id);
        }
      });
      stations.appendChild(g);
      this.stationGroups.set(s.id, g);
    }
    this.svg.appendChild(stations);
  }

  /** Hero intro: draw each route in with stroke-dash, stagger stations after. */
  intro(): void {
    if (this.reducedMotion) return;
    this.svg.classList.add('is-intro');
    LINES.forEach((line, i) => {
      const g = this.routeGroups.get(line.id)!;
      for (const path of g.querySelectorAll<SVGPathElement>('path')) {
        const len = path.getTotalLength();
        path.style.strokeDasharray = `${len}`;
        path.style.strokeDashoffset = `${len}`;
        path.style.transition = `stroke-dashoffset 1.1s cubic-bezier(.3,.6,.1,1) ${0.15 + i * 0.14}s`;
      }
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        for (const g of this.routeGroups.values())
          for (const p of g.querySelectorAll<SVGPathElement>('path')) p.style.strokeDashoffset = '0';
      });
    });
    window.setTimeout(() => {
      this.svg.classList.remove('is-intro');
      this.svg.classList.add('is-settled');
      for (const g of this.routeGroups.values())
        for (const p of g.querySelectorAll<SVGPathElement>('path')) {
          p.style.strokeDasharray = '';
          p.style.strokeDashoffset = '';
          p.style.transition = '';
        }
    }, 1900);
  }

  onPick(fn: PickListener): void {
    this.listeners.push(fn);
  }
  onStation(fn: (id: string) => void): void {
    this.stationListeners.push(fn);
  }

  pick(line: LineId | 'all'): void {
    this.picked = line;
    this.svg.classList.toggle('has-pick', line !== 'all');
    for (const [id, g] of this.routeGroups) g.classList.toggle('is-dim', line !== 'all' && id !== line);
    for (const s of STATIONS) {
      const g = this.stationGroups.get(s.id)!;
      const on = line === 'all' || s.lines.includes(line);
      g.classList.toggle('is-dim', !on);
    }
    this.listeners.forEach((fn) => fn(line));
  }

  get pickedLine(): LineId | 'all' {
    return this.picked;
  }

  selectStation(id: string): void {
    if (this.selectedStation) this.stationGroups.get(this.selectedStation)?.classList.remove('is-selected');
    this.selectedStation = id;
    this.stationGroups.get(id)?.classList.add('is-selected');
    this.stationListeners.forEach((fn) => fn(id));
  }
}

/* ── Line picker (radiogroup of colour-coded pills) ──────────────────── */

export function buildLinePicker(host: HTMLElement, map: NetworkMap): void {
  const options: { value: LineId | 'all'; label: string; chip?: LineId }[] = [
    { value: 'all', label: 'All lines' },
    ...LINES.map((l) => ({ value: l.id, label: l.name, chip: l.id })),
  ];
  host.setAttribute('role', 'radiogroup');
  host.setAttribute('aria-label', 'Highlight a line on the map');

  const buttons: HTMLButtonElement[] = [];
  for (const opt of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'line-pill';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', opt.value === 'all' ? 'true' : 'false');
    b.dataset.line = opt.value;
    if (opt.chip) {
      const chip = document.createElement('span');
      chip.className = `chip chip-${opt.chip}`;
      chip.setAttribute('aria-hidden', 'true');
      chip.textContent = opt.chip;
      b.appendChild(chip);
    }
    const t = document.createElement('span');
    t.textContent = opt.label;
    b.appendChild(t);
    b.addEventListener('click', () => map.pick(opt.value));
    b.addEventListener('keydown', (e) => {
      const i = buttons.indexOf(b);
      let next = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % buttons.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + buttons.length) % buttons.length;
      if (next >= 0) {
        e.preventDefault();
        buttons[next].focus();
        buttons[next].click();
      }
    });
    buttons.push(b);
    host.appendChild(b);
  }

  map.onPick((line) => {
    for (const b of buttons) {
      const checked = b.dataset.line === line;
      b.setAttribute('aria-checked', String(checked));
      b.tabIndex = checked ? 0 : -1;
    }
  });
  // initialise roving tabindex
  buttons.forEach((b, i) => (b.tabIndex = i === 0 ? 0 : -1));
}

/* ── Route summary line under the picker ─────────────────────────────── */

export function bindRouteSummary(node: HTMLElement, map: NetworkMap): void {
  const write = (line: LineId | 'all') => {
    if (line === 'all') {
      node.textContent = '4 lines · 25 stations · 7 interchanges. Pick a line to trace it, or press any station.';
      return;
    }
    const l = lineById.get(line)!;
    const first = stationById.get(l.stations[0])!.name;
    const last = stationById.get(l.stations[l.stations.length - 1])!.name;
    const sf = l.stations.filter((s) => stationById.get(s)!.stepFree).length;
    node.textContent = `${l.name} — ${l.mode} · ${first} ↔ ${last} · ${l.stations.length} stations · ${sf} of ${l.stations.length} step-free.`;
  };
  map.onPick(write);
  write('all');
}

/* ── Station detail card ─────────────────────────────────────────────── */

export function bindStationCard(card: HTMLElement, map: NetworkMap): void {
  const render = (id: string) => {
    const s = stationById.get(id)!;
    const chips = s.lines
      .map((lid) => {
        const l = lineById.get(lid)!;
        return `<span class="line-tag"><span class="chip chip-${lid}" aria-hidden="true">${lid}</span>${l.name} · ${l.mode}</span>`;
      })
      .join('');
    const deps = nextDepartures(id, 3)
      .map(
        (d) =>
          `<li><span class="chip chip-${d.line}" aria-hidden="true">${d.line}</span><span class="dep-dest">${LINE_LABELS[d.line]} Line → ${d.dest}</span><span class="dep-eta">${formatEta(d.seconds)}</span></li>`,
      )
      .join('');
    card.innerHTML = `
      <p class="card-kicker">${s.lines.length > 1 ? 'Interchange' : 'Station'}</p>
      <h3 class="card-name">${s.name}</h3>
      <div class="card-lines">${chips}</div>
      <p class="card-access ${s.stepFree ? 'is-yes' : 'is-no'}">
        <svg class="ic" viewBox="0 0 20 20" aria-hidden="true">${
          s.stepFree
            ? '<path d="M4 10.5l4 4 8-8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'
            : '<path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'
        }</svg>
        <span><strong>${s.stepFree ? 'Step-free' : 'Not step-free'}.</strong> ${s.access}</span>
      </p>
      <p class="card-kicker">Next departures</p>
      <ul class="card-deps">${deps}</ul>`;
  };
  map.onStation(render);
}
