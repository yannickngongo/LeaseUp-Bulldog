// All 5 hero animation components. Pure CSS / SVG, no JS deps.

const RED = "#C8102E";
const RED_LIGHT = "#F87171";
const RED_DIM = "#5C1623";
const BG = "#08080F";
const BORDER = "#1E1E2E";

// ─────────────────────────────────────────────────────────────────────────────
// A — SKYLINE: red wireframe city skyline with windows lighting up randomly
// ─────────────────────────────────────────────────────────────────────────────
export function SkylineAnim() {
  // Buildings: [x, y_top, width, height] — silhouettes that rise
  const buildings = [
    { x: 50, top: 320, w: 90, h: 280 },
    { x: 160, top: 220, w: 110, h: 380 },
    { x: 290, top: 280, w: 80, h: 320 },
    { x: 390, top: 160, w: 130, h: 440 },
    { x: 540, top: 240, w: 100, h: 360 },
    { x: 660, top: 300, w: 90, h: 300 },
    { x: 780, top: 200, w: 120, h: 400 },
    { x: 920, top: 280, w: 90, h: 320 },
    { x: 1030, top: 340, w: 80, h: 260 },
    { x: 1130, top: 240, w: 110, h: 360 },
  ];

  // Generate window positions for each building
  type Window = { x: number; y: number; key: string; lit: boolean; flicker: boolean };
  const windows: Window[] = [];
  buildings.forEach((b, bi) => {
    const cols = Math.floor(b.w / 18);
    const rows = Math.floor(b.h / 22);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const seed = bi * 1000 + r * 100 + c;
        const lit = (seed * 9301 + 49297) % 233280 / 233280 > 0.55;
        const flicker = lit && (seed * 7919) % 5 === 0;
        windows.push({
          x: b.x + 4 + c * 18,
          y: b.top + 8 + r * 22,
          key: `${bi}-${r}-${c}`,
          lit,
          flicker,
        });
      }
    }
  });

  return (
    <div className="absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes window-flicker {
          0%, 92%, 100% { opacity: 0.85; }
          93%, 96% { opacity: 0.15; }
          97% { opacity: 1; }
        }
        @keyframes window-glow-burst {
          0%, 100% { fill: ${RED}AA; filter: drop-shadow(0 0 1px ${RED}); }
          50% { fill: ${RED_LIGHT}; filter: drop-shadow(0 0 6px ${RED_LIGHT}); }
        }
        .skyline-bg-glow {
          background: radial-gradient(ellipse 80% 50% at 50% 100%, ${RED}15 0%, transparent 70%);
        }
      `}</style>

      {/* Atmospheric glow at the base of the skyline */}
      <div className="skyline-bg-glow absolute inset-x-0 bottom-0 h-2/3" />

      <svg viewBox="0 0 1280 720" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
        {/* Distant building haze (fainter back layer) */}
        {buildings.map((b, i) => (
          <rect
            key={`back-${i}`}
            x={b.x - 10}
            y={b.top + 30}
            width={b.w + 20}
            height={b.h - 30}
            fill={`${RED}05`}
            stroke={`${RED}30`}
            strokeWidth="0.5"
          />
        ))}

        {/* Front buildings */}
        {buildings.map((b, i) => (
          <rect
            key={`front-${i}`}
            x={b.x}
            y={b.top}
            width={b.w}
            height={b.h}
            fill={BG}
            stroke={RED}
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />
        ))}

        {/* Windows */}
        {windows.map((w, i) => (
          <rect
            key={w.key}
            x={w.x}
            y={w.y}
            width="10"
            height="14"
            rx="1"
            fill={w.lit ? `${RED}99` : "#1A1418"}
            style={
              w.flicker
                ? {
                    animation: `window-glow-burst ${4 + (i % 5)}s ease-in-out infinite`,
                    animationDelay: `${(i * 0.13) % 6}s`,
                  }
                : w.lit
                ? {
                    animation: `window-flicker ${8 + (i % 7)}s ease-in-out infinite`,
                    animationDelay: `${(i * 0.07) % 8}s`,
                  }
                : undefined
            }
          />
        ))}

        {/* Antenna / roof spikes */}
        {buildings.map((b, i) => (
          i % 3 === 0 && (
            <g key={`ant-${i}`}>
              <line x1={b.x + b.w / 2} y1={b.top} x2={b.x + b.w / 2} y2={b.top - 30} stroke={RED} strokeWidth="1" strokeOpacity="0.7" />
              <circle cx={b.x + b.w / 2} cy={b.top - 32} r="2" fill={RED_LIGHT}>
                <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          )
        ))}

        {/* Ground line */}
        <line x1="0" y1="600" x2="1280" y2="600" stroke={RED} strokeWidth="0.8" strokeOpacity="0.4" />
      </svg>

      {/* Top vignette to fade skyline into the title area */}
      <div className="absolute inset-x-0 top-0 h-1/2" style={{ background: `linear-gradient(to bottom, ${BG} 0%, ${BG}DD 30%, transparent 100%)` }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// B — BUILDING: 3D isometric building drawing itself in wireframe, looping
// ─────────────────────────────────────────────────────────────────────────────
export function BuildingAnim() {
  // Build a 6-story isometric building. Each floor reveals via stroke-dashoffset.
  const FLOORS = 6;
  const FLOOR_H = 50;
  const W = 220;
  const D = 100;

  const floors: { y: number; delay: number }[] = [];
  for (let i = 0; i < FLOORS; i++) {
    floors.push({ y: 480 - i * FLOOR_H, delay: i * 0.5 });
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes draw-line {
          0% { stroke-dashoffset: var(--len); opacity: 0.2; }
          5% { opacity: 1; }
          70% { stroke-dashoffset: 0; opacity: 1; }
          90% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0.1; }
        }
        @keyframes window-pop-in {
          0%, 60% { opacity: 0; transform: scale(0.5); }
          70% { opacity: 1; transform: scale(1.2); }
          80% { transform: scale(1); }
          90% { opacity: 1; }
          100% { opacity: 0.1; }
        }
        @keyframes building-loop { 0%, 100% { opacity: 1; } } /* placeholder for layout */
        .floor-line { stroke-dasharray: var(--len); animation: draw-line 8s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        .floor-window { transform-origin: center; transform-box: fill-box; animation: window-pop-in 8s ease-in-out infinite; }
      `}</style>

      {/* Atmospheric glow */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${RED}10 0%, transparent 70%)` }} />

      <svg viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <g transform="translate(640, 80)">

          {/* Ground perspective grid */}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <line key={`gx-${i}`} x1={-300 + i * 100} y1="540" x2={-150 + i * 100} y2="600" stroke={RED} strokeWidth="0.6" strokeOpacity="0.15" />
          ))}
          {[0, 1, 2].map((i) => (
            <line key={`gy-${i}`} x1={-300} y1={540 + i * 30} x2={400} y2={540 + i * 30} stroke={RED} strokeWidth="0.6" strokeOpacity="0.15" />
          ))}

          {/* Building floors — drawn from bottom up */}
          {floors.map((f, fi) => {
            const animDelay = `${f.delay}s`;
            return (
              <g key={fi} style={{ animationDelay: animDelay }}>
                {/* Front face */}
                <path
                  d={`M ${-W/2} ${f.y} L ${W/2} ${f.y} L ${W/2} ${f.y + FLOOR_H} L ${-W/2} ${f.y + FLOOR_H} Z`}
                  fill={`${BG}CC`}
                  stroke={RED}
                  strokeWidth="1.5"
                  strokeOpacity="0.8"
                  className="floor-line"
                  style={{ ["--len" as string]: 540, animationDelay: animDelay } as React.CSSProperties}
                />
                {/* Top face (isometric) */}
                {fi === FLOORS - 1 && (
                  <path
                    d={`M ${-W/2} ${f.y} L ${-W/2 + D/2} ${f.y - D/2} L ${W/2 + D/2} ${f.y - D/2} L ${W/2} ${f.y} Z`}
                    fill={`${RED}10`}
                    stroke={RED}
                    strokeWidth="1.5"
                    strokeOpacity="0.8"
                    className="floor-line"
                    style={{ ["--len" as string]: 700, animationDelay: `${f.delay + 0.2}s` } as React.CSSProperties}
                  />
                )}
                {/* Right side face */}
                <path
                  d={`M ${W/2} ${f.y} L ${W/2 + D/2} ${f.y - D/2} L ${W/2 + D/2} ${f.y - D/2 + FLOOR_H} L ${W/2} ${f.y + FLOOR_H} Z`}
                  fill={`${RED}08`}
                  stroke={RED}
                  strokeWidth="1.2"
                  strokeOpacity="0.6"
                  className="floor-line"
                  style={{ ["--len" as string]: 350, animationDelay: animDelay } as React.CSSProperties}
                />

                {/* Windows on this floor */}
                {[0, 1, 2, 3].map((wi) => {
                  const wx = -W/2 + 25 + wi * 45;
                  const wy = f.y + 14;
                  return (
                    <rect
                      key={wi}
                      x={wx}
                      y={wy}
                      width="28"
                      height="22"
                      fill={(fi + wi) % 3 === 0 ? `${RED}99` : `${BG}`}
                      stroke={RED}
                      strokeWidth="0.8"
                      strokeOpacity="0.6"
                      className="floor-window"
                      style={{ animationDelay: `${f.delay + 0.5 + wi * 0.08}s` }}
                    />
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Top + bottom vignettes */}
      <div className="absolute inset-x-0 top-0 h-1/3" style={{ background: `linear-gradient(to bottom, ${BG}EE, transparent)` }} />
      <div className="absolute inset-x-0 bottom-0 h-1/4" style={{ background: `linear-gradient(to top, ${BG}EE, transparent)` }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// C — FLOOR PLAN: top-down floor plan, units fill in red one-by-one (lease-up)
// ─────────────────────────────────────────────────────────────────────────────
export function FloorPlanAnim() {
  // 6×4 grid of units. Each unit fills with red on a staggered delay.
  const COLS = 6;
  const ROWS = 4;
  const units: { x: number; y: number; w: number; h: number; delay: number }[] = [];
  const cellW = 140;
  const cellH = 120;
  const startX = (1280 - COLS * cellW) / 2;
  const startY = (720 - ROWS * cellH) / 2;
  let order = 0;

  // Random-ish fill order (zigzag through grid for a natural lease-up rhythm)
  const fillOrder: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    const cols = r % 2 === 0 ? Array.from({length: COLS}, (_, i) => i) : Array.from({length: COLS}, (_, i) => COLS - 1 - i);
    for (const c of cols) {
      fillOrder.push(r * COLS + c);
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      const fillPosition = fillOrder.indexOf(idx);
      units.push({
        x: startX + c * cellW,
        y: startY + r * cellH,
        w: cellW,
        h: cellH,
        delay: fillPosition * 0.4,
      });
      order++;
    }
  }

  const TOTAL_DURATION = COLS * ROWS * 0.4 + 4; // total cycle in seconds

  return (
    <div className="absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes unit-fill {
          0% { fill: ${BG}; opacity: 0.3; }
          5% { opacity: 1; }
          15%, 85% { fill: ${RED}DD; opacity: 1; }
          95%, 100% { fill: ${BG}; opacity: 0.3; }
        }
        @keyframes unit-pulse {
          0%, 100% { stroke-opacity: 0.4; }
          50% { stroke-opacity: 0.8; }
        }
        @keyframes label-fade {
          0%, 5% { opacity: 0; }
          10%, 85% { opacity: 1; }
          95%, 100% { opacity: 0; }
        }
        .unit-rect { animation: unit-fill ${TOTAL_DURATION}s ease-in-out infinite; }
        .unit-stroke { animation: unit-pulse 4s ease-in-out infinite; }
        .unit-label { animation: label-fade ${TOTAL_DURATION}s ease-in-out infinite; }
      `}</style>

      {/* Subtle grid background */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `linear-gradient(${RED}15 1px, transparent 1px), linear-gradient(90deg, ${RED}15 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Atmospheric glow */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${RED}10 0%, transparent 70%)` }} />

      <svg viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        {/* Outer building outline */}
        <rect
          x={startX - 12}
          y={startY - 12}
          width={COLS * cellW + 24}
          height={ROWS * cellH + 24}
          fill="none"
          stroke={RED}
          strokeWidth="2.5"
          strokeOpacity="0.7"
          rx="4"
        />

        {/* Hallway down the middle */}
        <line
          x1={startX}
          y1={startY + (ROWS * cellH) / 2}
          x2={startX + COLS * cellW}
          y2={startY + (ROWS * cellH) / 2}
          stroke={RED}
          strokeWidth="1"
          strokeOpacity="0.3"
          strokeDasharray="4 4"
        />

        {/* Units */}
        {units.map((u, i) => (
          <g key={i}>
            <rect
              x={u.x}
              y={u.y}
              width={u.w}
              height={u.h}
              fill={BG}
              stroke={RED}
              strokeWidth="1"
              strokeOpacity="0.5"
              className="unit-rect unit-stroke"
              style={{ animationDelay: `${u.delay}s, ${u.delay}s` }}
            />
            <text
              x={u.x + u.w / 2}
              y={u.y + u.h / 2 + 4}
              textAnchor="middle"
              fontSize="11"
              fill="#FFFFFF"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="700"
              opacity="0"
              className="unit-label"
              style={{ animationDelay: `${u.delay + 0.3}s` }}
            >
              LEASED
            </text>
            <text
              x={u.x + 8}
              y={u.y + 16}
              fontSize="9"
              fill={RED_LIGHT}
              fontFamily="JetBrains Mono, monospace"
              opacity="0.7"
            >
              {String.fromCharCode(65 + Math.floor(i / COLS))}{(i % COLS) + 1}
            </text>
          </g>
        ))}
      </svg>

      {/* Top + bottom vignettes */}
      <div className="absolute inset-x-0 top-0 h-1/3" style={{ background: `linear-gradient(to bottom, ${BG}EE, transparent)` }} />
      <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: `linear-gradient(to top, ${BG}EE, transparent)` }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// D — PIPELINE: particles flowing from sources → AI hub → leased buildings
