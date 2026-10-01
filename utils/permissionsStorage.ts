import { ApplicantRolePermission, ApplicantRoleId } from '../types/permissions';
import { DEFAULT_APPLICANT_PERMISSIONS } from '../data/applicantPermissions';
import { RequestCategory } from '../types/request';

const PERMISSIONS_STORAGE_KEY = 'e_service_applicant_permissions_v1';
const CURRENT_ROLE_STORAGE_KEY = 'e_service_active_applicant_role_v1';

export function getStoredApplicantPermissions(): ApplicantRolePermission[] {
  try {
    const data = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (!data) {
      saveApplicantPermissions(DEFAULT_APPLICANT_PERMISSIONS);
      return DEFAULT_APPLICANT_PERMISSIONS;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to parse applicant permissions:', err);
    return DEFAULT_APPLICANT_PERMISSIONS;
  }
}

export function saveApplicantPermissions(permissions: ApplicantRolePermission[]): void {
  try {
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(permissions));
  } catch (err) {
    console.error('Failed to save applicant permissions:', err);
  }
}

export function resetApplicantPermissionsToDefault(): ApplicantRolePermission[] {
  saveApplicantPermissions(DEFAULT_APPLICANT_PERMISSIONS);
  return DEFAULT_APPLICANT_PERMISSIONS;
}

export function getPermissionForRole(roleId: ApplicantRoleId): ApplicantRolePermission {
  const all = getStoredApplicantPermissions();
  const match = all.find(p => p.roleId === roleId);
  if (match) return match;

  // Fallback to default
  const defaultMatch = DEFAULT_APPLICANT_PERMISSIONS.find(p => p.roleId === roleId);
  return defaultMatch || DEFAULT_APPLICANT_PERMISSIONS[0];
}

export function isCategoryAllowedForRole(roleId: ApplicantRoleId, category: RequestCategory): boolean {
  const perm = getPermissionForRole(roleId);
  return perm.allowedCategories.includes(category);
}

export function getActiveApplicantRole(): ApplicantRoleId {
  try {
    const role = localStorage.getItem(CURRENT_ROLE_STORAGE_KEY) as ApplicantRoleId;
    if (role && ['general_public', 'student', 'staff', 'external_org'].includes(role)) {
      return role;
    }
  } catch (e) {
    // Ignore error
  }
  return 'general_public';
}

export function setActiveApplicantRole(role: ApplicantRoleId): void {
  try {
    localStorage.setItem(CURRENT_ROLE_STORAGE_KEY, role);
  } catch (e) {
    console.error('Failed to set active applicant role', e);
  }
}

export type OfficerRole = 'admin' | 'officer';
const OFFICER_ROLE_STORAGE_KEY = 'e_service_active_officer_role_v1';

export function getStoredOfficerRole(): OfficerRole {
  try {
    const role = localStorage.getItem(OFFICER_ROLE_STORAGE_KEY) as OfficerRole;
    if (role === 'admin' || role === 'officer') {
      return role;
    }
  } catch (e) {
    // Ignore error
  }
  return 'admin';
}

export function setStoredOfficerRole(role: OfficerRole): void {
  try {
    localStorage.setItem(OFFICER_ROLE_STORAGE_KEY, role);
  } catch (e) {
    console.error('Failed to set officer role', e);
  }
}

export function verifyAdminPasscode(passcode: string): boolean {
  const normalized = passcode.trim();
  return normalized === '1234' || normalized === 'admin' || normalized === 'admin1234' || normalized === 'admin888';
}

