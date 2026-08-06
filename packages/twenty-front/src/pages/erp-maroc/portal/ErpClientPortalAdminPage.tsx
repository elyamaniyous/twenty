import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { styled } from '@linaria/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import {
  clientPortalCommentSchema,
  clientPortalRequestListSchema,
  clientPortalRequestSchema,
  erpPortalAccessGrantSchema,
  erpPortalAccessListSchema,
  erpPortalAccessSchema,
  erpTierListSchema,
  type ClientPortalRequest,
  type ErpPortalAccess,
  type ErpTier,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconCopy,
  IconLink,
  IconMessage,
  IconPlus,
  IconRefresh,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type View = 'access' | 'requests';
type LoadState = 'loading' | 'ready' | 'error';

const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat('fr-MA', { dateStyle: 'medium' }).format(
        new Date(value),
      )
    : '—';

const statusBadge = (status: string) => (
  <ErpStatusBadge
    label={status.replaceAll('_', ' ')}
    tone={
      ['ACTIVE', 'RESOLVED', 'CLOSED'].includes(status)
        ? 'success'
        : ['REVOKED'].includes(status)
          ? 'danger'
          : ['WAITING_CLIENT'].includes(status)
            ? 'warning'
            : 'info'
    }
  />
);

const Toolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  justify-content: space-between;
  min-height: 44px;
  overflow-x: auto;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const Tabs = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const Tab = styled.button<{ active: boolean }>`
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
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};
  white-space: nowrap;
`;

const Form = styled.form`
  align-items: end;
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  padding: ${themeCssVariables.spacing[3]};
`;

const Field = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const controlCss = `
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  width: 100%;
`;

const Input = styled.input`
  ${controlCss}
  height: 34px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const Select = styled.select`
  ${controlCss}
  height: 34px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const CheckboxRow = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  min-height: 34px;
`;

const Notice = styled.div<{ danger?: boolean }>`
  background: ${({ danger }) =>
    danger
      ? themeCssVariables.tag.background.red
      : themeCssVariables.tag.background.blue};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${({ danger }) =>
    danger ? themeCssVariables.tag.text.red : themeCssVariables.tag.text.blue};
  flex: 0 0 auto;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const LinkResult = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};

  code {
    color: ${themeCssVariables.font.color.primary};
    flex: 1 1 auto;
    font-size: ${themeCssVariables.font.size.sm};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Split = styled.div`
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: minmax(520px, 1fr) minmax(320px, 420px);
  min-height: 0;

  @media (max-width: 980px) {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }
`;

const Detail = styled.aside`
  border-left: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const DetailHeader = styled.div`
  align-items: flex-start;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  margin-bottom: ${themeCssVariables.spacing[3]};

  h2 {
    font-size: ${themeCssVariables.font.size.md};
    letter-spacing: 0;
    margin: 0 0 ${themeCssVariables.spacing[1]};
  }

  p {
    color: ${themeCssVariables.font.color.secondary};
    font-size: ${themeCssVariables.font.size.sm};
    margin: 0;
  }
`;

const Message = styled.div<{ customer: boolean; internal: boolean }>`
  border-left: 3px solid
    ${({ customer, internal }) =>
      internal
        ? themeCssVariables.border.color.medium
        : customer
          ? themeCssVariables.color.blue
          : themeCssVariables.font.color.primary};
  margin-bottom: ${themeCssVariables.spacing[2]};
  padding-left: ${themeCssVariables.spacing[2]};

  p {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.sm};
    margin: 0 0 ${themeCssVariables.spacing[0.5]};
  }

  span {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.xs};
  }
`;

const DetailForm = styled.form`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  margin-top: ${themeCssVariables.spacing[3]};
  padding-top: ${themeCssVariables.spacing[3]};
`;

const Textarea = styled.textarea`
  ${controlCss}
  min-height: 76px;
  padding: ${themeCssVariables.spacing[2]};
  resize: vertical;
