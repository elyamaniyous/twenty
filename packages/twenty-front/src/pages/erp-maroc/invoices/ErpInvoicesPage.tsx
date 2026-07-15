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
import { ErpInvoiceCursorPagination } from '@/erp-maroc/invoices/ErpInvoiceCursorPagination';
import { ErpInvoiceFilters } from '@/erp-maroc/invoices/ErpInvoiceFilters';
import { formatMadCents } from '@/erp-maroc/utils/money';
import {
  canonicalizeErpQueryState,
  updateErpQueryState,
} from '@/erp-maroc/utils/queryState';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import {
  erpInvoicePageSchema,
  type ErpInvoicePage,
  type ErpInvoiceRead,
} from 'twenty-shared/erp-maroc';
import { IconArrowRight, IconPlus } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type ListState = 'loading' | 'ready' | 'error';

const EMPTY_PAGE: ErpInvoicePage = { items: [], nextCursor: null };

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledRowActions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const StyledOpenLink = styled(Link)`
  align-items: center;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  height: 28px;
  justify-content: center;
  width: 28px;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledInvoiceLink = styled(Link)`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const STATUS_APPEARANCE: Record<
  ErpInvoiceRead['status'],
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  VALIDATED: { label: 'Validée', tone: 'info' },
  SENT: { label: 'Envoyée', tone: 'info' },
  PARTIALLY_PAID: { label: 'Partiellement réglée', tone: 'warning' },
  PAID: { label: 'Payée', tone: 'success' },
  OVERDUE: { label: 'Échue', tone: 'danger' },
  CANCELLED: { label: 'Annulée', tone: 'neutral' },
};

const PDF_APPEARANCE: Record<
  ErpInvoiceRead['pdfGenerationStatus'],
  { label: string; tone: ErpStatusTone }
> = {
  NOT_REQUESTED: { label: 'PDF non demandé', tone: 'neutral' },
  PENDING: { label: 'PDF en attente', tone: 'warning' },
  PROCESSING: { label: 'PDF en cours', tone: 'info' },
  GENERATED: { label: 'PDF généré', tone: 'success' },
  FAILED: { label: 'PDF échoué', tone: 'danger' },
};

const DELIVERY_APPEARANCE: Record<
  NonNullable<ErpInvoiceRead['emailDelivery']>['status'],
  { label: string; tone: ErpStatusTone }
> = {
  PENDING: { label: 'Courriel en attente', tone: 'warning' },
  PROCESSING: { label: 'Courriel en cours', tone: 'info' },
  SENT: { label: 'Courriel envoyé', tone: 'success' },
  FAILED: { label: 'Courriel échoué', tone: 'danger' },
  RECONCILIATION_REQUIRED: { label: 'Courriel à vérifier', tone: 'warning' },
};

const getInvoiceRequestPath = (searchParams: URLSearchParams) => {
  const requestParams = new URLSearchParams();
  const cursor = searchParams.get('cursor');
  const limit = searchParams.get('limit');
  if (cursor !== null) requestParams.set('cursor', cursor);
  if (limit !== null) requestParams.set('limit', limit);
  const query = requestParams.toString();
  return query.length === 0 ? '/invoices' : `/invoices?${query}`;
};

const hasSamePageConfiguration = (
  current: URLSearchParams,
  next: URLSearchParams,
) =>
  ['status', 'delivery', 'limit'].every(
    (key) => current.get(key) === next.get(key),
  );

