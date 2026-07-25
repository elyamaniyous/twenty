import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
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
import { styled } from '@linaria/react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  marketingAutomationListSchema,
  marketingAutomationSchema,
  marketingCampaignListSchema,
  marketingCampaignSchema,
  marketingContactListSchema,
  marketingContactSchema,
  marketingOverviewSchema,
  marketingSegmentListSchema,
  marketingSegmentSchema,
  marketingSegmentSyncResultSchema,
  marketingTierImportResultSchema,
  type MarketingAutomation,
  type MarketingCampaign,
  type MarketingContact,
  type MarketingOverview,
  type MarketingSegment,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconSend,
  IconUpload,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type View = 'contacts' | 'segments' | 'campaigns' | 'automations';
type Drawer = Exclude<View, 'contacts'> | null;
type PendingConfirmation =
  | { kind: 'contact'; contact: MarketingContact; optIn: boolean }
  | { kind: 'campaign'; campaign: MarketingCampaign }
  | null;
type LoadState = 'loading' | 'ready' | 'error';

const EMPTY_OVERVIEW: MarketingOverview = {
  connectorConfigured: false,
  counts: {
    contacts: 0,
    optedInContacts: 0,
    segments: 0,
    campaigns: 0,
    activeAutomations: 0,
  },
  recentRuns: [],
};

const StyledMetrics = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(5, minmax(120px, 1fr));
  overflow-x: auto;
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 120px;
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
  font-size: ${themeCssVariables.font.size.xl};
  letter-spacing: 0;
`;

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  min-height: 44px;
  overflow-x: auto;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledTabs = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledTab = styled.button<{ active: boolean }>`
  background: ${({ active }) =>
    active
      ? themeCssVariables.background.quaternary
      : themeCssVariables.background.transparent.light};
  border: 0;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ active }) =>
    active
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${({ active }) =>
    active
      ? themeCssVariables.font.weight.semiBold
      : themeCssVariables.font.weight.regular};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};
  white-space: nowrap;
`;

const StyledToolbarActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledNotice = styled.div<{ danger?: boolean }>`
  background: ${({ danger }) =>
    danger
      ? themeCssVariables.tag.background.red
      : themeCssVariables.tag.background.blue};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${({ danger }) =>
    danger ? themeCssVariables.tag.text.red : themeCssVariables.tag.text.blue};
  flex: 0 0 auto;
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 20px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledDrawerBody = styled.form`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  min-height: 0;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const fieldCss = `
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.md};
  width: 100%;
`;

const StyledInput = styled.input`
  ${fieldCss}
  height: 36px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledSelect = styled.select`
  ${fieldCss}
  height: 36px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledTextarea = styled.textarea`
  ${fieldCss}
  line-height: 20px;
  min-height: 88px;
  padding: ${themeCssVariables.spacing[2]};
  resize: vertical;
`;

const StyledHtmlTextarea = styled(StyledTextarea)`
  min-height: 220px;
