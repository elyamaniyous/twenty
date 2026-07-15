import { ErpAccountingReportFilters } from '@/erp-maroc/accounting/ErpAccountingReportFilters';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatMadCents } from '@/erp-maroc/utils/money';
import {
  canonicalizeErpQueryState,
  updateErpQueryState,
} from '@/erp-maroc/utils/queryState';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  erpBalanceReportSchema,
  type ErpBalanceItem,
  type ErpBalanceReport,
} from 'twenty-shared/erp-maroc';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const EMPTY_REPORT: ErpBalanceReport = {
  from: null,
  to: null,
  includeDraft: false,
  items: [],
  totals: {
    debitCents: 0,
    creditCents: 0,
    debitBalanceCents: 0,
    creditBalanceCents: 0,
  },
};

const StyledTotals = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.medium};
  display: grid;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: minmax(160px, 1fr) repeat(4, minmax(120px, 160px));
  padding: ${themeCssVariables.spacing[3]};

  strong,
  span {
    text-align: right;
  }

  strong:first-child {
    text-align: left;
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;

    strong,
    span,
    strong:first-child {
      text-align: left;
    }
  }
`;

export const ErpBalancePage = () => {
  const { client } = useErpMarocContext();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [report, setReport] = useState<ErpBalanceReport>(EMPTY_REPORT);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const query = useMemo(
    () => canonicalizeErpQueryState('accountingBalance', searchParams),
    [searchParams],
  );

  const columns = useMemo<ErpOperationalTableColumn<ErpBalanceItem>[]>(() => {
    const grandLivreQuery = new URLSearchParams();
    for (const key of ['from', 'to', 'includeDraft']) {
      const value = query.get(key);
      if (value !== null) grandLivreQuery.set(key, value);
    }
    return [
      {
        key: 'accountCode',
        header: 'Compte',
        width: '130px',
        render: (item) => {
          const target = new URLSearchParams(grandLivreQuery);
          target.set('accountCode', item.accountCode);
          return (
            <Link to={`/erp-maroc/accounting/grand-livre?${target}`}>
              {item.accountCode}
            </Link>
          );
        },
      },
      {
        key: 'label',
        header: 'Libellé',
        width: '280px',
        render: (item) => item.accountLabel,
      },
      {
        key: 'debit',
        header: 'Débit',
        width: '150px',
        align: 'right',
        render: (item) => formatMadCents(item.debitCents),
      },
      {
        key: 'credit',
        header: 'Crédit',
        width: '150px',
        align: 'right',
        render: (item) => formatMadCents(item.creditCents),
      },
      {
        key: 'debitBalance',
        header: 'Solde débiteur',
        width: '160px',
        align: 'right',
        render: (item) =>
          item.debitBalanceCents === 0
            ? '—'
            : formatMadCents(item.debitBalanceCents),
      },
      {
        key: 'creditBalance',
        header: 'Solde créditeur',
        width: '160px',
        align: 'right',
        render: (item) =>
          item.creditBalanceCents === 0
            ? '—'
            : formatMadCents(item.creditBalanceCents),
      },
    ];
  }, [query]);

  useEffect(() => {
    if (
      location.pathname === '/erp-maroc/accounting/balance' &&
      searchParams.toString() !== query.toString()
    ) {
      setSearchParams(query, { replace: true });
    }
  }, [location.pathname, query, searchParams, setSearchParams]);

  useEffect(() => {
    let active = true;
    setState('loading');
    void client
      .request({
        method: 'GET',
        path: '/accounting/balance',
        query: query.size === 0 ? undefined : Object.fromEntries(query),
        schema: erpBalanceReportSchema,
      })
      .then((result) => {
        if (!active) return;
        setReport(result);
        setState('ready');
      })
      .catch(() => {
        if (active) setState('error');
      });
    return () => {
      active = false;
    };
  }, [client, generation, query]);

  const updateFilters = (changes: Record<string, string | null>) =>
    setSearchParams(updateErpQueryState('accountingBalance', query, changes));

  return (
    <ErpPageShell
      title="Balance générale"
      description="Mouvements et soldes par compte"
    >
      <ErpAccountingReportFilters
        from={query.get('from') ?? ''}
        to={query.get('to') ?? ''}
        includeDraft={query.get('includeDraft') === 'true'}
        disabled={state === 'loading'}
        onChange={updateFilters}
      />
      <ErpOperationalTable
        ariaLabel="Balance générale"
        columns={columns}
        rows={report.items}
        getRowKey={(item) => item.accountId}
        state={state}
        loadingLabel="Calcul de la balance"
        emptyLabel="Aucun mouvement pour cette période"
        errorLabel="Impossible de calculer la balance"
        retryLabel="Réessayer"
        onRetry={() => setGeneration((value) => value + 1)}
      />
      {state === 'ready' && report.items.length > 0 ? (
        <StyledTotals aria-label="Totaux de la balance">
          <strong>Totaux</strong>
          <span>{formatMadCents(report.totals.debitCents)}</span>
          <span>{formatMadCents(report.totals.creditCents)}</span>
          <span>{formatMadCents(report.totals.debitBalanceCents)}</span>
          <span>{formatMadCents(report.totals.creditBalanceCents)}</span>
        </StyledTotals>
      ) : null}
    </ErpPageShell>
  );
};
