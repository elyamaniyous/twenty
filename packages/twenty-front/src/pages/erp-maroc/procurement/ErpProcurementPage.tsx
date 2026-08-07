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
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import { generatePath, Link } from 'react-router-dom';
import {
  erpMarocUpstreamRoutes,
  erpPurchaseRequestListSchema,
  erpPurchaseRequestSchema,
  erpSourcingEventListSchema,
  erpSourcingEventSchema,
  erpTierListSchema,
  type ErpPurchaseRequest,
  type ErpSourcingEvent,
  type ErpTier,
} from 'twenty-shared/erp-maroc';
import { IconArrowRight, IconCheck, IconPlus, IconX } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type View = 'requests' | 'events';

type RequestLineDraft = {
  key: number;
  description: string;
  unit: string;
  quantity: string;
  estimatedUnitPriceHt: string;
  tvaRate: string;
};

const today = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Casablanca' });

const addDays = (dateValue: string, days: number) => {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const emptyRequestLine = (key: number): RequestLineDraft => ({
  key,
  description: '',
  unit: 'unité',
  quantity: '1',
  estimatedUnitPriceHt: '',
  tvaRate: '20',
});

const requestStatus: Record<
  ErpPurchaseRequest['status'],
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  SUBMITTED: { label: 'À approuver', tone: 'warning' },
  APPROVED: { label: 'Approuvée', tone: 'success' },
  SOURCING: { label: 'En consultation', tone: 'info' },
  ORDERED: { label: 'Commandée', tone: 'success' },
  CANCELLED: { label: 'Annulée', tone: 'danger' },
};

const eventStatus: Record<
  ErpSourcingEvent['status'],
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'À ouvrir', tone: 'neutral' },
  OPEN: { label: 'Réponses ouvertes', tone: 'info' },
  CLOSED: { label: 'À attribuer', tone: 'warning' },
  AWARDED: { label: 'Attribuée', tone: 'success' },
  CANCELLED: { label: 'Annulée', tone: 'danger' },
};

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const StyledTabs = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  min-height: 40px;
  padding: 0 ${themeCssVariables.spacing[4]};
`;

const StyledTab = styled.button<{ $active: boolean }>`
  background: transparent;
  border: 0;
  border-bottom: 2px solid
    ${({ $active }) => ($active ? themeCssVariables.color.blue : 'transparent')};
  color: ${({ $active }) =>
    $active
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  font: inherit;
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledSummary = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StyledSummaryItem = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-height: 58px;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  span {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
  }

  strong {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.lg};
  }
`;

const StyledPanel = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledPanelHeader = styled.div`
  align-items: flex-start;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;

  h2 {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.md};
    letter-spacing: 0;
    margin: 0;
  }

  p {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
    margin: ${themeCssVariables.spacing[1]} 0 0;
  }
`;

const StyledFormGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const fieldStyles = `
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  min-height: 32px;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledInput = styled.input`
  ${fieldStyles}
`;

const StyledSelect = styled.select`
  ${fieldStyles}
`;

const StyledTextarea = styled.textarea`
  ${fieldStyles}
  min-height: 72px;
  padding-bottom: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[2]};
  resize: vertical;
`;

const StyledWideField = styled(StyledField)`
  grid-column: 1 / -1;
`;

const StyledLineTable = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  overflow-x: auto;
`;

const StyledLine = styled.div`
  align-items: end;
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(220px, 2fr) 100px 100px 140px 90px 32px;
  min-width: 760px;
