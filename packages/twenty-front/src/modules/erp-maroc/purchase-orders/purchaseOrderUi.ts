import type { ErpPurchaseOrder } from 'twenty-shared/erp-maroc';
import type { ErpStatusTone } from '@/erp-maroc/components/ErpStatusBadge';

export type PurchaseOrderProcessFilter =
  | 'ALL'
  | 'DRAFT'
  | 'RECEIVING'
  | 'INVOICING'
  | 'COMPLETED'
  | 'OVERDUE';

export const purchaseOrderStatusAppearance: Record<
  ErpPurchaseOrder['status'],
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  CONFIRMED: { label: 'Confirmé', tone: 'info' },
  PARTIALLY_RECEIVED: { label: 'Réception partielle', tone: 'warning' },
  RECEIVED: { label: 'Reçu', tone: 'success' },
  INVOICED: { label: 'Facturé', tone: 'success' },
  CANCELLED: { label: 'Annulé', tone: 'danger' },
};

export const formatPurchaseOrderDate = (value: string | null) =>
  value === null
    ? 'Non définie'
    : new Intl.DateTimeFormat('fr-MA', { dateStyle: 'medium' }).format(
        new Date(`${value}T12:00:00`),
      );

export const isPurchaseOrderDeliveryOverdue = (
  order: ErpPurchaseOrder,
  today: string,
) =>
  order.expectedDeliveryDate !== null &&
  order.expectedDeliveryDate < today &&
  (order.status === 'CONFIRMED' || order.status === 'PARTIALLY_RECEIVED');

export const matchesPurchaseOrderProcessFilter = (
  order: ErpPurchaseOrder,
  filter: PurchaseOrderProcessFilter,
  today: string,
) => {
  if (filter === 'ALL') return true;
  if (filter === 'DRAFT') return order.status === 'DRAFT';
  if (filter === 'RECEIVING') {
    return (
      order.status === 'CONFIRMED' || order.status === 'PARTIALLY_RECEIVED'
    );
  }
  if (filter === 'INVOICING') return order.status === 'RECEIVED';
  if (filter === 'COMPLETED') return order.status === 'INVOICED';
  return isPurchaseOrderDeliveryOverdue(order, today);
};

export const purchaseOrderNextAction: Record<
  ErpPurchaseOrder['status'],
  string
> = {
  DRAFT: 'Finaliser et confirmer',
  CONFIRMED: 'Enregistrer la réception',
  PARTIALLY_RECEIVED: 'Compléter la réception',
  RECEIVED: 'Contrôler la facture',
  INVOICED: 'Consulter le dossier',
  CANCELLED: 'Consulter le dossier',
};
