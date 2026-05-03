import { HeroShell } from "../_lib/HeroShell";
import { FloorPlanAnim } from "../_lib/animations";

export const metadata = { title: "Hero C — Floor plan" };

export default function FloorPlanHero() {
  return <HeroShell label="C · Floor plan" background={<FloorPlanAnim />} />;
}