`;

const StyledIconButton = styled.button`
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: inline-flex;
  height: 32px;
  justify-content: center;
  width: 32px;

  &:hover {
    background: ${themeCssVariables.background.secondary};
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledInlineActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledSmallButton = styled.button`
  background: transparent;
  border: 0;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.color.blue};
  cursor: pointer;
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  min-height: 28px;
  padding: 0 ${themeCssVariables.spacing[2]};
  white-space: nowrap;

  &:hover {
    background: ${themeCssVariables.background.secondary};
  }

  &:disabled {
    color: ${themeCssVariables.font.color.tertiary};
    cursor: default;
  }
`;

const StyledSupplierGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media (max-width: 768px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledSupplierOption = styled.label`
  align-items: center;
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 36px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledComparator = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  min-height: 160px;
`;

const StyledDetailLink = styled(Link)`
  align-items: center;
  color: ${themeCssVariables.color.blue};
  display: inline-flex;
  gap: ${themeCssVariables.spacing[1]};
  text-decoration: none;
`;

export const ErpProcurementPage = () => {
  const { client, context } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [view, setView] = useState<View>('requests');
  const [requests, setRequests] = useState<ErpPurchaseRequest[]>([]);
  const [events, setEvents] = useState<ErpSourcingEvent[]>([]);
  const [tiers, setTiers] = useState<ErpTier[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [isMutating, setIsMutating] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventRequestId, setEventRequestId] = useState<string | null>(null);
  const [lineKey, setLineKey] = useState(2);
  const [requestDraft, setRequestDraft] = useState({
    title: '',
    department: '',
    requestDate: today(),
    desiredDeliveryDate: '',
    estimatedBudget: '',
    notes: '',
  });
  const [requestLines, setRequestLines] = useState<RequestLineDraft[]>([
    emptyRequestLine(1),
  ]);
  const [eventDraft, setEventDraft] = useState({
    type: 'REQUEST_FOR_QUOTATION' as 'REQUEST_FOR_QUOTATION' | 'PRIVATE_TENDER',
    title: '',
    responseDeadline: addDays(today(), 7),
    priceWeight: '60',
    deliveryWeight: '25',
    paymentTermsWeight: '15',
    notes: '',
    supplierIds: [] as string[],
  });
  const [bidDraft, setBidDraft] = useState({
    supplierId: '',
    externalReference: '',
    issueDate: today(),
    validityDate: '',
    deliveryDays: '7',
    paymentTermsDays: '30',
    warranty: '',
    notes: '',
    prices: {} as Record<string, string>,
    tvaRates: {} as Record<string, string>,
  });

  const canManage = context?.capabilities.manageSupplierAccounting === true;
  const canApprove = context?.role === 'OWNER' || context?.role === 'ADMIN';
  const suppliers = useMemo(
    () =>
      tiers.filter(
        (tier) =>
          tier.isActive &&
          (tier.type === 'FOURNISSEUR' || tier.type === 'MIXTE'),
      ),
    [tiers],
  );
  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    Promise.all([
      client.request({
        method: 'GET',
        path: erpMarocUpstreamRoutes.procurement.requests,
        schema: erpPurchaseRequestListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: erpMarocUpstreamRoutes.procurement.events,
        schema: erpSourcingEventListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: erpMarocUpstreamRoutes.tiers.collection,
        schema: erpTierListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(([loadedRequests, loadedEvents, loadedTiers]) => {
        if (abortController.signal.aborted) return;
        setRequests(loadedRequests);
        setEvents(loadedEvents);
        setTiers(loadedTiers);
        setSelectedEventId((current) =>
          loadedEvents.some((event) => event.id === current)
            ? current
            : (loadedEvents[0]?.id ?? null),
        );
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client, generation]);

  useEffect(() => {
    if (!selectedEvent) return;
    setBidDraft((current) => ({
      ...current,
      supplierId:
        selectedEvent.invitedSuppliers.find(
          ({ supplierId }) =>
            !selectedEvent.bids.some((bid) => bid.supplierId === supplierId),
        )?.supplierId ?? '',
      prices: Object.fromEntries(
        selectedEvent.purchaseRequest.lines.map((line) => [line.id, '']),
      ),
      tvaRates: Object.fromEntries(
        selectedEvent.purchaseRequest.lines.map((line) => [
          line.id,
          String(line.tvaRate),
        ]),
      ),
    }));
  }, [selectedEvent]);

  const runMutation = async (
    action: () => Promise<unknown>,
    message: string,
  ) => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      await action();
      enqueueSuccessSnackBar({ message });
      setGeneration((value) => value + 1);
    } catch {
      enqueueErrorSnackBar({ message: "L'opération n'a pas pu être réalisée" });
    } finally {
      setIsMutating(false);
    }
  };

  const createRequest = () =>
    runMutation(async () => {
      if (!context?.societeId) throw new Error('Missing company');
      await client.request({
        method: 'POST',
        path: erpMarocUpstreamRoutes.procurement.requests,
        schema: erpPurchaseRequestSchema,
        body: {
          societeId: context.societeId,
          ...requestDraft,
          desiredDeliveryDate: requestDraft.desiredDeliveryDate || null,
          estimatedBudget: requestDraft.estimatedBudget
            ? Number(requestDraft.estimatedBudget)
            : null,
          lines: requestLines.map((line) => ({
            description: line.description,
            unit: line.unit || null,
            quantity: Number(line.quantity),
            estimatedUnitPriceHt: line.estimatedUnitPriceHt
              ? Number(line.estimatedUnitPriceHt)
              : null,
            tvaRate: Number(line.tvaRate),
          })),
        },
      });
      setShowRequestForm(false);
      setRequestDraft({
        title: '',
        department: '',
        requestDate: today(),
        desiredDeliveryDate: '',
        estimatedBudget: '',
        notes: '',
      });
      setRequestLines([emptyRequestLine(lineKey)]);
      setLineKey((value) => value + 1);
    }, "Demande d'achat créée");

  const mutateRequest = (
    request: ErpPurchaseRequest,
    action: 'submit' | 'approve',
  ) =>
    runMutation(
      () =>
        client.request({
          method: 'POST',
          path:
            action === 'submit'
              ? erpMarocUpstreamRoutes.procurement.submitRequest(request.id)
              : erpMarocUpstreamRoutes.procurement.approveRequest(request.id),
          schema: erpPurchaseRequestSchema,
        }),
      action === 'submit' ? 'Demande soumise' : 'Demande approuvée',
    );

  const beginEvent = (request: ErpPurchaseRequest) => {
    setEventRequestId(request.id);
    setEventDraft((current) => ({
      ...current,
      title: `Consultation — ${request.number} — ${request.title}`,
      supplierIds: [],
    }));
    setView('events');
  };

  const createEvent = () => {
    if (!eventRequestId) return;
    void runMutation(async () => {
      const event = await client.request({
        method: 'POST',
        path: erpMarocUpstreamRoutes.procurement.createEvent(eventRequestId),
        schema: erpSourcingEventSchema,
        body: {
          ...eventDraft,
          priceWeight: Number(eventDraft.priceWeight),
          deliveryWeight: Number(eventDraft.deliveryWeight),
          paymentTermsWeight: Number(eventDraft.paymentTermsWeight),
        },
      });
      setSelectedEventId(event.id);
      setEventRequestId(null);
    }, 'Consultation créée');
  };

  const mutateEvent = (event: ErpSourcingEvent, action: 'open' | 'close') =>
    runMutation(
      () =>
        client.request({
          method: 'POST',
          path:
            action === 'open'
              ? erpMarocUpstreamRoutes.procurement.openEvent(event.id)
              : erpMarocUpstreamRoutes.procurement.closeEvent(event.id),
          schema: erpSourcingEventSchema,
        }),
      action === 'open' ? 'Consultation ouverte' : 'Consultation clôturée',
    );

  const recordBid = () => {
    if (!selectedEvent) return;
    void runMutation(
      () =>
        client.request({
          method: 'POST',
          path: erpMarocUpstreamRoutes.procurement.bids(selectedEvent.id),
          schema: erpSourcingEventSchema,
          body: {
            supplierId: bidDraft.supplierId,
            externalReference: bidDraft.externalReference,
            issueDate: bidDraft.issueDate,
            validityDate: bidDraft.validityDate || null,
            deliveryDays: Number(bidDraft.deliveryDays),
            paymentTermsDays: Number(bidDraft.paymentTermsDays),
            warranty: bidDraft.warranty || null,
            notes: bidDraft.notes || null,
            lines: selectedEvent.purchaseRequest.lines.map((line) => ({
              purchaseRequestLineId: line.id,
              unitPriceHt: Number(bidDraft.prices[line.id]),
              tvaRate: Number(bidDraft.tvaRates[line.id]),
            })),
          },
        }),
      'Offre fournisseur enregistrée',
    );
  };

  const awardBid = (bidId: string) => {
    if (!selectedEvent) return;
    void runMutation(
      () =>
        client.request({
          method: 'POST',
          path: erpMarocUpstreamRoutes.procurement.awardEvent(selectedEvent.id),
          schema: erpSourcingEventSchema,
          body: { bidId },
        }),
      'Offre retenue et bon de commande créé',
    );
  };

  const requestColumns = useMemo<
    ErpOperationalTableColumn<ErpPurchaseRequest>[]
  >(
    () => [
      {
        key: 'number',
        header: 'Demande',
        width: '150px',
        render: (request) => request.number,
      },
      {
        key: 'title',
        header: 'Besoin',
        width: '280px',
        render: (request) => request.title,
      },
      {
        key: 'department',
        header: 'Service',
        width: '150px',
        render: (request) => request.department ?? '—',
      },
      {
        key: 'date',
        header: 'Demandée le',
        width: '120px',
        render: (request) => request.requestDate,
      },
      {
        key: 'budget',
        header: 'Budget',
        width: '130px',
        align: 'right',
        render: (request) =>
          request.estimatedBudgetCents === null
            ? '—'
            : formatMadCents(request.estimatedBudgetCents),
      },
      {
        key: 'status',
        header: 'Statut',
        width: '145px',
        render: (request) => (
          <ErpStatusBadge {...requestStatus[request.status]} />
        ),
      },
      {
        key: 'actions',
        header: 'Action',
        width: '220px',
        render: (request) => (
          <StyledInlineActions>
            {request.status === 'DRAFT' ? (
              <StyledSmallButton
                type="button"
                disabled={isMutating}
                onClick={() => void mutateRequest(request, 'submit')}
              >
                Soumettre
              </StyledSmallButton>
            ) : null}
            {request.status === 'SUBMITTED' && canApprove ? (
              <StyledSmallButton
                type="button"
                disabled={isMutating}
                onClick={() => void mutateRequest(request, 'approve')}
              >
                Approuver
              </StyledSmallButton>
            ) : null}
            {request.status === 'APPROVED' ? (
              <StyledSmallButton
                type="button"
                disabled={isMutating}
                onClick={() => beginEvent(request)}
              >
                Consulter
              </StyledSmallButton>
            ) : null}
          </StyledInlineActions>
        ),
      },
    ],
    [canApprove, isMutating],
  );

  const eventColumns = useMemo<ErpOperationalTableColumn<ErpSourcingEvent>[]>(
    () => [
      {
        key: 'request',
        header: 'Demande',
        width: '150px',
        render: (event) => event.purchaseRequest.number,
      },
      {
        key: 'title',
        header: 'Consultation',
        width: '300px',
        render: (event) => event.title,
      },
      {
        key: 'type',
        header: 'Type',
        width: '130px',
        render: (event) =>
          event.type === 'PRIVATE_TENDER'
            ? "Appel d'offres"
            : 'Demande de prix',
      },
      {
        key: 'deadline',
        header: 'Échéance',
        width: '120px',
        render: (event) => event.responseDeadline.slice(0, 10),
      },
      {
        key: 'responses',
        header: 'Réponses',
        width: '110px',
        align: 'center',
        render: (event) =>
          `${event.bids.length}/${event.invitedSuppliers.length}`,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '155px',
        render: (event) => <ErpStatusBadge {...eventStatus[event.status]} />,
      },
      {
        key: 'open',
        header: '',
        width: '80px',
        align: 'right',
        render: (event) => (
          <StyledSmallButton
            type="button"
            onClick={() => setSelectedEventId(event.id)}
          >
            Ouvrir
          </StyledSmallButton>
        ),
      },
    ],
    [],
  );

  const requestSummary = {
    draft: requests.filter(({ status }) => status === 'DRAFT').length,
    approval: requests.filter(({ status }) => status === 'SUBMITTED').length,
    sourcing: requests.filter(({ status }) => status === 'SOURCING').length,
    ordered: requests.filter(({ status }) => status === 'ORDERED').length,
  };

  return (
    <ErpPageShell
      title="Demandes et appels d'offres"
      description="Du besoin interne à l'offre fournisseur retenue et au bon de commande"
      actions={
        canManage ? (
          <Button
            title="Nouvelle demande"
            ariaLabel="Créer une demande d'achat"
            Icon={IconPlus}
            variant="primary"
            accent="blue"
            onClick={() => {
              setView('requests');
              setShowRequestForm(true);
            }}
          />
        ) : null
      }
      state={state}
      loadingLabel="Chargement du sourcing achats"
      errorLabel="Impossible de charger les demandes et consultations"
      onRetry={() => setGeneration((value) => value + 1)}
    >
      <StyledContent>
        <StyledTabs role="tablist" aria-label="Cycle de sourcing achats">
          <StyledTab
            type="button"
            role="tab"
            aria-selected={view === 'requests'}
            $active={view === 'requests'}
            onClick={() => setView('requests')}
          >
            Demandes d'achat
          </StyledTab>
          <StyledTab
            type="button"
            role="tab"
            aria-selected={view === 'events'}
            $active={view === 'events'}
            onClick={() => setView('events')}
          >
            Consultations fournisseurs
          </StyledTab>
        </StyledTabs>

        {view === 'requests' ? (
          <>
            <StyledSummary aria-label="Synthèse des demandes d'achat">
              <StyledSummaryItem>
                <span>Brouillons</span>
                <strong>{requestSummary.draft}</strong>
              </StyledSummaryItem>
              <StyledSummaryItem>
                <span>À approuver</span>
                <strong>{requestSummary.approval}</strong>
              </StyledSummaryItem>
              <StyledSummaryItem>
                <span>En consultation</span>
                <strong>{requestSummary.sourcing}</strong>
              </StyledSummaryItem>
              <StyledSummaryItem>
                <span>Commandées</span>
                <strong>{requestSummary.ordered}</strong>
              </StyledSummaryItem>
            </StyledSummary>
            {showRequestForm ? (
              <StyledPanel>
                <StyledPanelHeader>
                  <div>
                    <h2>Nouvelle demande d'achat</h2>
                    <p>
                      Décrivez le besoin, son budget et les articles attendus.
                    </p>
                  </div>
                  <StyledIconButton
                    type="button"
                    aria-label="Fermer la saisie"
                    onClick={() => setShowRequestForm(false)}
                  >
                    <IconX size={16} />
                  </StyledIconButton>
                </StyledPanelHeader>
                <StyledFormGrid>
                  <StyledField>
                    Objet
                    <StyledInput
                      value={requestDraft.title}
                      onChange={(event) =>
                        setRequestDraft((draft) => ({
                          ...draft,
                          title: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                  <StyledField>
                    Service demandeur
                    <StyledInput
                      value={requestDraft.department}
                      onChange={(event) =>
                        setRequestDraft((draft) => ({
                          ...draft,
                          department: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                  <StyledField>
                    Date de demande
                    <StyledInput
                      type="date"
                      value={requestDraft.requestDate}
                      onChange={(event) =>
                        setRequestDraft((draft) => ({
                          ...draft,
                          requestDate: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                  <StyledField>
                    Livraison souhaitée
                    <StyledInput
                      type="date"
                      value={requestDraft.desiredDeliveryDate}
                      onChange={(event) =>
                        setRequestDraft((draft) => ({
                          ...draft,
                          desiredDeliveryDate: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                  <StyledField>
                    Budget estimé HT (MAD)
                    <StyledInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={requestDraft.estimatedBudget}
                      onChange={(event) =>
                        setRequestDraft((draft) => ({
                          ...draft,
                          estimatedBudget: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                  <StyledWideField>
                    Notes
                    <StyledTextarea
                      value={requestDraft.notes}
                      onChange={(event) =>
                        setRequestDraft((draft) => ({
                          ...draft,
                          notes: event.target.value,
                        }))
                      }
                    />
                  </StyledWideField>
                </StyledFormGrid>
                <StyledLineTable>
                  {requestLines.map((line) => (
                    <StyledLine key={line.key}>
                      <StyledField>
                        Description
                        <StyledInput
                          value={line.description}
                          onChange={(event) =>
                            setRequestLines((lines) =>
                              lines.map((item) =>
                                item.key === line.key
                                  ? { ...item, description: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </StyledField>
                      <StyledField>
                        Unité
                        <StyledInput
                          value={line.unit}
                          onChange={(event) =>
                            setRequestLines((lines) =>
                              lines.map((item) =>
                                item.key === line.key
                                  ? { ...item, unit: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </StyledField>
                      <StyledField>
                        Quantité
                        <StyledInput
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={line.quantity}
                          onChange={(event) =>
                            setRequestLines((lines) =>
                              lines.map((item) =>
                                item.key === line.key
                                  ? { ...item, quantity: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </StyledField>
                      <StyledField>
                        Prix estimé HT
                        <StyledInput
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.estimatedUnitPriceHt}
                          onChange={(event) =>
                            setRequestLines((lines) =>
                              lines.map((item) =>
                                item.key === line.key
                                  ? {
                                      ...item,
                                      estimatedUnitPriceHt: event.target.value,
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      </StyledField>
                      <StyledField>
                        TVA
                        <StyledSelect
                          value={line.tvaRate}
                          onChange={(event) =>
                            setRequestLines((lines) =>
                              lines.map((item) =>
                                item.key === line.key
                                  ? { ...item, tvaRate: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        >
                          {[0, 7, 10, 14, 20].map((rate) => (
                            <option key={rate} value={rate}>
                              {rate}%
                            </option>
                          ))}
                        </StyledSelect>
                      </StyledField>
                      <StyledIconButton
                        type="button"
                        aria-label="Supprimer la ligne"
                        disabled={requestLines.length === 1}
                        onClick={() =>
                          setRequestLines((lines) =>
                            lines.filter((item) => item.key !== line.key),
                          )
                        }
                      >
                        <IconX size={16} />
                      </StyledIconButton>
                    </StyledLine>
                  ))}
                </StyledLineTable>
                <StyledActions>
                  <Button
                    title="Ajouter une ligne"
                    ariaLabel="Ajouter une ligne"
                    Icon={IconPlus}
                    variant="secondary"
                    onClick={() => {
                      setRequestLines((lines) => [
                        ...lines,
                        emptyRequestLine(lineKey),
                      ]);
                      setLineKey((value) => value + 1);
                    }}
                  />
                  <Button
                    title="Enregistrer"
                    ariaLabel="Enregistrer la demande"
                    Icon={IconCheck}
                    variant="primary"
                    accent="blue"
                    disabled={isMutating}
                    onClick={() => void createRequest()}
                  />
                </StyledActions>
              </StyledPanel>
            ) : null}
            <ErpOperationalTable
              ariaLabel="Demandes d'achat"
              columns={requestColumns}
              rows={requests}
              getRowKey={(request) => request.id}
              emptyLabel="Aucune demande d'achat"
            />
          </>
        ) : (
          <>
            {eventRequestId ? (
              <StyledPanel>
                <StyledPanelHeader>
                  <div>
                    <h2>Nouvelle consultation fournisseur</h2>
                    <p>
                      Invitez les fournisseurs puis pondérez les critères de
                      comparaison.
                    </p>
                  </div>
                  <StyledIconButton
                    type="button"
                    aria-label="Fermer la saisie"
                    onClick={() => setEventRequestId(null)}
                  >
                    <IconX size={16} />
                  </StyledIconButton>
                </StyledPanelHeader>
                <StyledFormGrid>
                  <StyledField>
                    Procédure
                    <StyledSelect
                      value={eventDraft.type}
                      onChange={(event) =>
                        setEventDraft((draft) => ({
                          ...draft,
                          type: event.target.value as typeof draft.type,
                        }))
                      }
                    >
                      <option value="REQUEST_FOR_QUOTATION">
                        Demande de prix
                      </option>
                      <option value="PRIVATE_TENDER">
                        Appel d'offres privé
                      </option>
                    </StyledSelect>
                  </StyledField>
                  <StyledField>
                    Intitulé
                    <StyledInput
                      value={eventDraft.title}
                      onChange={(event) =>
                        setEventDraft((draft) => ({
                          ...draft,
                          title: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                  <StyledField>
                    Date limite
                    <StyledInput
                      type="date"
                      value={eventDraft.responseDeadline}
                      onChange={(event) =>
                        setEventDraft((draft) => ({
                          ...draft,
                          responseDeadline: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                  <StyledField>
                    Poids prix (%)
                    <StyledInput
                      type="number"
                      min="0"
                      max="100"
                      value={eventDraft.priceWeight}
                      onChange={(event) =>
                        setEventDraft((draft) => ({
                          ...draft,
                          priceWeight: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                  <StyledField>
                    Poids délai (%)
                    <StyledInput
                      type="number"
                      min="0"
                      max="100"
                      value={eventDraft.deliveryWeight}
                      onChange={(event) =>
                        setEventDraft((draft) => ({
                          ...draft,
                          deliveryWeight: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                  <StyledField>
                    Poids paiement (%)
                    <StyledInput
                      type="number"
                      min="0"
                      max="100"
                      value={eventDraft.paymentTermsWeight}
                      onChange={(event) =>
                        setEventDraft((draft) => ({
                          ...draft,
                          paymentTermsWeight: event.target.value,
                        }))
                      }
                    />
                  </StyledField>
                  <StyledWideField>
                    Notes
                    <StyledTextarea
                      value={eventDraft.notes}
                      onChange={(event) =>
                        setEventDraft((draft) => ({
                          ...draft,
                          notes: event.target.value,
                        }))
                      }
                    />
                  </StyledWideField>
                </StyledFormGrid>
                <StyledSupplierGrid>
                  {suppliers.map((supplier) => (
                    <StyledSupplierOption key={supplier.id}>
                      <input
                        type="checkbox"
                        checked={eventDraft.supplierIds.includes(supplier.id)}
                        onChange={() =>
                          setEventDraft((draft) => ({
                            ...draft,
                            supplierIds: draft.supplierIds.includes(supplier.id)
                              ? draft.supplierIds.filter(
                                  (id) => id !== supplier.id,
                                )
                              : [...draft.supplierIds, supplier.id],
                          }))
                        }
                      />
                      <span>{supplier.name}</span>
                    </StyledSupplierOption>
                  ))}
                </StyledSupplierGrid>
                <Button
                  title="Créer la consultation"
                  ariaLabel="Créer la consultation"
                  Icon={IconCheck}
                  variant="primary"
                  accent="blue"
                  disabled={isMutating}
                  onClick={createEvent}
                />
              </StyledPanel>
            ) : null}
            <ErpOperationalTable
              ariaLabel="Consultations fournisseurs"
              columns={eventColumns}
              rows={events}
              getRowKey={(event) => event.id}
              emptyLabel="Aucune consultation fournisseur"
            />
            {selectedEvent ? (
              <StyledPanel>
                <StyledPanelHeader>
                  <div>
                    <h2>{selectedEvent.title}</h2>
                    <p>
                      {selectedEvent.purchaseRequest.number} ·{' '}
                      {selectedEvent.invitedSuppliers.length} fournisseur(s)
                      invité(s) · poids {selectedEvent.priceWeight}/
                      {selectedEvent.deliveryWeight}/
                      {selectedEvent.paymentTermsWeight}
                    </p>
                  </div>
                  <ErpStatusBadge {...eventStatus[selectedEvent.status]} />
                </StyledPanelHeader>
                <StyledActions>
                  {selectedEvent.status === 'DRAFT' ? (
                    <Button
                      title="Ouvrir les réponses"
                      ariaLabel="Ouvrir la consultation"
                      Icon={IconArrowRight}
                      variant="primary"
                      accent="blue"
                      disabled={isMutating}
                      onClick={() => void mutateEvent(selectedEvent, 'open')}
                    />
                  ) : null}
                  {selectedEvent.status === 'OPEN' &&
                  selectedEvent.bids.length > 0 ? (
                    <Button
                      title="Clôturer"
                      ariaLabel="Clôturer la consultation"
                      Icon={IconCheck}
                      variant="secondary"
                      disabled={isMutating}
                      onClick={() => void mutateEvent(selectedEvent, 'close')}
                    />
                  ) : null}
                  {selectedEvent.generatedPurchaseOrder ? (
                    <StyledDetailLink
                      to={generatePath(erpMarocPaths.purchaseOrderDetail, {
                        id: selectedEvent.generatedPurchaseOrder.id,
                      })}
                    >
                      Ouvrir {selectedEvent.generatedPurchaseOrder.number}
                      <IconArrowRight size={14} />
                    </StyledDetailLink>
                  ) : null}
                </StyledActions>
                {selectedEvent.status === 'OPEN' &&
                selectedEvent.invitedSuppliers.some(
                  ({ supplierId }) =>
                    !selectedEvent.bids.some(
                      (bid) => bid.supplierId === supplierId,
                    ),
                ) ? (
                  <StyledPanel>
                    <StyledPanelHeader>
                      <div>
                        <h2>Enregistrer un devis reçu</h2>
                        <p>
                          Saisissez les conditions et les prix du document
                          fournisseur.
                        </p>
                      </div>
                    </StyledPanelHeader>
                    <StyledFormGrid>
                      <StyledField>
                        Fournisseur
                        <StyledSelect
                          value={bidDraft.supplierId}
                          onChange={(event) =>
                            setBidDraft((draft) => ({
                              ...draft,
                              supplierId: event.target.value,
                            }))
                          }
                        >
                          {selectedEvent.invitedSuppliers
                            .filter(
                              ({ supplierId }) =>
                                !selectedEvent.bids.some(
                                  (bid) => bid.supplierId === supplierId,
                                ),
                            )
                            .map(({ supplier }) => (
                              <option key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </option>
                            ))}
                        </StyledSelect>
                      </StyledField>
                      <StyledField>
                        Référence devis
                        <StyledInput
                          value={bidDraft.externalReference}
                          onChange={(event) =>
                            setBidDraft((draft) => ({
                              ...draft,
                              externalReference: event.target.value,
                            }))
                          }
                        />
                      </StyledField>
                      <StyledField>
                        Date devis
                        <StyledInput
                          type="date"
                          value={bidDraft.issueDate}
                          onChange={(event) =>
                            setBidDraft((draft) => ({
                              ...draft,
                              issueDate: event.target.value,
                            }))
                          }
                        />
                      </StyledField>
                      <StyledField>
                        Validité
                        <StyledInput
                          type="date"
                          value={bidDraft.validityDate}
                          onChange={(event) =>
                            setBidDraft((draft) => ({
                              ...draft,
                              validityDate: event.target.value,
                            }))
                          }
                        />
                      </StyledField>
                      <StyledField>
                        Délai livraison (jours)
                        <StyledInput
                          type="number"
                          min="0"
                          value={bidDraft.deliveryDays}
                          onChange={(event) =>
                            setBidDraft((draft) => ({
                              ...draft,
                              deliveryDays: event.target.value,
                            }))
                          }
                        />
                      </StyledField>
                      <StyledField>
                        Paiement (jours)
                        <StyledInput
                          type="number"
                          min="0"
                          value={bidDraft.paymentTermsDays}
                          onChange={(event) =>
                            setBidDraft((draft) => ({
                              ...draft,
                              paymentTermsDays: event.target.value,
                            }))
                          }
                        />
                      </StyledField>
                      <StyledField>
                        Garantie
                        <StyledInput
                          value={bidDraft.warranty}
                          onChange={(event) =>
                            setBidDraft((draft) => ({
                              ...draft,
                              warranty: event.target.value,
                            }))
                          }
                        />
                      </StyledField>
                    </StyledFormGrid>
                    <StyledLineTable>
                      {selectedEvent.purchaseRequest.lines.map((line) => (
                        <StyledLine
                          key={line.id}
                          style={{
                            gridTemplateColumns:
                              'minmax(280px, 2fr) 120px 160px 100px',
                          }}
                        >
                          <StyledField>
                            Article
                            <StyledInput
                              readOnly
                              value={`${line.description} · ${line.quantity} ${line.unit ?? ''}`}
                            />
                          </StyledField>
                          <StyledField>
                            TVA
                            <StyledSelect
                              value={
                                bidDraft.tvaRates[line.id] ??
                                String(line.tvaRate)
                              }
                              onChange={(event) =>
                                setBidDraft((draft) => ({
                                  ...draft,
                                  tvaRates: {
                                    ...draft.tvaRates,
                                    [line.id]: event.target.value,
                                  },
                                }))
                              }
                            >
                              {[0, 7, 10, 14, 20].map((rate) => (
                                <option key={rate} value={rate}>
                                  {rate}%
                                </option>
                              ))}
                            </StyledSelect>
                          </StyledField>
                          <StyledField>
                            Prix unitaire HT (MAD)
                            <StyledInput
                              type="number"
                              min="0"
                              step="0.01"
                              value={bidDraft.prices[line.id] ?? ''}
                              onChange={(event) =>
                                setBidDraft((draft) => ({
                                  ...draft,
                                  prices: {
                                    ...draft.prices,
                                    [line.id]: event.target.value,
                                  },
                                }))
                              }
                            />
                          </StyledField>
                        </StyledLine>
                      ))}
                    </StyledLineTable>
                    <Button
                      title="Enregistrer l'offre"
                      ariaLabel="Enregistrer le devis fournisseur"
                      Icon={IconCheck}
                      variant="primary"
                      accent="blue"
                      disabled={isMutating}
                      onClick={recordBid}
                    />
                  </StyledPanel>
                ) : null}
                <StyledComparator>
                  <ErpOperationalTable
                    ariaLabel="Comparatif des offres fournisseurs"
                    columns={[
                      {
                        key: 'rank',
                        header: 'Rang',
                        width: '70px',
                        align: 'center',
                        render: (bid) => `#${bid.evaluationRank}`,
                      },
                      {
                        key: 'supplier',
                        header: 'Fournisseur',
                        width: '220px',
                        render: (bid) => bid.supplier.name,
                      },
                      {
                        key: 'reference',
                        header: 'Référence',
                        width: '150px',
                        render: (bid) => bid.externalReference,
                      },
                      {
                        key: 'total',
                        header: 'Total TTC',
                        width: '140px',
                        align: 'right',
                        render: (bid) => formatMadCents(bid.totalTtcCents),
                      },
                      {
                        key: 'delivery',
                        header: 'Livraison',
                        width: '110px',
                        align: 'right',
                        render: (bid) => `${bid.deliveryDays} j`,
                      },
                      {
                        key: 'payment',
                        header: 'Paiement',
                        width: '110px',
                        align: 'right',
                        render: (bid) => `${bid.paymentTermsDays} j`,
                      },
                      {
                        key: 'score',
                        header: 'Score',
                        width: '100px',
                        align: 'right',
                        render: (bid) =>
                          `${bid.evaluationScore.toFixed(2)}/100`,
                      },
                      {
                        key: 'award',
                        header: '',
                        width: '120px',
                        align: 'right',
                        render: (bid) =>
                          selectedEvent.status === 'CLOSED' && canApprove ? (
                            <StyledSmallButton
                              type="button"
                              disabled={isMutating}
                              onClick={() => awardBid(bid.id)}
                            >
                              Retenir
                            </StyledSmallButton>
                          ) : selectedEvent.selectedBidId === bid.id ? (
                            'Retenue'
                          ) : (
                            ''
                          ),
                      },
                    ]}
                    rows={selectedEvent.bids}
                    getRowKey={(bid) => bid.id}
                    emptyLabel="Aucune offre reçue"
                  />
                </StyledComparator>
              </StyledPanel>
            ) : null}
          </>
        )}
      </StyledContent>
    </ErpPageShell>
  );
};
