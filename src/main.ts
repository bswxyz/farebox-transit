import './style.css';
import { NetworkMap, buildLinePicker, bindRouteSummary, bindStationCard } from './map';
import { Board } from './arrivals';
import { initReveals, initCounters } from './reveal';
import { STATIONS } from './data';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Map + picker + station card ─────────────────────────────────────── */
const mapHost = document.getElementById('network-map');
const pickerHost = document.getElementById('line-picker');
const summaryNode = document.getElementById('route-summary');
const cardNode = document.getElementById('station-card');

if (mapHost && pickerHost && summaryNode && cardNode) {
  const map = new NetworkMap(mapHost, reducedMotion);
  buildLinePicker(pickerHost, map);
  bindRouteSummary(summaryNode, map);
  bindStationCard(cardNode, map);
  map.selectStation('union');
  map.intro();
}

/* ── Departures board ────────────────────────────────────────────────── */
const tbody = document.getElementById('board-body') as HTMLTableSectionElement | null;
const live = document.getElementById('board-live');
const clock = document.getElementById('board-clock');
const stationSelect = document.getElementById('board-station') as HTMLSelectElement | null;

if (tbody && live && stationSelect) {
  const sorted = [...STATIONS].sort((a, b) => a.name.localeCompare(b.name));
  for (const s of sorted) {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.lines.length > 1 ? `${s.name} — interchange` : s.name;
    if (s.id === 'union') opt.selected = true;
    stationSelect.appendChild(opt);
  }
  const board = new Board(tbody, live, clock, reducedMotion);
  board.start();
  stationSelect.addEventListener('change', () => board.setStation(stationSelect.value));
}

/* ── Fare card demo top-up ───────────────────────────────────────────── */
const balanceNode = document.getElementById('card-balance');
if (balanceNode) {
  let balance = 14.6;
  const write = () => (balanceNode.textContent = `$${balance.toFixed(2)}`);
  document.querySelectorAll<HTMLButtonElement>('[data-topup]').forEach((b) =>
    b.addEventListener('click', () => {
      balance = Math.min(200, balance + parseFloat(b.dataset.topup || '0'));
      write();
      balanceNode.classList.remove('bumped');
      void balanceNode.offsetWidth;
      if (!reducedMotion) balanceNode.classList.add('bumped');
    }),
  );
  write();
}

/* ── Hero intro (clipped lines) ──────────────────────────────────────── */
document.documentElement.classList.add('ready');

/* ── Reveals + counters ──────────────────────────────────────────────── */
initReveals(reducedMotion);
initCounters(reducedMotion);

/* ── Footer year ─────────────────────────────────────────────────────── */
const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
