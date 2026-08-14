import type { Organisation } from '@pinmarks/shared';

export type Plan = Organisation['plan'];

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, agency: 2 };

/** Does `plan` meet or exceed `required`? Missing/unknown plans are treated as 'free'. */
export function planAtLeast(plan: string | null | undefined, required: Plan): boolean {
  const rank = PLAN_RANK[plan as Plan] ?? PLAN_RANK.free;
  return rank >= PLAN_RANK[required];
}
