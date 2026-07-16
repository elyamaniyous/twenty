import type { ErpPurchaseOrder } from 'twenty-shared/erp-maroc';
import type { ErpStatusTone } from '@/erp-maroc/components/ErpStatusBadge';

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
