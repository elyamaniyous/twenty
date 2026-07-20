import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import {
  erpGrossMarginReportSchema,
  type ErpGrossMarginDelivery,
  type ErpGrossMarginReport,
} from 'twenty-shared/erp-maroc';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const madFormatter = new Intl.NumberFormat('fr-MA', {
  style: 'currency',
  currency: 'MAD',
  minimumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('fr-MA', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatCents = (value: number) => madFormatter.format(value / 100);
const formatRate = (value: number | null) =>
  value === null ? '—' : percentFormatter.format(value / 10_000);

const StyledPanel = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
`;

const StyledMetrics = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  overflow-x: auto;
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]};

  &:last-child {
    border-right: 0;
  }
`;

const StyledMetricLabel = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledMetricValue = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const emptyReport: ErpGrossMarginReport = {
  summary: {
    deliveryCount: 0,
    grossRevenueHtCents: 0,
    returnedRevenueHtCents: 0,
    deliveredCostCents: 0,
    returnedCostCents: 0,
    netRevenueHtCents: 0,
    netCostCents: 0,
    grossMarginCents: 0,
    marginRateBasisPoints: null,
  },
  deliveries: [],
};

export const ErpGrossMarginPanel = () => {
  const { client } = useErpMarocContext();
  const [report, setReport] = useState<ErpGrossMarginReport>(emptyReport);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    client
      .request({
        method: 'GET',
        path: '/inventory/gross-margins',
        schema: erpGrossMarginReportSchema,
        signal: abortController.signal,
      })
      .then((loadedReport) => {
        if (abortController.signal.aborted) return;
        setReport(loadedReport);
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client, generation]);

  const columns = useMemo<ErpOperationalTableColumn<ErpGrossMarginDelivery>[]>(
    () => [
      {
        key: 'delivery',
        header: 'Bon de livraison',
        width: '170px',
        render: (row) => row.deliveryNumber,
      },
      {
        key: 'date',
        header: 'Date',
        width: '120px',
        render: (row) => row.deliveryDate,
      },
      {
        key: 'customer',
        header: 'Client',
        width: '220px',
        render: (row) => row.customerName,
      },
      {
        key: 'revenue',
        header: 'CA HT net',
        width: '150px',
        align: 'right',
        render: (row) => formatCents(row.netRevenueHtCents),
      },
      {
        key: 'cost',
        header: 'Coût CUMP net',
        width: '160px',
        align: 'right',
        render: (row) => formatCents(row.netCostCents),
      },
      {
        key: 'margin',
        header: 'Marge brute',
        width: '150px',
        align: 'right',
        render: (row) => formatCents(row.grossMarginCents),
      },
      {
        key: 'rate',
        header: 'Taux',
        width: '100px',
        align: 'right',
        render: (row) => formatRate(row.marginRateBasisPoints),
      },
    ],
    [],
  );

  return (
    <StyledPanel>
      <StyledMetrics>
        <StyledMetric>
          <StyledMetricLabel>Livraisons</StyledMetricLabel>
          <StyledMetricValue>{report.summary.deliveryCount}</StyledMetricValue>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricLabel>CA HT net</StyledMetricLabel>
          <StyledMetricValue>
            {formatCents(report.summary.netRevenueHtCents)}
          </StyledMetricValue>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricLabel>Coût CUMP net</StyledMetricLabel>
          <StyledMetricValue>
            {formatCents(report.summary.netCostCents)}
          </StyledMetricValue>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricLabel>Marge brute</StyledMetricLabel>
          <StyledMetricValue>
            {formatCents(report.summary.grossMarginCents)} ·{' '}
            {formatRate(report.summary.marginRateBasisPoints)}
          </StyledMetricValue>
        </StyledMetric>
      </StyledMetrics>
      <ErpOperationalTable
        ariaLabel="Marge brute par livraison"
        columns={columns}
        rows={report.deliveries}
        getRowKey={(row) => row.deliveryNoteId}
        state={
          state === 'ready' && report.deliveries.length === 0 ? 'empty' : state
        }
        loadingLabel="Calcul des marges"
        emptyLabel="Aucune livraison valorisée"
        errorLabel="Impossible de calculer les marges"
        retryLabel="Réessayer"
        onRetry={() => setGeneration((value) => value + 1)}
      />
    </StyledPanel>
  );
};
