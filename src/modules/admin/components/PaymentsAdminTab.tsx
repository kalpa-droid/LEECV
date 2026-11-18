import React, { useState } from 'react';
import { button } from '../../../shared/core/uiDesignSystem';
import { ProcessedPaymentsTab } from './ProcessedPaymentsTab';
import { PendingGrantsTab } from './PendingGrantsTab';
import { UnclaimedCreditsTab } from './UnclaimedCreditsTab';

export function PaymentsAdminTab() {
  const [activeTab, setActiveTab] = useState<'processed' | 'pending' | 'unclaimed'>('processed');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('processed')}
          className={activeTab === 'processed' ? button.primary : button.secondary}
        >
          Historial de pagos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={activeTab === 'pending' ? button.primary : button.secondary}
        >
          Pagos retenidos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('unclaimed')}
          className={activeTab === 'unclaimed' ? button.primary : button.secondary}
        >
          Créditos sin reclamar
        </button>
      </div>
      {activeTab === 'processed' ? <ProcessedPaymentsTab /> : activeTab === 'pending' ? <PendingGrantsTab /> : <UnclaimedCreditsTab />}
    </div>
  );
}
