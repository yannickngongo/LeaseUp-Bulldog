import { HeroShell } from "../_lib/HeroShell";
import { BuildingAnim } from "../_lib/animations";

export const metadata = { title: "Hero B — Building" };

export default function BuildingHero() {
  return <HeroShell label="B · Building" background={<BuildingAnim />} />;
}
