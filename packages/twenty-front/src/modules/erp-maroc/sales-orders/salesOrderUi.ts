import type { ErpStatusTone } from '@/erp-maroc/components/ErpStatusBadge';
import type { ErpSalesOrder } from 'twenty-shared/erp-maroc';

export const salesOrderStatusAppearance: Record<
  ErpSalesOrder['status'],
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  CONFIRMED: { label: 'Confirmée', tone: 'info' },
  PARTIALLY_DELIVERED: { label: 'Livraison partielle', tone: 'warning' },
  DELIVERED: { label: 'Livrée', tone: 'success' },
  INVOICED: { label: 'Facturée', tone: 'success' },
  CANCELLED: { label: 'Annulée', tone: 'danger' },
};

export const formatSalesOrderDate = (value: string | null) =>
  value === null
    ? 'Non définie'
    : new Intl.DateTimeFormat('fr-MA', { dateStyle: 'medium' }).format(
        new Date(`${value}T12:00:00`),
      );
