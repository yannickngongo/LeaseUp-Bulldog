// Subtle ambient page background — same vocabulary as the landing's pipeline animation.
// Drop-in for any marketing page section that needs to feel "alive" without dominating the foreground.
// Renders: faint red grid + radial glow + drifting particles. Pure CSS, no JS.

const RED = "#C8102E";

type Variant = "hero" | "section";

export function PageBackground({ variant = "hero" }: { variant?: Variant }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">

      {/* Soft red glow — top for hero variant, center for section variant */}
      <div
        className="absolute h-[420px] w-[900px] rounded-full"
        style={{
          left: "50%",
          top: variant === "hero" ? "0" : "50%",
          transform: variant === "hero" ? "translate(-50%, -40%)" : "translate(-50%, -50%)",
          background: `radial-gradient(ellipse, ${RED}18 0%, transparent 70%)`,
          filter: "blur(80px)",
        }}
      />

      {/* Faint grid texture (8% red, masked to fade at edges) */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `linear-gradient(${RED}10 1px, transparent 1px), linear-gradient(90deg, ${RED}10 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          maskImage: `radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)`,
          WebkitMaskImage: `radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)`,
        }}
      />

      {/* Drifting particles — only on hero variant */}
      {variant === "hero" && (
        <>
          <style>{`
            @keyframes pb-float-up {
              0%   { transform: translateY(0); opacity: 0; }
              30%  { opacity: 0.8; }
              70%  { opacity: 0.6; }
              100% { transform: translateY(-300px); opacity: 0; }
            }
          `}</style>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className="absolute bottom-0 h-1 w-1 rounded-full"
              style={{
                left: `${10 + i * 15}%`,
                background: RED,
                boxShadow: `0 0 8px ${RED}`,
                animation: `pb-float-up ${6 + (i % 3)}s ease-in-out infinite`,
                animationDelay: `${i * 0.7}s`,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
