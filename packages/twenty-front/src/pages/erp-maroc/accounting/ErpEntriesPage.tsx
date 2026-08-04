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
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  erpAccountingEntryPageSchema,
  erpAccountingEntryStatusSchema,
  erpAccountingSourceTypeSchema,
  type ErpAccountingEntry,
  type ErpAccountingEntryPage,
} from 'twenty-shared/erp-maroc';
import { IconChevronLeft, IconChevronRight, IconPlus } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const EMPTY_PAGE: ErpAccountingEntryPage = { items: [], nextCursor: null };

const STATUS: Record<
  ErpAccountingEntry['status'],
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'À contrôler', tone: 'warning' },
  VALIDATED: { label: 'Validée', tone: 'success' },
  LOCKED: { label: 'Verrouillée', tone: 'neutral' },
  REJECTED: { label: 'Rejetée', tone: 'danger' },
};

const SOURCE: Record<ErpAccountingEntry['sourceType'], string> = {
  MANUAL: 'Saisie manuelle',
  REVERSAL: 'Contrepassation',
  INVOICE: 'Facture',
  PAYMENT: 'Règlement',
  CREDIT_NOTE: 'Avoir',
  SUPPLIER_INVOICE: 'Facture fournisseur',
  SUPPLIER_PAYMENT: 'Paiement fournisseur',
  PAYROLL: 'Paie',
  EXPENSE_NOTE: 'Note de frais',
  PROVISION: 'Provision',
  CLOSING: 'Clôture',
  OPENING_BALANCE: 'À-nouveaux',
};

const formatDate = (value: string) => value.split('-').reverse().join('/');

const columns: ErpOperationalTableColumn<ErpAccountingEntry>[] = [
  {
    key: 'date',
    header: 'Date',
    width: '110px',
    render: (row) => formatDate(row.entryDate),
  },
  {
    key: 'journal',
    header: 'Journal',
    width: '130px',
    render: (row) => `${row.journalCode} · ${row.journalLabel}`,
  },
  {
    key: 'label',
    header: 'Libellé',
    width: '280px',
    render: (row) => (
      <Link to={`/erp-maroc/accounting/entries/${row.id}`}>{row.label}</Link>
    ),
  },
  {
    key: 'source',
    header: 'Origine',
    width: '120px',
    render: (row) => SOURCE[row.sourceType],
  },
  {
    key: 'debit',
    header: 'Débit',
    width: '140px',
    align: 'right',
    render: (row) => formatMadCents(row.totalDebitCents),
  },
  {
    key: 'credit',
    header: 'Crédit',
    width: '140px',
    align: 'right',
    render: (row) => formatMadCents(row.totalCreditCents),
  },
  {
    key: 'status',
    header: 'Statut',
    width: '140px',
    render: (row) => (
      <ErpStatusBadge
        label={STATUS[row.status].label}
        tone={STATUS[row.status].tone}
      />
    ),
  },
];

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledFilter = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledControl = styled.select`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  height: 32px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledDate = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledPagination = styled.div`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

