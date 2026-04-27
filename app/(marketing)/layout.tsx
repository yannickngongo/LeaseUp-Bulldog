import { ParticleNetwork } from "@/components/ParticleNetwork";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#08080F]">
      {/* Aurora layers */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="lub-aurora lub-aurora-a" />
        <div className="lub-aurora lub-aurora-b" />
        <div className="lub-aurora lub-aurora-c" />
        <div className="lub-aurora lub-aurora-d" />
        <ParticleNetwork />
      </div>

      {/* Page content sits above the background */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
