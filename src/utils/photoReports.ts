import type { PhotoReport } from "../types";

export interface NewPhotoReportInput {
  employeeId: string;
  employeeName: string;
  workId: string;
  workTitle: string;
  objectName: string;
  sectionName: string;
  images: string[];
  comment: string;
}

/** Single builder for a freshly-submitted PhotoReport, shared by the worker's quick-attach modal
 * (Dashboard/Tasks/Notifications quick actions) and the dedicated upload card on the Фотоотчёт
 * page — every new report starts real-life-accurate as "pending" (awaiting prorab review), never
 * pre-approved. */
export function buildPhotoReport(input: NewPhotoReportInput): PhotoReport {
  return {
    id: `photo-${Date.now()}`,
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    workId: input.workId,
    workTitle: input.workTitle,
    objectName: input.objectName,
    sectionName: input.sectionName,
    images: input.images,
    comment: input.comment,
    status: "pending",
    reviewerComment: null,
    createdDate: new Date().toISOString(),
  };
}
