// packages/domain/src/moments/together.ts
// Sorting and prioritization for Our World together plans (P-21, P-72).

export interface PlanWhen {
  kind: "someday" | "soon" | "season" | "date";
  detail?: string;
}

/**
 * Returns a numerical sort weight for plan timelines:
 * soon -> date -> season -> someday
 */
export function whenPriorityWeight(when: PlanWhen): number {
  switch (when.kind) {
    case "soon":
      return 1;
    case "date":
      return 2;
    case "season":
      return 3;
    case "someday":
      return 4;
  }
}
