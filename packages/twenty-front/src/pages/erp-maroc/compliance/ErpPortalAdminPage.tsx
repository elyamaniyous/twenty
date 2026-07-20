import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import {
  ErpWorkspaceSummaryItem,
  StyledErpWorkspaceContent,
  StyledErpWorkspaceField,
  StyledErpWorkspaceFormGrid,
  StyledErpWorkspaceInlineActions,
  StyledErpWorkspaceInput,
  StyledErpWorkspacePanel,
  StyledErpWorkspacePanelTitle,
  StyledErpWorkspaceSelect,
  StyledErpWorkspaceSummary,
  StyledErpWorkspaceTextarea,
  StyledErpWorkspaceToolbar,
} from '@/erp-maroc/components/ErpComplianceUi';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useEffect, useState } from 'react';
import {
  erpPortalAccessGrantSchema,
  erpPortalAccessListSchema,
  erpRegulatoryListSchema,
  erpRegulatoryObjectSchema,
  erpTierListSchema,
  type ErpPortalAccess,
  type ErpTier,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconCopy,
  IconLink,
  IconRefresh,
  IconX,
} from 'twenty-ui/display';
import { Button, TabButton } from 'twenty-ui/input';

type PortalRequest = {
  id: string;
  subject: string;
  type: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';
  description: string;
  createdAt: string;
  tier: { name: string };
  comments: Array<{ id: string; body: string; isInternal: boolean }>;
  documents: Array<{ id: string }>;
};

const requestStatuses: PortalRequest['status'][] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_CLIENT',
  'RESOLVED',
  'CLOSED',
];

