import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
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
  ErpOpportunityPickerDrawer,
  type QuoteReconciliationState,
} from '@/erp-maroc/quotes/ErpOpportunityPickerDrawer';
import { ErpQuoteFilters } from '@/erp-maroc/quotes/ErpQuoteFilters';
import {
  buildOpportunityQuotePayload,
  type OpportunityQuotePayloadError,
  type TwentyOpportunityRecord,
} from '@/erp-maroc/quotes/buildOpportunityQuotePayload';
import { formatMadCents } from '@/erp-maroc/utils/money';
import {
  canonicalizeErpQueryState,
  updateErpQueryState,
} from '@/erp-maroc/utils/queryState';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import {
  erpQuoteListSchema,
  erpQuoteSchema,
  erpTierListSchema,
  type ErpQuote,
  type ErpTier,
} from 'twenty-shared/erp-maroc';
import { IconArrowRight, IconPlus } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const OPPORTUNITY_PAGE_LIMIT = 20;

type TwentyOpportunityObjectRecord = TwentyOpportunityRecord & {
  __typename: string;
};

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

const StyledQuoteLink = styled(Link)`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

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

const isUncertainMutationError = (error: unknown) =>
  !(error instanceof ErpMarocError) ||
  error.statusCode === 409 ||
  error.statusCode === 429 ||
  error.statusCode >= 500;

export const ErpQuotesPage = () => {
  const { client, context } = useErpMarocContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [quotes, setQuotes] = useState<ErpQuote[]>([]);
  const [tiers, setTiers] = useState<ErpTier[]>([]);
  const [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [listGeneration, setListGeneration] = useState(0);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<TwentyOpportunityRecord | null>(null);
  // Reconciliation reads the selected source after an asynchronous list refresh.
  // oxlint-disable-next-line twenty/no-state-useref
  const selectedOpportunityRef = useRef<TwentyOpportunityRecord | null>(null);
  const [payloadErrors, setPayloadErrors] = useState<
    OpportunityQuotePayloadError[]
  >([]);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reconciliation, setReconciliationState] =
    useState<QuoteReconciliationState>(null);
  // Network locks and reconciliation must change before React can render again.
  // oxlint-disable-next-line twenty/no-state-useref
  const mutationLock = useRef(false);
  // oxlint-disable-next-line twenty/no-state-useref
  const reconciliationRef = useRef<QuoteReconciliationState>(null);
  // oxlint-disable-next-line twenty/no-state-useref
  const hasLoaded = useRef(false);
  // oxlint-disable-next-line twenty/no-state-useref
  const openedResumeOpportunity = useRef<string | null>(null);
  // oxlint-disable-next-line twenty/no-state-useref
  const attemptedResumeOpportunity = useRef<string | null>(null);

  const setReconciliation = (value: QuoteReconciliationState) => {
    reconciliationRef.current = value;
    setReconciliationState(value);
  };

  const canManageSalesDocuments =
    context?.capabilities.manageSalesDocuments === true;
  const hasSalesPermission = () =>
    context?.capabilities.manageSalesDocuments === true;

  const canonicalSearchParams = useMemo(
    () => canonicalizeErpQueryState('quotes', searchParams),
    [searchParams],
  );
  const resumeOpportunityId = canonicalSearchParams.get('resumeOpportunityId');

  const opportunityQuery = useFindManyRecords<TwentyOpportunityObjectRecord>({
    objectNameSingular: 'opportunity',
    recordGqlFields: {
      id: true,
      name: true,
      amount: true,
      companyId: true,
      pointOfContactId: true,
      company: { name: true },
      pointOfContact: { name: true },
    },
    limit: OPPORTUNITY_PAGE_LIMIT,
    skip: !isPickerOpen,
  });
  const targetedOpportunityQuery =
    useFindManyRecords<TwentyOpportunityObjectRecord>({
      objectNameSingular: 'opportunity',
      recordGqlFields: {
        id: true,
        name: true,
        amount: true,
        companyId: true,
        pointOfContactId: true,
        company: { name: true },
        pointOfContact: { name: true },
      },
      filter:
        resumeOpportunityId === null
          ? undefined
          : { id: { eq: resumeOpportunityId } },
      limit: 1,
      skip:
        !isPickerOpen ||
        !canManageSalesDocuments ||
        resumeOpportunityId === null,
    });

  useEffect(() => {
    if (
      location.pathname === '/erp-maroc/quotes' &&
      searchParams.toString() !== canonicalSearchParams.toString()
    ) {
      setSearchParams(canonicalSearchParams, { replace: true });
    }
  }, [canonicalSearchParams, location.pathname, searchParams, setSearchParams]);

  useEffect(() => {
    if (
      location.pathname !== '/erp-maroc/quotes' ||
      !canManageSalesDocuments ||
      resumeOpportunityId === null ||
      openedResumeOpportunity.current === resumeOpportunityId
    ) {
      return;
    }

    openedResumeOpportunity.current = resumeOpportunityId;
    selectedOpportunityRef.current = null;
    setSelectedOpportunity(null);
    setPayloadErrors([]);
    setMutationError(null);
    setReconciliation(null);
    setIsPickerOpen(true);
  }, [canManageSalesDocuments, location.pathname, resumeOpportunityId]);

  useEffect(() => {
    const abortController = new AbortController();
    let isCurrent = true;
    if (!hasLoaded.current) setListStatus('loading');

    Promise.all([
      client.request({
        method: 'GET',
        path: '/quotes',
        schema: erpQuoteListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/tiers',
        schema: erpTierListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(([loadedQuotes, loadedTiers]) => {
        if (!isCurrent || abortController.signal.aborted) return;
        hasLoaded.current = true;
        setQuotes(loadedQuotes);
        setTiers(loadedTiers);
        setListStatus('ready');

        if (
          reconciliationRef.current === 'refreshing' &&
          selectedOpportunityRef.current !== null
        ) {
          const reconciledQuote = loadedQuotes.find(
            ({ twentyOpportunityId }) =>
              twentyOpportunityId === selectedOpportunityRef.current?.id,
          );
          if (reconciledQuote !== undefined) {
            setReconciliation(null);
            navigate(`/erp-maroc/quotes/${reconciledQuote.id}`);
          } else {
            setReconciliation('needs-ack');
          }
        }
      })
      .catch(() => {
        if (!isCurrent || abortController.signal.aborted) return;
        setListStatus('error');
        if (reconciliationRef.current === 'refreshing') {
          setReconciliation('failed');
        }
      });

    return () => {
      isCurrent = false;
      abortController.abort();
    };
  }, [client, listGeneration, navigate]);

  const statusFilter = canonicalSearchParams.get('status') ?? 'all';
  const tierFilter = canonicalSearchParams.get('tierId') ?? '';
  const filteredQuotes = useMemo(
    () =>
      quotes.filter(
        (quote) =>
          (statusFilter === 'all' || quote.status === statusFilter) &&
          (tierFilter === '' || quote.tierId === tierFilter),
      ),
    [quotes, statusFilter, tierFilter],
  );
  const tierNames = useMemo(
    () => new Map(tiers.map(({ id, name }) => [id, name])),
    [tiers],
  );

  const updateFilters = (changes: Record<string, string | null>) =>
    setSearchParams(
      updateErpQueryState('quotes', canonicalSearchParams, changes),
    );

  const retryList = () => {
    if (reconciliationRef.current === 'failed') {
      setReconciliation('refreshing');
    }
    setListGeneration((current) => current + 1);
  };

  const openOpportunityPicker = () => {
    if (!hasSalesPermission()) return;
    setPayloadErrors([]);
    setMutationError(null);
    setReconciliation(null);
    setIsPickerOpen(true);
  };

  const closeOpportunityPicker = () => {
    if (mutationLock.current || reconciliationRef.current !== null) return;
    setIsPickerOpen(false);
    setPayloadErrors([]);
    setMutationError(null);
    setReconciliation(null);
  };

  const selectOpportunity = (opportunity: TwentyOpportunityRecord) => {
    if (mutationLock.current || reconciliationRef.current !== null) return;
    selectedOpportunityRef.current = opportunity;
    setSelectedOpportunity(opportunity);
    setPayloadErrors([]);
    setMutationError(null);
  };

  const submitOpportunityRecord = useCallback(
    async (
      opportunity: TwentyOpportunityRecord,
      allowTierRedirect: boolean,
    ) => {
      if (
        context?.capabilities.manageSalesDocuments !== true ||
        mutationLock.current ||
        reconciliationRef.current !== null
      ) {
        return;
      }

      const payloadResult = buildOpportunityQuotePayload(opportunity, tiers);
      if (payloadResult.status === 'blocked') {
        setPayloadErrors(payloadResult.errors);
        return;
      }
      if (payloadResult.status === 'needs-tier-sync') {
        if (allowTierRedirect) {
          navigate(payloadResult.route);
        } else {
          setMutationError(
            'Le tiers lié est encore absent. Synchronisez-le avant de reprendre ce devis.',
          );
        }
        return;
      }

      selectedOpportunityRef.current = opportunity;
      setSelectedOpportunity(opportunity);
      mutationLock.current = true;
      setIsSubmitting(true);
      setPayloadErrors([]);
      setMutationError(null);
      try {
        const intent = client.createMutationIntent(
          {
            method: 'POST',
            path: '/quotes/from-opportunity',
            schema: erpQuoteSchema,
            body: payloadResult.payload,
          },
          { idempotency: 'forbidden' },
        );
        const savedQuote = await intent.execute();
        navigate(`/erp-maroc/quotes/${savedQuote.id}`);
      } catch (error) {
        if (isUncertainMutationError(error)) {
          setReconciliation('refreshing');
          setListGeneration((current) => current + 1);
        } else {
          setMutationError('Impossible de créer le devis');
        }
      } finally {
        mutationLock.current = false;
        setIsSubmitting(false);
      }
    },
    [client, context?.capabilities.manageSalesDocuments, navigate, tiers],
  );

  const submitOpportunity = () => {
    if (selectedOpportunity === null) return;
    void submitOpportunityRecord(
      selectedOpportunity,
      resumeOpportunityId === null,
    );
  };

  useEffect(() => {
    if (
      !isPickerOpen ||
      !canManageSalesDocuments ||
      resumeOpportunityId === null ||
      listStatus !== 'ready' ||
      targetedOpportunityQuery.loading ||
      targetedOpportunityQuery.error !== undefined ||
      attemptedResumeOpportunity.current === resumeOpportunityId
    ) {
      return;
    }

    const opportunity = targetedOpportunityQuery.records.find(
      ({ id }) => id === resumeOpportunityId,
    );
    if (opportunity === undefined) return;

    attemptedResumeOpportunity.current = resumeOpportunityId;
    selectedOpportunityRef.current = opportunity;
    setSelectedOpportunity(opportunity);
    void submitOpportunityRecord(opportunity, false);
  }, [
    canManageSalesDocuments,
    isPickerOpen,
    listStatus,
    resumeOpportunityId,
    submitOpportunityRecord,
    targetedOpportunityQuery.error,
    targetedOpportunityQuery.loading,
    targetedOpportunityQuery.records,
  ]);

  const columns: ErpOperationalTableColumn<ErpQuote>[] = [
    {
      key: 'number',
      header: 'Numéro',
      width: '150px',
      render: (row) => (
        <StyledQuoteLink to={`/erp-maroc/quotes/${row.id}`}>
          {row.number}
        </StyledQuoteLink>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '120px',
      render: (row) => {
        const appearance = STATUS_APPEARANCE[row.status];
        return (
          <ErpStatusBadge label={appearance.label} tone={appearance.tone} />
        );
      },
    },
    {
      key: 'tier',
      header: 'Client',
      width: '220px',
      render: (row) => tierNames.get(row.tierId) ?? 'Client indisponible',
    },
    {
      key: 'issueDate',
      header: 'Émission',
      width: '120px',
      render: (row) => row.issueDate,
    },
    {
      key: 'validUntil',
      header: 'Validité',
      width: '120px',
      render: (row) => row.validUntil ?? '—',
    },
    {
      key: 'total',
      header: 'Total TTC',
      width: '150px',
      align: 'right',
      render: (row) => formatMadCents(row.totalTtcCents),
    },
    {
      key: 'source',
      header: 'Source',
      width: '130px',
      render: (row) =>
        row.twentyOpportunityId === null ? 'Manuel' : 'Opportunité',
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '100px',
      align: 'right',
      render: (row) => (
        <StyledRowActions>
          <StyledOpenLink
            to={`/erp-maroc/quotes/${row.id}`}
            title={`Ouvrir ${row.number}`}
            aria-label={`Ouvrir ${row.number}`}
          >
            <IconArrowRight size={16} />
          </StyledOpenLink>
        </StyledRowActions>
      ),
    },
  ];

  return (
    <ErpPageShell
      title="Devis"
      actions={
        canManageSalesDocuments ? (
          <StyledActions>
            <Button
              title="Créer depuis une opportunité"
              ariaLabel="Créer depuis une opportunité"
              variant="secondary"
              onClick={openOpportunityPicker}
            />
            <Button
              title="Nouveau devis"
              ariaLabel="Nouveau devis"
              Icon={IconPlus}
              accent="blue"
              onClick={() => {
                if (hasSalesPermission()) navigate('/erp-maroc/quotes/new');
              }}
            />
          </StyledActions>
        ) : null
      }
    >
      <StyledContent>
        <ErpQuoteFilters
          status={statusFilter}
          tierId={tierFilter}
          tiers={tiers}
          onChange={updateFilters}
        />
        <ErpOperationalTable
          ariaLabel="Devis"
          columns={columns}
          rows={filteredQuotes}
          getRowKey={(row) => row.id}
          state={listStatus}
          loadingLabel="Chargement des devis"
          emptyLabel="Aucun devis sur la page chargée"
          errorLabel="Impossible de charger les devis"
          retryLabel="Réessayer"
          onRetry={retryList}
        />
      </StyledContent>

      <ErpOpportunityPickerDrawer
        isOpen={isPickerOpen}
        selected={selectedOpportunity}
        picker={{
          records:
            resumeOpportunityId === null
              ? opportunityQuery.records
              : targetedOpportunityQuery.records,
          loading:
            resumeOpportunityId === null
              ? opportunityQuery.loading
              : targetedOpportunityQuery.loading,
          error:
            resumeOpportunityId === null
              ? opportunityQuery.error
              : targetedOpportunityQuery.error,
          hasNextPage:
            resumeOpportunityId === null && opportunityQuery.hasNextPage,
          onRetry:
            resumeOpportunityId === null
              ? opportunityQuery.refetch
              : targetedOpportunityQuery.refetch,
          onLoadMore: opportunityQuery.fetchMoreRecords,
          loadingLabel:
            resumeOpportunityId === null
              ? undefined
              : 'Chargement de l’opportunité ciblée',
          errorLabel:
            resumeOpportunityId === null
              ? undefined
              : 'Impossible de charger l’opportunité ciblée',
          emptyLabel:
            resumeOpportunityId === null
              ? undefined
              : 'Opportunité ciblée introuvable',
          retryLabel:
            resumeOpportunityId === null
              ? undefined
              : 'Réessayer l’opportunité ciblée',
        }}
        errors={payloadErrors}
        mutationError={mutationError}
        reconciliation={reconciliation}
        canManage={canManageSalesDocuments}
        isSubmitting={isSubmitting}
        onSelect={selectOpportunity}
        onClose={closeOpportunityPicker}
        onSubmit={submitOpportunity}
        onRetryReconciliation={retryList}
        onAcknowledge={() => {
          setReconciliation(null);
          setMutationError(null);
        }}
      />
    </ErpPageShell>
  );
};
