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
  pass_30d: {
    unlimitedExports: true,
    cloudStorageGB: 0,
    label: 'Pase Total 30 Días',
    badgeClass: 'bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)] border-[var(--color-status-success-base)]/30',
    marketingBullets: [
      'pass30dFeatureAllApps',
      'pass30dFeatureNoAutoRenew',
      'agencyDriveBackupFeature',
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
  return plan === 'pro' || plan === 'pass_30d';
}

export function isProOrEnterprise(plan?: string | null): boolean {
  return plan === 'pro' || plan === 'pass_30d' || plan === 'enterprise';
}

export function isAdminRole(role?: string | null): boolean {
  return role === 'admin';
}

import { useExportEntitlement } from './useExportEntitlement';

export function useEntitlements() {
  const { profile, user } = useAuth();
  const [pdfTokens, setPdfTokens] = useState(0);
  const [tokenStats, setTokenStats] = useState({ total: 0, used: 0, available: 0 });
  const [appPasses, setAppPasses] = useState<Array<{ id: string; pass_id: string; doc_type: string; is_permanent: boolean; expires_at: string | null }>>([]);
  const exportEntitlement = useExportEntitlement();

  const fetchStats = useCallback(async () => {
    if (user?.id || user?.email) {
      try {
        const [stats, activePasses] = await Promise.all([
          dal.pdfExportTokens.getTokenStats({
            userId: user.id,
            email: user.email || undefined
          }),
          user.id ? dal.userAppPasses.listActive(user.id) : Promise.resolve([]),
        ]);
        setTokenStats(stats);
        setPdfTokens(stats.available);
        setAppPasses(activePasses);
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
  const planVence = profile?.plan_vence ? new Date(profile.plan_vence) : null;
  const isGlobalPassActive = (plan === 'pro' || plan === 'pass_30d') && (!planVence || planVence > new Date());
  const features = PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.free;
  
  return {
    plan,
    isPro: isGlobalPassActive,
    pdfTokens,
    tokenStats,
    appPasses,
    hasActivePassForDocType: (dt: string) => isGlobalPassActive || appPasses.some(p => p.doc_type === dt),
    hasEditorialTeamPass: isGlobalPassActive || appPasses.some(p => p.pass_id === 'pass_editorial_team_30d'),
    loading: exportEntitlement.loading,
    features,
    isPremium: isGlobalPassActive,
    inGracePeriod: false,
    graceEndsAt: null,
    canEmergencyExport: false,
    unlimitedExports: features.unlimitedExports,
    cloudStorageGB: features.cloudStorageGB,
    canExport: exportEntitlement.canExport,
    consumeExport: async (dt?: string) => {
      const res = await exportEntitlement.consumeCreditIfNeeded(dt);
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