export const ErpEntriesPage = () => {
  const { client } = useErpMarocContext();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState<ErpAccountingEntryPage>(EMPTY_PAGE);
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [requestGeneration, setRequestGeneration] = useState(0);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const canonicalSearchParams = useMemo(
    () => canonicalizeErpQueryState('accountingEntries', searchParams),
    [searchParams],
  );
  const cursor = canonicalSearchParams.get('cursor');

  const updateFilters = (changes: Record<string, string | null>) => {
    const next = updateErpQueryState(
      'accountingEntries',
      canonicalSearchParams,
      changes,
    );
    if (next.get('cursor') !== canonicalSearchParams.get('cursor')) {
      setCursorHistory([]);
    }
    setSearchParams(next);
  };

  useEffect(() => {
    if (
      location.pathname === '/erp-maroc/accounting/entries' &&
      searchParams.toString() !== canonicalSearchParams.toString()
    ) {
      setSearchParams(canonicalSearchParams, { replace: true });
    }
  }, [canonicalSearchParams, location.pathname, searchParams, setSearchParams]);

  useEffect(() => {
    let active = true;
    setListState('loading');
    void client
      .request({
        method: 'GET',
        path: '/accounting/entries',
        query:
          canonicalSearchParams.size === 0
            ? undefined
            : Object.fromEntries(canonicalSearchParams),
        schema: erpAccountingEntryPageSchema,
      })
      .then((result) => {
        if (!active) return;
        setPage(result);
        setListState('ready');
      })
      .catch(() => {
        if (active) setListState('error');
      });

    return () => {
      active = false;
    };
  }, [canonicalSearchParams, client, requestGeneration]);

  const setFilter = (key: string, value: string) => {
    setCursorHistory([]);
    updateFilters({ [key]: value === 'all' || value === '' ? null : value });
  };

  return (
    <ErpPageShell
      title="Écritures comptables"
      description="Journal central des factures, règlements et avoirs"
      actions={
        <Link to="/erp-maroc/accounting/entries/new">
          <Button
            title="Nouvelle OD"
            ariaLabel="Créer une opération diverse"
            Icon={IconPlus}
            accent="blue"
          />
        </Link>
      }
    >
      <StyledToolbar>
        <StyledFilter>
          Statut
          <StyledControl
            aria-label="Statut des écritures"
            value={canonicalSearchParams.get('status') ?? 'all'}
            onChange={(event) => setFilter('status', event.target.value)}
          >
            <option value="all">Tous</option>
            {erpAccountingEntryStatusSchema.options.map((status) => (
              <option key={status} value={status}>
                {STATUS[status].label}
              </option>
            ))}
          </StyledControl>
        </StyledFilter>
        <StyledFilter>
          Origine
          <StyledControl
            aria-label="Origine des écritures"
            value={canonicalSearchParams.get('sourceType') ?? 'all'}
            onChange={(event) => setFilter('sourceType', event.target.value)}
          >
            <option value="all">Toutes</option>
            {erpAccountingSourceTypeSchema.options.map((sourceType) => (
              <option key={sourceType} value={sourceType}>
                {SOURCE[sourceType]}
              </option>
            ))}
          </StyledControl>
        </StyledFilter>
        <StyledFilter>
          Du
          <StyledDate
            type="date"
            aria-label="Date comptable de début"
            value={canonicalSearchParams.get('from') ?? ''}
            onChange={(event) => setFilter('from', event.target.value)}
          />
        </StyledFilter>
        <StyledFilter>
          Au
          <StyledDate
            type="date"
            aria-label="Date comptable de fin"
            value={canonicalSearchParams.get('to') ?? ''}
            onChange={(event) => setFilter('to', event.target.value)}
          />
        </StyledFilter>
        <StyledFilter>
          Par page
          <StyledControl
            aria-label="Écritures par page"
            value={canonicalSearchParams.get('limit') ?? '50'}
            onChange={(event) => setFilter('limit', event.target.value)}
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </StyledControl>
        </StyledFilter>
      </StyledToolbar>
      <ErpOperationalTable
        ariaLabel="Écritures comptables"
        columns={columns}
        rows={page.items}
        getRowKey={(row) => row.id}
        state={listState}
        loadingLabel="Chargement des écritures"
        emptyLabel="Aucune écriture pour ces critères"
        errorLabel="Impossible de charger les écritures"
        retryLabel="Réessayer"
        onRetry={() => setRequestGeneration((value) => value + 1)}
      />
      <StyledPagination>
        <Button
          title="Page précédente"
          ariaLabel="Page précédente"
          Icon={IconChevronLeft}
          variant="secondary"
          disabled={listState !== 'ready' || cursorHistory.length === 0}
          onClick={() => {
            const previous = cursorHistory.at(-1);
            if (previous === undefined) return;
            setCursorHistory((history) => history.slice(0, -1));
            setSearchParams(
              updateErpQueryState('accountingEntries', canonicalSearchParams, {
                cursor: previous,
              }),
            );
          }}
        />
        <Button
          title="Page suivante"
          ariaLabel="Page suivante"
          Icon={IconChevronRight}
          variant="secondary"
          disabled={listState !== 'ready' || page.nextCursor === null}
          onClick={() => {
            if (page.nextCursor === null) return;
            setCursorHistory((history) => [...history, cursor]);
            setSearchParams(
              updateErpQueryState('accountingEntries', canonicalSearchParams, {
                cursor: page.nextCursor,
              }),
            );
          }}
        />
      </StyledPagination>
    </ErpPageShell>
  );
};