`;

export const ErpClientPortalAdminPage = () => {
  const { client } = useErpMarocContext();
  const [view, setView] = useState<View>('access');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState<{
    danger: boolean;
    text: string;
  } | null>(null);
  const [portalLink, setPortalLink] = useState('');
  const [tiers, setTiers] = useState<ErpTier[]>([]);
  const [accesses, setAccesses] = useState<ErpPortalAccess[]>([]);
  const [requests, setRequests] = useState<ClientPortalRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [accessForm, setAccessForm] = useState({
    tierId: '',
    email: '',
    expiresInDays: '30',
    canViewInvoices: true,
    canViewDocuments: true,
    canSubmitDocuments: true,
  });
  const [reviewForm, setReviewForm] = useState({
    status: 'IN_PROGRESS',
    assignedToTwentyUserId: '',
    comment: '',
    isInternal: false,
  });

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const [nextTiers, nextAccesses, nextRequests] = await Promise.all([
        client.request({
          method: 'GET',
          path: '/tiers',
          schema: erpTierListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/operations/portal-access',
          schema: erpPortalAccessListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/portal-admin/requests',
          schema: clientPortalRequestListSchema,
        }),
      ]);
      const customerTiers = nextTiers.filter(({ type }) =>
        ['CLIENT', 'MIXTE'].includes(type),
      );
      setTiers(customerTiers);
      setAccesses(nextAccesses);
      setRequests(nextRequests);
      setAccessForm((current) => ({
        ...current,
        tierId: current.tierId || customerTiers[0]?.id || '',
        email:
          current.email ||
          customerTiers.find(
            ({ id }) => id === (current.tierId || customerTiers[0]?.id),
          )?.email ||
          '',
      }));
      setSelectedRequestId((current) =>
        nextRequests.some(({ id }) => id === current)
          ? current
          : nextRequests[0]?.id || '',
      );
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const mutate = async (operation: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await operation();
      setNotice({ danger: false, text: success });
      await load();
    } catch {
      setNotice({ danger: true, text: "L'opération n'a pas abouti." });
    } finally {
      setBusy(false);
    }
  };

  const grantAccess = (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    void client
      .createMutationIntent({
        method: 'POST',
        path: '/operations/portal-access',
        schema: erpPortalAccessGrantSchema,
        body: {
          ...accessForm,
          expiresInDays: Number(accessForm.expiresInDays),
        },
      })
      .execute()
      .then(async (result) => {
        const absoluteLink = `${window.location.origin}${result.portalPath}`;
        setPortalLink(absoluteLink);
        setNotice({
          danger: false,
          text: 'Accès créé. Le lien ne sera plus affiché après avoir quitté cette page.',
        });
        setShowForm(false);
        await load();
      })
      .catch(() =>
        setNotice({ danger: true, text: "L'accès n'a pas pu être créé." }),
      )
      .finally(() => setBusy(false));
  };

  const selectedRequest =
    requests.find(({ id }) => id === selectedRequestId) ?? null;

  useEffect(() => {
    if (!selectedRequest) return;
    setReviewForm((current) => ({
      ...current,
      status: selectedRequest.status,
      assignedToTwentyUserId: selectedRequest.assignedToTwentyUserId ?? '',
    }));
  }, [selectedRequest]);

  const saveRequest = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedRequest) return;
    void mutate(async () => {
      if (reviewForm.comment.trim()) {
        await client
          .createMutationIntent({
            method: 'POST',
            path: `/portal-admin/requests/${selectedRequest.id}/comments`,
            schema: clientPortalCommentSchema,
            body: {
              body: reviewForm.comment,
              isInternal: reviewForm.isInternal,
            },
          })
          .execute();
      }
      await client
        .createMutationIntent({
          method: 'PATCH',
          path: `/portal-admin/requests/${selectedRequest.id}`,
          schema: clientPortalRequestSchema,
          body: {
            status: reviewForm.status,
            assignedToTwentyUserId:
              reviewForm.assignedToTwentyUserId.trim() || null,
          },
        })
        .execute();
      setReviewForm((current) => ({
        ...current,
        comment: '',
        isInternal: false,
      }));
    }, 'Demande mise à jour.');
  };

  const accessColumns = useMemo<ErpOperationalTableColumn<ErpPortalAccess>[]>(
    () => [
      {
        key: 'customer',
        header: 'Client',
        width: '220px',
        render: (access) =>
          access.tier?.name ??
          tiers.find(({ id }) => id === access.tierId)?.name ??
          access.tierId,
      },
      {
        key: 'email',
        header: 'Email',
        width: '220px',
        render: ({ email }) => email ?? '—',
      },
      {
        key: 'status',
        header: 'Statut',
        width: '110px',
        render: ({ status }) => statusBadge(status),
      },
      {
        key: 'expires',
        header: 'Expiration',
        width: '130px',
        render: ({ tokenExpiresAt }) => formatDate(tokenExpiresAt),
      },
      {
        key: 'last',
        header: 'Dernière connexion',
        width: '160px',
        render: ({ lastAuthenticatedAt }) => formatDate(lastAuthenticatedAt),
      },
      {
        key: 'permissions',
        header: 'Droits',
        width: '190px',
        render: (access) =>
          [
            access.canViewInvoices ? 'Factures' : null,
            access.canViewDocuments ? 'Documents' : null,
            access.canSubmitDocuments ? 'Dépôt' : null,
          ]
            .filter(Boolean)
            .join(', ') || 'Aucun',
      },
      {
        key: 'actions',
        header: '',
        width: '70px',
        align: 'right',
        render: (access) =>
          access.status === 'ACTIVE' ? (
            <Button
              title="Révoquer"
              ariaLabel="Révoquer"
              Icon={IconX}
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void mutate(
                  () =>
                    client
                      .createMutationIntent({
                        method: 'POST',
                        path: `/operations/portal-access/${access.id}/revoke`,
                        schema: erpPortalAccessSchema,
                        body: {},
                      })
                      .execute(),
                  'Accès révoqué.',
                )
              }
            />
          ) : null,
      },
    ],
    [busy, client, tiers],
  );

  const requestColumns = useMemo<
    ErpOperationalTableColumn<ClientPortalRequest>[]
  >(
    () => [
      {
        key: 'client',
        header: 'Client',
        width: '180px',
        render: ({ tier }) => tier?.name ?? '—',
      },
      {
        key: 'subject',
        header: 'Objet',
        width: '260px',
        render: ({ subject }) => subject,
      },
      {
        key: 'type',
        header: 'Type',
        width: '120px',
        render: ({ type }) => type,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '130px',
        render: ({ status }) => statusBadge(status),
      },
      {
        key: 'created',
        header: 'Créée le',
        width: '130px',
        render: ({ createdAt }) => formatDate(createdAt),
      },
      {
        key: 'open',
        header: '',
        width: '70px',
        align: 'right',
        render: ({ id }) => (
          <Button
            title="Ouvrir"
            ariaLabel="Ouvrir"
            Icon={IconMessage}
            variant="secondary"
            onClick={() => setSelectedRequestId(id)}
          />
        ),
      },
    ],
    [],
  );

  return (
    <ErpPageShell
      title="Portail clients"
      description="Accès externes, demandes et échanges documentaires"
      state={loadState}
      onRetry={() => void load()}
      actions={
        <>
          <Button
            title="Actualiser"
            ariaLabel="Actualiser"
            Icon={IconRefresh}
            variant="secondary"
            onClick={() => void load()}
          />
          {view === 'access' && (
            <Button
              title="Nouvel accès"
              ariaLabel="Nouvel accès"
              Icon={IconPlus}
              variant="primary"
              onClick={() => setShowForm((value) => !value)}
            />
          )}
        </>
      }
    >
      <Toolbar>
        <Tabs>
          <Tab
            active={view === 'access'}
            type="button"
            onClick={() => setView('access')}
          >
            Accès clients
          </Tab>
          <Tab
            active={view === 'requests'}
            type="button"
            onClick={() => setView('requests')}
          >
            Demandes
          </Tab>
        </Tabs>
      </Toolbar>
      {notice && <Notice danger={notice.danger}>{notice.text}</Notice>}
      {portalLink && (
        <LinkResult>
          <IconLink size={16} />
          <code>{portalLink}</code>
          <Button
            title="Copier"
            ariaLabel="Copier"
            Icon={IconCopy}
            variant="secondary"
            onClick={() => void navigator.clipboard.writeText(portalLink)}
          />
        </LinkResult>
      )}
      {view === 'access' && (
        <>
          {showForm && (
            <Form onSubmit={grantAccess}>
              <Field>
                Client
                <Select
                  required
                  value={accessForm.tierId}
                  onChange={(event) => {
                    const tier = tiers.find(
                      ({ id }) => id === event.target.value,
                    );
                    setAccessForm((current) => ({
                      ...current,
                      tierId: event.target.value,
                      email: tier?.email ?? '',
                    }));
                  }}
                >
                  {tiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                Email
                <Input
                  required
                  type="email"
                  value={accessForm.email}
                  onChange={(event) =>
                    setAccessForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field>
                Validité
                <Select
                  value={accessForm.expiresInDays}
                  onChange={(event) =>
                    setAccessForm((current) => ({
                      ...current,
                      expiresInDays: event.target.value,
                    }))
                  }
                >
                  <option value="7">7 jours</option>
                  <option value="30">30 jours</option>
                  <option value="60">60 jours</option>
                  <option value="90">90 jours</option>
                </Select>
              </Field>
              <CheckboxRow>
                <input
                  type="checkbox"
                  checked={accessForm.canViewInvoices}
                  onChange={(event) =>
                    setAccessForm((current) => ({
                      ...current,
                      canViewInvoices: event.target.checked,
                    }))
                  }
                />{' '}
                Factures
              </CheckboxRow>
              <CheckboxRow>
                <input
                  type="checkbox"
                  checked={accessForm.canViewDocuments}
                  onChange={(event) =>
                    setAccessForm((current) => ({
                      ...current,
                      canViewDocuments: event.target.checked,
                    }))
                  }
                />{' '}
                Documents
              </CheckboxRow>
              <CheckboxRow>
                <input
                  type="checkbox"
                  checked={accessForm.canSubmitDocuments}
                  onChange={(event) =>
                    setAccessForm((current) => ({
                      ...current,
                      canSubmitDocuments: event.target.checked,
                    }))
                  }
                />{' '}
                Dépôt
              </CheckboxRow>
              <Button
                title="Créer l'accès"
                ariaLabel="Créer l'accès"
                Icon={IconCheck}
                variant="primary"
                type="submit"
                disabled={busy || !accessForm.tierId}
              />
            </Form>
          )}
          <ErpOperationalTable
            ariaLabel="Accès portail clients"
            columns={accessColumns}
            rows={accesses}
            getRowKey={({ id }) => id}
            emptyLabel="Aucun accès client"
          />
        </>
      )}
      {view === 'requests' && (
        <Split>
          <ErpOperationalTable
            ariaLabel="Demandes portail clients"
            columns={requestColumns}
            rows={requests}
            getRowKey={({ id }) => id}
            emptyLabel="Aucune demande client"
          />
          <Detail>
            {selectedRequest ? (
              <>
                <DetailHeader>
                  <div>
                    <h2>{selectedRequest.subject}</h2>
                    <p>
                      {selectedRequest.tier?.name} ·{' '}
                      {selectedRequest.description}
                    </p>
                  </div>
                  {statusBadge(selectedRequest.status)}
                </DetailHeader>
                {selectedRequest.comments.map((comment) => (
                  <Message
                    key={comment.id}
                    customer={comment.fromCustomer}
                    internal={comment.isInternal}
                  >
                    <p>{comment.body}</p>
                    <span>
                      {comment.isInternal
                        ? 'Note interne'
                        : comment.fromCustomer
                          ? 'Client'
                          : 'Équipe Zowka'}{' '}
                      · {formatDate(comment.createdAt)}
                    </span>
                  </Message>
                ))}
                <DetailForm onSubmit={saveRequest}>
                  <Field>
                    Statut
                    <Select
                      value={reviewForm.status}
                      onChange={(event) =>
                        setReviewForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                    >
                      <option value="OPEN">Ouverte</option>
                      <option value="IN_PROGRESS">En traitement</option>
                      <option value="WAITING_CLIENT">Attente client</option>
                      <option value="RESOLVED">Résolue</option>
                      <option value="CLOSED">Clôturée</option>
                    </Select>
                  </Field>
                  <Field>
                    Responsable Twenty
                    <Input
                      value={reviewForm.assignedToTwentyUserId}
                      onChange={(event) =>
                        setReviewForm((current) => ({
                          ...current,
                          assignedToTwentyUserId: event.target.value,
                        }))
                      }
                      placeholder="Identifiant utilisateur (optionnel)"
                    />
                  </Field>
                  <Field>
                    Réponse
                    <Textarea
                      value={reviewForm.comment}
                      onChange={(event) =>
                        setReviewForm((current) => ({
                          ...current,
                          comment: event.target.value,
                        }))
                      }
                      placeholder="Message visible par le client"
                    />
                  </Field>
                  <CheckboxRow>
                    <input
                      type="checkbox"
                      checked={reviewForm.isInternal}
                      onChange={(event) =>
                        setReviewForm((current) => ({
                          ...current,
                          isInternal: event.target.checked,
                        }))
                      }
                    />{' '}
                    Note interne
                  </CheckboxRow>
                  <Button
                    title="Enregistrer"
                    ariaLabel="Enregistrer"
                    Icon={IconCheck}
                    variant="primary"
                    type="submit"
                    disabled={busy}
                  />
                </DetailForm>
              </>
            ) : (
              <Notice>Sélectionnez une demande.</Notice>
            )}
          </Detail>
        </Split>
      )}
    </ErpPageShell>
  );
};
