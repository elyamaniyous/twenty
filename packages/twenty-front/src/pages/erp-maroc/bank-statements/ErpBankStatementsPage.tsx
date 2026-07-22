import {
  bankStatementLinesToCsv,
  bankStatementFileToBase64,
} from '@/erp-maroc/bank-statements/bankStatementFiles';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import {
  ErpStatusBadge,
  type ErpStatusTone,
} from '@/erp-maroc/components/ErpStatusBadge';
import { buildBankStatementAccountingEntryPath } from '@/erp-maroc/accounting/bankStatementAccountingNavigation';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  erpBankReconciliationCandidatesSchema,
  erpBankAccountListSchema,
  erpBankAccountSchema,
  erpBankStatementDetailSchema,
  erpBankStatementLineSchema,
  erpBankStatementListSchema,
  erpBankStatementSchema,
  type ErpBankReconciliationCandidate,
  type ErpBankAccount,
  type ErpBankStatement,
  type ErpBankStatementDetail,
  type ErpBankStatementLine,
  type ErpBankStatementStatus,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconDownload,
  IconEye,
  IconLink,
  IconPlus,
  IconUnlink,
  IconUpload,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { z } from 'zod';

const STATUS: Record<
  ErpBankStatementStatus,
  { label: string; tone: ErpStatusTone }
> = {
  PENDING_OCR: { label: 'En attente OCR', tone: 'neutral' },
  PROCESSING: { label: 'Analyse en cours', tone: 'warning' },
  READY_FOR_REVIEW: { label: 'À valider', tone: 'warning' },
  CONFIRMED: { label: 'Validé', tone: 'success' },
  CLOSED: { label: 'Clôturé', tone: 'neutral' },
  FAILED: { label: 'Échec OCR', tone: 'danger' },
};

const openingSettlementReversalSchema = z.object({
  id: z.string(),
  reversalRequestedAt: z.string(),
  reversedAt: z.string().nullable(),
  reversalReason: z.string(),
  accountingEntry: z.object({
    id: z.string(),
    status: z.enum(['DRAFT', 'VALIDATED', 'LOCKED', 'REJECTED']),
  }),
  reversalAccountingEntry: z
    .object({
      id: z.string(),
      status: z.enum(['DRAFT', 'VALIDATED', 'LOCKED', 'REJECTED']),
    })
    .nullable(),
  openItem: z.object({
    id: z.string(),
    outstandingAmountCents: z.number(),
    status: z.enum(['OPEN', 'SETTLED', 'CANCELLED']),
  }),
  bankStatementLine: z.object({ id: z.string() }),
});

const StyledFileInput = styled.input`
  display: none;
`;

const StyledContent = styled.div`
  display: grid;
  flex: 1 1 auto;
  grid-template-rows: minmax(180px, 2fr) minmax(260px, 3fr);
  min-height: 0;
`;

const StyledAccountForm = styled.div`
  align-items: end;
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns:
    minmax(160px, 1fr) minmax(160px, 1fr) minmax(230px, 1.4fr)
    minmax(110px, 0.6fr) auto;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};

  @media (max-width: 900px) {
    align-items: stretch;
    grid-template-columns: 1fr;
  }
`;

const StyledImports = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  min-height: 0;
  overflow: hidden;
`;

const StyledSelect = styled.button`
  background: transparent;
  border: 0;
  color: ${themeCssVariables.color.blue};
  cursor: pointer;
  font: inherit;
  max-width: 100%;
  overflow: hidden;
  padding: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledReview = styled.section`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const StyledReviewHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  min-height: 44px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledReviewTitle = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  letter-spacing: 0;
`;

const StyledReviewActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledScroll = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
`;

const StyledEditorTable = styled.table`
  border-collapse: collapse;
  min-width: 1380px;
  table-layout: fixed;
  width: 100%;
`;

const StyledReconciliationPanel = styled.div`
  align-items: end;
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: grid;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns:
    minmax(200px, 1fr) minmax(260px, 1.5fr) minmax(220px, 1fr)
    auto;
  padding: ${themeCssVariables.spacing[3]};

  @media (max-width: 900px) {
    align-items: stretch;
    grid-template-columns: 1fr;
  }
`;

const StyledReconciliationField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  letter-spacing: 0;
  min-width: 0;
`;

const StyledSelectInput = styled.select`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 32px;
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledReconciliationActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledReconciliationCell = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledReconciliationText = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  flex: 1 1 auto;
  font-size: ${themeCssVariables.font.size.sm};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledHead = styled.th`
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  height: 34px;
  letter-spacing: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
  text-align: left;
`;

const StyledCell = styled.td`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  height: 38px;
  padding: 0 ${themeCssVariables.spacing[1]};
`;

const StyledInput = styled.input`
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[1]};
  width: 100%;

  &:focus {
    border-color: ${themeCssVariables.color.blue};
    outline: none;
  }

  &:disabled {
    color: ${themeCssVariables.font.color.secondary};
  }
