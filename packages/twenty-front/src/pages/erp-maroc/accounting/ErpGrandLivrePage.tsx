import { ErpAccountingReportFilters } from '@/erp-maroc/accounting/ErpAccountingReportFilters';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import {
  ErpStatusBadge,
  type ErpStatusTone,
} from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatMadCents } from '@/erp-maroc/utils/money';
import {
  canonicalizeErpQueryState,
  updateErpQueryState,
} from '@/erp-maroc/utils/queryState';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  erpGrandLivreReportSchema,
  type ErpGrandLivreItem,
  type ErpGrandLivreReport,
} from 'twenty-shared/erp-maroc';
import { IconSearch } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const DEFAULT_ACCOUNT_CODE = '3421';

const STATUS: Record<
  ErpGrandLivreItem['status'],
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'À contrôler', tone: 'warning' },
  VALIDATED: { label: 'Validée', tone: 'success' },
};

const columns: ErpOperationalTableColumn<ErpGrandLivreItem>[] = [
  {
    key: 'date',
    header: 'Date',
    width: '110px',
    render: (item) => item.entryDate.split('-').reverse().join('/'),
  },
  {
    key: 'journal',
    header: 'Journal',
    width: '120px',
    render: (item) => item.journalCode,
  },
  {
    key: 'label',
    header: 'Libellé',
    width: '300px',
    render: (item) => (
      <Link to={`/erp-maroc/accounting/entries/${item.entryId}`}>
        {item.label}
      </Link>
    ),
  },
  {
    key: 'debit',
    header: 'Débit',
    width: '145px',
    align: 'right',
    render: (item) =>
      item.debitCents === 0 ? '—' : formatMadCents(item.debitCents),
  },
  {
    key: 'credit',
    header: 'Crédit',
    width: '145px',
    align: 'right',
    render: (item) =>
      item.creditCents === 0 ? '—' : formatMadCents(item.creditCents),
  },
  {
    key: 'balance',
    header: 'Solde cumulé',
    width: '155px',
    align: 'right',
    render: (item) => formatMadCents(item.runningBalanceCents),
  },
  {
    key: 'status',
    header: 'Statut',
    width: '140px',
    render: (item) => (
      <ErpStatusBadge
        label={STATUS[item.status].label}
        tone={STATUS[item.status].tone}
      />
    ),
  },
];

const StyledAccountForm = styled.form`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledAccountInput = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 110px;
`;

const StyledTotals = styled.div`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.medium};
  display: grid;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: minmax(200px, 1fr) repeat(3, minmax(130px, 170px));
  padding: ${themeCssVariables.spacing[3]};

  span {
    text-align: right;
  }
`;

const EMPTY_REPORT: ErpGrandLivreReport = {
  account: {
    id: '00000000-0000-0000-0000-000000000000',
    code: DEFAULT_ACCOUNT_CODE,
    label: '',
    classNumber: 0,
  },
  from: null,
  to: null,
  includeDraft: false,
  items: [],
  totals: { debitCents: 0, creditCents: 0, balanceCents: 0 },
};

export const ErpGrandLivrePage = () => {
  const { client } = useErpMarocContext();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [report, setReport] = useState<ErpGrandLivreReport>(EMPTY_REPORT);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const canonicalQuery = useMemo(
    () => canonicalizeErpQueryState('accountingGrandLivre', searchParams),
    [searchParams],
  );
  const query = useMemo(() => {
    const result = new URLSearchParams(canonicalQuery);
    if (!result.has('accountCode'))
      result.set('accountCode', DEFAULT_ACCOUNT_CODE);
    return result;
  }, [canonicalQuery]);
  const [accountCode, setAccountCode] = useState(
    query.get('accountCode') ?? DEFAULT_ACCOUNT_CODE,
  );

  useEffect(() => {
    setAccountCode(query.get('accountCode') ?? DEFAULT_ACCOUNT_CODE);
  }, [query]);

  useEffect(() => {
    if (
      location.pathname === '/erp-maroc/accounting/grand-livre' &&
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
        path: '/accounting/grand-livre',
        query: Object.fromEntries(query),
        schema: erpGrandLivreReportSchema,
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
    setSearchParams(
      updateErpQueryState('accountingGrandLivre', query, changes),
    );

  const submitAccount = (event: FormEvent) => {
    event.preventDefault();
    updateFilters({ accountCode });
  };

  return (
    <ErpPageShell
      title="Grand livre"
      description={
        state === 'ready'
          ? `${report.account.code} · ${report.account.label}`
          : 'Mouvements chronologiques par compte'
      }
    >
      <ErpAccountingReportFilters
        from={query.get('from') ?? ''}
        to={query.get('to') ?? ''}
        includeDraft={query.get('includeDraft') === 'true'}
        disabled={state === 'loading'}
        onChange={updateFilters}
        leading={
          <StyledAccountForm onSubmit={submitAccount}>
            <label htmlFor="grand-livre-account">Compte</label>
            <StyledAccountInput
              id="grand-livre-account"
              value={accountCode}
              pattern="[A-Za-z0-9][A-Za-z0-9.-]{0,31}"
              maxLength={32}
              disabled={state === 'loading'}
              onChange={(event) => setAccountCode(event.target.value)}
            />
            <Button
              type="submit"
              title="Afficher le compte"
              ariaLabel="Afficher le compte"
              Icon={IconSearch}
              variant="secondary"
              disabled={state === 'loading' || accountCode.trim().length === 0}
            />
          </StyledAccountForm>
        }
      />
      <ErpOperationalTable
        ariaLabel="Grand livre"
        columns={columns}
        rows={report.items}
        getRowKey={(item) => item.lineId}
        state={state}
        loadingLabel="Calcul du grand livre"
        emptyLabel="Aucun mouvement pour ce compte et cette période"
        errorLabel="Compte introuvable ou grand livre indisponible"
        retryLabel="Réessayer"
        onRetry={() => setGeneration((value) => value + 1)}
      />
      {state === 'ready' && report.items.length > 0 ? (
        <StyledTotals aria-label="Totaux du grand livre">
          <strong>Totaux</strong>
          <span>{formatMadCents(report.totals.debitCents)}</span>
          <span>{formatMadCents(report.totals.creditCents)}</span>
          <span>{formatMadCents(report.totals.balanceCents)}</span>
        </StyledTotals>
      ) : null}
    </ErpPageShell>
  );
};
