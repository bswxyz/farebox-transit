/* ── Farebox network model ─────────────────────────────────────────────
   The fictional city of Calder. Four lines, 25 stations, 7 interchanges.
   Geometry is octilinear (Vignelli 45° discipline) on a 760×600 canvas.
   Everything the map, the arrivals engine and the detail card know about
   the network lives here. */

export type LineId = 'R' | 'B' | 'G' | 'A';

export interface Line {
  id: LineId;
  name: string;
  mode: 'Metro' | 'Tram' | 'Bus rapid';
  /** SVG path, 45°-angle segments only */
  d: string;
  /** ordered station ids, terminus → terminus */
  stations: string[];
  /** seconds between departures [min, max] */
  headway: [number, number];
}

export interface Station {
  id: string;
  name: string;
  x: number;
  y: number;
  lines: LineId[];
  stepFree: boolean;
  /** honest one-liner for the detail card */
  access: string;
  /** label placement */
  lx: number;
  ly: number;
  anchor: 'start' | 'middle' | 'end';
}

export const LINES: Line[] = [
  {
    id: 'R',
    name: 'Red Line',
    mode: 'Metro',
    d: 'M220,90 L220,160 L300,240 L300,520',
    stations: ['northgate', 'museum', 'union', 'fountain', 'southbank', 'millbrook'],
    headway: [240, 420],
  },
  {
    id: 'B',
    name: 'Blue Line',
    mode: 'Metro',
    d: 'M80,300 L560,300 L640,220 L640,80',
    stations: ['westfield', 'quarry', 'elm', 'union', 'grand', 'cathedral', 'harbor', 'observatory', 'airport'],
    headway: [270, 450],
  },
  {
    id: 'G',
    name: 'Green Line',
    mode: 'Tram',
    d: 'M140,520 L140,380 L220,300 L380,140 L640,140',
    stations: ['parkside', 'vale', 'glasshouse', 'elm', 'museum', 'orchard', 'university', 'stadium', 'observatory'],
    headway: [330, 540],
  },
  {
    id: 'A',
    name: 'Amber Line',
    mode: 'Bus rapid',
    d: 'M80,90 L460,90 L560,190 L560,420 L480,500',
    stations: ['hillcrest', 'northgate', 'foundry', 'fairground', 'stadium', 'harbor', 'brickyard', 'saltmarsh'],
    headway: [300, 480],
  },
];

