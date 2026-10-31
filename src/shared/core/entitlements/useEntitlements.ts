import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { dal } from '../storage/dataAccessLayer';

export const PLAN_FEATURES = {
  free: {
    unlimitedExports: false,
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

import { useExportEntitlement } from './useExportEntitlement';

export function useEntitlements() {
  const { profile, user } = useAuth();
  const [pdfTokens, setPdfTokens] = useState(0);
  const [tokenStats, setTokenStats] = useState({ total: 0, used: 0, available: 0 });
  const exportEntitlement = useExportEntitlement();

  const fetchStats = useCallback(async () => {
    if (user?.id || user?.email) {
      try {
        const stats = await dal.pdfExportTokens.getTokenStats({
          userId: user.id,
          email: user.email || undefined
        });
        setTokenStats(stats);
        setPdfTokens(stats.available);
      } catch (err) {
        console.error('Error fetching token stats:', err);
      }
    } else {
      setTokenStats({ total: 0, used: 0, available: 0 });
      setPdfTokens(0);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const plan = profile?.plan || 'free';
  const features = PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.free;
  
  return {
    plan,
    isPro: plan === 'pro',
    pdfTokens,
    tokenStats,
    loading: exportEntitlement.loading,
    features,
    isPremium: plan === 'pro',
    inGracePeriod: false,
    graceEndsAt: null,
    canEmergencyExport: false,
    unlimitedExports: features.unlimitedExports,
    cloudStorageGB: features.cloudStorageGB,
    canExport: exportEntitlement.canExport,
    consumeExport: async () => {
      const res = await exportEntitlement.consumeCreditIfNeeded();
      await fetchStats();
      return res;
    },
    refreshEntitlements: async () => {
      await Promise.all([
        exportEntitlement.refreshCredits(),
        fetchStats()
      ]);
    }
  };
}
