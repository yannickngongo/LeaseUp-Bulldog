// Pipeline animation — sources flowing through AI hub into building grid.
// Used in the live landing hero. Tuned to read well as a focal element below the hero title.
// Pure CSS/SVG, no JS deps.

const RED = "#C8102E";
const RED_LIGHT = "#F87171";
const BG = "#08080F";

export function PipelineAnim() {
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

      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 45% 50% at 50% 50%, ${RED}25 0%, transparent 70%)` }} />

      <svg viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        <defs>
          {sources.map((s, i) => (
            <path key={`p-in-${i}`} id={`path-in-${i}`} d={`M ${s.x + 60} ${s.y} Q ${(s.x + hubX) / 2} ${(s.y + hubY) / 2} ${hubX - 50} ${hubY}`} />
          ))}
          {buildings.map((b, i) => (
            <path key={`p-out-${i}`} id={`path-out-${i}`} d={`M ${hubX + 50} ${hubY} Q ${(hubX + b.x) / 2} ${(hubY + b.y) / 2} ${b.x - 30} ${b.y}`} />
          ))}
        </defs>

        {sources.map((s, i) => (
          <g key={`src-${i}`}>
            <rect x={s.x - 15} y={s.y - 18} width={75} height={36} rx="6" fill={`${BG}DD`} stroke={RED} strokeWidth="1" strokeOpacity="0.6" />
            <text x={s.x + 22} y={s.y + 5} textAnchor="middle" fontSize="11" fill={RED_LIGHT} fontFamily="Inter, sans-serif" fontWeight="600">{s.label}</text>
            <use href={`#path-in-${i}`} fill="none" stroke={RED} strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3 5" />
          </g>
        ))}

        <g className="hub-pulse">
          <circle cx={hubX} cy={hubY} r="50" fill={`${RED}25`} stroke={RED} strokeWidth="1.5" />
          <circle cx={hubX} cy={hubY} r="35" fill="none" stroke={RED_LIGHT} strokeWidth="1" strokeOpacity="0.8" />
          <circle cx={hubX} cy={hubY} r="20" fill={`${RED}80`} />
          <text x={hubX} y={hubY + 4} textAnchor="middle" fontSize="11" fill="#FFFFFF" fontFamily="JetBrains Mono, monospace" fontWeight="700">AI</text>
        </g>

        {buildings.map((b, i) => (
          <use key={`use-${i}`} href={`#path-out-${i}`} fill="none" stroke={RED} strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3 5" />
        ))}

        {sources.map((s, i) =>
          [0, 1, 2].map((p) => (
            <circle key={`in-p-${i}-${p}`} r="3" fill={RED_LIGHT} style={{ filter: `drop-shadow(0 0 4px ${RED_LIGHT})`, offsetPath: `path('M ${s.x + 60} ${s.y} Q ${(s.x + hubX) / 2} ${(s.y + hubY) / 2} ${hubX - 50} ${hubY}')`, animation: `flow-particle ${3 + (i + p) * 0.5}s linear infinite`, animationDelay: `${p * 0.8 + i * 0.2}s` } as React.CSSProperties} />
          ))
        )}

        {buildings.map((b, i) =>
          [0, 1].map((p) => (
            <circle key={`out-p-${i}-${p}`} r="3" fill={RED_LIGHT} style={{ filter: `drop-shadow(0 0 4px ${RED_LIGHT})`, offsetPath: `path('M ${hubX + 50} ${hubY} Q ${(hubX + b.x) / 2} ${(hubY + b.y) / 2} ${b.x - 30} ${b.y}')`, animation: `flow-particle ${3 + p * 0.7}s linear infinite`, animationDelay: `${p * 1.2 + i * 0.4 + 1.5}s` } as React.CSSProperties} />
          ))
        )}

        {buildings.map((b, i) => (
          <g key={`b-${i}`}>
            <rect x={b.x - 25} y={b.y - 35} width={50} height={70} fill={`${BG}DD`} stroke={RED} strokeWidth="1.2" rx="2" />
            {[0, 1, 2].map((row) => [0, 1].map((col) => (
              <rect key={`${row}-${col}`} x={b.x - 18 + col * 18} y={b.y - 28 + row * 16} width="10" height="10" rx="1" className="building-window" style={{ animationDelay: `${(i + row + col) * 0.3}s` }} />
            )))}
          </g>
        ))}
      </svg>

      <div className="absolute inset-x-0 top-0 h-16" style={{ background: `linear-gradient(to bottom, ${BG}DD, transparent)` }} />
      <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: `linear-gradient(to top, ${BG}DD, transparent)` }} />
      <div className="absolute inset-y-0 left-0 w-12" style={{ background: `linear-gradient(to right, ${BG}AA, transparent)` }} />
      <div className="absolute inset-y-0 right-0 w-12" style={{ background: `linear-gradient(to left, ${BG}AA, transparent)` }} />
    </div>
  );
}