`;

const StyledDrawerFooter = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

const contactStatus = (
  contact: MarketingContact,
): { label: string; tone: ErpStatusTone } => {
  if (contact.consentStatus === 'OPTED_IN' && !contact.emailBlacklisted) {
    return { label: 'Inscrit', tone: 'success' };
  }
  if (contact.consentStatus === 'OPTED_OUT') {
    return { label: 'Désinscrit', tone: 'neutral' };
  }
  if (contact.lastSyncError) return { label: 'Erreur Brevo', tone: 'danger' };
  return { label: 'Consentement requis', tone: 'warning' };
};

const segmentStatus: Record<
  MarketingSegment['status'],
  { label: string; tone: ErpStatusTone }
> = {
  SYNCING: { label: 'Synchronisation', tone: 'info' },
  ACTIVE: { label: 'Actif', tone: 'success' },
  SYNC_ERROR: { label: 'Erreur', tone: 'danger' },
  ARCHIVED: { label: 'Archivé', tone: 'neutral' },
};

const campaignStatus: Record<
  MarketingCampaign['status'],
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  SCHEDULED: { label: 'En cours', tone: 'info' },
  SENT: { label: 'Envoyée', tone: 'success' },
  FAILED: { label: 'Échec', tone: 'danger' },
  ARCHIVED: { label: 'Archivée', tone: 'neutral' },
};

const automationStatus: Record<
  MarketingAutomation['status'],
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  ACTIVE: { label: 'Active', tone: 'success' },
  PAUSED: { label: 'En pause', tone: 'warning' },
  ARCHIVED: { label: 'Archivée', tone: 'neutral' },
};

export const ErpMarketingPage = () => {
  const { client, context } = useErpMarocContext();
  const formRef = useRef<HTMLFormElement>(null);
  const [view, setView] = useState<View>('contacts');
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [contacts, setContacts] = useState<MarketingContact[]>([]);
  const [segments, setSegments] = useState<MarketingSegment[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [automations, setAutomations] = useState<MarketingAutomation[]>([]);
  const [pending, setPending] = useState<PendingConfirmation>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageDanger, setMessageDanger] = useState(false);
  const [segmentForm, setSegmentForm] = useState({
    name: '',
    description: '',
    lifecycleStage: '',
  });
  const [campaignForm, setCampaignForm] = useState({
    segmentId: '',
    name: '',
    subject: '',
    previewText: '',
    htmlContent:
      '<h1>Bienvenue chez Zowka</h1><p>Merci de votre confiance.</p>',
  });
  const [automationForm, setAutomationForm] = useState({
    segmentId: '',
    name: '',
    emailSubject: 'Bienvenue chez Zowka',
    emailHtmlContent:
      '<h1>Bienvenue</h1><p>Merci pour votre inscription à nos communications.</p>',
  });

  const canManage =
    context?.capabilities.manageMarketing === true &&
    context.features.marketingAutomation === true;

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const [
        nextOverview,
        nextContacts,
        nextSegments,
        nextCampaigns,
        nextAutomations,
      ] = await Promise.all([
        client.request({
          method: 'GET',
          path: '/marketing/overview',
          schema: marketingOverviewSchema,
        }),
        client.request({
          method: 'GET',
          path: '/marketing/contacts',
          schema: marketingContactListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/marketing/segments',
          schema: marketingSegmentListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/marketing/campaigns',
          schema: marketingCampaignListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/marketing/automations',
          schema: marketingAutomationListSchema,
        }),
      ]);
      setOverview(nextOverview);
      setContacts(nextContacts);
      setSegments(nextSegments);
      setCampaigns(nextCampaigns);
      setAutomations(nextAutomations);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const executeMutation = async <T,>(
    execute: () => Promise<T>,
    successMessage: string,
  ) => {
    setBusy(true);
    setMessage(null);
    try {
      await execute();
      setMessageDanger(false);
      setMessage(successMessage);
      setDrawer(null);
      setPending(null);
      await load();
    } catch {
      setMessageDanger(true);
      setMessage(
        "L'action n'a pas abouti. Vérifiez la configuration et réessayez.",
      );
      setPending(null);
    } finally {
      setBusy(false);
    }
  };

  const importContacts = () =>
    executeMutation(
      () =>
        client
          .createMutationIntent({
            method: 'POST',
            path: '/marketing/contacts/import-tiers',
            schema: marketingTierImportResultSchema,
          })
          .execute(),
      'Les clients avec une adresse email ont été ajoutés au marketing.',
    );

  const submitDrawer = (event: FormEvent) => {
    event.preventDefault();
    if (drawer === 'segments') {
      void executeMutation(
        () =>
          client
            .createMutationIntent({
              method: 'POST',
              path: '/marketing/segments',
              schema: marketingSegmentSchema,
              body: {
                name: segmentForm.name,
                description: segmentForm.description || null,
                lifecycleStage: segmentForm.lifecycleStage || null,
              },
            })
            .execute(),
        'Le segment Brevo a été créé.',
      );
      return;
    }
    if (drawer === 'campaigns') {
      void executeMutation(
        () =>
          client
            .createMutationIntent({
              method: 'POST',
              path: '/marketing/campaigns',
              schema: marketingCampaignSchema,
              body: {
                ...campaignForm,
                previewText: campaignForm.previewText || null,
              },
            })
            .execute(),
        'La campagne a été créée en brouillon.',
      );
      return;
    }
    if (drawer === 'automations') {
      void executeMutation(
        () =>
          client
            .createMutationIntent({
              method: 'POST',
              path: '/marketing/automations',
              schema: marketingAutomationSchema,
              body: {
                ...automationForm,
                segmentId: automationForm.segmentId || null,
                trigger: 'CONTACT_OPTED_IN',
              },
            })
            .execute(),
        "L'automatisation a été créée en brouillon.",
      );
    }
  };

  const confirmPending = () => {
    if (pending?.kind === 'contact') {
      const { contact, optIn } = pending;
      void executeMutation(
        () =>
          client
            .createMutationIntent({
              method: 'POST',
              path: `/marketing/contacts/${contact.id}/consent`,
              schema: marketingContactSchema,
              body: {
                status: optIn ? 'OPTED_IN' : 'OPTED_OUT',
                source: optIn
                  ? 'Validation manuelle Zowka'
                  : 'Désinscription manuelle Zowka',
              },
            })
            .execute(),
        optIn
          ? 'Le consentement a été enregistré et les automatisations actives ont été exécutées.'
          : 'Le contact a été désinscrit et retiré des segments.',
      );
      return;
    }
    if (pending?.kind === 'campaign') {
      void executeMutation(
        () =>
          client
            .createMutationIntent({
              method: 'POST',
              path: `/marketing/campaigns/${pending.campaign.id}/send`,
              schema: marketingCampaignSchema,
            })
            .execute(),
        "L'envoi de la campagne a été demandé à Brevo.",
      );
    }
  };

  const syncSegment = (segment: MarketingSegment) =>
    executeMutation(
      () =>
        client
          .createMutationIntent({
            method: 'POST',
            path: `/marketing/segments/${segment.id}/sync`,
            schema: marketingSegmentSyncResultSchema,
          })
          .execute(),
      'Le segment et ses contacts consentis ont été synchronisés.',
    );

  const refreshCampaign = (campaign: MarketingCampaign) =>
    executeMutation(
      () =>
        client
          .createMutationIntent({
            method: 'POST',
            path: `/marketing/campaigns/${campaign.id}/refresh`,
            schema: marketingCampaignSchema,
          })
          .execute(),
      'Les statistiques de campagne ont été actualisées.',
    );

  const setAutomationStatus = (
    automation: MarketingAutomation,
    action: 'activate' | 'pause',
  ) =>
    executeMutation(
      () =>
        client
          .createMutationIntent({
            method: 'POST',
            path: `/marketing/automations/${automation.id}/${action}`,
            schema: marketingAutomationSchema,
          })
          .execute(),
      action === 'activate'
        ? "L'automatisation est active."
        : "L'automatisation est en pause.",
    );

  const contactColumns: ErpOperationalTableColumn<MarketingContact>[] = [
    {
      key: 'contact',
      header: 'Contact',
      width: '220px',
      render: (row) =>
        [row.firstName, row.lastName].filter(Boolean).join(' ') ||
        row.tier?.name ||
        'Sans nom',
    },
    {
      key: 'email',
      header: 'Email',
      width: '250px',
      render: (row) => row.email,
    },
    {
      key: 'lifecycle',
      header: 'Cycle',
      width: '130px',
      render: (row) => row.lifecycleStage,
    },
    {
      key: 'consent',
      header: 'Consentement',
      width: '180px',
      render: (row) => {
        const status = contactStatus(row);
        return <ErpStatusBadge label={status.label} tone={status.tone} />;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '230px',
      render: (row) => (
        <StyledActions>
          <Button
            title="Inscrire"
            ariaLabel={`Inscrire ${row.email}`}
            Icon={IconCheck}
            variant="secondary"
            disabled={busy || !canManage || row.consentStatus === 'OPTED_IN'}
            onClick={() =>
              setPending({ kind: 'contact', contact: row, optIn: true })
            }
          />
          <Button
            title="Désinscrire"
            ariaLabel={`Désinscrire ${row.email}`}
            Icon={IconX}
            variant="secondary"
            disabled={busy || !canManage || row.consentStatus === 'OPTED_OUT'}
            onClick={() =>
              setPending({ kind: 'contact', contact: row, optIn: false })
            }
          />
        </StyledActions>
      ),
    },
  ];

  const segmentColumns: ErpOperationalTableColumn<MarketingSegment>[] = [
    {
      key: 'name',
      header: 'Segment',
      width: '250px',
      render: (row) => row.name,
    },
    {
      key: 'filter',
      header: 'Cycle ciblé',
      width: '160px',
      render: (row) => row.lifecycleStage ?? 'Tous',
    },
    {
      key: 'members',
      header: 'Membres',
      width: '110px',
      align: 'right',
      render: (row) => row._count?.members ?? 0,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '150px',
      render: (row) => (
        <ErpStatusBadge
          label={segmentStatus[row.status].label}
          tone={segmentStatus[row.status].tone}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '180px',
      render: (row) => (
        <Button
          title="Synchroniser"
          ariaLabel={`Synchroniser ${row.name}`}
          Icon={IconRefresh}
          variant="secondary"
          disabled={busy || !canManage || row.status === 'ARCHIVED'}
          onClick={() => void syncSegment(row)}
        />
      ),
    },
  ];

  const campaignColumns: ErpOperationalTableColumn<MarketingCampaign>[] = [
    {
      key: 'name',
      header: 'Campagne',
      width: '230px',
      render: (row) => row.name,
    },
    {
      key: 'segment',
      header: 'Segment',
      width: '180px',
      render: (row) => row.segment.name,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '130px',
      render: (row) => (
        <ErpStatusBadge
          label={campaignStatus[row.status].label}
          tone={campaignStatus[row.status].tone}
        />
      ),
    },
    {
      key: 'delivery',
      header: 'Livrés / ouverts / clics',
      width: '180px',
      render: (row) =>
        `${row.deliveredCount} / ${row.openedCount} / ${row.clickedCount}`,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '220px',
      render: (row) => (
        <StyledActions>
          <Button
            title="Envoyer"
            ariaLabel={`Envoyer ${row.name}`}
            Icon={IconSend}
            variant="secondary"
            disabled={busy || !canManage || row.status !== 'DRAFT'}
            onClick={() => setPending({ kind: 'campaign', campaign: row })}
          />
          <Button
            title="Actualiser"
            ariaLabel={`Actualiser ${row.name}`}
            Icon={IconRefresh}
            variant="secondary"
            disabled={busy || !canManage || row.brevoCampaignId === null}
            onClick={() => void refreshCampaign(row)}
          />
        </StyledActions>
      ),
    },
  ];

  const automationColumns: ErpOperationalTableColumn<MarketingAutomation>[] = [
    {
      key: 'name',
      header: 'Automatisation',
      width: '240px',
      render: (row) => row.name,
    },
    {
      key: 'trigger',
      header: 'Déclencheur',
      width: '190px',
      render: () => 'Consentement marketing',
    },
    {
      key: 'segment',
      header: 'Segment',
      width: '170px',
      render: (row) => row.segment?.name ?? 'Aucun',
    },
    {
      key: 'runs',
      header: 'Exécutions',
      width: '110px',
      align: 'right',
      render: (row) => row._count.runs,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '130px',
      render: (row) => (
        <ErpStatusBadge
          label={automationStatus[row.status].label}
          tone={automationStatus[row.status].tone}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '170px',
      render: (row) =>
        row.status === 'ACTIVE' ? (
          <Button
            title="Mettre en pause"
            ariaLabel={`Mettre ${row.name} en pause`}
            Icon={IconPlayerPause}
            variant="secondary"
            disabled={busy || !canManage}
            onClick={() => void setAutomationStatus(row, 'pause')}
          />
        ) : (
          <Button
            title="Activer"
            ariaLabel={`Activer ${row.name}`}
            Icon={IconPlayerPlay}
            variant="secondary"
            disabled={busy || !canManage || row.status === 'ARCHIVED'}
            onClick={() => void setAutomationStatus(row, 'activate')}
          />
        ),
    },
  ];

  const formTitle =
    drawer === 'segments'
      ? 'Nouveau segment'
      : drawer === 'campaigns'
        ? 'Nouvelle campagne'
        : 'Nouvelle automatisation';

  return (
    <ErpPageShell
      title="Marketing"
      description="Segments, campagnes et parcours automatisés avec Brevo"
      state={loadState}
      errorLabel="Impossible de charger le marketing"
      onRetry={() => void load()}
      actions={
        <Button
          title="Actualiser"
          ariaLabel="Actualiser le marketing"
          Icon={IconRefresh}
          variant="secondary"
          disabled={busy}
          onClick={() => void load()}
        />
      }
    >
      <StyledMetrics aria-label="Indicateurs marketing">
        {[
          ['Contacts', overview.counts.contacts],
          ['Consentis', overview.counts.optedInContacts],
          ['Segments', overview.counts.segments],
          ['Campagnes', overview.counts.campaigns],
          ['Automatisations actives', overview.counts.activeAutomations],
        ].map(([label, value]) => (
          <StyledMetric key={label}>
            <StyledMetricLabel>{label}</StyledMetricLabel>
            <StyledMetricValue>{value}</StyledMetricValue>
          </StyledMetric>
        ))}
      </StyledMetrics>
      <StyledToolbar>
        <StyledTabs role="tablist" aria-label="Vues marketing">
          {(
            [
              ['contacts', 'Contacts'],
              ['segments', 'Segments'],
              ['campaigns', 'Campagnes'],
              ['automations', 'Automatisations'],
            ] as const
          ).map(([key, label]) => (
            <StyledTab
              key={key}
              type="button"
              role="tab"
              active={view === key}
              aria-selected={view === key}
              onClick={() => setView(key)}
            >
              {label}
            </StyledTab>
          ))}
        </StyledTabs>
        <StyledToolbarActions>
          {view === 'contacts' ? (
            <Button
              title="Importer les clients"
              ariaLabel="Importer les clients dans le marketing"
              Icon={IconUpload}
              variant="secondary"
              disabled={busy || !canManage}
              onClick={() => void importContacts()}
            />
          ) : (
            <Button
              title={
                view === 'segments'
                  ? 'Nouveau segment'
                  : view === 'campaigns'
                    ? 'Nouvelle campagne'
                    : 'Nouvelle automatisation'
              }
              ariaLabel="Créer"
              Icon={IconPlus}
              accent="blue"
              disabled={busy || !canManage}
              onClick={() => setDrawer(view)}
            />
          )}
        </StyledToolbarActions>
      </StyledToolbar>
      {!overview.connectorConfigured ? (
        <StyledNotice danger>
          Le connecteur Brevo n’est pas opérationnel. Les consultations restent
          disponibles, mais les actions marketing sont bloquées.
        </StyledNotice>
      ) : null}
      {message ? (
        <StyledNotice danger={messageDanger}>{message}</StyledNotice>
      ) : null}
      {view === 'contacts' ? (
        <ErpOperationalTable
          ariaLabel="Contacts marketing"
          columns={contactColumns}
          rows={contacts}
          getRowKey={(row) => row.id}
          emptyLabel="Aucun contact marketing"
        />
      ) : view === 'segments' ? (
        <ErpOperationalTable
          ariaLabel="Segments marketing"
          columns={segmentColumns}
          rows={segments}
          getRowKey={(row) => row.id}
          emptyLabel="Aucun segment"
        />
      ) : view === 'campaigns' ? (
        <ErpOperationalTable
          ariaLabel="Campagnes marketing"
          columns={campaignColumns}
          rows={campaigns}
          getRowKey={(row) => row.id}
          emptyLabel="Aucune campagne"
        />
      ) : (
        <ErpOperationalTable
          ariaLabel="Automatisations marketing"
          columns={automationColumns}
          rows={automations}
          getRowKey={(row) => row.id}
          emptyLabel="Aucune automatisation"
        />
      )}
      <ErpFormDrawer
        isOpen={drawer !== null}
        title={formTitle}
        description="La création ne déclenche aucun envoi immédiat."
        isBusy={busy}
        onClose={() => setDrawer(null)}
        footer={
          <StyledDrawerFooter>
            <Button
              title="Annuler"
              ariaLabel="Annuler"
              Icon={IconX}
              variant="secondary"
              disabled={busy}
              onClick={() => setDrawer(null)}
            />
            <Button
              title="Créer"
              ariaLabel={formTitle}
              Icon={IconCheck}
              accent="blue"
              disabled={busy}
              onClick={() => formRef.current?.requestSubmit()}
            />
          </StyledDrawerFooter>
        }
      >
        <StyledDrawerBody ref={formRef} onSubmit={submitDrawer}>
          {drawer === 'segments' ? (
            <>
              <StyledField>
                Nom
                <StyledInput
                  required
                  minLength={2}
                  maxLength={120}
                  value={segmentForm.name}
                  onChange={(event) =>
                    setSegmentForm((form) => ({
                      ...form,
                      name: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Cycle de vie
                <StyledSelect
                  value={segmentForm.lifecycleStage}
                  onChange={(event) =>
                    setSegmentForm((form) => ({
                      ...form,
                      lifecycleStage: event.target.value,
                    }))
                  }
                >
                  <option value="">Tous les contacts consentis</option>
                  <option value="LEAD">Lead</option>
                  <option value="PROSPECT">Prospect</option>
                  <option value="CUSTOMER">Client</option>
                  <option value="LOYAL">Client fidèle</option>
                  <option value="ADVOCATE">Ambassadeur</option>
                </StyledSelect>
              </StyledField>
              <StyledField>
                Description
                <StyledTextarea
                  maxLength={500}
                  value={segmentForm.description}
                  onChange={(event) =>
                    setSegmentForm((form) => ({
                      ...form,
                      description: event.target.value,
                    }))
                  }
                />
              </StyledField>
            </>
          ) : drawer === 'campaigns' ? (
            <>
              <StyledField>
                Segment
                <StyledSelect
                  required
                  value={campaignForm.segmentId}
                  onChange={(event) =>
                    setCampaignForm((form) => ({
                      ...form,
                      segmentId: event.target.value,
                    }))
                  }
                >
                  <option value="">Sélectionner</option>
                  {segments
                    .filter((segment) => segment.status === 'ACTIVE')
                    .map((segment) => (
                      <option key={segment.id} value={segment.id}>
                        {segment.name}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Nom
                <StyledInput
                  required
                  minLength={2}
                  maxLength={120}
                  value={campaignForm.name}
                  onChange={(event) =>
                    setCampaignForm((form) => ({
                      ...form,
                      name: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Objet
                <StyledInput
                  required
                  minLength={2}
                  maxLength={200}
                  value={campaignForm.subject}
                  onChange={(event) =>
                    setCampaignForm((form) => ({
                      ...form,
                      subject: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Pré-en-tête
                <StyledInput
                  maxLength={255}
                  value={campaignForm.previewText}
                  onChange={(event) =>
                    setCampaignForm((form) => ({
                      ...form,
                      previewText: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Contenu HTML
                <StyledHtmlTextarea
                  required
                  minLength={11}
                  value={campaignForm.htmlContent}
                  onChange={(event) =>
                    setCampaignForm((form) => ({
                      ...form,
                      htmlContent: event.target.value,
                    }))
                  }
                />
              </StyledField>
            </>
          ) : (
            <>
              <StyledField>
                Nom
                <StyledInput
                  required
                  minLength={2}
                  maxLength={120}
                  value={automationForm.name}
                  onChange={(event) =>
                    setAutomationForm((form) => ({
                      ...form,
                      name: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Segment à alimenter
                <StyledSelect
                  value={automationForm.segmentId}
                  onChange={(event) =>
                    setAutomationForm((form) => ({
                      ...form,
                      segmentId: event.target.value,
                    }))
                  }
                >
                  <option value="">Aucun segment</option>
                  {segments
                    .filter((segment) => segment.status === 'ACTIVE')
                    .map((segment) => (
                      <option key={segment.id} value={segment.id}>
                        {segment.name}
                      </option>
                    ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Objet de l’email
                <StyledInput
                  required
                  minLength={2}
                  maxLength={200}
                  value={automationForm.emailSubject}
                  onChange={(event) =>
                    setAutomationForm((form) => ({
                      ...form,
                      emailSubject: event.target.value,
                    }))
                  }
                />
              </StyledField>
              <StyledField>
                Contenu HTML
                <StyledHtmlTextarea
                  required
                  minLength={11}
                  value={automationForm.emailHtmlContent}
                  onChange={(event) =>
                    setAutomationForm((form) => ({
                      ...form,
                      emailHtmlContent: event.target.value,
                    }))
                  }
                />
              </StyledField>
            </>
          )}
        </StyledDrawerBody>
      </ErpFormDrawer>
      <ErpConfirmDialog
        isOpen={pending !== null}
        title={
          pending?.kind === 'campaign'
            ? 'Envoyer cette campagne ?'
            : pending?.kind === 'contact' && pending.optIn
              ? 'Confirmer le consentement ?'
              : 'Désinscrire ce contact ?'
        }
        message={
          pending?.kind === 'campaign'
            ? `Brevo enverra la campagne « ${pending.campaign.name} » à tous les membres du segment synchronisé.`
            : pending?.kind === 'contact' && pending.optIn
              ? 'Confirmez uniquement si vous disposez de la preuve du consentement. Les automatisations actives pourront envoyer un email.'
              : 'Le contact sera bloqué dans Brevo et retiré de tous les segments.'
        }
        confirmLabel="Confirmer"
        destructive={
          pending?.kind === 'campaign' ||
          (pending?.kind === 'contact' && !pending.optIn)
        }
        isConfirming={busy}
        onCancel={() => setPending(null)}
        onConfirm={confirmPending}
      />
    </ErpPageShell>
  );
};
