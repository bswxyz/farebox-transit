/* ── Deterministic arrivals engine ─────────────────────────────────────
   No backend. Every (station, line, direction) gets its own seeded
   mulberry32 stream of departure gaps, so the board ticks believably —
   "4 min" decays to "due", the row leaves, the next departure appears —
   and the sequence is reproducible for a given station. Time advances
   with the real clock from page load. */

import { LINES, stationById, lineById, platformFor, type LineId } from './data';

/** Small fast seeded PRNG — good enough to schedule fictional trains. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const T0 = Date.now();
const elapsed = () => (Date.now() - T0) / 1000;

interface Service {
  key: string;
  line: LineId;
  dest: string;
  platform: string;
  headway: [number, number];
  rand: () => number;
  /** upcoming departures, seconds from T0 */
  times: number[];
}

const serviceCache = new Map<string, Service[]>();

function servicesFor(stationId: string): Service[] {
  let cached = serviceCache.get(stationId);
  if (cached) return cached;
  const st = stationById.get(stationId)!;
  const services: Service[] = [];
  for (const lid of st.lines) {
    const line = lineById.get(lid)!;
    const idx = line.stations.indexOf(stationId);
    const dirs: { dir: number; destId: string }[] = [];
    if (idx < line.stations.length - 1) dirs.push({ dir: 0, destId: line.stations[line.stations.length - 1] });
    if (idx > 0) dirs.push({ dir: 1, destId: line.stations[0] });
    for (const { dir, destId } of dirs) {
      const rand = mulberry32(hash(`farebox:${stationId}:${lid}:${dir}`));
      const [hmin, hmax] = line.headway;
      const first = 25 + rand() * hmax * 0.8;
      services.push({
        key: `${lid}:${dir}`,
        line: lid,
        dest: stationById.get(destId)!.name,
        platform: platformFor(stationId, lid, dir),
        headway: [hmin, hmax],
        rand,
        times: [first],
      });
    }
  }
  serviceCache.set(stationId, services);
  return services;
}

/** Keep each stream topped up and drop departures that already left. */
function advance(s: Service): void {
  const now = elapsed();
  const horizon = now + 3600;
  let last = s.times[s.times.length - 1] ?? now;
  while (last < horizon) {
    last += s.headway[0] + s.rand() * (s.headway[1] - s.headway[0]);
    s.times.push(last);
  }
  while (s.times.length && s.times[0] < now - 8) s.times.shift();
}

export interface Departure {
  line: LineId;
  dest: string;
  platform: string;
  seconds: number;
}

/** Next n departures across all lines at a station (for the detail card). */
export function nextDepartures(stationId: string, n: number): Departure[] {
  const now = elapsed();
  const all: Departure[] = [];
  for (const s of servicesFor(stationId)) {
    advance(s);
    for (const t of s.times.slice(0, 2))
      all.push({ line: s.line, dest: s.dest, platform: s.platform, seconds: t - now });
  }
  return all.sort((a, b) => a.seconds - b.seconds).slice(0, n);
}

export function formatEta(seconds: number): string {
  if (seconds <= 25) return 'due';
  if (seconds < 105) return '1 min';
  return `${Math.round(seconds / 60)} min`;
}

/* ── The departures board ────────────────────────────────────────────── */

export class Board {
  private station = 'union';
  private rows = new Map<string, HTMLTableRowElement>();
  private timer: number | undefined;
  private lastAnnounce = 0;

  constructor(
    private tbody: HTMLTableSectionElement,
    private liveRegion: HTMLElement,
    private clock: HTMLElement | null,
    private reducedMotion: boolean,
  ) {}

  start(): void {
    this.render(true);
    this.timer = window.setInterval(() => this.render(false), 1000);
  }

  stop(): void {
    if (this.timer) window.clearInterval(this.timer);
  }

  setStation(id: string): void {
    this.station = id;
    this.rows.clear();
    this.tbody.innerHTML = '';
    this.lastAnnounce = 0;
    this.render(true);
  }

  private makeRow(s: Service): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.className = 'board-row';
    tr.dataset.key = s.key;
    tr.innerHTML = `
      <td class="b-line"><span class="chip chip-${s.line}"><span class="sr-only">${lineById.get(s.line)!.name} </span>${s.line}</span></td>
      <td class="b-dest">${s.dest}</td>
      <td class="b-plat">${s.platform}</td>
      <td class="b-next"></td>
      <td class="b-then"></td>`;
    return tr;
  }

  private render(first: boolean): void {
    const now = elapsed();
    const services = servicesFor(this.station);
    services.forEach(advance);
    const sorted = [...services].sort((a, b) => (a.times[0] ?? 1e9) - (b.times[0] ?? 1e9));

    // FLIP: capture positions before any reorder
    const before = new Map<string, number>();
    if (!first && !this.reducedMotion)
      for (const [key, tr] of this.rows) before.set(key, tr.getBoundingClientRect().top);

    let orderChanged = false;
    sorted.forEach((s, i) => {
      let tr = this.rows.get(s.key);
      if (!tr) {
        tr = this.makeRow(s);
        this.rows.set(s.key, tr);
        this.tbody.appendChild(tr);
        orderChanged = true;
      }
      if (this.tbody.children[i] !== tr) {
        this.tbody.insertBefore(tr, this.tbody.children[i] ?? null);
        orderChanged = true;
      }
      const eta0 = s.times[0] !== undefined ? s.times[0] - now : undefined;
      const eta1 = s.times[1] !== undefined ? s.times[1] - now : undefined;
      const next = tr.querySelector('.b-next')!;
      const then = tr.querySelector('.b-then')!;
      const nextText = eta0 !== undefined ? formatEta(eta0) : '—';
      const thenText = eta1 !== undefined ? formatEta(eta1) : '—';
      if (next.textContent !== nextText) next.textContent = nextText;
      if (then.textContent !== thenText) then.textContent = thenText;
      tr.classList.toggle('is-due', eta0 !== undefined && eta0 <= 25);
    });

    if (orderChanged && !first && !this.reducedMotion) {
      for (const [key, tr] of this.rows) {
        const prev = before.get(key);
        if (prev === undefined) {
          tr.classList.remove('row-enter');
          void tr.offsetWidth;
          tr.classList.add('row-enter');
          continue;
        }
        const delta = prev - tr.getBoundingClientRect().top;
        if (Math.abs(delta) > 1) {
          tr.style.transition = 'none';
          tr.style.transform = `translateY(${delta}px)`;
          requestAnimationFrame(() => {
            tr.style.transition = 'transform .4s var(--ease)';
            tr.style.transform = '';
          });
        }
      }
    }

    if (this.clock) {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
      this.clock.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    }

    // Throttled announcement for screen readers (at most every 30s)
    if (now - this.lastAnnounce >= 30 || first) {
      this.lastAnnounce = now;
      const top = sorted.slice(0, 3).map((s) => {
        const eta = s.times[0] !== undefined ? formatEta(s.times[0] - now) : 'no service';
        return `${lineById.get(s.line)!.name} to ${s.dest}: ${eta === 'due' ? 'due now' : eta}`;
      });
      this.liveRegion.textContent = `Departures from ${stationById.get(this.station)!.name}. ${top.join('. ')}.`;
    }
  }
}

export { LINES };
