import { niches } from "./niches";

// Shared by the homepage and intake: a displayed animation is never a selection.
export const intakeBranches = [
  ...new Set([...niches.map((niche) => niche.name), "Architecten", "Coaching"]),
].sort((a, b) => a.localeCompare(b, "nl"));

export function validIntakeBranch(value: string | null): string | undefined {
  return value && intakeBranches.includes(value) ? value : undefined;
}