export const ErpPortalAdminPage = () => {
  const { client } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [view, setView] = useState<'requests' | 'access'>('requests');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [tiers, setTiers] = useState<ErpTier[]>([]);
  const [accesses, setAccesses] = useState<ErpPortalAccess[]>([]);
  const [requests, setRequests] = useState<PortalRequest[]>([]);
  const [tierId, setTierId] = useState('');
  const [email, setEmail] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [canViewInvoices, setCanViewInvoices] = useState(true);
  const [canViewDocuments, setCanViewDocuments] = useState(true);
  const [canSubmitDocuments, setCanSubmitDocuments] = useState(true);
  const [portalUrl, setPortalUrl] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [requestStatus, setRequestStatus] =
    useState<PortalRequest['status']>('IN_PROGRESS');
  const [reply, setReply] = useState('');
  const [internalComment, setInternalComment] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = () => setGeneration((value) => value + 1);

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    Promise.all([
      client.request({
        method: 'GET',
        path: '/tiers',
        schema: erpTierListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/operations/portal-access',
        schema: erpPortalAccessListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/portal-admin/requests',
        schema: erpRegulatoryListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(([loadedTiers, loadedAccesses, loadedRequests]) => {
        if (abortController.signal.aborted) return;
        setTiers(loadedTiers);
        setAccesses(loadedAccesses);
        setRequests(loadedRequests as unknown as PortalRequest[]);
        setTierId((current) => current || loadedTiers[0]?.id || '');
        setSelectedRequestId(
          (current) =>
            current || (loadedRequests[0]?.id as string | undefined) || '',
        );
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client, generation]);

  useEffect(() => {
    const tier = tiers.find((item) => item.id === tierId);
    if (tier?.email) setEmail(tier.email);
  }, [tierId, tiers]);

  const grantAccess = async () => {
    if (tierId === '' || email.trim() === '') return;
    setBusyId('grant');
    try {
      const grant = await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/operations/portal-access',
            schema: erpPortalAccessGrantSchema,
            body: {
              tierId,
              email: email.trim(),
              expiresInDays: Number(expiresInDays),
              canViewInvoices,
              canViewDocuments,
              canSubmitDocuments,
            },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      setPortalUrl(`${window.location.origin}${grant.portalPath}`);
      enqueueSuccessSnackBar({
        message: 'Accès créé, lien affiché une seule fois',
      });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Création de l’accès impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const revokeAccess = async (access: ErpPortalAccess) => {
    if (!window.confirm('Révoquer immédiatement cet accès portail ?')) return;
    setBusyId(access.id);
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: `/operations/portal-access/${access.id}/revoke`,
            schema: erpRegulatoryObjectSchema,
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Révocation impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const updateRequest = async () => {
    if (selectedRequestId === '') return;
    setBusyId('request-status');
    try {
      await client
        .createMutationIntent(
          {
            method: 'PATCH',
            path: `/portal-admin/requests/${selectedRequestId}`,
            schema: erpRegulatoryObjectSchema,
            body: { status: requestStatus },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'Statut et notification mis à jour' });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Mise à jour impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const sendReply = async () => {
    if (selectedRequestId === '' || reply.trim() === '') return;
    setBusyId('reply');
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: `/portal-admin/requests/${selectedRequestId}/comments`,
            schema: erpRegulatoryObjectSchema,
            body: { body: reply.trim(), isInternal: internalComment },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      setReply('');
      enqueueSuccessSnackBar({
        message: internalComment
          ? 'Note interne ajoutée'
          : 'Réponse envoyée au portail',
      });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Envoi impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const copyPortalUrl = async () => {
    await navigator.clipboard.writeText(portalUrl);
    enqueueSuccessSnackBar({ message: 'Lien copié' });
  };

  const accessColumns: ErpOperationalTableColumn<ErpPortalAccess>[] = [
    {
      key: 'email',
      header: 'Email',
      width: '260px',
      render: (row) => row.email ?? '—',
    },
    {
      key: 'tier',
      header: 'Client',
      width: '220px',
      render: (row) =>
        tiers.find((tier) => tier.id === row.tierId)?.name ?? row.tierId,
    },
    {
      key: 'expires',
      header: 'Expiration',
      width: '180px',
      render: (row) =>
        row.tokenExpiresAt
          ? new Date(row.tokenExpiresAt).toLocaleDateString('fr-MA')
          : '—',
    },
    {
      key: 'status',
      header: 'Statut',
      width: '110px',
      render: (row) => row.status,
    },
    {
      key: 'action',
      header: '',
      width: '140px',
      render: (row) =>
        row.status === 'ACTIVE' ? (
          <Button
            title="Révoquer"
            ariaLabel={`Révoquer ${row.email ?? row.id}`}
            Icon={IconX}
            variant="secondary"
            disabled={busyId !== null}
            onClick={() => void revokeAccess(row)}
          />
        ) : null,
    },
  ];

  const requestColumns: ErpOperationalTableColumn<PortalRequest>[] = [
    {
      key: 'customer',
      header: 'Client',
      width: '220px',
      render: (row) => row.tier.name,
    },
    {
      key: 'subject',
      header: 'Demande',
      width: '320px',
      render: (row) => row.subject,
    },
    { key: 'type', header: 'Type', width: '130px', render: (row) => row.type },
    {
      key: 'status',
      header: 'Statut',
      width: '140px',
      render: (row) => row.status,
    },
    {
      key: 'documents',
      header: 'Pièces',
      width: '90px',
      align: 'right',
      render: (row) => row.documents.length,
    },
    {
      key: 'comments',
      header: 'Messages',
      width: '100px',
      align: 'right',
      render: (row) => row.comments.length,
    },
    {
      key: 'select',
      header: '',
      width: '130px',
      render: (row) => (
        <Button
          title="Traiter"
          ariaLabel={`Traiter ${row.subject}`}
          Icon={IconCheck}
          variant="secondary"
          onClick={() => {
            setSelectedRequestId(row.id);
            setRequestStatus(row.status);
          }}
        />
      ),
    },
  ];

  return (
    <ErpPageShell
      title="Portail client et cabinet"
      description="Accès externes, demandes documentaires, échanges et notifications"
      state={state}
      onRetry={refresh}
      actions={
        <Button
          title="Actualiser"
          ariaLabel="Actualiser le portail"
          Icon={IconRefresh}
          variant="secondary"
          onClick={refresh}
        />
      }
    >
      <StyledErpWorkspaceToolbar>
        <TabButton
          id="portal-requests"
          title="Demandes"
          active={view === 'requests'}
          onClick={() => setView('requests')}
        />
        <TabButton
          id="portal-access"
          title="Accès"
          active={view === 'access'}
          onClick={() => setView('access')}
        />
        <Button
          title="Ouvrir le portail"
          ariaLabel="Ouvrir le portail externe"
          Icon={IconLink}
          variant="secondary"
          onClick={() =>
            window.open('/portal', '_blank', 'noopener,noreferrer')
          }
        />
      </StyledErpWorkspaceToolbar>
      <StyledErpWorkspaceSummary>
        <ErpWorkspaceSummaryItem
          label="Accès actifs"
          value={accesses.filter((access) => access.status === 'ACTIVE').length}
        />
        <ErpWorkspaceSummaryItem
          label="Demandes ouvertes"
          value={
            requests.filter(
              (request) => !['RESOLVED', 'CLOSED'].includes(request.status),
            ).length
          }
        />
        <ErpWorkspaceSummaryItem
          label="Pièces reçues"
          value={requests.reduce(
            (total, request) => total + request.documents.length,
            0,
          )}
        />
      </StyledErpWorkspaceSummary>
      <StyledErpWorkspaceContent>
        {view === 'access' ? (
          <>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Créer ou renouveler un accès
              </StyledErpWorkspacePanelTitle>
              <StyledErpWorkspaceFormGrid>
                <StyledErpWorkspaceField>
                  Client
                  <StyledErpWorkspaceSelect
                    value={tierId}
                    onChange={(event) => setTierId(event.target.value)}
                  >
                    {tiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name}
                      </option>
                    ))}
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Email
                  <StyledErpWorkspaceInput
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Durée en jours
                  <StyledErpWorkspaceInput
                    type="number"
                    min="1"
                    max="90"
                    value={expiresInDays}
                    onChange={(event) => setExpiresInDays(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  <span>
                    <input
                      type="checkbox"
                      checked={canViewInvoices}
                      onChange={(event) =>
                        setCanViewInvoices(event.target.checked)
                      }
                    />{' '}
                    Factures
                  </span>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  <span>
                    <input
                      type="checkbox"
                      checked={canViewDocuments}
                      onChange={(event) =>
                        setCanViewDocuments(event.target.checked)
                      }
                    />{' '}
                    Documents
                  </span>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  <span>
                    <input
                      type="checkbox"
                      checked={canSubmitDocuments}
                      onChange={(event) =>
                        setCanSubmitDocuments(event.target.checked)
                      }
                    />{' '}
                    Dépôt de pièces
                  </span>
                </StyledErpWorkspaceField>
                <Button
                  title="Créer l’accès"
                  ariaLabel="Créer l'accès portail"
                  Icon={IconLink}
                  variant="primary"
                  disabled={
                    busyId !== null || tierId === '' || email.trim() === ''
                  }
                  onClick={() => void grantAccess()}
                />
              </StyledErpWorkspaceFormGrid>
              {portalUrl !== '' ? (
                <StyledErpWorkspaceFormGrid>
                  <StyledErpWorkspaceField>
                    Lien à transmettre
                    <StyledErpWorkspaceInput readOnly value={portalUrl} />
                  </StyledErpWorkspaceField>
                  <Button
                    title="Copier"
                    ariaLabel="Copier le lien du portail"
                    Icon={IconCopy}
                    variant="secondary"
                    onClick={() => void copyPortalUrl()}
                  />
                </StyledErpWorkspaceFormGrid>
              ) : null}
            </StyledErpWorkspacePanel>
            <ErpOperationalTable
              ariaLabel="Accès portail"
              columns={accessColumns}
              rows={accesses}
              getRowKey={(row) => row.id}
              emptyLabel="Aucun accès portail"
            />
          </>
        ) : (
          <>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Traitement d’une demande
              </StyledErpWorkspacePanelTitle>
              <StyledErpWorkspaceFormGrid>
                <StyledErpWorkspaceField>
                  Demande
                  <StyledErpWorkspaceSelect
                    value={selectedRequestId}
                    onChange={(event) =>
                      setSelectedRequestId(event.target.value)
                    }
                  >
                    <option value="">Sélectionner</option>
                    {requests.map((request) => (
                      <option key={request.id} value={request.id}>
                        {request.tier.name} · {request.subject}
                      </option>
                    ))}
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Statut
                  <StyledErpWorkspaceSelect
                    value={requestStatus}
                    onChange={(event) =>
                      setRequestStatus(
                        event.target.value as PortalRequest['status'],
                      )
                    }
                  >
                    {requestStatuses.map((statusValue) => (
                      <option key={statusValue}>{statusValue}</option>
                    ))}
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <Button
                  title="Mettre à jour"
                  ariaLabel="Mettre à jour la demande"
                  Icon={IconCheck}
                  variant="secondary"
                  disabled={busyId !== null || selectedRequestId === ''}
                  onClick={() => void updateRequest()}
                />
                <StyledErpWorkspaceField>
                  Réponse ou note
                  <StyledErpWorkspaceTextarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  <span>
                    <input
                      type="checkbox"
                      checked={internalComment}
                      onChange={(event) =>
                        setInternalComment(event.target.checked)
                      }
                    />{' '}
                    Note interne
                  </span>
                </StyledErpWorkspaceField>
                <Button
                  title="Envoyer"
                  ariaLabel="Envoyer la réponse"
                  Icon={IconCheck}
                  variant="primary"
                  disabled={
                    busyId !== null ||
                    selectedRequestId === '' ||
                    reply.trim() === ''
                  }
                  onClick={() => void sendReply()}
                />
              </StyledErpWorkspaceFormGrid>
            </StyledErpWorkspacePanel>
            <ErpOperationalTable
              ariaLabel="Demandes du portail"
              columns={requestColumns}
              rows={requests}
              getRowKey={(row) => row.id}
              emptyLabel="Aucune demande externe"
            />
          </>
        )}
      </StyledErpWorkspaceContent>
    </ErpPageShell>
  );
};
