import { styled } from '@linaria/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import {
  clientPortalCreditNoteListSchema,
  clientPortalCommentSchema,
  clientPortalDocumentSchema,
  clientPortalFileSchema,
  clientPortalInvoiceListSchema,
  clientPortalNotificationListSchema,
  clientPortalNotificationSchema,
  clientPortalPaymentListSchema,
  clientPortalRequestListSchema,
  clientPortalRequestSchema,
  clientPortalSessionSchema,
  type ClientPortalCreditNote,
  type ClientPortalInvoice,
  type ClientPortalNotification,
  type ClientPortalPayment,
  type ClientPortalRequest,
  type ClientPortalSession,
} from 'twenty-shared/erp-maroc';
import {
  IconBell,
  IconDownload,
  IconFileText,
  IconMessage,
  IconRefresh,
  IconSend,
  IconUpload,
} from 'twenty-ui/display';
import { type z } from 'zod';

type View = 'invoices' | 'payments' | 'requests' | 'notifications';
type LoadState = 'loading' | 'ready' | 'error' | 'unauthorized';

const STORAGE_KEY = 'zowka-client-portal-token';
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,100}$/;

const formatMoney = (cents: number, currency = 'MAD') =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency }).format(
    cents / 100,
  );

const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat('fr-MA', { dateStyle: 'medium' }).format(
        new Date(value),
      )
    : '—';

