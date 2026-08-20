export type PaymentStatus = 'pendiente' | 'aprobado' | 'rechazado';
export type PaymentGateway = 'mercadopago' | 'lemonsqueezy' | 'payoneer' | 'transferencia' | 'manual';

export interface PaymentClaim {
  id: string;
  user_id?: string | null;
  email: string;
  plan: 'pro' | 'enterprise';
  amount?: string | number | null;
  payment_method: PaymentGateway;
  transaction_reference?: string | null;
  status: PaymentStatus;
  created_at?: string;
  reviewed_at?: string | null;
}
