import type { ProblemReport } from "../types";

/** Empty by design — problem reports are entirely worker-generated (see WorkerProblemModal),
 * there is no realistic "seed" data for something a real person hasn't submitted yet. */
export const mockProblemReports: ProblemReport[] = [];
