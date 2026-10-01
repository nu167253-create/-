export interface PrivacyPolicyConsent {
  hasAccepted: boolean;
  acceptedAt: string | null;
  policyVersion: string;
  cctvPolicyAcknowledged: boolean;
  pdpaAcknowledged: boolean;
  termsOfServiceAcknowledged: boolean;
  userAgent?: string;
}

export const CURRENT_POLICY_VERSION = '2026.1';
const STORAGE_KEY = 'cctv_privacy_policy_consent_v1';

export function getPrivacyPolicyConsent(): PrivacyPolicyConsent {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        hasAccepted: !!parsed.hasAccepted,
        acceptedAt: parsed.acceptedAt || null,
        policyVersion: parsed.policyVersion || CURRENT_POLICY_VERSION,
        cctvPolicyAcknowledged: !!parsed.cctvPolicyAcknowledged,
        pdpaAcknowledged: !!parsed.pdpaAcknowledged,
        termsOfServiceAcknowledged: !!parsed.termsOfServiceAcknowledged,
        userAgent: parsed.userAgent
      };
    }
  } catch (e) {
    console.error('Failed to read privacy consent from localStorage:', e);
  }

  return {
    hasAccepted: false,
    acceptedAt: null,
    policyVersion: CURRENT_POLICY_VERSION,
    cctvPolicyAcknowledged: false,
    pdpaAcknowledged: false,
    termsOfServiceAcknowledged: false
  };
}

export function savePrivacyPolicyConsent(update: Partial<PrivacyPolicyConsent>): PrivacyPolicyConsent {
  const current = getPrivacyPolicyConsent();
  const updated: PrivacyPolicyConsent = {
    ...current,
    ...update,
    hasAccepted: update.hasAccepted ?? true,
    acceptedAt: update.acceptedAt ?? new Date().toISOString(),
    policyVersion: CURRENT_POLICY_VERSION,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save privacy consent to localStorage:', e);
  }

  return updated;
}

export function hasUserAcceptedPrivacyPolicy(): boolean {
  const consent = getPrivacyPolicyConsent();
  return consent.hasAccepted;
}

export function resetPrivacyPolicyConsent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to reset privacy consent:', e);
  }
}
