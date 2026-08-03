import { request, type PagedResult } from './apiClient';

export type IssueReportStatus = 'Open' | 'Resolved';

export interface IssueReport {
  id: string;
  objectId: string;
  individualTaskId: string | null;
  reportedByUserId: string;
  title: string;
  description: string;
  photoUrl: string | null;
  status: IssueReportStatus;
  reportedAt: string;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
}

export interface CreateIssueReportInput {
  objectId: string;
  title: string;
  description: string;
  individualTaskId?: string;
  photo?: File;
}

/** Brigadir/Worker create; Owner/Prorab/Brigadir/Worker read (own-scoped for Brigadir/Worker, object-scoped for Prorab+). Multipart — optional single photo. */
export function createIssueReport(input: CreateIssueReportInput): Promise<IssueReport> {
  const formData = new FormData();
  formData.append('objectId', input.objectId);
  formData.append('title', input.title);
  formData.append('description', input.description);
  if (input.individualTaskId) formData.append('individualTaskId', input.individualTaskId);
  if (input.photo) formData.append('photo', input.photo);
  return request<IssueReport>('/api/v1/issue-reports', { method: 'POST', body: formData });
}

export function listIssueReports(page: number, pageSize: number): Promise<PagedResult<IssueReport>> {
  return request<PagedResult<IssueReport>>(`/api/v1/issue-reports?page=${page}&pageSize=${pageSize}`);
}

/** Owner/Prorab only. */
export function resolveIssueReport(issueReportId: string): Promise<IssueReport> {
  return request<IssueReport>(`/api/v1/issue-reports/${issueReportId}/resolve`, { method: 'POST' });
}
