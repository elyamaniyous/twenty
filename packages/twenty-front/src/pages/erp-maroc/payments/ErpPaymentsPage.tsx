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
import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import {
  erpPaymentPageSchema,
  erpPaymentKindSchema,
  erpPaymentMethodSchema,
  erpPaymentStatusSchema,
  type ErpPayment,
  type ErpPaymentPage,
} from 'twenty-shared/erp-maroc';
import { IconPlus } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';

const EMPTY_PAGE: ErpPaymentPage = { items: [], nextCursor: null };

const columns: ErpOperationalTableColumn<ErpPayment>[] = [
  {
    key: 'reference',
    header: 'Référence',
    width: '180px',
    render: (row) => row.reference ?? 'Sans référence',
  },
  {
    key: 'amount',
    header: 'Montant',
    width: '150px',
    align: 'right',
    render: (row) => formatMadCents(row.amountCents),
  },
  {
    key: 'actions',
    header: 'Actions',
    width: '120px',
    align: 'right',
    render: (row) => {
      const reference = row.reference ?? 'ce règlement';

      return (
        <Link
          to={`/erp-maroc/payments/${row.id}`}
          aria-label={`Ouvrir ${reference}`}
        >
          Ouvrir
        </Link>
      );
    },
  },
];

export const ErpPaymentsPage = () => {
  const { client, context } = useErpMarocContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState<ErpPaymentPage>(EMPTY_PAGE);
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [requestGeneration, setRequestGeneration] = useState(0);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const canonicalSearchParams = useMemo(
    () => canonicalizeErpQueryState('payments', searchParams),
    [searchParams],
  );
  const cursor = canonicalSearchParams.get('cursor');
  const canCreatePendingPayment =
    context?.capabilities.createPendingPayment === true;

  const updateFilters = (changes: Record<string, string | null>) => {
    const nextSearchParams = updateErpQueryState(
      'payments',
      canonicalSearchParams,
      changes,
    );
    const shouldResetHistory = [
      'status',
      'kind',
      'method',
      'limit',
      'from',
      'to',
      'tierId',
      'invoiceId',
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
      updateErpQueryState('payments', canonicalSearchParams, {
        cursor: page.nextCursor,
      }),
    );
  };

  const goToPreviousPage = () => {
    const previousCursor = cursorHistory.at(-1);
    if (previousCursor === undefined || listState !== 'ready') return;

    setCursorHistory((history) => history.slice(0, -1));
    setSearchParams(
      updateErpQueryState('payments', canonicalSearchParams, {
        cursor: previousCursor,
      }),
    );
  };

  useEffect(() => {
    if (
      location.pathname === '/erp-maroc/payments' &&
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
        path: '/payments',
        query:
          canonicalSearchParams.size === 0
            ? undefined
            : Object.fromEntries(canonicalSearchParams),
        schema: erpPaymentPageSchema,
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
      title="Règlements"
      actions={
        canCreatePendingPayment ? (
          <Button
            title="Nouveau règlement"
            ariaLabel="Nouveau règlement"
            Icon={IconPlus}
            accent="blue"
            onClick={() => {
              if (context?.capabilities.createPendingPayment === true) {
                const invoiceId = canonicalSearchParams.get('invoiceId');
                const tierId = canonicalSearchParams.get('tierId');
                const newPaymentSearchParams = new URLSearchParams();

                if (invoiceId !== null && tierId !== null) {
                  newPaymentSearchParams.set('invoiceId', invoiceId);
                  newPaymentSearchParams.set('tierId', tierId);
                }

                navigate(
                  `/erp-maroc/payments/new${
                    newPaymentSearchParams.size === 0
                      ? ''
                      : `?${newPaymentSearchParams}`
                  }`,
                );
              }
            }}
          />
        ) : null
      }
    >
      <div>
        <select
          aria-label="Statut des règlements"
          value={canonicalSearchParams.get('status') ?? 'all'}
          onChange={(event) =>
            updateFilters({
              status: event.target.value === 'all' ? null : event.target.value,
            })
          }
        >
          <option value="all">Tous</option>
          {erpPaymentStatusSchema.options.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          aria-label="Type de règlement"
          value={canonicalSearchParams.get('kind') ?? 'all'}
          onChange={(event) =>
            updateFilters({
              kind: event.target.value === 'all' ? null : event.target.value,
            })
          }
        >
          <option value="all">Tous</option>
          {erpPaymentKindSchema.options.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
        <select
          aria-label="Mode de règlement"
          value={canonicalSearchParams.get('method') ?? 'all'}
          onChange={(event) =>
            updateFilters({
              method: event.target.value === 'all' ? null : event.target.value,
            })
          }
        >
          <option value="all">Tous</option>
          {erpPaymentMethodSchema.options.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
        <select
          aria-label="Règlements par page"
          value={canonicalSearchParams.get('limit') ?? '50'}
          onChange={(event) =>
            updateFilters({
              limit: event.target.value === '50' ? null : event.target.value,
            })
          }
        >
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
      <ErpOperationalTable
        ariaLabel="Règlements"
        columns={columns}
        rows={page.items}
        getRowKey={(row) => row.id}
        state={listState}
        loadingLabel="Chargement des règlements"
        emptyLabel="Aucun règlement sur la page chargée"
        errorLabel="Impossible de charger les règlements"
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
