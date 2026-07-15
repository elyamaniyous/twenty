import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import {
  ErpStatusBadge,
  type ErpStatusTone,
} from '@/erp-maroc/components/ErpStatusBadge';
import {
  formatCivilDate,
  formatInstantInTimeZone,
} from '@/erp-maroc/utils/civilDate';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import { Link } from 'react-router-dom';
import { Fragment, useMemo } from 'react';
import type {
  ErpInvoice,
  ErpInvoiceLine,
  ErpInvoiceRead,
} from 'twenty-shared/erp-maroc';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const INVOICE_STATUS_APPEARANCE: Record<
  ErpInvoice['status'],
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  VALIDATED: { label: 'Validée', tone: 'info' },
  SENT: { label: 'Envoyée', tone: 'info' },
  PARTIALLY_PAID: { label: 'Partiellement réglée', tone: 'warning' },
  PAID: { label: 'Réglée', tone: 'success' },
  OVERDUE: { label: 'Échue', tone: 'danger' },
  CANCELLED: { label: 'Annulée', tone: 'danger' },
};

const PDF_STATUS_APPEARANCE: Record<
  ErpInvoice['pdfGenerationStatus'],
  { label: string; tone: ErpStatusTone }
> = {
  NOT_REQUESTED: { label: 'PDF non demandé', tone: 'neutral' },
  PENDING: { label: 'PDF en attente', tone: 'warning' },
  PROCESSING: { label: 'PDF en cours', tone: 'warning' },
  GENERATED: { label: 'PDF généré', tone: 'success' },
  FAILED: { label: 'Échec PDF', tone: 'danger' },
};

const EMAIL_STATUS_APPEARANCE = {
  PENDING: { label: 'Courriel en attente', tone: 'warning' },
  PROCESSING: { label: 'Courriel en cours', tone: 'warning' },
  SENT: { label: 'Courriel envoyé', tone: 'success' },
  FAILED: { label: 'Échec du courriel', tone: 'danger' },
  RECONCILIATION_REQUIRED: {
    label: 'Courriel à vérifier',
    tone: 'warning',
  },
} as const satisfies Record<
  NonNullable<ErpInvoice['emailDelivery']>['status'],
  { label: string; tone: ErpStatusTone }
>;

const PAYMENT_METHOD_LABELS: Record<
  NonNullable<ErpInvoice['paymentMethod']>,
  string
> = {
  BANK_TRANSFER: 'Virement bancaire',
  CHECK: 'Chèque',
  CASH: 'Espèces',
  CARD: 'Carte bancaire',
  DIRECT_DEBIT: 'Prélèvement',
  OTHER: 'Autre',
};

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const StyledSummary = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledSummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[0.5]};
  min-width: 0;
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledValue = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow-wrap: anywhere;
`;

const StyledLink = styled(Link)`
  color: ${themeCssVariables.color.blue};
  overflow-wrap: anywhere;
`;

const StyledLegal = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledSectionTitle = styled.h2`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  margin: 0;
`;

const StyledLegalDetails = styled.dl`
  display: grid;
  gap: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  margin: 0;
`;

const StyledTerm = styled.dt`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledDefinition = styled.dd`
  color: ${themeCssVariables.font.color.primary};
  margin: ${themeCssVariables.spacing[0.5]} 0 0;
  overflow-wrap: anywhere;
`;

const StyledTableRegion = styled.div`
  display: flex;
  flex: 1 1 auto;
  min-height: 180px;
`;

const StyledTotals = styled.dl`
  align-self: flex-end;
  display: grid;
  grid-template-columns: minmax(120px, auto) minmax(130px, auto);
  margin: 0;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
  row-gap: ${themeCssVariables.spacing[2]};
`;

const StyledTotalTerm = styled.dt`
  color: ${themeCssVariables.font.color.secondary};
`;

const StyledAmount = styled.dd`
  color: ${themeCssVariables.font.color.primary};
  font-variant-numeric: tabular-nums;
  margin: 0;
  text-align: right;
`;

