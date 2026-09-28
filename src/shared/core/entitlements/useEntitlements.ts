
export const PLAN_FEATURES = {
  free: {
    unlimitedExports: false,
    candidateManagement: false,
    cloudStorageGB: 0,
    label: 'Plan Gratuito',
    badgeClass: 'bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] border-[var(--ui-border)]',
    marketingBullets: [
      'freeBrowserEditorFeature',
      'freeJsonDriveBackupFeature',
      'freeIndexedDbFeature',
      'freePdfExportFeature',
    ],
  },
  pro: {
    unlimitedExports: true,
    candidateManagement: true,
    cloudStorageGB: 0,
    label: 'Plan Pro',
    badgeClass: 'bg-[var(--color-secondary-muted)] text-[var(--color-secondary-text)] border-[var(--color-secondary-base)]/30',
    marketingBullets: [
      'agencyPdfUnlimitedFeature',
      'agencySupabaseCloudFeature',
      'agencyDriveBackupFeature',
      'agencyOneClickShareFeature',
    ],
  },
  enterprise: {
    unlimitedExports: true,
    candidateManagement: true,
    cloudStorageGB: 50,
    label: 'Enterprise',
    badgeClass: 'bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)] border-[var(--color-accent-purple)]/30',
    marketingBullets: [
      'enterpriseAllProFeature',
      'enterpriseCloudStorageFeature',
      'enterpriseCertAnnexesFeature',
      'enterpriseSpaceAlertsFeature',
    ],
  },
};

export function getPlanLabel(plan?: string | null): string {
  return PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES]?.label ?? PLAN_FEATURES.free.label;
}

export function getPlanBadgeClass(plan?: string | null): string {
  return PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES]?.badgeClass ?? PLAN_FEATURES.free.badgeClass;
}

export function isProOrEnterprise(plan?: string | null): boolean {
  return plan === 'pro' || plan === 'enterprise';
}

export function isEnterprise(plan?: string | null): boolean {
  return plan === 'enterprise';
}

export function isAdminRole(role?: string | null): boolean {
  return role === 'admin';
}

export function useEntitlements() {
  const plan = 'free';
  const features = PLAN_FEATURES.free;
  
  return {
    plan,
    loading: false,
    features,
    isPremium: false,
    inGracePeriod: false,
    graceEndsAt: null,
    aiCredits: 3,
    hasAiCredits: true,
    canEmergencyExport: false,
    unlimitedExports: features.unlimitedExports,
    candidateManagement: features.candidateManagement,
    cloudStorageGB: features.cloudStorageGB,
    refreshEntitlements: async () => {}
  };
}
