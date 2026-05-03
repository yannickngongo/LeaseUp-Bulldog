import { HeroShell } from "../_lib/HeroShell";
import { PipelineAnim } from "../_lib/animations";

export const metadata = { title: "Hero D — Pipeline" };

export default function PipelineHero() {
  return <HeroShell label="D · Pipeline" background={<PipelineAnim />} />;
}
