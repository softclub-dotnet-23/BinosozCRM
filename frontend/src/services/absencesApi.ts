import { apiClient } from "./apiClient";
import type { AbsenceType, PagedResult } from "./types";

// Application/Absences/AbsenceRecordDto.cs — documentUrl is already a ready-to-use signed URL
// (LocalFileStorageService.GetSignedUrl runs on every read), not a raw storage key. Still route
// it through resolveSignedFileUrl (filesApi.ts) before use — it's server-relative.
export interface AbsenceRecordDto {
  id: string;
  workerId: string;
  dateFrom: string;
  dateTo: string;
  type: AbsenceType;
  reason: string | null;
  isPaid: boolean;
  documentUrl: string | null;
  approvedByUserId: string | null;
}

export interface CreateAbsenceRecordRequest {
  workerId: string;
  dateFrom: string;
  dateTo: string;
  type: AbsenceType;
  isPaid: boolean;
  reason?: string | null;
  document?: File | null;
}

export interface ListParams {
  page: number;
  pageSize: number;
}

// AbsencesController — api/v1/absences. Every action (including Create) is
// Owner,Prorab,Accountant only — there is no Brigadir-reachable action on this controller at all.
export const absencesApi = {
  list: (params: ListParams) => apiClient.get<PagedResult<AbsenceRecordDto>>("/absences", { params }).then((r) => r.data),

  get: (absenceRecordId: string) => apiClient.get<AbsenceRecordDto>(`/absences/${absenceRecordId}`).then((r) => r.data),

  // Api/Contracts/Absences/CreateAbsenceRecordRequest.cs — the IFormFile property is
  // "Document" (PascalCase); ASP.NET Core model binding for multipart form fields is
  // case-insensitive, but every field is sent under its exact backend property name here for
  // clarity. Never JSON.stringify the file, never set Content-Type manually — the browser sets
  // the multipart boundary itself once FormData is the axios request body.
  create: (request: CreateAbsenceRecordRequest) => {
    const form = new FormData();
    form.append("WorkerId", request.workerId);
    form.append("DateFrom", request.dateFrom);
    form.append("DateTo", request.dateTo);
    form.append("Type", String(request.type));
    form.append("IsPaid", String(request.isPaid));
    if (request.reason) form.append("Reason", request.reason);
    if (request.document) form.append("Document", request.document);

    return apiClient.post<AbsenceRecordDto>("/absences", form).then((r) => r.data);
  },
};
