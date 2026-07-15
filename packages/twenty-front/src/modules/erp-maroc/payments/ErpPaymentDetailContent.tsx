import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import {
  ErpStatusBadge,
  type ErpStatusTone,
} from '@/erp-maroc/components/ErpStatusBadge';
import { formatCivilDate } from '@/erp-maroc/utils/civilDate';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { Link } from 'react-router-dom';
import type { ErpPayment, ErpPaymentAllocation } from 'twenty-shared/erp-maroc';

const PAYMENT_STATUS_APPEARANCE: Record<
  ErpPayment['status'],
  { label: string; tone: ErpStatusTone }
> = {
  PENDING_ALLOCATION: {
    label: 'En attente de ventilation',
    tone: 'warning',
  },
  POSTED: { label: 'Comptabilisé', tone: 'success' },
  REVERSED: { label: 'Contrepassé', tone: 'info' },
  CANCELLED: { label: 'Annulé', tone: 'danger' },
};

const PAYMENT_METHOD_LABELS: Record<ErpPayment['method'], string> = {
  BANK_TRANSFER: 'Virement bancaire',
  CHECK: 'Chèque',
  CASH: 'Espèces',
  CARD: 'Carte bancaire',
  DIRECT_DEBIT: 'Prélèvement',
  OTHER: 'Autre',
};

const columns: ErpOperationalTableColumn<ErpPaymentAllocation>[] = [
  {
    key: 'invoice',
    header: 'Facture',
    width: '180px',
    render: ({ invoiceId, invoiceNumber }) => (
      <Link to={`/erp-maroc/invoices/${invoiceId}`}>
        {invoiceNumber ?? invoiceId}
      </Link>
    ),
  },
  {
    key: 'amount',
    header: 'Montant',
    width: '150px',
    align: 'right',
    render: ({ amountCents }) => formatMadCents(amountCents),
  },
];

type ErpPaymentDetailContentProps = {
  payment: ErpPayment;
};

export const ErpPaymentDetailContent = ({
  payment,
}: ErpPaymentDetailContentProps) => {
  const statusAppearance = PAYMENT_STATUS_APPEARANCE[payment.status];

  return (
    <div>
      <dl>
        <div>
          <dt>Statut</dt>
          <dd>
            <ErpStatusBadge
              label={statusAppearance.label}
              tone={statusAppearance.tone}
            />
          </dd>
        </div>
        <div>
          <dt>Montant</dt>
          <dd>{formatMadCents(payment.amountCents)}</dd>
        </div>
        <div>
          <dt>Référence</dt>
          <dd>{payment.reference ?? '-'}</dd>
        </div>
        <div>
          <dt>Date de paiement</dt>
          <dd>{formatCivilDate(payment.paymentDate)}</dd>
        </div>
        <div>
          <dt>Mode de paiement</dt>
          <dd>{PAYMENT_METHOD_LABELS[payment.method]}</dd>
        </div>
        {payment.terminationReason === null ? null : (
          <div>
            <dt>Motif de clôture</dt>
            <dd>{payment.terminationReason}</dd>
          </div>
        )}
        {payment.originalPaymentId === null ? null : (
          <div>
            <dt>Paiement d'origine</dt>
            <dd>
              <Link to={`/erp-maroc/payments/${payment.originalPaymentId}`}>
                {payment.originalPaymentId}
              </Link>
            </dd>
          </div>
        )}
        {payment.reversal === undefined ? null : (
          <div>
            <dt>Contrepassation</dt>
            <dd>
              <Link to={`/erp-maroc/payments/${payment.reversal.id}`}>
                {payment.reversal.id}
              </Link>
            </dd>
          </div>
        )}
      </dl>

      <ErpOperationalTable
        ariaLabel="Ventilations du règlement"
        columns={columns}
        rows={payment.allocations}
        getRowKey={({ id }) => id}
        state="ready"
        emptyLabel="Ce règlement ne contient aucune ventilation"
      />
    </div>
  );
};
