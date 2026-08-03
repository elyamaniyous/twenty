import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatCivilDate } from '@/erp-maroc/utils/civilDate';
import {
  formatMadCents,
  parseMadDecimalToCents,
} from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  erpBankAccountListSchema,
  erpChequeAlertsSchema,
  erpChequeBookListSchema,
  erpChequeBookSchema,
  erpChequeDepositEligibleListSchema,
  erpChequeDepositSlipListSchema,
  erpChequeDepositSlipSchema,
  erpChequeDirectionSchema,
  erpChequeInstrumentTypeSchema,
  erpChequePageSchema,
  erpChequeSchema,
  erpChequeStatusSchema,
  erpChequeSummarySchema,
  type ErpBankAccount,
  type ErpChequeAlerts,
  type ErpCheque,
  type ErpChequeBook,
  type ErpChequeDepositSlipListItem,
  type ErpChequePage,
  type ErpChequeStatus,
  type ErpChequeSummary,
} from 'twenty-shared/erp-maroc';
import { IconPlus } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const EMPTY_PAGE: ErpChequePage = { items: [], nextCursor: null };
const EMPTY_SUMMARY: ErpChequeSummary = { rows: [] };

const statusLabels: Record<ErpChequeStatus, string> = {
  DRAFT: 'Brouillon',
  PRINTED: 'Imprimé',
  SIGNED: 'Signé',
  DELIVERED: 'Remis',
  IN_PORTFOLIO: 'En portefeuille',
  DEPOSITED: 'Déposé',
  CLEARED: 'Dénoué',
  REJECTED: 'Rejeté',
  STOPPED: 'Opposition',
  CANCELLED: 'Annulé',
};

const statusTone = (status: ErpChequeStatus) => {
  if (status === 'CLEARED') return 'success' as const;
  if (['REJECTED', 'STOPPED', 'CANCELLED'].includes(status)) {
    return 'danger' as const;
  }
  if (['DEPOSITED', 'DELIVERED'].includes(status)) return 'warning' as const;
  if (status === 'DRAFT') return 'neutral' as const;
  return 'info' as const;
};

const StyledMetrics = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  &:last-child {
    border-right: 0;
  }
`;

const StyledMetricLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledMetricValue = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  letter-spacing: 0;
  overflow-wrap: anywhere;
`;

const StyledAlerts = styled.div`
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StyledAlert = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  grid-template-columns: 1fr auto;
  min-width: 0;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};

  span {
    color: ${themeCssVariables.font.color.secondary};
    font-size: ${themeCssVariables.font.size.sm};
    overflow-wrap: anywhere;
  }

  strong {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.md};
    letter-spacing: 0;
  }

  small {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.xs};
    grid-column: 1 / -1;
  }
`;

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};

  input,
  select {
    background: ${themeCssVariables.background.primary};
    border: 1px solid ${themeCssVariables.border.color.medium};
    border-radius: ${themeCssVariables.border.radius.sm};
    color: ${themeCssVariables.font.color.primary};
    min-height: 32px;
    padding: 0 ${themeCssVariables.spacing[2]};
  }

  input {
    min-width: min(260px, 100%);
  }
`;

const StyledDrawerForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  overflow: auto;
  padding: ${themeCssVariables.spacing[4]};

  label {
    color: ${themeCssVariables.font.color.secondary};
    display: flex;
    flex-direction: column;
    font-size: ${themeCssVariables.font.size.sm};
    gap: ${themeCssVariables.spacing[1]};
  }

  input,
  select,
  textarea {
    background: ${themeCssVariables.background.primary};
    border: 1px solid ${themeCssVariables.border.color.medium};
    border-radius: ${themeCssVariables.border.radius.sm};
    box-sizing: border-box;
    color: ${themeCssVariables.font.color.primary};
    min-height: 36px;
    padding: ${themeCssVariables.spacing[2]};
    width: 100%;
  }

  textarea {
    min-height: 84px;
    resize: vertical;
  }
`;

const StyledError = styled.div`
  color: ${themeCssVariables.color.red};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledSection = styled.section`
  border-top: 1px solid ${themeCssVariables.border.color.light};

  h2 {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.md};
    letter-spacing: 0;
    margin: 0;
    padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
  }
`;

const StyledEligibleList = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  max-height: 280px;
  overflow: auto;
`;

