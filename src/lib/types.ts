export type OrderStatus = 'pending_payment' | 'processing' | 'completed' | 'failed';

export interface Order {
  id: string;
  email: string;
  propertyAddress: string;
  photoUrls: string[];
  status: OrderStatus;
  stripeSessionId?: string;
  falRequestIds?: string[];
  videoUrls?: string[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}
