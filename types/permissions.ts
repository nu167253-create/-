import { RequestCategory, PriorityLevel } from './request';

export type ApplicantRoleId = 'general_public' | 'student' | 'staff' | 'external_org';

export interface ApplicantRolePermission {
  roleId: ApplicantRoleId;
  roleTitleTh: string;
  roleTitleEn: string;
  description: string;
  badgeColor: string; // Tailwind color class for badge
  allowedCategories: RequestCategory[];
  maxPriorityLevel: PriorityLevel;
  maxFileUploadSizeMB: number;
  maxAttachmentsCount: number;
  requireDigitalSignature: boolean;
  allowSelfCancellation: boolean;
  canAccessCctvRepair: boolean;
  canAccessBudgetForms: boolean;
  allowDraftSaving: boolean;
  updatedAt?: string;
}

export interface PermissionCheckResult {
  isAllowed: boolean;
  reason?: string;
}
