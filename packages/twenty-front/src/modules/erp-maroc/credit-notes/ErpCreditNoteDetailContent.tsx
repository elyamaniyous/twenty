import { formatCivilDate } from '@/erp-maroc/utils/civilDate';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { Link } from 'react-router-dom';
import type { ErpCreditNote } from 'twenty-shared/erp-maroc';

export const ErpCreditNoteDetailContent = ({
  creditNote,
}: {
  creditNote: ErpCreditNote;
}) => {
  const statusLabel =
    creditNote.status === 'DRAFT'
      ? 'Brouillon'
      : creditNote.status === 'VALIDATED'
        ? 'Validé'
        : 'Annulé';

  return (
    <div>
      <span role="status">{statusLabel}</span>
      <dl>
        <div>
          <dt>Facture source</dt>
          <dd>{creditNote.sourceInvoiceNumber}</dd>
        </div>
        <div>
          <dt>Client</dt>
          <dd>{creditNote.tierId}</dd>
        </div>
        <div>
          <dt>Total HT</dt>
          <dd data-testid="credit-note-total-ht">
            {formatMadCents(creditNote.totalHtCents)}
          </dd>
        </div>
        <div>
          <dt>TVA</dt>
          <dd data-testid="credit-note-total-tva">
            {formatMadCents(creditNote.totalTvaCents)}
          </dd>
        </div>
        <div>
          <dt>Total TTC</dt>
          <dd data-testid="credit-note-total-ttc">
            {formatMadCents(creditNote.totalTtcCents)}
          </dd>
        </div>
        <div>
          <dt>Crédit disponible</dt>
          <dd>{formatMadCents(creditNote.availableCreditCents)}</dd>
        </div>
      </dl>
      <section aria-label="Lignes de l'avoir">
        {creditNote.lines.map((line) => (
          <article key={line.id}>
            <strong>{line.description}</strong>
            <span>{`${line.quantity} ${line.unit ?? ''}`.trim()}</span>
            <span>{formatMadCents(line.amountHtCents)}</span>
            <span>{`${line.tvaRate} %`}</span>
          </article>
        ))}
      </section>
      <section aria-label="Allocations de crédit">
        {creditNote.allocations.map((allocation) => (
          <article key={allocation.id}>
            <Link to={`/erp-maroc/invoices/${allocation.invoiceId}`}>
              {allocation.invoiceId}
            </Link>
            <span>{allocation.kind}</span>
            <span>{formatMadCents(allocation.amountCents)}</span>
          </article>
        ))}
      </section>
      <dl>
        <div>
          <dt>Créé le</dt>
          <dd>{creditNote.createdAt}</dd>
        </div>
        {creditNote.validatedAt === null ? null : (
          <div>
            <dt>Validé le</dt>
            <dd>{creditNote.validatedAt}</dd>
          </div>
        )}
        {creditNote.cancelledAt === null ? null : (
          <div>
            <dt>Annulé le</dt>
            <dd>{creditNote.cancelledAt}</dd>
          </div>
        )}
        <div>
          <dt>Mis à jour le</dt>
          <dd>{creditNote.updatedAt}</dd>
        </div>
        <div>
          <dt>Date d'émission</dt>
          <dd>{formatCivilDate(creditNote.issueDate)}</dd>
        </div>
      </dl>
    </div>
  );
};
