import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import type { ErpStatusTone } from '@/erp-maroc/components/ErpStatusBadge';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import { useMemo } from 'react';
import type { ErpQuote, ErpQuoteLine } from 'twenty-shared/erp-maroc';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const STATUS_APPEARANCE: Record<
  ErpQuote['status'],
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  SENT: { label: 'Envoyé', tone: 'info' },
  ACCEPTED: { label: 'Accepté', tone: 'success' },
  REJECTED: { label: 'Refusé', tone: 'danger' },
  EXPIRED: { label: 'Expiré', tone: 'warning' },
  CONVERTED: { label: 'Converti', tone: 'success' },
};

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const StyledSummary = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledSummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[0.5]};
  min-width: 120px;
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledValue = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
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

const StyledTerm = styled.dt`
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

export const formatQuoteCivilDate = (value: string | null) => {
  if (value === null) return '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

export const getQuoteStatusAppearance = (status: ErpQuote['status']) =>
  STATUS_APPEARANCE[status];

type ErpQuoteDetailContentProps = {
  quote: ErpQuote;
  customerName: string;
};

export const ErpQuoteDetailContent = ({
  quote,
  customerName,
}: ErpQuoteDetailContentProps) => {
  const taxes = useMemo(() => {
    const grouped = new Map<number, number>();
    for (const line of quote.lines) {
      grouped.set(
        line.tvaRate,
        (grouped.get(line.tvaRate) ?? 0) + line.totalTvaCents,
      );
    }
    return [...grouped.entries()].sort(([left], [right]) => left - right);
  }, [quote.lines]);

  const columns: ErpOperationalTableColumn<ErpQuoteLine>[] = [
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

  return (
    <StyledContent>
      <StyledSummary>
        <StyledSummaryItem>
          <StyledLabel>Client</StyledLabel>
          <StyledValue>{customerName}</StyledValue>
        </StyledSummaryItem>
        <StyledSummaryItem>
          <StyledLabel>Émission</StyledLabel>
          <StyledValue>{formatQuoteCivilDate(quote.issueDate)}</StyledValue>
        </StyledSummaryItem>
        <StyledSummaryItem>
          <StyledLabel>Validité</StyledLabel>
          <StyledValue>{formatQuoteCivilDate(quote.validUntil)}</StyledValue>
        </StyledSummaryItem>
        <StyledSummaryItem>
          <StyledLabel>Total TTC</StyledLabel>
          <StyledValue>{formatMadCents(quote.totalTtcCents)}</StyledValue>
        </StyledSummaryItem>
      </StyledSummary>

      <StyledTableRegion>
        <ErpOperationalTable
          ariaLabel="Lignes du devis"
          columns={columns}
          rows={quote.lines}
          getRowKey={({ id }) => id}
          emptyLabel="Ce devis ne contient aucune ligne"
        />
      </StyledTableRegion>

      <StyledTotals>
        <StyledTerm>Total HT</StyledTerm>
        <StyledAmount data-testid="quote-total-ht">
          {formatMadCents(quote.totalHtCents)}
        </StyledAmount>
        {taxes.map(([rate, cents]) => (
          <span key={rate} style={{ display: 'contents' }}>
            <StyledTerm>TVA {rate} %</StyledTerm>
            <StyledAmount data-testid={`quote-tax-${rate}`}>
              {formatMadCents(cents)}
            </StyledAmount>
          </span>
        ))}
        <StyledTerm>Total TTC</StyledTerm>
        <StyledGrandTotal data-testid="quote-total-ttc">
          {formatMadCents(quote.totalTtcCents)}
        </StyledGrandTotal>
      </StyledTotals>
    </StyledContent>
  );
};
