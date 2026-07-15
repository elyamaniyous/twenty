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
import {
  ErpCreditNoteFilters,
  type ErpCreditNoteFilterValues,
} from '@/erp-maroc/credit-notes/ErpCreditNoteFilters';
import { formatMadCents } from '@/erp-maroc/utils/money';
import {
  canonicalizeErpQueryState,
  updateErpQueryState,
} from '@/erp-maroc/utils/queryState';
import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import {
  erpCreditNotePageSchema,
  type ErpCreditNote,
  type ErpCreditNotePage,
} from 'twenty-shared/erp-maroc';
import { IconPlus } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';

type ListState = 'loading' | 'ready' | 'error';

const EMPTY_PAGE: ErpCreditNotePage = { items: [], nextCursor: null };

const STATUS_APPEARANCE: Record<
  ErpCreditNote['status'],
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  VALIDATED: { label: 'Validé', tone: 'success' },
  CANCELLED: { label: 'Annulé', tone: 'danger' },
};

const columns: ErpOperationalTableColumn<ErpCreditNote>[] = [
  {
    key: 'number',
    header: 'Numéro',
    width: '160px',
    render: (row) => (
      <Link to={`/erp-maroc/credit-notes/${row.id}`}>
        {row.number ?? 'Brouillon'}
      </Link>
    ),
  },
  {
    key: 'sourceInvoiceNumber',
    header: 'Facture source',
    width: '180px',
    render: (row) => row.sourceInvoiceNumber,
  },
  {
    key: 'tierId',
    header: 'Client',
    width: '280px',
    render: (row) => row.tierId,
  },
  {
    key: 'issueDate',
    header: 'Émission',
    width: '130px',
    render: (row) => row.issueDate,
  },
  {
    key: 'totalTtc',
    header: 'Total TTC',
    width: '150px',
    align: 'right',
    render: (row) => formatMadCents(row.totalTtcCents),
  },
  {
    key: 'availableCredit',
    header: 'Crédit disponible',
    width: '180px',
    align: 'right',
    render: (row) => formatMadCents(row.availableCreditCents),
  },
  {
    key: 'status',
    header: 'Statut',
    width: '150px',
    render: (row) => {
      const appearance = STATUS_APPEARANCE[row.status];

      return <ErpStatusBadge label={appearance.label} tone={appearance.tone} />;
    },
  },
];

export const ErpCreditNotesPage = () => {
  const { client, context } = useErpMarocContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState<ErpCreditNotePage>(EMPTY_PAGE);
  const [listState, setListState] = useState<ListState>('loading');
  const [requestGeneration, setRequestGeneration] = useState(0);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const canonicalSearchParams = useMemo(
    () => canonicalizeErpQueryState('creditNotes', searchParams),
    [searchParams],
  );
  const cursor = canonicalSearchParams.get('cursor');
  const canManageCreditNotes = context?.capabilities.manageCreditNotes === true;
  const filterValues: ErpCreditNoteFilterValues = {
    status: (canonicalSearchParams.get('status') ??
      'all') as ErpCreditNoteFilterValues['status'],
    tierId: canonicalSearchParams.get('tierId') ?? '',
    sourceInvoiceId: canonicalSearchParams.get('invoiceId') ?? '',
    from: canonicalSearchParams.get('from') ?? '',
    to: canonicalSearchParams.get('to') ?? '',
  };

  const updateFilters = (values: ErpCreditNoteFilterValues) => {
    const nextSearchParams = updateErpQueryState(
      'creditNotes',
      canonicalSearchParams,
      {
        status: values.status === 'all' ? null : values.status,
        tierId: values.tierId || null,
        invoiceId: values.sourceInvoiceId || null,
        from: values.from || null,
        to: values.to || null,
      },
    );
    const shouldResetHistory = [
      'status',
      'tierId',
      'invoiceId',
      'from',
      'to',
    ].some(
      (key) => canonicalSearchParams.get(key) !== nextSearchParams.get(key),
    );

    if (shouldResetHistory) {
      setCursorHistory([]);
    }
    setSearchParams(nextSearchParams);
  };

  const goToNextPage = () => {
    if (page.nextCursor === null || listState !== 'ready') return;

    setCursorHistory((history) => [...history, cursor]);
    setSearchParams(
      updateErpQueryState('creditNotes', canonicalSearchParams, {
        cursor: page.nextCursor,
      }),
    );
  };

  const goToPreviousPage = () => {
    const previousCursor = cursorHistory.at(-1);
    if (previousCursor === undefined || listState !== 'ready') return;

    setCursorHistory((history) => history.slice(0, -1));
    setSearchParams(
      updateErpQueryState('creditNotes', canonicalSearchParams, {
        cursor: previousCursor,
      }),
    );
  };

  useEffect(() => {
    if (
      location.pathname === '/erp-maroc/credit-notes' &&
      searchParams.toString() !== canonicalSearchParams.toString()
    ) {
      setSearchParams(canonicalSearchParams, { replace: true });
    }
  }, [canonicalSearchParams, location.pathname, searchParams, setSearchParams]);

  useEffect(() => {
    let isMounted = true;

    setListState('loading');
    void client
      .request({
        method: 'GET',
        path: '/credit-notes',
        query:
          canonicalSearchParams.size === 0
            ? undefined
            : Object.fromEntries(canonicalSearchParams),
        schema: erpCreditNotePageSchema,
      })
      .then((nextPage) => {
        if (!isMounted) return;
        setPage(nextPage);
        setListState('ready');
      })
      .catch(() => {
        if (!isMounted) return;
        setListState('error');
      });

    return () => {
      isMounted = false;
    };
  }, [canonicalSearchParams, client, requestGeneration]);

  return (
    <ErpPageShell
      title="Avoirs"
      actions={
        canManageCreditNotes ? (
          <Button
            title="Nouvel avoir"
            ariaLabel="Nouvel avoir"
            Icon={IconPlus}
            accent="blue"
            onClick={() => {
              if (context?.capabilities.manageCreditNotes === true) {
                navigate('/erp-maroc/credit-notes/new');
              }
            }}
          />
        ) : null
      }
    >
      <ErpCreditNoteFilters
        values={filterValues}
        disabled={listState !== 'ready'}
        onChange={updateFilters}
      />
      <ErpOperationalTable
        ariaLabel="Avoirs"
        columns={columns}
        rows={page.items}
        getRowKey={(row) => row.id}
        state={listState}
        loadingLabel="Chargement des avoirs"
        emptyLabel="Aucun avoir sur la page chargée"
        errorLabel="Impossible de charger les avoirs"
        retryLabel="Réessayer"
        onRetry={() => setRequestGeneration((generation) => generation + 1)}
      />
      <button
        type="button"
        disabled={listState !== 'ready' || cursorHistory.length === 0}
        onClick={goToPreviousPage}
      >
        Page précédente
      </button>
      <button
        type="button"
        disabled={listState !== 'ready' || page.nextCursor === null}
        onClick={goToNextPage}
      >
        Page suivante
      </button>
    </ErpPageShell>
  );
};
