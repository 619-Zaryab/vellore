import { Badge } from './ui';
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE, STATUS_LABEL, STATUS_TONE } from '@/lib/constants';
export const OrderStatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
export const PaymentBadge = ({ status }) => <Badge tone={PAYMENT_STATUS_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>;