export const STATIONS: Station[] = [
  // Red
  { id: 'northgate', name: 'Northgate', x: 220, y: 90, lines: ['R', 'A'], stepFree: true, access: 'Step-free from street to both platforms. Two lifts, checked daily.', lx: 220, ly: 62, anchor: 'middle' },
  { id: 'museum', name: 'Museum', x: 290, y: 230, lines: ['R', 'G'], stepFree: true, access: 'Step-free via the Garden Hall entrance. The Old Court entrance has stairs.', lx: 306, ly: 220, anchor: 'start' },
  { id: 'union', name: 'Union', x: 300, y: 300, lines: ['R', 'B'], stepFree: true, access: 'Step-free everywhere, including between platforms. Tactile edges on all platforms.', lx: 288, ly: 326, anchor: 'end' },
  { id: 'fountain', name: 'Fountain', x: 300, y: 370, lines: ['R'], stepFree: true, access: 'Step-free from street to platform. Level boarding at the front two doors.', lx: 314, ly: 375, anchor: 'start' },
  { id: 'southbank', name: 'Southbank', x: 300, y: 440, lines: ['R'], stepFree: true, access: 'Step-free from street to platform via ramp. Gradient 1:21.', lx: 314, ly: 445, anchor: 'start' },
  { id: 'millbrook', name: 'Millbrook', x: 300, y: 520, lines: ['R'], stepFree: true, access: 'Step-free. Level boarding along the whole platform.', lx: 300, ly: 548, anchor: 'middle' },
  // Blue
  { id: 'westfield', name: 'Westfield', x: 80, y: 300, lines: ['B'], stepFree: true, access: 'Step-free from street to platform. Accessible toilet inside the gate line.', lx: 80, ly: 328, anchor: 'middle' },
  { id: 'quarry', name: 'Quarry', x: 150, y: 300, lines: ['B'], stepFree: false, access: 'No lift — 42 steps to the platform. Lift install starts March 2027. Nearest step-free: Westfield or Elm, one stop each way.', lx: 150, ly: 280, anchor: 'middle' },
  { id: 'elm', name: 'Elm', x: 220, y: 300, lines: ['B', 'G'], stepFree: true, access: 'Step-free to the Blue Line and the tram stop. The tram boards level from the island.', lx: 220, ly: 326, anchor: 'middle' },
  { id: 'grand', name: 'Grand', x: 380, y: 300, lines: ['B'], stepFree: true, access: 'Step-free from street to platform. One lift — if it fails, staff will tell you before the gate line.', lx: 380, ly: 326, anchor: 'middle' },
  { id: 'cathedral', name: 'Cathedral', x: 460, y: 300, lines: ['B'], stepFree: true, access: 'Step-free from street to platform via the north entrance.', lx: 460, ly: 326, anchor: 'middle' },
  { id: 'harbor', name: 'Harbor', x: 560, y: 300, lines: ['B', 'A'], stepFree: true, access: 'Step-free between the metro and the busway. The footbridge to the ferry pier has stairs only.', lx: 544, ly: 326, anchor: 'end' },
  { id: 'observatory', name: 'Observatory', x: 640, y: 140, lines: ['B', 'G'], stepFree: true, access: 'Step-free everywhere. Shortest lift wait on the network.', lx: 628, ly: 122, anchor: 'end' },
  { id: 'airport', name: 'Airport', x: 640, y: 80, lines: ['B'], stepFree: true, access: 'Step-free. The east lift is out until 14 July — use the west lift, signed from arrivals.', lx: 640, ly: 56, anchor: 'middle' },
  // Green
  { id: 'parkside', name: 'Parkside', x: 140, y: 520, lines: ['G'], stepFree: true, access: 'Level boarding from the street — it is a tram stop, no stairs exist.', lx: 140, ly: 548, anchor: 'middle' },
  { id: 'vale', name: 'Vale', x: 140, y: 440, lines: ['G'], stepFree: false, access: 'The platform sits above street level — 12 steps. Ramp planned for the 2027 rebuild. Nearest step-free: Parkside.', lx: 154, ly: 445, anchor: 'start' },
  { id: 'glasshouse', name: 'Glasshouse', x: 180, y: 340, lines: ['G'], stepFree: true, access: 'Level boarding. The crossing to the southbound stop has dropped kerbs and tactile paving.', lx: 196, ly: 352, anchor: 'start' },
  { id: 'orchard', name: 'Orchard', x: 340, y: 180, lines: ['G'], stepFree: true, access: 'Level boarding both directions.', lx: 354, ly: 185, anchor: 'start' },
  { id: 'university', name: 'University', x: 440, y: 140, lines: ['G'], stepFree: true, access: 'Level boarding. Audio announcements at this stop are bilingual.', lx: 440, ly: 114, anchor: 'middle' },
  { id: 'stadium', name: 'Stadium', x: 510, y: 140, lines: ['G', 'A'], stepFree: true, access: 'Step-free between tram and busway. On event days, boarding queues are staffed.', lx: 510, ly: 168, anchor: 'middle' },
  // Amber
  { id: 'hillcrest', name: 'Hillcrest', x: 80, y: 90, lines: ['A'], stepFree: true, access: 'Kerb-level boarding. All Amber Line buses kneel and carry ramps.', lx: 80, ly: 118, anchor: 'middle' },
  { id: 'foundry', name: 'Foundry', x: 340, y: 90, lines: ['A'], stepFree: false, access: 'The stop is fine — the only paved approach has steps. A ramp is funded for autumn 2026. Nearest step-free: Fairground.', lx: 340, ly: 66, anchor: 'middle' },
  { id: 'fairground', name: 'Fairground', x: 460, y: 90, lines: ['A'], stepFree: true, access: 'Kerb-level boarding with a raised platform.', lx: 460, ly: 66, anchor: 'middle' },
  { id: 'brickyard', name: 'Brickyard', x: 560, y: 380, lines: ['A'], stepFree: false, access: 'Narrow kerb — wheelchair users board at the front door only, and it is tight. Being widened in the 2026–27 works. Nearest step-free: Harbor.', lx: 574, ly: 385, anchor: 'start' },
  { id: 'saltmarsh', name: 'Saltmarsh', x: 480, y: 500, lines: ['A'], stepFree: true, access: 'Kerb-level boarding. Step-free path to the nature reserve gate.', lx: 480, ly: 528, anchor: 'middle' },
];

export const stationById = new Map(STATIONS.map((s) => [s.id, s]));
export const lineById = new Map(LINES.map((l) => [l.id, l]));

/** Deterministic platform number for a station+line (pure cosmetics). */
export function platformFor(stationId: string, line: LineId, dirIndex: number): string {
  const st = stationById.get(stationId)!;
  return String(st.lines.indexOf(line) * 2 + dirIndex + 1);
}