export const ErpInvoicesPage = () => {
  const { client, context } = useErpMarocContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState<ErpInvoicePage>(EMPTY_PAGE);
  const [listState, setListState] = useState<ListState>('loading');
  const [listGeneration, setListGeneration] = useState(0);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);

  const canonicalSearchParams = useMemo(
    () => canonicalizeErpQueryState('invoices', searchParams),
    [searchParams],
  );
  const requestPath = useMemo(
    () => getInvoiceRequestPath(canonicalSearchParams),
    [canonicalSearchParams],
  );
  const cursor = canonicalSearchParams.get('cursor');
  const statusFilter = canonicalSearchParams.get('status') ?? 'all';
  const deliveryFilter = canonicalSearchParams.get('delivery') ?? 'all';
  const limit = canonicalSearchParams.get('limit') ?? '';
  const canManageSalesDocuments =
    context?.capabilities.manageSalesDocuments === true;

  useEffect(() => {
    if (
      location.pathname === '/erp-maroc/invoices' &&
      searchParams.toString() !== canonicalSearchParams.toString()
    ) {
      setSearchParams(canonicalSearchParams, { replace: true });
    }
  }, [canonicalSearchParams, location.pathname, searchParams, setSearchParams]);

  useEffect(() => {
    const abortController = new AbortController();
    let isCurrent = true;
    setListState('loading');

    client
      .request({
        method: 'GET',
        path: requestPath,
        schema: erpInvoicePageSchema,
        signal: abortController.signal,
      })
      .then((loadedPage) => {
        if (!isCurrent || abortController.signal.aborted) return;
        setPage(loadedPage);
        setListState('ready');
      })
      .catch(() => {
        if (!isCurrent || abortController.signal.aborted) return;
        setListState('error');
      });

    return () => {
      isCurrent = false;
      abortController.abort();
    };
  }, [client, listGeneration, requestPath]);

  const visibleInvoices = useMemo(
    () =>
      page.items.filter(
        (invoice) =>
          (statusFilter === 'all' || invoice.status === statusFilter) &&
          (deliveryFilter === 'all' ||
            invoice.emailDelivery?.status === deliveryFilter),
      ),
    [deliveryFilter, page.items, statusFilter],
  );

  const updatePageConfiguration = (changes: Record<string, string | null>) => {
    const nextSearchParams = updateErpQueryState(
      'invoices',
      canonicalSearchParams,
      changes,
    );
    if (!hasSamePageConfiguration(canonicalSearchParams, nextSearchParams)) {
      setCursorHistory([]);
    }
    setSearchParams(nextSearchParams);
  };

  const goToNextPage = () => {
    if (page.nextCursor === null || listState !== 'ready') return;
    setCursorHistory((history) => [...history, cursor]);
    setSearchParams(
      updateErpQueryState('invoices', canonicalSearchParams, {
        cursor: page.nextCursor,
      }),
    );
  };

  const goToPreviousPage = () => {
    const previousCursor = cursorHistory.at(-1);
    if (previousCursor === undefined || listState !== 'ready') return;
    setCursorHistory((history) => history.slice(0, -1));
    setSearchParams(
      updateErpQueryState('invoices', canonicalSearchParams, {
        cursor: previousCursor,
      }),
    );
  };

  const columns: ErpOperationalTableColumn<ErpInvoiceRead>[] = [
    {
      key: 'number',
      header: 'Numéro',
      width: '150px',
      render: (row) => (
        <StyledInvoiceLink to={`/erp-maroc/invoices/${row.id}`}>
          {row.number ?? 'Brouillon sans numéro'}
        </StyledInvoiceLink>
      ),
    },
    {
      key: 'tier',
      header: 'Client',
      width: '210px',
      render: (row) => row.tier.name,
    },
    {
      key: 'issueDate',
      header: 'Émission',
      width: '120px',
      render: (row) => row.issueDate,
    },
    {
      key: 'dueDate',
      header: 'Échéance',
      width: '120px',
      render: (row) => row.dueDate,
    },
    {
      key: 'total',
      header: 'Total TTC',
      width: '150px',
      align: 'right',
      render: (row) => formatMadCents(row.totalTtcCents),
    },
    {
      key: 'outstanding',
      header: 'Restant',
      width: '150px',
      align: 'right',
      render: (row) => formatMadCents(row.outstandingCents),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '150px',
      render: (row) => {
        const appearance = STATUS_APPEARANCE[row.status];
        return (
          <ErpStatusBadge label={appearance.label} tone={appearance.tone} />
        );
      },
    },
    {
      key: 'pdf',
      header: 'PDF',
      width: '160px',
      render: (row) => {
        const appearance = PDF_APPEARANCE[row.pdfGenerationStatus];
        return (
          <ErpStatusBadge label={appearance.label} tone={appearance.tone} />
        );
      },
    },
    {
      key: 'delivery',
      header: 'Courriel',
      width: '180px',
      render: (row) => {
        if (row.emailDelivery === null) {
          return <ErpStatusBadge label="Courriel non demandé" tone="neutral" />;
        }
        const appearance = DELIVERY_APPEARANCE[row.emailDelivery.status];
        return (
          <ErpStatusBadge label={appearance.label} tone={appearance.tone} />
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '100px',
      align: 'right',
      render: (row) => {
        const number = row.number ?? 'la facture';
        return (
          <StyledRowActions>
            <StyledOpenLink
              to={`/erp-maroc/invoices/${row.id}`}
              title={`Ouvrir ${number}`}
              aria-label={`Ouvrir ${number}`}
            >
              <IconArrowRight size={16} />
            </StyledOpenLink>
          </StyledRowActions>
        );
      },
    },
  ];

  return (
    <ErpPageShell
      title="Factures"
      actions={
        canManageSalesDocuments ? (
          <StyledActions>
            <Button
              title="Nouvelle facture"
              ariaLabel="Nouvelle facture"
              Icon={IconPlus}
              accent="blue"
              onClick={() => {
                if (context?.capabilities.manageSalesDocuments === true) {
                  navigate('/erp-maroc/invoices/new');
                }
              }}
            />
          </StyledActions>
        ) : null
      }
    >
      <StyledContent>
        <ErpInvoiceFilters
          status={statusFilter}
          delivery={deliveryFilter}
          limit={limit}
          showLoadedPage={listState === 'ready'}
          onChange={updatePageConfiguration}
        />
        <ErpOperationalTable
          ariaLabel="Factures"
          columns={columns}
          rows={visibleInvoices}
          getRowKey={(row) => row.id}
          state={listState}
          loadingLabel="Chargement des factures"
          emptyLabel="Aucune facture sur la page chargée"
          errorLabel="Impossible de charger les factures"
          retryLabel="Réessayer"
          onRetry={() => setListGeneration((generation) => generation + 1)}
        />
        <ErpInvoiceCursorPagination
          hasPrevious={cursorHistory.length > 0}
          hasNext={page.nextCursor !== null}
          disabled={listState !== 'ready'}
          onPrevious={goToPreviousPage}
          onNext={goToNextPage}
        />
      </StyledContent>
    </ErpPageShell>
  );
};
