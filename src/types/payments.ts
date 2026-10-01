import type { ProviderId } from '../shared/core/payments/paymentProviderCatalog';
import type { PlanId } from '../shared/core/payments/pricingCatalog';

export type PaymentStatus = 'pendiente' | 'aprobado' | 'rechazado';
export type PaymentGateway = ProviderId | 'transferencia' | 'manual';

export interface PaymentClaim {
  id: string;
  user_id?: string | null;
  email: string;
  plan: PlanId;
  amount?: string | number | null;
  payment_method: PaymentGateway;
  transaction_reference?: string | null;
  status: PaymentStatus;
  created_at?: string;
  reviewed_at?: string | null;
}