`;

const StyledConfidence = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};

  &[data-warning='true'] {
    color: ${themeCssVariables.font.color.danger};
    font-weight: ${themeCssVariables.font.weight.semiBold};
  }
`;

const StyledState = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex: 1 1 auto;
  justify-content: center;
  min-height: 120px;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledError = styled.div`
  background: ${themeCssVariables.background.danger};
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('fr-MA', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));

const candidateId = (candidate: ErpBankReconciliationCandidate) =>
  candidate.kind === 'SUPPLIER'
    ? candidate.supplierPaymentPreparationId
    : candidate.customerPaymentId;

const candidateLabel = (candidate: ErpBankReconciliationCandidate) =>
  candidate.kind === 'SUPPLIER'
    ? `${candidate.score}% · Fournisseur ${candidate.supplierName} · ${candidate.supplierInvoiceReference} · ${candidate.paymentDate} · ${formatMadCents(candidate.amountCents)}`
    : `${candidate.score}% · Client ${candidate.customerName} · ${candidate.invoiceReferences.join(', ') || 'sans affectation'} · ${candidate.paymentDate} · ${formatMadCents(candidate.amountCents)}`;

const accountingEntryStatusLabel = {
  DRAFT: 'écriture brouillon',
  VALIDATED: 'écriture validée',
  LOCKED: 'écriture verrouillée',
  REJECTED: 'écriture rejetée',
} as const;

const reconciliationLabel = (line: ErpBankStatementLine) => {
  if (line.reconciliation === null) return '';
  return line.reconciliation.kind === 'SUPPLIER'
    ? `${line.reconciliation.supplierName} · ${line.reconciliation.supplierInvoiceReference}`
    : line.reconciliation.kind === 'CUSTOMER'
      ? `${line.reconciliation.customerName} · ${line.reconciliation.invoiceReferences.join(', ') || 'encaissement client'}`
      : `${line.reconciliation.tierName} · ${line.reconciliation.openItemReference} · ${
          line.reconciliation.reversalAccountingEntryStatus
            ? `contrepassation ${accountingEntryStatusLabel[line.reconciliation.reversalAccountingEntryStatus].replace('écriture ', '')}`
            : accountingEntryStatusLabel[
                line.reconciliation.accountingEntryStatus
              ]
        }`;
};

const isOpeningReversalReadyForFinalization = (line: ErpBankStatementLine) =>
  line.reconciliation?.kind === 'OPENING_ITEM' &&
  (line.reconciliation.reversalAccountingEntryStatus === 'VALIDATED' ||
    line.reconciliation.reversalAccountingEntryStatus === 'LOCKED');

const isOpeningReversalRejected = (line: ErpBankStatementLine) =>
  line.reconciliation?.kind === 'OPENING_ITEM' &&
  line.reconciliation.reversalAccountingEntryStatus === 'REJECTED';

const downloadCsv = (statement: ErpBankStatementDetail) => {
  const blob = new Blob([bankStatementLinesToCsv(statement.lines)], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = statement.originalFilename.replace(/\.[^.]+$/i, '.csv');
  anchor.click();
  URL.revokeObjectURL(url);
};

export const ErpBankStatementsPage = () => {
  const { client } = useErpMarocContext();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const returnSelection = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return {
      statementId: query.get('statementId'),
      lineId: query.get('lineId'),
    };
  }, [location.search]);
  const [returnSelectionRestored, setReturnSelectionRestored] = useState(false);
  const [imports, setImports] = useState<ErpBankStatement[]>([]);
  const [bankAccounts, setBankAccounts] = useState<ErpBankAccount[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountName, setAccountName] = useState('Compte principal');
  const [accountBankName, setAccountBankName] = useState('');
  const [accountRib, setAccountRib] = useState('');
  const [accountingAccountCode, setAccountingAccountCode] = useState('5141');
  const [savingAccount, setSavingAccount] = useState(false);
  const [detail, setDetail] = useState<ErpBankStatementDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconciliationLineId, setReconciliationLineId] = useState<
    string | null
  >(null);
  const [reconciliationCandidates, setReconciliationCandidates] = useState<
    ErpBankReconciliationCandidate[]
  >([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [reconciliationReason, setReconciliationReason] = useState('');
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const reconciliationLine = useMemo(
    () =>
      detail?.lines.find((line) => line.id === reconciliationLineId) ?? null,
    [detail, reconciliationLineId],
  );
  const isFinalizingOpeningReversal =
    reconciliationLine !== null &&
    isOpeningReversalReadyForFinalization(reconciliationLine);
  const isRetryingOpeningReversal =
    reconciliationLine !== null &&
    isOpeningReversalRejected(reconciliationLine);

  const loadImports = useCallback(async () => {
    const result = await client.request({
      method: 'GET',
      path: '/bank-statements',
      schema: erpBankStatementListSchema,
    });
    setImports(result);
    setState('ready');
    return result;
  }, [client]);

  const loadBankAccounts = useCallback(async () => {
    const result = await client.request({
      method: 'GET',
      path: '/bank-accounts',
      schema: erpBankAccountListSchema,
    });
    setBankAccounts(result);
    setSelectedBankAccountId((current) => current || result[0]?.id || '');
    return result;
  }, [client]);

  const loadDetail = useCallback(
    async (id: string) => {
      const result = await client.request({
        method: 'GET',
        path: `/bank-statements/${id}`,
        schema: erpBankStatementDetailSchema,
      });
      setDetail(result);
    },
    [client],
  );

  useEffect(() => {
    void Promise.all([loadImports(), loadBankAccounts()])
      .then(([nextImports]) => {
        const statementId = returnSelection.statementId;
        if (
          statementId !== null &&
          nextImports.some((item) => item.id === statementId)
        ) {
          return loadDetail(statementId);
        }
      })
      .catch(() => setState('error'));
  }, [loadBankAccounts, loadDetail, loadImports, returnSelection.statementId]);

  useEffect(() => {
    if (returnSelectionRestored || detail?.id !== returnSelection.statementId) {
      return;
    }
    if (
      returnSelection.lineId !== null &&
      detail.lines.some((line) => line.id === returnSelection.lineId)
    ) {
      setReconciliationLineId(returnSelection.lineId);
    }
    setReturnSelectionRestored(true);
  }, [detail, returnSelection, returnSelectionRestored]);

  useEffect(() => {
    if (
      !imports.some((item) =>
        ['PENDING_OCR', 'PROCESSING'].includes(item.status),
      )
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadImports()
        .then((next) => {
          if (detail && ['PENDING_OCR', 'PROCESSING'].includes(detail.status)) {
            const current = next.find((item) => item.id === detail.id);
            if (current && current.status !== detail.status)
              void loadDetail(detail.id);
          }
        })
        .catch(() => setError('Actualisation OCR impossible'));
    }, 3_000);
    return () => window.clearInterval(timer);
  }, [detail, imports, loadDetail, loadImports]);

  const columns = useMemo<ErpOperationalTableColumn<ErpBankStatement>[]>(
    () => [
      {
        key: 'filename',
        header: 'Relevé',
        width: '300px',
        render: (row) => (
          <StyledSelect type="button" onClick={() => void loadDetail(row.id)}>
            {row.originalFilename}
          </StyledSelect>
        ),
      },
      {
        key: 'created',
        header: 'Déposé le',
        width: '150px',
        render: (row) => formatDateTime(row.createdAt),
      },
      {
        key: 'pages',
        header: 'Pages',
        width: '80px',
        render: (row) => row.pageCount ?? '—',
      },
      {
        key: 'lines',
        header: 'Lignes',
        width: '80px',
        render: (row) => row.lineCount,
      },
      {
        key: 'balance',
        header: 'Solde final',
        width: '140px',
        align: 'right',
        render: (row) =>
          row.closingBalanceCents === null
            ? '—'
            : formatMadCents(row.closingBalanceCents),
      },
      {
        key: 'status',
        header: 'Statut',
        width: '150px',
        render: (row) => (
          <ErpStatusBadge
            label={STATUS[row.status].label}
            tone={STATUS[row.status].tone}
          />
        ),
      },
    ],
    [loadDetail],
  );

  const createBankAccount = async () => {
    if (
      !accountName.trim() ||
      !accountBankName.trim() ||
      !/^\d{24}$/.test(accountRib.replace(/\s/g, '')) ||
      !/^\d{4,8}$/.test(accountingAccountCode)
    ) {
      setError(
        'Renseignez le nom, la banque, un RIB de 24 chiffres et le compte comptable',
      );
      return;
    }
    setSavingAccount(true);
    setError(null);
    try {
      const intent = client.createMutationIntent({
        method: 'POST',
        path: '/bank-accounts',
        schema: erpBankAccountSchema,
        body: {
          name: accountName.trim(),
          bankName: accountBankName.trim(),
          rib: accountRib.replace(/\s/g, ''),
          accountingAccountCode,
          openingBalanceCents: 0,
        },
      });
      const created = await intent.execute();
      await loadBankAccounts();
      setSelectedBankAccountId(created.id);
      setShowAccountForm(false);
      setAccountRib('');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Création du compte impossible',
      );
    } finally {
      setSavingAccount(false);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const contentBase64 = await bankStatementFileToBase64(file);
      const intent = client.createMutationIntent({
        method: 'POST',
        path: '/bank-statements',
        schema: erpBankStatementSchema,
        body: {
          filename: file.name,
          contentBase64,
          ...(selectedBankAccountId
            ? { bankAccountId: selectedBankAccountId }
            : {}),
        },
      });
      const created = await intent.execute();
      await loadImports();
      await loadDetail(created.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Import impossible');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const assignBankAccount = async (bankAccountId: string) => {
    if (!detail || !bankAccountId) return;
    setError(null);
    try {
      const intent = client.createMutationIntent({
        method: 'PATCH',
        path: `/bank-statements/${detail.id}/bank-account`,
        schema: erpBankStatementDetailSchema,
        body: { bankAccountId },
      });
      setDetail(await intent.execute());
      setSelectedBankAccountId(bankAccountId);
      await loadImports();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Affectation du compte impossible',
      );
    }
  };

  const closeStatement = async () => {
    if (!detail) return;
    setClosing(true);
    setError(null);
    try {
      const intent = client.createMutationIntent({
        method: 'POST',
        path: `/bank-statements/${detail.id}/close`,
        schema: erpBankStatementDetailSchema,
        body: {},
      });
      setDetail(await intent.execute());
      await loadImports();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Clôture impossible');
    } finally {
      setClosing(false);
    }
  };

  const updateLine = (id: string, changes: Partial<ErpBankStatementLine>) => {
    setDetail((current) =>
      current === null
        ? null
        : {
            ...current,
            lines: current.lines.map((line) =>
              line.id === id ? { ...line, ...changes } : line,
            ),
          },
    );
  };

  const closeReconciliation = () => {
    setReconciliationLineId(null);
    setReconciliationCandidates([]);
    setSelectedCandidateId('');
    setReconciliationReason('');
  };

  const openReconciliation = async (line: ErpBankStatementLine) => {
    setReconciliationLineId(line.id);
    setReconciliationCandidates([]);
    setSelectedCandidateId('');
    setReconciliationReason('');
    setError(null);
    if (line.reconciliation !== null || line.review !== null) return;

    setLoadingCandidates(true);
    try {
      const result = await client.request({
        method: 'GET',
        path: `/bank-statement-lines/${line.id}/reconciliation-candidates`,
        schema: erpBankReconciliationCandidatesSchema,
      });
      setReconciliationCandidates(result.candidates);
      setSelectedCandidateId(
        result.candidates.length > 0 ? candidateId(result.candidates[0]) : '',
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Suggestions de rapprochement indisponibles',
      );
    } finally {
      setLoadingCandidates(false);
    }
  };

  const openReversalAccountingEntry = (line: ErpBankStatementLine) => {
    if (
      detail === null ||
      line.reconciliation?.kind !== 'OPENING_ITEM' ||
      line.reconciliation.reversalAccountingEntryId === null
    ) {
      return;
    }
    void navigate(
      buildBankStatementAccountingEntryPath({
        accountingEntryId: line.reconciliation.reversalAccountingEntryId,
        statementId: detail.id,
        lineId: line.id,
      }),
    );
  };

  const reconcile = async () => {
    if (!reconciliationLine || !selectedCandidateId) return;
    const candidate = reconciliationCandidates.find(
      (item) => candidateId(item) === selectedCandidateId,
    );
    if (!candidate) return;
    setReconciling(true);
    setError(null);
    try {
      const intent = client.createMutationIntent({
        method: 'POST',
        path:
          candidate.kind === 'SUPPLIER'
            ? `/bank-statement-lines/${reconciliationLine.id}/reconcile-supplier-payment`
            : `/bank-statement-lines/${reconciliationLine.id}/reconcile-customer-payment`,
        schema: erpBankStatementLineSchema,
        body:
          candidate.kind === 'SUPPLIER'
            ? { supplierPaymentPreparationId: selectedCandidateId }
            : { customerPaymentId: selectedCandidateId },
      });
      await intent.execute();
      if (detail) await loadDetail(detail.id);
      closeReconciliation();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Rapprochement impossible',
      );
    } finally {
      setReconciling(false);
    }
  };

  const unreconcile = async () => {
    if (
      !reconciliationLine ||
      reconciliationLine.reconciliation === null ||
      (!isFinalizingOpeningReversal && reconciliationReason.trim().length < 10)
    )
      return;
    setReconciling(true);
    setError(null);
    try {
      if (reconciliationLine.reconciliation.kind === 'OPENING_ITEM') {
        const intent = isFinalizingOpeningReversal
          ? client.createMutationIntent(
              {
                method: 'POST',
                path: `/onboarding/bank-statement-lines/${reconciliationLine.id}/finalize-open-item-settlement-reversal`,
                schema: openingSettlementReversalSchema,
                body: { confirm: true },
              },
              { idempotency: 'required' },
            )
          : client.createMutationIntent(
              {
                method: 'POST',
                path: `/onboarding/bank-statement-lines/${reconciliationLine.id}/reverse-open-item-settlement`,
                schema: openingSettlementReversalSchema,
                body: { reason: reconciliationReason.trim() },
              },
              { idempotency: 'required' },
            );
        await intent.execute();
      } else {
        const intent = client.createMutationIntent({
          method: 'POST',
          path:
            reconciliationLine.reconciliation.kind === 'SUPPLIER'
              ? `/bank-statement-lines/${reconciliationLine.id}/unreconcile-supplier-payment`
              : `/bank-statement-lines/${reconciliationLine.id}/unreconcile-customer-payment`,
          schema: erpBankStatementLineSchema,
          body: { reason: reconciliationReason.trim() },
        });
        await intent.execute();
      }
      if (detail) await loadDetail(detail.id);
      closeReconciliation();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Annulation du rapprochement impossible',
      );
    } finally {
      setReconciling(false);
    }
  };

  const reviewLine = async () => {
    if (!reconciliationLine || reconciliationReason.trim().length < 10) return;
    setReconciling(true);
    setError(null);
    try {
      const intent = client.createMutationIntent({
        method: 'POST',
        path: `/bank-statement-lines/${reconciliationLine.id}/review`,
        schema: erpBankStatementLineSchema,
        body: { reason: reconciliationReason.trim() },
      });
      await intent.execute();
      if (detail) await loadDetail(detail.id);
      closeReconciliation();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Contrôle manuel impossible',
      );
    } finally {
      setReconciling(false);
    }
  };

  const unreviewLine = async () => {
    if (!reconciliationLine || reconciliationReason.trim().length < 10) return;
    setReconciling(true);
    setError(null);
    try {
      const intent = client.createMutationIntent({
        method: 'POST',
        path: `/bank-statement-lines/${reconciliationLine.id}/unreview`,
        schema: erpBankStatementLineSchema,
        body: { reason: reconciliationReason.trim() },
      });
      await intent.execute();
      if (detail) await loadDetail(detail.id);
      closeReconciliation();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Annulation du contrôle impossible',
      );
    } finally {
      setReconciling(false);
    }
  };

  const confirm = async () => {
    if (!detail) return;
    setConfirming(true);
    setError(null);
    try {
      const intent = client.createMutationIntent({
        method: 'POST',
        path: `/bank-statements/${detail.id}/confirm`,
        schema: erpBankStatementDetailSchema,
        body: { lines: detail.lines },
      });
      const confirmed = await intent.execute();
      setDetail(confirmed);
      await loadImports();
    } catch {
      setError('La validation du relevé a échoué');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <ErpPageShell
      title="Banque"
      description="Import et contrôle des relevés bancaires"
      state={state}
      loadingLabel="Chargement des relevés"
      errorLabel="Impossible de charger les relevés"
      onRetry={() => {
        setState('loading');
        void Promise.all([loadImports(), loadBankAccounts()]).catch(() =>
          setState('error'),
        );
      }}
      actions={
        <>
          <Button
            title="Ajouter un compte bancaire"
            ariaLabel="Ajouter un compte bancaire"
            Icon={IconPlus}
            variant="secondary"
            onClick={() => setShowAccountForm((current) => !current)}
          />
          <StyledFileInput
            ref={fileInput}
            type="file"
            accept="application/pdf,text/csv,.pdf,.csv,.sta,.mt940"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <Button
            title={uploading ? 'Envoi en cours' : 'Importer un relevé'}
            ariaLabel="Importer un relevé PDF, CSV ou MT940"
            Icon={IconUpload}
            variant="primary"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          />
        </>
      }
    >
      {error ? <StyledError role="alert">{error}</StyledError> : null}
      {showAccountForm ? (
        <StyledAccountForm>
          <StyledReconciliationField>
            <span>Nom du compte</span>
            <StyledInput
              value={accountName}
              maxLength={100}
              onChange={(event) => setAccountName(event.target.value)}
            />
          </StyledReconciliationField>
          <StyledReconciliationField>
            <span>Banque</span>
            <StyledInput
              value={accountBankName}
              maxLength={100}
              placeholder="Ex. Attijariwafa bank"
              onChange={(event) => setAccountBankName(event.target.value)}
            />
          </StyledReconciliationField>
          <StyledReconciliationField>
            <span>RIB (24 chiffres)</span>
            <StyledInput
              value={accountRib}
              inputMode="numeric"
              maxLength={30}
              onChange={(event) => setAccountRib(event.target.value)}
            />
          </StyledReconciliationField>
          <StyledReconciliationField>
            <span>Compte comptable</span>
            <StyledInput
              value={accountingAccountCode}
              inputMode="numeric"
              maxLength={8}
              onChange={(event) => setAccountingAccountCode(event.target.value)}
            />
          </StyledReconciliationField>
          <Button
            title="Créer le compte"
            ariaLabel="Créer le compte bancaire"
            Icon={IconCheck}
            variant="primary"
            disabled={savingAccount}
            isLoading={savingAccount}
            onClick={() => void createBankAccount()}
          />
        </StyledAccountForm>
      ) : null}
      <StyledContent>
        <StyledImports>
          <ErpOperationalTable
            ariaLabel="Relevés bancaires"
            columns={columns}
            rows={imports}
            getRowKey={(row) => row.id}
            emptyLabel="Aucun relevé bancaire"
          />
        </StyledImports>
        <StyledReview>
          {detail === null ? (
            <StyledState>Sélectionnez un relevé</StyledState>
          ) : detail.status === 'PENDING_OCR' ||
            detail.status === 'PROCESSING' ? (
            <StyledState>Analyse PaddleOCR en cours</StyledState>
          ) : detail.status === 'FAILED' ? (
            <StyledState>
              {detail.lastError ?? 'L’analyse OCR a échoué'}
            </StyledState>
          ) : (
            <>
              <StyledReviewHeader>
                <StyledReviewTitle>{detail.originalFilename}</StyledReviewTitle>
                <StyledReviewActions>
                  <StyledReconciliationField>
                    <span>Compte bancaire</span>
                    <StyledSelectInput
                      value={detail.bankAccount?.id ?? ''}
                      disabled={
                        detail.status === 'CLOSED' || bankAccounts.length === 0
                      }
                      onChange={(event) =>
                        void assignBankAccount(event.target.value)
                      }
                    >
                      <option value="">À affecter</option>
                      {bankAccounts
                        .filter((account) => account.isActive)
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name} · {account.bankName} ·{' '}
                            {account.rib.slice(-6)}
                          </option>
                        ))}
                    </StyledSelectInput>
                  </StyledReconciliationField>
                  <Button
                    title="Télécharger le CSV"
                    ariaLabel="Télécharger le CSV"
                    Icon={IconDownload}
                    variant="secondary"
                    onClick={() => downloadCsv(detail)}
                  />
                  {detail.status === 'READY_FOR_REVIEW' ? (
                    <Button
                      title={
                        confirming
                          ? 'Validation en cours'
                          : 'Valider les lignes'
                      }
                      ariaLabel="Valider les lignes du relevé"
                      Icon={IconCheck}
                      variant="primary"
                      disabled={confirming || detail.lines.length === 0}
                      onClick={() => void confirm()}
                    />
                  ) : null}
                  {detail.status === 'CONFIRMED' ? (
                    <Button
                      title={
                        detail.unresolvedLineCount > 0
                          ? `${detail.unresolvedLineCount} ligne(s) à résoudre`
                          : closing
                            ? 'Clôture en cours'
                            : 'Clôturer le relevé'
                      }
                      ariaLabel="Clôturer le relevé bancaire"
                      Icon={IconCheck}
                      variant="primary"
                      disabled={
                        closing ||
                        detail.unresolvedLineCount > 0 ||
                        detail.bankAccount === null ||
                        detail.balanceCheckPassed === false
                      }
                      isLoading={closing}
                      onClick={() => void closeStatement()}
                    />
                  ) : null}
                </StyledReviewActions>
              </StyledReviewHeader>
              {reconciliationLine !== null ? (
                <StyledReconciliationPanel>
                  <StyledReconciliationField>
                    <span>Ligne bancaire</span>
                    <StyledReconciliationText>
                      {reconciliationLine.transactionDate} ·{' '}
                      {formatMadCents(
                        reconciliationLine.debitCents ||
                          reconciliationLine.creditCents,
                      )}{' '}
                      · {reconciliationLine.description}
                    </StyledReconciliationText>
                  </StyledReconciliationField>
                  {reconciliationLine.reconciliation === null &&
                  reconciliationLine.review === null ? (
                    <StyledReconciliationField>
                      <span>Paiement candidat</span>
                      <StyledSelectInput
                        value={selectedCandidateId}
                        disabled={loadingCandidates || reconciling}
                        onChange={(event) =>
                          setSelectedCandidateId(event.target.value)
                        }
                      >
                        {reconciliationCandidates.length === 0 ? (
                          <option value="">
                            {loadingCandidates
                              ? 'Recherche en cours'
                              : 'Aucun paiement compatible'}
                          </option>
                        ) : null}
                        {reconciliationCandidates.map((candidate) => (
                          <option
                            key={candidateId(candidate)}
                            value={candidateId(candidate)}
                          >
                            {candidateLabel(candidate)}
                          </option>
                        ))}
                      </StyledSelectInput>
                    </StyledReconciliationField>
                  ) : null}
                  {!isFinalizingOpeningReversal ? (
                    <StyledReconciliationField>
                      <span>
                        {isRetryingOpeningReversal
                          ? 'Motif de la nouvelle tentative'
                          : reconciliationLine.reconciliation !== null ||
                              reconciliationLine.review !== null
                            ? 'Motif d’annulation'
                            : 'Motif du contrôle manuel'}
                      </span>
                      <StyledInput
                        value={reconciliationReason}
                        minLength={10}
                        maxLength={500}
                        placeholder="Ex. opération vérifiée sur le justificatif"
                        disabled={reconciling}
                        onChange={(event) =>
                          setReconciliationReason(event.target.value)
                        }
                      />
                    </StyledReconciliationField>
                  ) : null}
                  {reconciliationLine.reconciliation !== null ? (
                    <StyledReconciliationField>
                      <span>Rapprochement actuel</span>
                      <StyledReconciliationText>
                        {reconciliationLabel(reconciliationLine)}
                      </StyledReconciliationText>
                    </StyledReconciliationField>
                  ) : reconciliationLine.review !== null ? (
                    <StyledReconciliationField>
                      <span>Contrôle actuel</span>
                      <StyledReconciliationText>
                        {reconciliationLine.review.reason}
                      </StyledReconciliationText>
                    </StyledReconciliationField>
                  ) : null}
                  <StyledReconciliationActions>
                    {reconciliationLine.reconciliation !== null ? (
                      <Button
                        title={
                          isFinalizingOpeningReversal
                            ? 'Finaliser l’annulation'
                            : isRetryingOpeningReversal
                              ? 'Repréparer la contrepassation'
                              : reconciliationLine.reconciliation.kind ===
                                    'OPENING_ITEM' &&
                                  reconciliationLine.reconciliation
                                    .accountingEntryStatus !== 'DRAFT'
                                ? 'Préparer la contrepassation'
                                : 'Annuler le rapprochement'
                        }
                        ariaLabel={
                          isFinalizingOpeningReversal
                            ? 'Finaliser l’annulation après validation de la contrepassation'
                            : isRetryingOpeningReversal
                              ? 'Créer une nouvelle contrepassation après le rejet'
                              : reconciliationLine.reconciliation.kind ===
                                    'OPENING_ITEM' &&
                                  reconciliationLine.reconciliation
                                    .accountingEntryStatus !== 'DRAFT'
                                ? 'Préparer la contrepassation comptable'
                                : 'Annuler le rapprochement bancaire'
                        }
                        Icon={IconUnlink}
                        accent="danger"
                        disabled={
                          (!isFinalizingOpeningReversal &&
                            reconciliationReason.trim().length < 10) ||
                          reconciling
                        }
                        isLoading={reconciling}
                        onClick={() => void unreconcile()}
                      />
                    ) : reconciliationLine.review !== null ? (
                      <Button
                        title="Annuler le contrôle"
                        ariaLabel="Annuler le contrôle manuel"
                        Icon={IconUnlink}
                        accent="danger"
                        disabled={
                          reconciliationReason.trim().length < 10 || reconciling
                        }
                        isLoading={reconciling}
                        onClick={() => void unreviewLine()}
                      />
                    ) : (
                      <>
                        <Button
                          title="Rapprocher"
                          ariaLabel="Confirmer le rapprochement bancaire"
                          Icon={IconLink}
                          variant="primary"
                          disabled={!selectedCandidateId || reconciling}
                          isLoading={reconciling}
                          onClick={() => void reconcile()}
                        />
                        <Button
                          title="Marquer contrôlé"
                          ariaLabel="Marquer la ligne comme contrôlée manuellement"
                          Icon={IconCheck}
                          variant="secondary"
                          disabled={
                            reconciliationReason.trim().length < 10 ||
                            reconciling
                          }
                          isLoading={reconciling}
                          onClick={() => void reviewLine()}
                        />
                      </>
                    )}
                    <Button
                      title="Fermer"
                      ariaLabel="Fermer le panneau de rapprochement"
                      Icon={IconX}
                      variant="secondary"
                      disabled={reconciling}
                      onClick={closeReconciliation}
                    />
                  </StyledReconciliationActions>
                </StyledReconciliationPanel>
              ) : null}
              <StyledScroll>
                <StyledEditorTable aria-label="Lignes du relevé bancaire">
                  <colgroup>
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '360px' }} />
                    <col style={{ width: '150px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '130px' }} />
                    <col style={{ width: '100px' }} />
                    <col style={{ width: '260px' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <StyledHead>Date</StyledHead>
                      <StyledHead>Date valeur</StyledHead>
                      <StyledHead>Libellé</StyledHead>
                      <StyledHead>Référence</StyledHead>
                      <StyledHead>Débit</StyledHead>
                      <StyledHead>Crédit</StyledHead>
                      <StyledHead>Solde</StyledHead>
                      <StyledHead>Confiance</StyledHead>
                      <StyledHead>Rapprochement</StyledHead>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.lines.map((line) => {
                      const disabled = detail.status !== 'READY_FOR_REVIEW';
                      const canResolve = detail.status === 'CONFIRMED';
                      return (
                        <tr key={line.id}>
                          <StyledCell>
                            <StyledInput
                              type="date"
                              value={line.transactionDate}
                              disabled={disabled}
                              onChange={(event) =>
                                updateLine(line.id, {
                                  transactionDate: event.target.value,
                                })
                              }
                            />
                          </StyledCell>
                          <StyledCell>
                            <StyledInput
                              type="date"
                              value={line.valueDate ?? ''}
                              disabled={disabled}
                              onChange={(event) =>
                                updateLine(line.id, {
                                  valueDate: event.target.value || null,
                                })
                              }
                            />
                          </StyledCell>
                          <StyledCell>
                            <StyledInput
                              value={line.description}
                              disabled={disabled}
                              onChange={(event) =>
                                updateLine(line.id, {
                                  description: event.target.value,
                                })
                              }
                            />
                          </StyledCell>
                          <StyledCell>
                            <StyledInput
                              value={line.reference ?? ''}
                              disabled={disabled}
                              onChange={(event) =>
                                updateLine(line.id, {
                                  reference: event.target.value || null,
                                })
                              }
                            />
                          </StyledCell>
                          {(
                            [
                              'debitCents',
                              'creditCents',
                              'balanceCents',
                            ] as const
                          ).map((field) => (
                            <StyledCell key={field}>
                              <StyledInput
                                type="number"
                                step="0.01"
                                min={field === 'balanceCents' ? undefined : '0'}
                                defaultValue={
                                  line[field] === null
                                    ? ''
                                    : (line[field] / 100).toFixed(2)
                                }
                                disabled={disabled}
                                onBlur={(event) =>
                                  updateLine(line.id, {
                                    [field]:
                                      event.target.value === '' &&
                                      field === 'balanceCents'
                                        ? null
                                        : Math.round(
                                            Number(event.target.value || '0') *
                                              100,
                                          ),
                                  })
                                }
                              />
                            </StyledCell>
                          ))}
                          <StyledCell>
                            <StyledConfidence
                              data-warning={line.needsReview ? 'true' : 'false'}
                              title={
                                line.needsReview
                                  ? 'Cette ligne doit être contrôlée'
                                  : 'Confiance OCR'
                              }
                            >
                              {(line.confidenceBasisPoints / 100).toFixed(0)} %
                            </StyledConfidence>
                          </StyledCell>
                          <StyledCell>
                            {!canResolve && detail.status !== 'CLOSED' ? (
                              '—'
                            ) : line.reconciliation === null &&
                              line.review === null ? (
                              canResolve ? (
                                <Button
                                  title="Rapprocher ou contrôler"
                                  ariaLabel={`Rapprocher ou contrôler la ligne ${line.description}`}
                                  Icon={IconLink}
                                  variant="secondary"
                                  disabled={reconciling}
                                  onClick={() => void openReconciliation(line)}
                                />
                              ) : (
                                'Non résolue'
                              )
                            ) : line.review !== null ? (
                              <StyledReconciliationCell>
                                <StyledReconciliationText
                                  title={line.review.reason}
                                >
                                  Contrôlé · {line.review.reason}
                                </StyledReconciliationText>
                                {canResolve &&
                                line.reconciliation?.kind !== 'OPENING_ITEM' ? (
                                  <Button
                                    title="Annuler"
                                    ariaLabel="Annuler le contrôle manuel"
                                    Icon={IconUnlink}
                                    accent="danger"
                                    disabled={reconciling}
                                    onClick={() =>
                                      void openReconciliation(line)
                                    }
                                  />
                                ) : null}
                              </StyledReconciliationCell>
                            ) : (
                              <StyledReconciliationCell>
                                <StyledReconciliationText
                                  title={reconciliationLabel(line)}
                                >
                                  {reconciliationLabel(line)}
                                </StyledReconciliationText>
                                {line.reconciliation?.kind === 'OPENING_ITEM' &&
                                line.reconciliation
                                  .reversalAccountingEntryId !== null ? (
                                  <Button
                                    title="Voir l’écriture"
                                    ariaLabel="Voir l’écriture comptable de contrepassation"
                                    Icon={IconEye}
                                    variant="secondary"
                                    disabled={reconciling}
                                    onClick={() =>
                                      openReversalAccountingEntry(line)
                                    }
                                  />
                                ) : null}
                                {canResolve &&
                                (line.reconciliation?.kind !== 'OPENING_ITEM' ||
                                  (line.reconciliation
                                    .reversalAccountingEntryId === null &&
                                    line.reconciliation
                                      .accountingEntryStatus !== 'REJECTED') ||
                                  isOpeningReversalRejected(line) ||
                                  isOpeningReversalReadyForFinalization(
                                    line,
                                  )) ? (
                                  <Button
                                    title="Annuler"
                                    ariaLabel={`Annuler le rapprochement ${reconciliationLabel(line)}`}
                                    Icon={IconUnlink}
                                    accent="danger"
                                    disabled={reconciling}
                                    onClick={() =>
                                      void openReconciliation(line)
                                    }
                                  />
                                ) : null}
                              </StyledReconciliationCell>
                            )}
                          </StyledCell>
                        </tr>
                      );
                    })}
                  </tbody>
                </StyledEditorTable>
              </StyledScroll>
            </>
          )}
        </StyledReview>
      </StyledContent>
    </ErpPageShell>
  );
};