const StyledEligibleRow = styled.label`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid !important;
  gap: ${themeCssVariables.spacing[2]} !important;
  grid-template-columns: 20px minmax(90px, 0.6fr) minmax(150px, 1fr) auto;
  padding: ${themeCssVariables.spacing[2]};

  input {
    min-height: auto !important;
    width: auto !important;
  }

  strong {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.sm};
    letter-spacing: 0;
  }
`;

type DrawerMode = 'cheque' | 'book' | 'deposit' | null;

const sumSummary = (
  summary: ErpChequeSummary,
  predicate: (row: ErpChequeSummary['rows'][number]) => boolean,
) =>
  summary.rows
    .filter(predicate)
    .reduce((total, row) => total + row.amountCents, 0);

const columns: ErpOperationalTableColumn<ErpCheque>[] = [
  {
    key: 'direction',
    header: 'Sens',
    width: '110px',
    render: (row) => (row.direction === 'RECEIVED' ? 'Reçu' : 'Émis'),
  },
  {
    key: 'number',
    header: 'Numéro',
    width: '140px',
    render: (row) => row.number,
  },
  {
    key: 'counterparty',
    header: 'Tiers / bénéficiaire',
    render: (row) => row.tier?.name ?? row.counterpartyName,
  },
  {
    key: 'bank',
    header: 'Banque',
    width: '170px',
    render: (row) => row.bankAccount.bankName,
  },
  {
    key: 'dueDate',
    header: 'Échéance',
    width: '120px',
    render: (row) =>
      row.dueDate === null
        ? formatCivilDate(row.issueDate)
        : formatCivilDate(row.dueDate),
  },
  {
    key: 'status',
    header: 'Statut',
    width: '150px',
    render: (row) => (
      <ErpStatusBadge
        label={statusLabels[row.status]}
        tone={statusTone(row.status)}
      />
    ),
  },
  {
    key: 'amount',
    header: 'Montant',
    width: '150px',
    align: 'right',
    render: (row) => formatMadCents(row.amountCents),
  },
  {
    key: 'action',
    header: '',
    width: '90px',
    align: 'right',
    render: (row) => <Link to={`/erp-maroc/cheques/${row.id}`}>Ouvrir</Link>,
  },
];

const depositSlipColumns: ErpOperationalTableColumn<ErpChequeDepositSlipListItem>[] =
  [
    {
      key: 'number',
      header: 'Bordereau',
      width: '170px',
      render: (row) => row.number,
    },
    {
      key: 'date',
      header: 'Date de remise',
      width: '140px',
      render: (row) => formatCivilDate(row.depositDate),
    },
    {
      key: 'bank',
      header: 'Banque',
      render: (row) => `${row.bankAccount.bankName} · ${row.bankAccount.name}`,
    },
    {
      key: 'count',
      header: 'Chèques',
      width: '100px',
      align: 'right',
      render: (row) => row._count.lines,
    },
    {
      key: 'total',
      header: 'Total',
      width: '160px',
      align: 'right',
      render: (row) => formatMadCents(row.totalAmountCents),
    },
    {
      key: 'action',
      header: '',
      width: '90px',
      align: 'right',
      render: (row) => (
        <Link to={`/erp-maroc/cheques/deposit-slips/${row.id}`}>Ouvrir</Link>
      ),
    },
  ];

