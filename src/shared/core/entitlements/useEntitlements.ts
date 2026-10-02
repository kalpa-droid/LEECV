import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { dal } from '../storage/dataAccessLayer';

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
};

export function getPlanLabel(plan?: string | null): string {
  return PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES]?.label ?? PLAN_FEATURES.free.label;
}

export function getPlanBadgeClass(plan?: string | null): string {
  return PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES]?.badgeClass ?? PLAN_FEATURES.free.badgeClass;
}

export function isPro(plan?: string | null): boolean {
  return plan === 'pro';
}

export function isAdminRole(role?: string | null): boolean {
  return role === 'admin';
}

export function useEntitlements() {
  const { profile, user } = useAuth();
  const [pdfTokens, setPdfTokens] = useState(0);
  const [tokenStats, setTokenStats] = useState({ total: 0, used: 0, available: 0 });

  useEffect(() => {
    if (user?.email) {
      dal.pdfExportTokens.getTokenStats(user.email).then(stats => {
        setTokenStats(stats);
        setPdfTokens(stats.available);
      }).catch(console.error);
    }
  }, [user]);

  const plan = profile?.plan || 'free';
  const features = PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.free;
  
  return {
    plan,
    isPro: plan === 'pro',
    pdfTokens,
    tokenStats,
    loading: false,
    features,
    isPremium: plan === 'pro',
    inGracePeriod: false,
    graceEndsAt: null,
    canEmergencyExport: false,
    unlimitedExports: features.unlimitedExports,
    candidateManagement: features.candidateManagement,
    cloudStorageGB: features.cloudStorageGB,
    refreshEntitlements: async () => {}
  };
}
