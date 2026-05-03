import { HeroShell } from "../_lib/HeroShell";
import { FacadeAnim } from "../_lib/animations";

export const metadata = { title: "Hero E — Facade" };

export default function FacadeHero() {
  return <HeroShell label="E · Facade" background={<FacadeAnim />} />;
}