export const ErpChequesPage = () => {
  const { client, context } = useErpMarocContext();
  const navigate = useNavigate();
  const [page, setPage] = useState<ErpChequePage>(EMPTY_PAGE);
  const [summary, setSummary] = useState<ErpChequeSummary>(EMPTY_SUMMARY);
  const [alerts, setAlerts] = useState<ErpChequeAlerts | null>(null);
  const [books, setBooks] = useState<ErpChequeBook[]>([]);
  const [depositSlips, setDepositSlips] = useState<
    ErpChequeDepositSlipListItem[]
  >([]);
  const [eligibleCheques, setEligibleCheques] = useState<ErpCheque[]>([]);
  const [eligibleState, setEligibleState] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [depositBankAccountId, setDepositBankAccountId] = useState('');
  const [bankAccounts, setBankAccounts] = useState<ErpBankAccount[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    direction: '',
    status: '',
    search: '',
  });
  const canManage = context?.capabilities.manageSupplierAccounting === true;

  const load = useCallback(async () => {
    setState('loading');
    try {
      const query = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== ''),
      );
      const [
        nextPage,
        nextSummary,
        nextAlerts,
        nextBooks,
        nextDepositSlips,
        nextBankAccounts,
      ] = await Promise.all([
        client.request({
          method: 'GET',
          path: '/cheques',
          query: Object.keys(query).length === 0 ? undefined : query,
          schema: erpChequePageSchema,
        }),
        client.request({
          method: 'GET',
          path: '/cheques/summary',
          schema: erpChequeSummarySchema,
        }),
        client.request({
          method: 'GET',
          path: '/cheques/alerts',
          schema: erpChequeAlertsSchema,
        }),
        client.request({
          method: 'GET',
          path: '/cheques/books',
          schema: erpChequeBookListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/cheques/deposit-slips',
          schema: erpChequeDepositSlipListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/bank-accounts',
          schema: erpBankAccountListSchema,
        }),
      ]);
      setPage(nextPage);
      setSummary(nextSummary);
      setAlerts(nextAlerts);
      setBooks(nextBooks);
      setDepositSlips(nextDepositSlips);
      setBankAccounts(nextBankAccounts.filter((account) => account.isActive));
      setState('ready');
    } catch {
      setState('error');
    }
  }, [client, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadEligibleCheques = useCallback(async () => {
    setEligibleState('loading');
    try {
      const result = await client.request({
        method: 'GET',
        path: '/cheques/deposit-slips/eligible',
        schema: erpChequeDepositEligibleListSchema,
      });
      setEligibleCheques(result);
      setEligibleState('ready');
    } catch {
      setEligibleState('error');
    }
  }, [client]);

  useEffect(() => {
    if (drawerMode === 'deposit') void loadEligibleCheques();
  }, [drawerMode, loadEligibleCheques]);

  const metrics = useMemo(
    () => ({
      portfolio: sumSummary(
        summary,
        (row) =>
          row.direction === 'RECEIVED' &&
          ['IN_PORTFOLIO', 'DEPOSITED'].includes(row.status),
      ),
      issued: sumSummary(
        summary,
        (row) =>
          row.direction === 'ISSUED' &&
          ['PRINTED', 'SIGNED', 'DELIVERED'].includes(row.status),
      ),
      cleared: sumSummary(summary, (row) => row.status === 'CLEARED'),
      rejected: sumSummary(summary, (row) => row.status === 'REJECTED'),
    }),
    [summary],
  );

  const alertMetrics = useMemo(() => {
    const rows = alerts?.alerts ?? [];
    const aggregate = (type: ErpChequeAlerts['alerts'][number]['type']) => {
      const selected = rows.filter((row) => row.type === type);
      return {
        count: selected.length,
        amountCents: selected.reduce(
          (total, row) => total + row.cheque.amountCents,
          0,
        ),
      };
    };
    return {
      received: aggregate('RECEIVED_TO_DEPOSIT'),
      issued: aggregate('ISSUED_TO_FUND'),
      stale: aggregate('STALE_DEPOSIT'),
      lowBooks: alerts?.lowBooks.length ?? 0,
    };
  }, [alerts]);

  const closeDrawer = () => {
    if (isSubmitting) return;
    setDrawerMode(null);
    setFormError(null);
    setDepositBankAccountId('');
  };

  const submitCheque = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!context || isSubmitting) return;
    const form = new FormData(event.currentTarget);
    try {
      setIsSubmitting(true);
      setFormError(null);
      const amountCents = parseMadDecimalToCents(String(form.get('amount')));
      if (amountCents <= 0) throw new Error('invalid amount');
      const optional = (name: string) => {
        const value = String(form.get(name) ?? '').trim();
        return value || undefined;
      };
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/cheques',
          schema: erpChequeSchema,
          body: {
            societeId: context.societeId,
            bankAccountId: String(form.get('bankAccountId')),
            chequeBookId: optional('chequeBookId'),
            direction: String(form.get('direction')),
            instrumentType: String(form.get('instrumentType')),
            number: optional('number'),
            amountCents,
            currency: 'MAD',
            issueDate: String(form.get('issueDate')),
            dueDate: optional('dueDate'),
            place: optional('place'),
            counterpartyName: String(form.get('counterpartyName')),
            drawerName: optional('drawerName'),
            memo: optional('memo'),
          },
        },
        { idempotency: 'required' },
      );
      const created = await intent.execute();
      navigate(`/erp-maroc/cheques/${created.id}`);
    } catch {
      setFormError('Vérifiez les champs puis réessayez la création.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitBook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!context || isSubmitting) return;
    const form = new FormData(event.currentTarget);
    try {
      setIsSubmitting(true);
      setFormError(null);
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/cheques/books',
          schema: erpChequeBookSchema,
          body: {
            societeId: context.societeId,
            bankAccountId: String(form.get('bankAccountId')),
            name: String(form.get('name')),
            prefix: String(form.get('prefix') ?? ''),
            startNumber: Number(form.get('startNumber')),
            endNumber: Number(form.get('endNumber')),
            numberPadding: Number(form.get('numberPadding')),
            custodian: String(form.get('custodian') ?? '') || undefined,
          },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setDrawerMode(null);
      await load();
    } catch {
      setFormError(
        'Impossible de créer ce carnet. Vérifiez la plage de numéros.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitDepositSlip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!context || isSubmitting) return;
    const form = new FormData(event.currentTarget);
    const chequeIds = form
      .getAll('chequeIds')
      .map((value) => String(value))
      .filter(Boolean);
    if (chequeIds.length === 0) {
      setFormError('Sélectionnez au moins un chèque à remettre.');
      return;
    }
    try {
      setIsSubmitting(true);
      setFormError(null);
      const notes = String(form.get('notes') ?? '').trim();
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/cheques/deposit-slips',
          schema: erpChequeDepositSlipSchema,
          body: {
            societeId: context.societeId,
            bankAccountId: String(form.get('bankAccountId')),
            depositDate: String(form.get('depositDate')),
            chequeIds,
            notes: notes || undefined,
          },
        },
        { idempotency: 'required' },
      );
      const created = await intent.execute();
      navigate(`/erp-maroc/cheques/deposit-slips/${created.id}`);
    } catch {
      setFormError(
        'La remise a échoué. Vérifiez les chèques et le compte bancaire.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeBooks = books.filter((book) => book.status === 'ACTIVE');
  const filteredEligibleCheques = eligibleCheques.filter(
    (cheque) => cheque.bankAccountId === depositBankAccountId,
  );

  return (
    <ErpPageShell
      title="Chèques et effets"
      description="Encaissements, décaissements et lettres de change"
      actions={
        canManage ? (
          <>
            <Button
              title="Nouveau carnet"
              ariaLabel="Nouveau carnet"
              variant="secondary"
              onClick={() => setDrawerMode('book')}
            />
            <Button
              title="Nouveau bordereau"
              ariaLabel="Nouveau bordereau de remise"
              variant="secondary"
              onClick={() => {
                setDepositBankAccountId('');
                setFormError(null);
                setDrawerMode('deposit');
              }}
            />
            <Button
              title="Nouveau chèque"
              ariaLabel="Nouveau chèque"
              Icon={IconPlus}
              accent="blue"
              onClick={() => setDrawerMode('cheque')}
            />
          </>
        ) : null
      }
    >
      <StyledMetrics>
        <StyledMetric>
          <StyledMetricLabel>Reçus en portefeuille</StyledMetricLabel>
          <StyledMetricValue>
            {formatMadCents(metrics.portfolio)}
          </StyledMetricValue>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricLabel>Émis en circulation</StyledMetricLabel>
          <StyledMetricValue>
            {formatMadCents(metrics.issued)}
          </StyledMetricValue>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricLabel>Dénoués</StyledMetricLabel>
          <StyledMetricValue>
            {formatMadCents(metrics.cleared)}
          </StyledMetricValue>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricLabel>Rejetés</StyledMetricLabel>
          <StyledMetricValue>
            {formatMadCents(metrics.rejected)}
          </StyledMetricValue>
        </StyledMetric>
      </StyledMetrics>
      <StyledAlerts aria-label="Alertes chèques">
        <StyledAlert>
          <span>À déposer sous {alerts?.horizonDays ?? 7} jours</span>
          <strong>{alertMetrics.received.count}</strong>
          <small>{formatMadCents(alertMetrics.received.amountCents)}</small>
        </StyledAlert>
        <StyledAlert>
          <span>À provisionner sous {alerts?.horizonDays ?? 7} jours</span>
          <strong>{alertMetrics.issued.count}</strong>
          <small>{formatMadCents(alertMetrics.issued.amountCents)}</small>
        </StyledAlert>
        <StyledAlert>
          <span>Dépôts sans dénouement</span>
          <strong>{alertMetrics.stale.count}</strong>
          <small>{formatMadCents(alertMetrics.stale.amountCents)}</small>
        </StyledAlert>
        <StyledAlert>
          <span>Carnets presque épuisés</span>
          <strong>{alertMetrics.lowBooks}</strong>
          <small>5 feuilles ou moins</small>
        </StyledAlert>
      </StyledAlerts>
      <StyledToolbar>
        <input
          aria-label="Rechercher un chèque"
          placeholder="Numéro, tiers ou motif"
          value={filters.search}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              search: event.target.value,
            }))
          }
        />
        <select
          aria-label="Sens du chèque"
          value={filters.direction}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              direction: event.target.value,
            }))
          }
        >
          <option value="">Tous les sens</option>
          {erpChequeDirectionSchema.options.map((direction) => (
            <option key={direction} value={direction}>
              {direction === 'RECEIVED' ? 'Reçus' : 'Émis'}
            </option>
          ))}
        </select>
        <select
          aria-label="Statut du chèque"
          value={filters.status}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              status: event.target.value,
            }))
          }
        >
          <option value="">Tous les statuts</option>
          {erpChequeStatusSchema.options.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </StyledToolbar>
      <ErpOperationalTable
        ariaLabel="Registre des chèques"
        columns={columns}
        rows={page.items}
        getRowKey={(row) => row.id}
        state={state}
        loadingLabel="Chargement des chèques"
        emptyLabel="Aucun chèque ne correspond aux filtres"
        errorLabel="Impossible de charger le registre"
        retryLabel="Réessayer"
        onRetry={() => void load()}
      />

      <StyledSection>
        <h2>Derniers bordereaux de remise</h2>
        <ErpOperationalTable
          ariaLabel="Bordereaux de remise"
          columns={depositSlipColumns}
          rows={depositSlips}
          getRowKey={(row) => row.id}
          state={state}
          loadingLabel="Chargement des bordereaux"
          emptyLabel="Aucun bordereau de remise"
          errorLabel="Impossible de charger les bordereaux"
          retryLabel="Réessayer"
          onRetry={() => void load()}
        />
      </StyledSection>

      <ErpFormDrawer
        isOpen={drawerMode === 'cheque'}
        title="Nouveau chèque ou effet"
        description="Enregistrez un instrument reçu ou émis."
        isBusy={isSubmitting}
        onClose={closeDrawer}
      >
        <StyledDrawerForm id="create-cheque-form" onSubmit={submitCheque}>
          {formError === null ? null : (
            <StyledError role="alert">{formError}</StyledError>
          )}
          <label>
            Sens
            <select name="direction" defaultValue="RECEIVED" required>
              <option value="RECEIVED">Reçu d’un client</option>
              <option value="ISSUED">Émis à un bénéficiaire</option>
            </select>
          </label>
          <label>
            Type
            <select name="instrumentType" defaultValue="CHEQUE" required>
              {erpChequeInstrumentTypeSchema.options.map((type) => (
                <option key={type} value={type}>
                  {type === 'CHEQUE' ? 'Chèque' : 'Lettre de change normalisée'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Compte bancaire
            <select name="bankAccountId" required defaultValue="">
              <option value="" disabled>
                Sélectionner
              </option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.bankName} · {account.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Carnet interne, si chèque émis
            <select name="chequeBookId" defaultValue="">
              <option value="">Aucun</option>
              {activeBooks.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.name} · prochain {book.prefix}
                  {String(book.nextNumber).padStart(book.numberPadding, '0')}
                </option>
              ))}
            </select>
          </label>
          <label>
            Numéro
            <input
              name="number"
              maxLength={80}
              placeholder="Automatique avec un carnet"
            />
          </label>
          <label>
            Tiers, tireur ou bénéficiaire
            <input name="counterpartyName" required maxLength={200} />
          </label>
          <label>
            Montant en MAD
            <input
              name="amount"
              required
              inputMode="decimal"
              placeholder="12500,00"
            />
          </label>
          <label>
            Date d’émission
            <input name="issueDate" type="date" required />
          </label>
          <label>
            Date d’échéance
            <input name="dueDate" type="date" />
          </label>
          <label>
            Lieu
            <input name="place" maxLength={120} defaultValue="Casablanca" />
          </label>
          <label>
            Tireur LCN
            <input name="drawerName" maxLength={200} />
          </label>
          <label>
            Motif
            <textarea name="memo" maxLength={500} />
          </label>
          <Button
            type="submit"
            title="Créer le chèque"
            ariaLabel="Créer le chèque"
            accent="blue"
            disabled={isSubmitting}
          />
        </StyledDrawerForm>
      </ErpFormDrawer>

      <ErpFormDrawer
        isOpen={drawerMode === 'book'}
        title="Nouveau carnet"
        description="Définissez la plage de numéros affectée à un compte bancaire."
        isBusy={isSubmitting}
        onClose={closeDrawer}
      >
        <StyledDrawerForm id="create-cheque-book-form" onSubmit={submitBook}>
          {formError === null ? null : (
            <StyledError role="alert">{formError}</StyledError>
          )}
          <label>
            Compte bancaire
            <select name="bankAccountId" required defaultValue="">
              <option value="" disabled>
                Sélectionner
              </option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.bankName} · {account.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nom du carnet
            <input
              name="name"
              required
              maxLength={120}
              placeholder="Carnet principal"
            />
          </label>
          <label>
            Préfixe
            <input name="prefix" maxLength={20} />
          </label>
          <label>
            Premier numéro
            <input name="startNumber" type="number" min="0" required />
          </label>
          <label>
            Dernier numéro
            <input name="endNumber" type="number" min="0" required />
          </label>
          <label>
            Nombre de chiffres
            <input
              name="numberPadding"
              type="number"
              min="1"
              max="20"
              defaultValue="7"
              required
            />
          </label>
          <label>
            Gardien du carnet
            <input name="custodian" maxLength={120} />
          </label>
          <Button
            type="submit"
            title="Créer le carnet"
            ariaLabel="Créer le carnet"
            accent="blue"
            disabled={isSubmitting}
          />
        </StyledDrawerForm>
      </ErpFormDrawer>

      <ErpFormDrawer
        isOpen={drawerMode === 'deposit'}
        title="Nouveau bordereau de remise"
        description="Sélectionnez les chèques reçus à déposer sur le même compte."
        isBusy={isSubmitting}
        onClose={closeDrawer}
      >
        <StyledDrawerForm
          id="create-cheque-deposit-slip-form"
          onSubmit={submitDepositSlip}
        >
          {formError === null ? null : (
            <StyledError role="alert">{formError}</StyledError>
          )}
          <label>
            Compte bancaire de remise
            <select
              name="bankAccountId"
              required
              value={depositBankAccountId}
              onChange={(event) => {
                setDepositBankAccountId(event.target.value);
                setFormError(null);
              }}
            >
              <option value="" disabled>
                Sélectionner
              </option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.bankName} · {account.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date de remise
            <input
              name="depositDate"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </label>
          <div>
            {eligibleState === 'loading' || eligibleState === 'idle' ? (
              <StyledMetricLabel>
                Chargement des chèques disponibles…
              </StyledMetricLabel>
            ) : eligibleState === 'error' ? (
              <StyledError role="alert">
                Impossible de charger les chèques disponibles.
              </StyledError>
            ) : depositBankAccountId === '' ? (
              <StyledMetricLabel>
                Sélectionnez d’abord le compte bancaire.
              </StyledMetricLabel>
            ) : filteredEligibleCheques.length === 0 ? (
              <StyledMetricLabel>
                Aucun chèque reçu n’est prêt pour cette remise.
              </StyledMetricLabel>
            ) : (
              <StyledEligibleList>
                {filteredEligibleCheques.map((cheque) => (
                  <StyledEligibleRow key={cheque.id}>
                    <input type="checkbox" name="chequeIds" value={cheque.id} />
                    <strong>{cheque.number}</strong>
                    <span>{cheque.tier?.name ?? cheque.counterpartyName}</span>
                    <strong>{formatMadCents(cheque.amountCents)}</strong>
                  </StyledEligibleRow>
                ))}
              </StyledEligibleList>
            )}
          </div>
          <label>
            Observations
            <textarea name="notes" maxLength={500} />
          </label>
          <Button
            type="submit"
            title="Valider la remise"
            ariaLabel="Créer et valider le bordereau"
            accent="blue"
            disabled={
              isSubmitting ||
              eligibleState !== 'ready' ||
              filteredEligibleCheques.length === 0
            }
          />
        </StyledDrawerForm>
      </ErpFormDrawer>
    </ErpPageShell>
  );
};
