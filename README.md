# Farebox

**Live:** https://bswxyz.github.io/farebox-transit/ · **Build notes:** https://bswxyz.github.io/farebox-transit/guide/

A civic-tech transit app landing site with a working interactive network map and a live-ish
departures board — part of the [Fable 25 design showcase](https://bswxyz.github.io/fable-hub/).

---

## The concept

Farebox is the official app of Calder, a fictional city: live arrivals for every bus, tram and
metro, one fare card that caps itself, service alerts written by people in plain words, and honest
step-free information for every station. The voice is municipal and direct — "The 8:12 means
8:12." — and accessibility is not a compliance footnote but the product's core argument, so the
site treats WCAG-AAA contrast and full keyboard operation as visible features and publishes its
own contrast measurements.

## Design system

- **Palette (municipal light):** `--bg:#ffffff` · `--ink:#111418` (18.5:1) · `--dim:#343b44` ·
  `--paper-2:#f2f4f6` · line colours `--red:#e4322b` / `--blue:#1f6fe0` / `--green:#2ea44f` /
  `--amber:#f5a623` · `--line:rgba(17,20,24,.14)`. Line colours appear only as chips and strokes,
  never as body text. Amber gets a darker twin (`#c47600`) for white surfaces because pure
  `#f5a623` fails contrast on white — the bright amber lives on dark surfaces (board, fare card).
- **Type:** `Hanken Grotesk` 700/800 (display, destinations) · `Inter` 400–700 (body/UI) ·
  `Spline Sans Mono` (times, codes, measurements, eyebrows).
- **Signature motion:** an efficient, no-nonsense ease `cubic-bezier(.2,.9,.25,1)` with short
  durations; a staggered stroke-dash draw-in of the four routes; clipped-line hero intro; FLIP
  re-sorting on the departures board. Full `prefers-reduced-motion` fallback.
- **Why it fits:** a transit authority's design job is legibility under stress. High contrast,
  one reused chip component, 45° Vignelli geometry, mono numerals — nothing decorative that
  doesn't inform.

## Stack

- **Vite + vanilla TypeScript.** No framework — the page is two small state machines (map,
  board) over a typed network model, and a 1-second loop that mutates only changed text nodes.
- The network (4 lines, 25 stations, 7 interchanges, per-station step-free notes) lives in
  `src/data.ts`; the SVG map, the line picker, the station cards and the arrivals engine are all
  derived from that one model.
- The arrivals engine is a seeded `mulberry32` PRNG per (station, line, direction) — believable
  headways, deterministic sequences, zero backend.
- Google Fonts (Hanken Grotesk / Inter / Spline Sans Mono). No images anywhere: the map, the
  chips and the fare card are the visuals.

## Running it locally

```bash
git clone https://github.com/bswxyz/farebox-transit
cd farebox-transit
npm install
npm run dev        # Vite dev server → http://localhost:5173/farebox-transit/
npm run build      # typecheck + build → docs/
```

## Structure

```
index.html          the page (semantic sections, .js gate, skip link)
guide/index.html    "how it was built" — second rollup input, styled to match
src/data.ts         the network model: lines, stations, geometry, access notes
src/map.ts          SVG map builder + line picker + station detail card
src/arrivals.ts     seeded arrivals engine + ticking departures board
src/reveal.ts       IntersectionObserver reveals + animated counters
src/style.css       all styling — design tokens in :root at the top
vite.config.ts      base '/farebox-transit/', outDir 'docs', two inputs
public/.nojekyll    keeps GitHub Pages from post-processing docs/
```

## Demo vs. real — what a production version would need

Intentionally scoped as a showcase. What's **simulated/static** today:

- **Calder does not exist.** The network, stations, on-time figure and step-free data are
  authored fiction (plausible, but fiction).
- **Arrivals are a seeded simulation.** Real arrivals need the agency's **GTFS + GTFS-RT**
  feeds, vehicle positions, service-day calendars, and honest degraded states when the feed dies.
- **The fare card is an illustration.** A real stored-value card needs a fare engine (caps,
  transfers, reduced-fare eligibility), a payments processor, refunds, and audited accounting.
- **Alerts are hand-written examples.** Production needs an alerts pipeline (GTFS-RT service
  alerts), a human editorial layer to keep the plain-language promise, and the 12-language
  translation workflow the site advertises.
- **No apps.** The store buttons stay on the page; real Farebox would be native iOS/Android with
  offline caching and NFC ticketing.

What's **real** and reusable as-is: the typed network model + generated SVG map (keyboard
operable, screen-reader labelled), the deterministic arrivals engine and board renderer, the
chip/alert/board component system, and the AAA-minded colour math.

## License

[MIT](LICENSE). Design & build by **Fable** (Anthropic's Claude). No photographic or generated
image assets — everything on the page is drawn with code.
