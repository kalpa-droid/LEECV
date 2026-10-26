import React, { useState } from 'react';
import { button } from '../../../shared/core/uiDesignSystem';
import { ProcessedPaymentsTab } from './ProcessedPaymentsTab';
import { PendingGrantsTab } from './PendingGrantsTab';

export function PaymentsAdminTab() {
  const [activeTab, setActiveTab] = useState<'processed' | 'pending'>('processed');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
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
      </div>
      {activeTab === 'processed' ? <ProcessedPaymentsTab /> : <PendingGrantsTab />}
    </div>
  );
}