const tokenFromLocation = () => {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const token = new URLSearchParams(hash).get('token')?.trim() ?? '';
  if (TOKEN_PATTERN.test(token)) {
    window.sessionStorage.setItem(STORAGE_KEY, token);
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`,
    );
    return token;
  }
  const stored = window.sessionStorage.getItem(STORAGE_KEY)?.trim() ?? '';
  return TOKEN_PATTERN.test(stored) ? stored : '';
};

const requestPortal = async <TSchema extends z.ZodType>(
  token: string,
  path: string,
  schema: TSchema,
  options?: { method?: 'GET' | 'POST'; body?: unknown },
): Promise<z.infer<TSchema>> => {
  const response = await fetch(`/erp-maroc-public/portal${path}`, {
    method: options?.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.method === 'POST'
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
    body:
      options?.method === 'POST'
        ? JSON.stringify(options.body ?? {})
        : undefined,
    credentials: 'omit',
  });
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok || payload === null) {
    if (response.status === 401) window.sessionStorage.removeItem(STORAGE_KEY);
    throw new Error(
      response.status === 401 ? 'unauthorized' : 'request-failed',
    );
  }
  return schema.parse(payload);
};

const downloadBase64 = (file: {
  filename: string;
  contentType: string;
  contentBase64: string;
}) => {
  const bytes = Uint8Array.from(window.atob(file.contentBase64), (character) =>
    character.charCodeAt(0),
  );
  const url = URL.createObjectURL(
    new Blob([bytes], { type: file.contentType }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const separator = result.indexOf(',');
      if (separator < 0) reject(new Error('invalid-file'));
      else resolve(result.slice(separator + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('read-failed'));
    reader.readAsDataURL(file);
  });

const statusLabel: Record<string, string> = {
  SENT: 'Envoyée',
  VALIDATED: 'Validée',
  OVERDUE: 'En retard',
  PAID: 'Payée',
  PARTIALLY_PAID: 'Partiellement payée',
  OPEN: 'Ouverte',
  IN_PROGRESS: 'En traitement',
  WAITING_CLIENT: 'Votre réponse attendue',
  RESOLVED: 'Résolue',
  CLOSED: 'Clôturée',
  POSTED: 'Comptabilisé',
  REVERSED: 'Contrepassé',
  CANCELLED: 'Annulé',
  UNREAD: 'Nouveau',
  READ: 'Lu',
};

const Shell = styled.div`
  background: #f4f6f8;
  color: #202124;
  height: 100dvh;
  overflow-y: auto;
  width: 100%;
`;

const Header = styled.header`
  align-items: center;
  background: #ffffff;
  border-bottom: 1px solid #dfe3e8;
  display: flex;
  justify-content: space-between;
  min-height: 64px;
  padding: 0 32px;

  @media (max-width: 720px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
    padding: 16px 20px;
  }
`;

const Brand = styled.div`
  align-items: center;
  display: flex;
  gap: 12px;
`;

const Mark = styled.div`
  align-items: center;
  background: #111827;
  border-radius: 6px;
  color: #ffffff;
  display: flex;
  font-size: 18px;
  font-weight: 700;
  height: 34px;
  justify-content: center;
  width: 34px;
`;

const BrandName = styled.strong`
  font-size: 18px;
  letter-spacing: 0;
`;

const Identity = styled.div`
  color: #5f6368;
  font-size: 13px;
  text-align: right;

  strong {
    color: #202124;
    display: block;
    font-size: 14px;
  }

  @media (max-width: 720px) {
    text-align: left;
  }
`;

const Main = styled.main`
  margin: 0 auto;
  max-width: 1240px;
  padding: 28px 32px 48px;

  @media (max-width: 720px) {
    padding: 20px 12px 36px;
  }
`;

const TitleRow = styled.div`
  align-items: flex-end;
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;

  h1 {
    font-size: 26px;
    letter-spacing: 0;
    margin: 0 0 4px;
  }

  p {
    color: #6b7280;
    margin: 0;
  }
`;

const IconButton = styled.button`
  align-items: center;
  background: #ffffff;
  border: 1px solid #cfd4dc;
  border-radius: 5px;
  color: #374151;
  cursor: pointer;
  display: inline-flex;
  height: 34px;
  justify-content: center;
  width: 34px;

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`;

const Metrics = styled.section`
  background: #ffffff;
  border: 1px solid #dfe3e8;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin-bottom: 20px;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Metric = styled.div`
  border-right: 1px solid #e5e7eb;
  min-width: 0;
  padding: 18px;

  &:last-child {
    border-right: 0;
  }

  span {
    color: #6b7280;
    display: block;
    font-size: 12px;
    margin-bottom: 7px;
  }

  strong {
    font-size: 20px;
    letter-spacing: 0;
    overflow-wrap: anywhere;
  }
`;

const Tabs = styled.nav`
  border-bottom: 1px solid #cfd4dc;
  display: flex;
  gap: 20px;
  margin-bottom: 0;
  overflow-x: auto;
`;

const Tab = styled.button<{ active: boolean }>`
  background: transparent;
  border: 0;
  border-bottom: 2px solid
    ${({ active }) => (active ? '#111827' : 'transparent')};
  color: ${({ active }) => (active ? '#111827' : '#6b7280')};
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: ${({ active }) => (active ? 600 : 400)};
  height: 44px;
  padding: 0;
  white-space: nowrap;
`;

const Panel = styled.section`
  background: #ffffff;
  border: 1px solid #dfe3e8;
  border-top: 0;
  min-height: 280px;
  overflow-x: auto;
`;

const Table = styled.table`
  border-collapse: collapse;
  min-width: 760px;
  width: 100%;

  th,
  td {
    border-bottom: 1px solid #edf0f2;
    font-size: 13px;
    padding: 13px 16px;
    text-align: left;
  }

  th {
    color: #6b7280;
    font-size: 12px;
    font-weight: 500;
  }

  td[data-align='right'],
  th[data-align='right'] {
    text-align: right;
  }
`;

const Status = styled.span<{ danger?: boolean; success?: boolean }>`
  background: ${({ danger, success }) =>
    danger ? '#fee2e2' : success ? '#dcfce7' : '#eef2f7'};
  border-radius: 4px;
  color: ${({ danger, success }) =>
    danger ? '#991b1b' : success ? '#166534' : '#475569'};
  display: inline-block;
  font-size: 11px;
  padding: 3px 7px;
  white-space: nowrap;
`;

const Empty = styled.div`
  color: #6b7280;
  padding: 52px 24px;
  text-align: center;
`;

const Toolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  min-height: 52px;
  padding: 0 16px;

  strong {
    font-size: 14px;
  }
`;

const PrimaryButton = styled.button`
  align-items: center;
  background: #111827;
  border: 1px solid #111827;
  border-radius: 5px;
  color: #ffffff;
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: 13px;
  gap: 7px;
  min-height: 34px;
  padding: 0 13px;

  &:disabled {
    cursor: default;
    opacity: 0.55;
  }
`;

const SecondaryButton = styled(PrimaryButton)`
  background: #ffffff;
  border-color: #cfd4dc;
  color: #374151;
`;

const Form = styled.form`
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: grid;
  gap: 12px;
  grid-template-columns: 180px 1fr 2fr auto;
  padding: 16px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const Input = styled.input`
  background: #ffffff;
  border: 1px solid #cfd4dc;
  border-radius: 5px;
  box-sizing: border-box;
  color: #202124;
  font: inherit;
  font-size: 13px;
  height: 36px;
  padding: 0 10px;
  width: 100%;
`;

const Select = styled.select`
  background: #ffffff;
  border: 1px solid #cfd4dc;
  border-radius: 5px;
  color: #202124;
  font: inherit;
  font-size: 13px;
  height: 36px;
  padding: 0 10px;
  width: 100%;
`;

const Request = styled.article`
  border-bottom: 1px solid #e5e7eb;
  padding: 18px;
`;

const RequestHeader = styled.div`
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;

  h3 {
    font-size: 15px;
    letter-spacing: 0;
    margin: 0 0 5px;
  }

  p {
    color: #6b7280;
    font-size: 13px;
    margin: 0;
  }
`;

const Conversation = styled.div`
  margin-top: 16px;
`;

const Message = styled.div<{ customer: boolean }>`
  border-left: 3px solid ${({ customer }) => (customer ? '#2563eb' : '#111827')};
  margin: 8px 0;
  padding: 4px 0 4px 10px;

  p {
    font-size: 13px;
    margin: 0 0 3px;
  }

  span {
    color: #9ca3af;
    font-size: 11px;
  }
`;

const InlineForm = styled.form`
  align-items: center;
  display: flex;
  gap: 8px;
  margin-top: 12px;

  ${Input} {
    flex: 1 1 auto;
  }
`;

const Documents = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;

const DocumentButton = styled.button`
  align-items: center;
  background: #ffffff;
  border: 1px solid #d7dce2;
  border-radius: 4px;
  color: #374151;
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: 12px;
  gap: 6px;
  min-height: 30px;
  padding: 0 9px;
`;

const UploadLabel = styled.label`
  align-items: center;
  background: #ffffff;
  border: 1px solid #d7dce2;
  border-radius: 4px;
  color: #374151;
  cursor: pointer;
  display: inline-flex;
  font-size: 12px;
  gap: 6px;
  min-height: 30px;
  padding: 0 9px;
`;

const Notice = styled.div<{ danger?: boolean }>`
  background: ${({ danger }) => (danger ? '#fef2f2' : '#eff6ff')};
  border-bottom: 1px solid ${({ danger }) => (danger ? '#fecaca' : '#bfdbfe')};
  color: ${({ danger }) => (danger ? '#991b1b' : '#1e40af')};
  font-size: 13px;
  padding: 11px 16px;
`;

const Centered = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  justify-content: center;
  padding: 24px;
  text-align: center;

  h1 {
    font-size: 24px;
    letter-spacing: 0;
  }

  p {
    color: #6b7280;
    max-width: 420px;
  }
`;

export const ClientPortalPage = () => {
  const [token] = useState(tokenFromLocation);
  const [view, setView] = useState<View>('invoices');
  const [loadState, setLoadState] = useState<LoadState>(
    token ? 'loading' : 'unauthorized',
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    danger: boolean;
    text: string;
  } | null>(null);
  const [session, setSession] = useState<ClientPortalSession | null>(null);
  const [invoices, setInvoices] = useState<ClientPortalInvoice[]>([]);
  const [payments, setPayments] = useState<ClientPortalPayment[]>([]);
  const [credits, setCredits] = useState<ClientPortalCreditNote[]>([]);
  const [requests, setRequests] = useState<ClientPortalRequest[]>([]);
  const [notifications, setNotifications] = useState<
    ClientPortalNotification[]
  >([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({
    type: 'SUPPORT',
    subject: '',
    description: '',
  });
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {},
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoadState('loading');
    try {
      const currentSession = await requestPortal(
        token,
        '/session',
        clientPortalSessionSchema,
      );
      const [
        nextInvoices,
        nextPayments,
        nextCredits,
        nextRequests,
        nextNotifications,
      ] = await Promise.all([
        currentSession.permissions.canViewInvoices
          ? requestPortal(token, '/invoices', clientPortalInvoiceListSchema)
          : Promise.resolve([]),
        currentSession.permissions.canViewInvoices
          ? requestPortal(token, '/payments', clientPortalPaymentListSchema)
          : Promise.resolve([]),
        currentSession.permissions.canViewInvoices
          ? requestPortal(
              token,
              '/credit-notes',
              clientPortalCreditNoteListSchema,
            )
          : Promise.resolve([]),
        requestPortal(token, '/requests', clientPortalRequestListSchema),
        requestPortal(
          token,
          '/notifications',
          clientPortalNotificationListSchema,
        ),
      ]);
      setSession(currentSession);
      setInvoices(nextInvoices);
      setPayments(nextPayments);
      setCredits(nextCredits);
      setRequests(nextRequests);
      setNotifications(nextNotifications);
      setLoadState('ready');
    } catch (error) {
      setLoadState(
        error instanceof Error && error.message === 'unauthorized'
          ? 'unauthorized'
          : 'error',
      );
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(() => {
    const outstanding = invoices.reduce(
      (total, invoice) => total + invoice.outstandingCents,
      0,
    );
    const overdue = invoices.reduce(
      (total, invoice) =>
        total + (invoice.isOverdue ? invoice.outstandingCents : 0),
      0,
    );
    const availableCredit = credits
      .filter(({ status }) => status === 'VALIDATED')
      .reduce((total, credit) => total + credit.remainingCents, 0);
    return {
      outstanding,
      overdue,
      availableCredit,
      unread: notifications.filter(({ status }) => status === 'UNREAD').length,
    };
  }, [credits, invoices, notifications]);

  const mutate = async (
    operation: () => Promise<unknown>,
    success: string,
  ): Promise<boolean> => {
    setBusy(true);
    setNotice(null);
    try {
      await operation();
      setNotice({ danger: false, text: success });
      await load();
      return true;
    } catch {
      setNotice({ danger: true, text: "L'opération n'a pas abouti." });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const createRequest = (event: FormEvent) => {
    event.preventDefault();
    void mutate(
      () =>
        requestPortal(token, '/requests', clientPortalRequestSchema, {
          method: 'POST',
          body: requestForm,
        }),
      'Votre demande a été transmise.',
    ).then((succeeded) => {
      if (!succeeded) return;
      setShowRequestForm(false);
      setRequestForm({ type: 'SUPPORT', subject: '', description: '' });
    });
  };

  const addComment = (event: FormEvent, requestId: string) => {
    event.preventDefault();
    const body = commentDrafts[requestId]?.trim() ?? '';
    if (!body) return;
    void mutate(
      () =>
        requestPortal(
          token,
          `/requests/${requestId}/comments`,
          clientPortalCommentSchema,
          { method: 'POST', body: { body } },
        ),
      'Votre message a été envoyé.',
    ).then((succeeded) => {
      if (succeeded) {
        setCommentDrafts((current) => ({ ...current, [requestId]: '' }));
      }
    });
  };

  const uploadDocument = (requestId: string, file: File | undefined) => {
    if (!file) return;
    if (file.size > 14 * 1024 * 1024) {
      setNotice({ danger: true, text: 'Le document dépasse 14 Mo.' });
      return;
    }
    void mutate(async () => {
      const contentBase64 = await fileToBase64(file);
      await requestPortal(
        token,
        `/requests/${requestId}/documents`,
        clientPortalDocumentSchema.pick({
          id: true,
          filename: true,
          mimeType: true,
          sizeBytes: true,
        }),
        {
          method: 'POST',
          body: { filename: file.name, title: file.name, contentBase64 },
        },
      );
    }, 'Document déposé.');
  };

  const download = async (path: string) => {
    setBusy(true);
    try {
      const file = await requestPortal(token, path, clientPortalFileSchema);
      downloadBase64(file);
    } catch {
      setNotice({ danger: true, text: 'Document indisponible.' });
    } finally {
      setBusy(false);
    }
  };

  const markRead = (notification: ClientPortalNotification) => {
    if (notification.status === 'READ') return;
    void mutate(
      () =>
        requestPortal(
          token,
          `/notifications/${notification.id}/read`,
          clientPortalNotificationSchema,
          { method: 'POST' },
        ),
      'Notification lue.',
    );
  };

  if (loadState === 'unauthorized') {
    return (
      <Shell>
        <Centered>
          <Mark>Z</Mark>
          <h1>Lien invalide ou expiré</h1>
          <p>Demandez un nouveau lien sécurisé à votre interlocuteur Zowka.</p>
        </Centered>
      </Shell>
    );
  }

  if (loadState === 'loading' && !session) {
    return (
      <Shell>
        <Centered>
          <Mark>Z</Mark>
          <p>Chargement de votre espace…</p>
        </Centered>
      </Shell>
    );
  }

  if (loadState === 'error' || !session) {
    return (
      <Shell>
        <Centered>
          <Mark>Z</Mark>
          <h1>Espace temporairement indisponible</h1>
          <SecondaryButton type="button" onClick={() => void load()}>
            <IconRefresh size={16} /> Réessayer
          </SecondaryButton>
        </Centered>
      </Shell>
    );
  }

  return (
    <Shell>
      <Header>
        <Brand>
          <Mark>Z</Mark>
          <BrandName>Zowka</BrandName>
        </Brand>
        <Identity>
          <strong>{session.customer.name}</strong>
          {session.company.name}
        </Identity>
      </Header>
      <Main>
        <TitleRow>
          <div>
            <h1>Espace client</h1>
            <p>Situation à jour au {formatDate(new Date().toISOString())}</p>
          </div>
          <IconButton
            type="button"
            onClick={() => void load()}
            disabled={busy}
            title="Actualiser"
          >
            <IconRefresh size={17} />
          </IconButton>
        </TitleRow>
        <Metrics>
          <Metric>
            <span>Solde à régler</span>
            <strong>{formatMoney(metrics.outstanding)}</strong>
          </Metric>
          <Metric>
            <span>Échu</span>
            <strong>{formatMoney(metrics.overdue)}</strong>
          </Metric>
          <Metric>
            <span>Avoirs validés</span>
            <strong>{formatMoney(metrics.availableCredit)}</strong>
          </Metric>
          <Metric>
            <span>Nouvelles notifications</span>
            <strong>{metrics.unread}</strong>
          </Metric>
        </Metrics>
        <Tabs>
          {(
            [
              ['invoices', 'Factures'],
              ['payments', 'Paiements et avoirs'],
              ['requests', 'Demandes'],
              ['notifications', 'Notifications'],
            ] as const
          ).map(([key, label]) => (
            <Tab
              key={key}
              active={view === key}
              onClick={() => setView(key)}
              type="button"
            >
              {label}
            </Tab>
          ))}
        </Tabs>
        <Panel>
          {notice && <Notice danger={notice.danger}>{notice.text}</Notice>}
          {view === 'invoices' &&
            (invoices.length ? (
              <Table>
                <thead>
                  <tr>
                    <th>Facture</th>
                    <th>Émission</th>
                    <th>Échéance</th>
                    <th>Statut</th>
                    <th data-align="right">Total TTC</th>
                    <th data-align="right">Réglé</th>
                    <th data-align="right">Reste</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <strong>{invoice.number ?? '—'}</strong>
                        <br />
                        {invoice.title}
                      </td>
                      <td>{formatDate(invoice.issueDate)}</td>
                      <td>{formatDate(invoice.dueDate)}</td>
                      <td>
                        <Status
                          danger={invoice.isOverdue}
                          success={invoice.outstandingCents === 0}
                        >
                          {invoice.isOverdue
                            ? 'En retard'
                            : (statusLabel[invoice.status] ?? invoice.status)}
                        </Status>
                      </td>
                      <td data-align="right">
                        {formatMoney(invoice.totalTtcCents, invoice.currency)}
                      </td>
                      <td data-align="right">
                        {formatMoney(invoice.paidCents, invoice.currency)}
                      </td>
                      <td data-align="right">
                        <strong>
                          {formatMoney(
                            invoice.outstandingCents,
                            invoice.currency,
                          )}
                        </strong>
                      </td>
                      <td data-align="right">
                        {invoice.pdfAvailable && (
                          <IconButton
                            type="button"
                            title="Télécharger la facture"
                            disabled={busy}
                            onClick={() =>
                              void download(`/invoices/${invoice.id}/pdf`)
                            }
                          >
                            <IconDownload size={16} />
                          </IconButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <Empty>Aucune facture disponible.</Empty>
            ))}
          {view === 'payments' && (
            <>
              <Toolbar>
                <strong>Paiements</strong>
              </Toolbar>
              {payments.length ? (
                <Table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Référence</th>
                      <th>Moyen</th>
                      <th>Statut</th>
                      <th data-align="right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.paymentDate)}</td>
                        <td>{payment.reference ?? '—'}</td>
                        <td>{payment.method.replaceAll('_', ' ')}</td>
                        <td>
                          <Status success={payment.status === 'POSTED'}>
                            {statusLabel[payment.status] ?? payment.status}
                          </Status>
                        </td>
                        <td data-align="right">
                          {formatMoney(
                            payment.kind === 'REVERSAL'
                              ? -payment.amountCents
                              : payment.amountCents,
                            payment.currency,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Empty>Aucun paiement comptabilisé.</Empty>
              )}
              <Toolbar>
                <strong>Avoirs</strong>
              </Toolbar>
              {credits.length ? (
                <Table>
                  <thead>
                    <tr>
                      <th>Avoir</th>
                      <th>Date</th>
                      <th>Statut</th>
                      <th data-align="right">Montant TTC</th>
                      <th data-align="right">Disponible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {credits.map((credit) => (
                      <tr key={credit.id}>
                        <td>{credit.number ?? '—'}</td>
                        <td>{formatDate(credit.issueDate)}</td>
                        <td>
                          <Status success={credit.status === 'VALIDATED'}>
                            {statusLabel[credit.status] ?? credit.status}
                          </Status>
                        </td>
                        <td data-align="right">
                          {formatMoney(credit.totalTtcCents, credit.currency)}
                        </td>
                        <td data-align="right">
                          <strong>
                            {formatMoney(
                              credit.remainingCents,
                              credit.currency,
                            )}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Empty>Aucun avoir disponible.</Empty>
              )}
            </>
          )}
          {view === 'requests' && (
            <>
              <Toolbar>
                <strong>Demandes et documents</strong>
                <PrimaryButton
                  type="button"
                  onClick={() => setShowRequestForm((value) => !value)}
                >
                  <IconMessage size={16} /> Nouvelle demande
                </PrimaryButton>
              </Toolbar>
              {showRequestForm && (
                <Form onSubmit={createRequest}>
                  <Select
                    value={requestForm.type}
                    onChange={(event) =>
                      setRequestForm((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                  >
                    <option value="SUPPORT">Assistance</option>
                    <option value="DOCUMENT">Document</option>
                    <option value="INVOICE">Facture</option>
                    <option value="ACCOUNTING">Comptabilité</option>
                    <option value="OTHER">Autre</option>
                  </Select>
                  <Input
                    required
                    maxLength={180}
                    placeholder="Objet"
                    value={requestForm.subject}
                    onChange={(event) =>
                      setRequestForm((current) => ({
                        ...current,
                        subject: event.target.value,
                      }))
                    }
                  />
                  <Input
                    required
                    maxLength={4000}
                    placeholder="Votre demande"
                    value={requestForm.description}
                    onChange={(event) =>
                      setRequestForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                  <PrimaryButton disabled={busy} type="submit">
                    <IconSend size={16} /> Envoyer
                  </PrimaryButton>
                </Form>
              )}
              {requests.length ? (
                requests.map((request) => (
                  <Request key={request.id}>
                    <RequestHeader>
                      <div>
                        <h3>{request.subject}</h3>
                        <p>{request.description}</p>
                      </div>
                      <Status
                        success={
                          request.status === 'RESOLVED' ||
                          request.status === 'CLOSED'
                        }
                      >
                        {statusLabel[request.status] ?? request.status}
                      </Status>
                    </RequestHeader>
                    <Conversation>
                      {request.comments.map((comment) => (
                        <Message
                          key={comment.id}
                          customer={comment.fromCustomer}
                        >
                          <p>{comment.body}</p>
                          <span>
                            {comment.fromCustomer
                              ? 'Vous'
                              : session.company.name}{' '}
                            · {formatDate(comment.createdAt)}
                          </span>
                        </Message>
                      ))}
                    </Conversation>
                    {session.permissions.canViewDocuments &&
                      request.documents.length > 0 && (
                        <Documents>
                          {request.documents.map((document) => (
                            <DocumentButton
                              key={document.id}
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void download(
                                  `/documents/${document.id}/content`,
                                )
                              }
                            >
                              <IconFileText size={15} />{' '}
                              {document.title ?? document.filename}
                            </DocumentButton>
                          ))}
                        </Documents>
                      )}
                    {request.status !== 'CLOSED' && (
                      <InlineForm
                        onSubmit={(event) => addComment(event, request.id)}
                      >
                        <Input
                          maxLength={4000}
                          placeholder="Ajouter un message"
                          value={commentDrafts[request.id] ?? ''}
                          onChange={(event) =>
                            setCommentDrafts((current) => ({
                              ...current,
                              [request.id]: event.target.value,
                            }))
                          }
                        />
                        <IconButton
                          type="submit"
                          disabled={busy}
                          title="Envoyer"
                        >
                          <IconSend size={16} />
                        </IconButton>
                        {session.permissions.canSubmitDocuments && (
                          <UploadLabel>
                            <IconUpload size={15} /> Déposer
                            <input
                              hidden
                              type="file"
                              accept="application/pdf,image/png,image/jpeg"
                              onChange={(event) =>
                                uploadDocument(
                                  request.id,
                                  event.target.files?.[0],
                                )
                              }
                            />
                          </UploadLabel>
                        )}
                      </InlineForm>
                    )}
                  </Request>
                ))
              ) : (
                <Empty>Aucune demande en cours.</Empty>
              )}
            </>
          )}
          {view === 'notifications' &&
            (notifications.length ? (
              notifications.map((notification) => (
                <Request key={notification.id}>
                  <RequestHeader>
                    <div>
                      <h3>
                        <IconBell size={15} /> {notification.title}
                      </h3>
                      <p>{notification.body}</p>
                    </div>
                    <Status success={notification.status === 'READ'}>
                      {statusLabel[notification.status]}
                    </Status>
                  </RequestHeader>
                  <Documents>
                    <span>{formatDate(notification.createdAt)}</span>
                    {notification.status === 'UNREAD' && (
                      <SecondaryButton
                        type="button"
                        disabled={busy}
                        onClick={() => markRead(notification)}
                      >
                        Marquer comme lu
                      </SecondaryButton>
                    )}
                  </Documents>
                </Request>
              ))
            ) : (
              <Empty>Aucune notification.</Empty>
            ))}
        </Panel>
      </Main>
    </Shell>
  );
};