const StyledGrandTotal = styled(StyledAmount)`
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const displayValue = (value: string | null) =>
  value === null || value.trim().length === 0 ? '—' : value;

const formatInvoiceInstant = (value: string | null, timeZone: string) => {
  if (value === null) return '—';

  try {
    return formatInstantInTimeZone(value, timeZone);
  } catch {
    return '—';
  }
};

export const getInvoiceStatusAppearance = (status: ErpInvoice['status']) =>
  INVOICE_STATUS_APPEARANCE[status];

type ErpInvoiceDetailContentProps = {
  invoice: ErpInvoiceRead;
  timeZone: string;
};

export const ErpInvoiceDetailContent = ({
  invoice,
  timeZone,
}: ErpInvoiceDetailContentProps) => {
  const taxes = useMemo(() => {
    const grouped = new Map<number, number>();
    for (const line of invoice.lines) {
      grouped.set(
        line.tvaRate,
        (grouped.get(line.tvaRate) ?? 0) + line.totalTvaCents,
      );
    }
    return [...grouped.entries()].sort(([left], [right]) => left - right);
  }, [invoice.lines]);

  const columns: ErpOperationalTableColumn<ErpInvoiceLine>[] = [
    {
      key: 'description',
      header: 'Description',
      width: '280px',
      render: ({ description }) => description,
    },
    {
      key: 'quantity',
      header: 'Quantité',
      width: '90px',
      align: 'right',
      render: ({ quantity }) => quantity.toLocaleString('fr-MA'),
    },
    {
      key: 'unit',
      header: 'Unité',
      width: '100px',
      render: ({ unit }) => unit ?? '—',
    },
    {
      key: 'unitPrice',
      header: 'Prix unitaire HT',
      width: '150px',
      align: 'right',
      render: ({ unitPriceHtCents }) => formatMadCents(unitPriceHtCents),
    },
    {
      key: 'tva',
      header: 'TVA',
      width: '80px',
      align: 'right',
      render: ({ tvaRate }) => `${tvaRate} %`,
    },
    {
      key: 'totalHt',
      header: 'Total HT',
      width: '140px',
      align: 'right',
      render: ({ totalHtCents }) => formatMadCents(totalHtCents),
    },
    {
      key: 'totalTtc',
      header: 'Total TTC',
      width: '140px',
      align: 'right',
      render: ({ totalTtcCents }) => formatMadCents(totalTtcCents),
    },
  ];

  const legalVerification =
    invoice.legalSnapshotVerificationStatus === 'VERIFIED'
      ? { label: 'Vérification confirmée', tone: 'success' as const }
      : { label: 'Vérification en attente', tone: 'warning' as const };
  const emailAppearance =
    invoice.emailDelivery === null
      ? { label: 'Courriel non demandé', tone: 'neutral' as const }
      : EMAIL_STATUS_APPEARANCE[invoice.emailDelivery.status];

  return (
    <StyledContent>
      <StyledSummary>
        <StyledSummaryItem>
          <StyledLabel>Client</StyledLabel>
          <StyledValue>
            {displayValue(invoice.customerNameSnapshot ?? invoice.tier.name)}
          </StyledValue>
        </StyledSummaryItem>
        <StyledSummaryItem>
          <StyledLabel>Émission</StyledLabel>
          <StyledValue>{formatCivilDate(invoice.issueDate)}</StyledValue>
        </StyledSummaryItem>
        <StyledSummaryItem>
          <StyledLabel>Échéance</StyledLabel>
          <StyledValue>{formatCivilDate(invoice.dueDate)}</StyledValue>
        </StyledSummaryItem>
        <StyledSummaryItem>
          <StyledLabel>Paiement</StyledLabel>
          <StyledValue>
            {invoice.paymentMethod === null
              ? 'Non renseigné'
              : PAYMENT_METHOD_LABELS[invoice.paymentMethod]}
          </StyledValue>
        </StyledSummaryItem>
        <StyledSummaryItem>
          <StyledLabel>Référence</StyledLabel>
          <StyledValue>{displayValue(invoice.paymentReference)}</StyledValue>
        </StyledSummaryItem>
        <StyledSummaryItem>
          <StyledLabel>Vérification légale</StyledLabel>
          <ErpStatusBadge
            label={legalVerification.label}
            tone={legalVerification.tone}
          />
        </StyledSummaryItem>
        <StyledSummaryItem>
          <StyledLabel>PDF</StyledLabel>
          <ErpStatusBadge
            label={PDF_STATUS_APPEARANCE[invoice.pdfGenerationStatus].label}
            tone={PDF_STATUS_APPEARANCE[invoice.pdfGenerationStatus].tone}
          />
        </StyledSummaryItem>
        <StyledSummaryItem>
          <StyledLabel>Courriel</StyledLabel>
          <ErpStatusBadge
            label={emailAppearance.label}
            tone={emailAppearance.tone}
          />
        </StyledSummaryItem>
        <StyledSummaryItem>
          <StyledLabel>Validation</StyledLabel>
          <StyledValue>
            {formatInvoiceInstant(invoice.validatedAt, timeZone)}
          </StyledValue>
        </StyledSummaryItem>
        {invoice.sourceQuote === null ? null : (
          <StyledSummaryItem>
            <StyledLabel>Devis source</StyledLabel>
            <StyledLink to={`/erp-maroc/quotes/${invoice.sourceQuote.id}`}>
              {invoice.sourceQuote.number}
            </StyledLink>
          </StyledSummaryItem>
        )}
      </StyledSummary>

      <StyledLegal aria-label="Instantané légal">
        <StyledSectionTitle>Instantané légal</StyledSectionTitle>
        <StyledLegalDetails>
          <div>
            <StyledTerm>Vendeur</StyledTerm>
            <StyledDefinition>
              {displayValue(invoice.sellerRaisonSocialeSnapshot)}
            </StyledDefinition>
          </div>
          <div>
            <StyledTerm>ICE vendeur</StyledTerm>
            <StyledDefinition>
              {displayValue(invoice.sellerIceSnapshot)}
            </StyledDefinition>
          </div>
          <div>
            <StyledTerm>IF vendeur</StyledTerm>
            <StyledDefinition>
              {displayValue(invoice.sellerIdentifiantFiscalSnapshot)}
            </StyledDefinition>
          </div>
          <div>
            <StyledTerm>RC vendeur</StyledTerm>
            <StyledDefinition>
              {displayValue(invoice.sellerRcSnapshot)}
            </StyledDefinition>
          </div>
          <div>
            <StyledTerm>Client facturé</StyledTerm>
            <StyledDefinition>
              {displayValue(invoice.customerNameSnapshot)}
            </StyledDefinition>
          </div>
          <div>
            <StyledTerm>ICE client</StyledTerm>
            <StyledDefinition>
              {displayValue(invoice.customerIceSnapshot)}
            </StyledDefinition>
          </div>
          <div>
            <StyledTerm>Courriel client</StyledTerm>
            <StyledDefinition>
              {displayValue(invoice.customerEmailSnapshot)}
            </StyledDefinition>
          </div>
          <div>
            <StyledTerm>Note de vérification</StyledTerm>
            <StyledDefinition>
              {displayValue(invoice.legalSnapshotVerificationNote)}
            </StyledDefinition>
          </div>
        </StyledLegalDetails>
      </StyledLegal>

      <StyledTableRegion>
        <ErpOperationalTable
          ariaLabel="Lignes de la facture"
          columns={columns}
          rows={invoice.lines}
          getRowKey={({ id }) => id}
          emptyLabel="Cette facture ne contient aucune ligne"
        />
      </StyledTableRegion>

      <StyledTotals>
        <StyledTotalTerm>Total HT</StyledTotalTerm>
        <StyledAmount data-testid="invoice-total-ht">
          {formatMadCents(invoice.totalHtCents)}
        </StyledAmount>
        {taxes.map(([rate, cents]) => (
          <Fragment key={rate}>
            <StyledTotalTerm>TVA {rate} %</StyledTotalTerm>
            <StyledAmount data-testid={`invoice-tax-${rate}`}>
              {formatMadCents(cents)}
            </StyledAmount>
          </Fragment>
        ))}
        <StyledTotalTerm>Total légal TTC</StyledTotalTerm>
        <StyledGrandTotal data-testid="invoice-total-ttc">
          {formatMadCents(invoice.totalTtcCents)}
        </StyledGrandTotal>
        <StyledTotalTerm>Encaissements nets</StyledTotalTerm>
        <StyledAmount data-testid="invoice-collection-payments">
          {formatMadCents(invoice.collections.paymentCents)}
        </StyledAmount>
        <StyledTotalTerm>Crédits appliqués</StyledTotalTerm>
        <StyledAmount data-testid="invoice-collection-credits">
          {formatMadCents(invoice.collections.creditAppliedCents)}
        </StyledAmount>
        <StyledTotalTerm>Solde dû</StyledTotalTerm>
        <StyledGrandTotal data-testid="invoice-collection-outstanding">
          {formatMadCents(invoice.collections.outstandingCents)}
        </StyledGrandTotal>
      </StyledTotals>
    </StyledContent>
  );
};