// ─────────────────────────────────────────────────────────────────────────────
export function PipelineAnim() {
  // Centered composition — sources spread vertically on the left, AI hub at exact center, buildings vertically distributed on the right.
  // Tuned to read well as a focal element below the hero title (not as a behind-text background).
  const sources = [
    { x: 100, y: 160, label: "Zillow" },
    { x: 100, y: 290, label: "Apts.com" },
    { x: 100, y: 430, label: "AppFolio" },
    { x: 100, y: 560, label: "Facebook" },
  ];
  const hubX = 640, hubY = 360;
  const buildings = [
    { x: 1100, y: 200 },
    { x: 1100, y: 360 },
    { x: 1100, y: 520 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes hub-pulse { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.06); opacity: 1; } }
        .hub-pulse { animation: hub-pulse 3s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        @keyframes flow-particle {
          0% { offset-distance: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        @keyframes building-light { 0%, 100% { fill: ${RED}40; } 50% { fill: ${RED_LIGHT}; } }
        .building-window { animation: building-light 4s ease-in-out infinite; }
      `}</style>

      {/* Atmospheric glow — centered behind the AI hub */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 45% 50% at 50% 50%, ${RED}25 0%, transparent 70%)` }} />

      <svg viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          {sources.map((s, i) => (
            <path key={`p-in-${i}`} id={`path-in-${i}`} d={`M ${s.x + 60} ${s.y} Q ${(s.x + hubX) / 2} ${(s.y + hubY) / 2} ${hubX - 50} ${hubY}`} />
          ))}
          {buildings.map((b, i) => (
            <path key={`p-out-${i}`} id={`path-out-${i}`} d={`M ${hubX + 50} ${hubY} Q ${(hubX + b.x) / 2} ${(hubY + b.y) / 2} ${b.x - 30} ${b.y}`} />
          ))}
        </defs>

        {/* Source labels */}
        {sources.map((s, i) => (
          <g key={`src-${i}`}>
            <rect x={s.x - 15} y={s.y - 18} width={75} height={36} rx="6" fill={`${BG}DD`} stroke={RED} strokeWidth="1" strokeOpacity="0.6" />
            <text x={s.x + 22} y={s.y + 5} textAnchor="middle" fontSize="11" fill={RED_LIGHT} fontFamily="Inter, sans-serif" fontWeight="600">{s.label}</text>
            <use href={`#path-in-${i}`} fill="none" stroke={RED} strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3 5" />
          </g>
        ))}

        {/* AI Hub (sphere/orb) */}
        <g className="hub-pulse">
          <circle cx={hubX} cy={hubY} r="50" fill={`${RED}25`} stroke={RED} strokeWidth="1.5" />
          <circle cx={hubX} cy={hubY} r="35" fill="none" stroke={RED_LIGHT} strokeWidth="1" strokeOpacity="0.8" />
          <circle cx={hubX} cy={hubY} r="20" fill={`${RED}80`} />
          <text x={hubX} y={hubY + 4} textAnchor="middle" fontSize="11" fill="#FFFFFF" fontFamily="JetBrains Mono, monospace" fontWeight="700">AI</text>
        </g>

        {/* Outgoing paths */}
        {buildings.map((b, i) => (
          <use key={`use-${i}`} href={`#path-out-${i}`} fill="none" stroke={RED} strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3 5" />
        ))}

        {/* Flowing particles inbound */}
        {sources.map((s, i) =>
          [0, 1, 2].map((p) => (
            <circle key={`in-p-${i}-${p}`} r="3" fill={RED_LIGHT} style={{ filter: `drop-shadow(0 0 4px ${RED_LIGHT})`, offsetPath: `path('M ${s.x + 60} ${s.y} Q ${(s.x + hubX) / 2} ${(s.y + hubY) / 2} ${hubX - 50} ${hubY}')`, animation: `flow-particle ${3 + (i + p) * 0.5}s linear infinite`, animationDelay: `${p * 0.8 + i * 0.2}s` } as React.CSSProperties} />
          ))
        )}

        {/* Flowing particles outbound */}
        {buildings.map((b, i) =>
          [0, 1].map((p) => (
            <circle key={`out-p-${i}-${p}`} r="3" fill={RED_LIGHT} style={{ filter: `drop-shadow(0 0 4px ${RED_LIGHT})`, offsetPath: `path('M ${hubX + 50} ${hubY} Q ${(hubX + b.x) / 2} ${(hubY + b.y) / 2} ${b.x - 30} ${b.y}')`, animation: `flow-particle ${3 + p * 0.7}s linear infinite`, animationDelay: `${p * 1.2 + i * 0.4 + 1.5}s` } as React.CSSProperties} />
          ))
        )}

        {/* Destination buildings */}
        {buildings.map((b, i) => (
          <g key={`b-${i}`}>
            <rect x={b.x - 25} y={b.y - 35} width={50} height={70} fill={`${BG}DD`} stroke={RED} strokeWidth="1.2" rx="2" />
            {[0, 1, 2].map((row) => [0, 1].map((col) => (
              <rect key={`${row}-${col}`} x={b.x - 18 + col * 18} y={b.y - 28 + row * 16} width="10" height="10" rx="1" className="building-window" style={{ animationDelay: `${(i + row + col) * 0.3}s` }} />
            )))}
          </g>
        ))}
      </svg>

      {/* Soft edge fades — keeps the animation visually contained without a hard frame */}
      <div className="absolute inset-x-0 top-0 h-16" style={{ background: `linear-gradient(to bottom, ${BG}DD, transparent)` }} />
      <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: `linear-gradient(to top, ${BG}DD, transparent)` }} />
      <div className="absolute inset-y-0 left-0 w-12" style={{ background: `linear-gradient(to right, ${BG}AA, transparent)` }} />
      <div className="absolute inset-y-0 right-0 w-12" style={{ background: `linear-gradient(to left, ${BG}AA, transparent)` }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// E — FACADE: dense grid of small lit windows pulsing at staggered intervals
// ─────────────────────────────────────────────────────────────────────────────
export function FacadeAnim() {
  const COLS = 40;
  const ROWS = 18;
  const cells: { x: number; y: number; lit: boolean; delay: number; bright: boolean }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const seed = r * COLS + c;
      const hash = (seed * 9301 + 49297) % 233280;
      const lit = hash / 233280 > 0.45;
      const bright = lit && hash % 13 === 0;
      cells.push({
        x: c,
        y: r,
        lit,
        bright,
        delay: (seed * 0.13) % 10,
      });
    }
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes facade-flicker {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes facade-burst {
          0%, 90%, 100% { background-color: ${RED}30; box-shadow: none; }
          93%, 96% { background-color: ${RED_LIGHT}; box-shadow: 0 0 12px ${RED_LIGHT}, 0 0 4px ${RED_LIGHT}; }
        }
        .facade-cell { transition: background-color 200ms; }
        .facade-lit { animation: facade-flicker 6s ease-in-out infinite; }
        .facade-bright { animation: facade-burst 8s ease-in-out infinite; }
      `}</style>

      {/* Dim red atmospheric base */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 50%, ${RED}08 0%, transparent 70%)` }} />

      {/* Facade grid */}
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          gap: "6px",
          padding: "20px",
        }}
      >
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`facade-cell rounded-[1px] ${cell.bright ? "facade-bright" : cell.lit ? "facade-lit" : ""}`}
            style={{
              background: cell.lit ? `${RED}30` : "#11090A",
              animationDelay: `${cell.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Top + bottom vignettes (heavier so title sits cleanly) */}
      <div className="absolute inset-x-0 top-0 h-1/2" style={{ background: `linear-gradient(to bottom, ${BG}, ${BG}AA 40%, transparent 100%)` }} />
      <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: `linear-gradient(to top, ${BG}EE, transparent)` }} />
      <div className="absolute inset-y-0 left-0 w-1/4" style={{ background: `linear-gradient(to right, ${BG}AA, transparent)` }} />
      <div className="absolute inset-y-0 right-0 w-1/4" style={{ background: `linear-gradient(to left, ${BG}AA, transparent)` }} />
    </div>
  );
}
