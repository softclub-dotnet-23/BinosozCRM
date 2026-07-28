import type { WorkerMessage } from "../types";

/** Empty by design — messages to the Прораб are entirely worker-generated (see the "Написать
 * прорабу" quick action), there is no realistic "seed" conversation to fabricate. */
export const mockWorkerMessages: WorkerMessage[] = [];
