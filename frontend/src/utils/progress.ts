import type { ObjectStatus } from "../types";

export function getProgressTone(status: ObjectStatus, progress: number): "green" | "red" | "orange" {
  if (status === "at_risk") {
    return progress < 20 ? "red" : "orange";
  }
  return "green";
}
