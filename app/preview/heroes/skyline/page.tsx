import { HeroShell } from "../_lib/HeroShell";
import { SkylineAnim } from "../_lib/animations";

export const metadata = { title: "Hero A — Skyline" };

export default function SkylineHero() {
  return <HeroShell label="A · Skyline" background={<SkylineAnim />} />;
}
