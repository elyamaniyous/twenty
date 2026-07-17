import {
  bankStatementLinesToCsv,
  bankStatementPdfToBase64,
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
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  erpBankReconciliationCandidatesSchema,
  erpBankStatementDetailSchema,
  erpBankStatementLineSchema,
  erpBankStatementListSchema,
  erpBankStatementSchema,
  type ErpBankReconciliationCandidate,
  type ErpBankStatement,
  type ErpBankStatementDetail,
  type ErpBankStatementLine,
  type ErpBankStatementStatus,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconDownload,
  IconLink,
  IconUnlink,
  IconUpload,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const STATUS: Record<
  ErpBankStatementStatus,
  { label: string; tone: ErpStatusTone }
> = {
  PENDING_OCR: { label: 'En attente OCR', tone: 'neutral' },
  PROCESSING: { label: 'Analyse en cours', tone: 'warning' },
  READY_FOR_REVIEW: { label: 'À valider', tone: 'warning' },
  CONFIRMED: { label: 'Validé', tone: 'success' },
  FAILED: { label: 'Échec OCR', tone: 'danger' },
};

const StyledFileInput = styled.input`
  display: none;
`;

const StyledContent = styled.div`
  display: grid;
  flex: 1 1 auto;
  grid-template-rows: minmax(180px, 2fr) minmax(260px, 3fr);
  min-height: 0;
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
  grid-template-columns: minmax(220px, 1fr) minmax(300px, 2fr) auto;
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

const downloadCsv = (statement: ErpBankStatementDetail) => {
  const blob = new Blob([bankStatementLinesToCsv(statement.lines)], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = statement.originalFilename.replace(/\.pdf$/i, '.csv');
  anchor.click();
  URL.revokeObjectURL(url);
};

export const ErpBankStatementsPage = () => {
  const { client } = useErpMarocContext();
  const fileInput = useRef<HTMLInputElement>(null);
  const [imports, setImports] = useState<ErpBankStatement[]>([]);
  const [detail, setDetail] = useState<ErpBankStatementDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
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
    void loadImports().catch(() => setState('error'));
  }, [loadImports]);

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

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const contentBase64 = await bankStatementPdfToBase64(file);
      const intent = client.createMutationIntent({
        method: 'POST',
        path: '/bank-statements',
        schema: erpBankStatementSchema,
        body: { filename: file.name, contentBase64 },
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

  const replaceLine = (line: ErpBankStatementLine) => {
    setDetail((current) =>
      current === null
        ? null
        : {
            ...current,
            lines: current.lines.map((item) =>
              item.id === line.id ? line : item,
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
    if (line.reconciliation !== null) return;

    setLoadingCandidates(true);
    try {
      const result = await client.request({
        method: 'GET',
        path: `/bank-statement-lines/${line.id}/reconciliation-candidates`,
        schema: erpBankReconciliationCandidatesSchema,
      });
      setReconciliationCandidates(result.candidates);
      setSelectedCandidateId(
        result.candidates[0]?.supplierPaymentPreparationId ?? '',
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

  const reconcile = async () => {
    if (!reconciliationLine || !selectedCandidateId) return;
    setReconciling(true);
    setError(null);
    try {
      const intent = client.createMutationIntent({
        method: 'POST',
        path: `/bank-statement-lines/${reconciliationLine.id}/reconcile-supplier-payment`,
        schema: erpBankStatementLineSchema,
        body: { supplierPaymentPreparationId: selectedCandidateId },
      });
      replaceLine(await intent.execute());
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
    if (!reconciliationLine || reconciliationReason.trim().length < 10) return;
    setReconciling(true);
    setError(null);
    try {
      const intent = client.createMutationIntent({
        method: 'POST',
        path: `/bank-statement-lines/${reconciliationLine.id}/unreconcile-supplier-payment`,
        schema: erpBankStatementLineSchema,
        body: { reason: reconciliationReason.trim() },
      });
      replaceLine(await intent.execute());
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
        void loadImports().catch(() => setState('error'));
      }}
      actions={
        <>
          <StyledFileInput
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <Button
            title={uploading ? 'Envoi en cours' : 'Importer un relevé'}
            ariaLabel="Importer un relevé PDF"
            Icon={IconUpload}
            variant="primary"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          />
        </>
      }
    >
      {error ? <StyledError role="alert">{error}</StyledError> : null}
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
                </StyledReviewActions>
              </StyledReviewHeader>
              {reconciliationLine !== null ? (
                <StyledReconciliationPanel>
                  <StyledReconciliationField>
                    <span>Ligne bancaire</span>
                    <StyledReconciliationText>
                      {reconciliationLine.transactionDate} ·{' '}
                      {formatMadCents(reconciliationLine.debitCents)} ·{' '}
                      {reconciliationLine.description}
                    </StyledReconciliationText>
                  </StyledReconciliationField>
                  {reconciliationLine.reconciliation === null ? (
                    <StyledReconciliationField>
                      <span>Paiement fournisseur candidat</span>
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
                            key={candidate.supplierPaymentPreparationId}
                            value={candidate.supplierPaymentPreparationId}
                          >
                            {candidate.score}% · {candidate.supplierName} ·{' '}
                            {candidate.supplierInvoiceReference} ·{' '}
                            {candidate.paymentDate} ·{' '}
                            {formatMadCents(candidate.amountCents)}
                          </option>
                        ))}
                      </StyledSelectInput>
                    </StyledReconciliationField>
                  ) : (
                    <StyledReconciliationField>
                      <span>Motif d’annulation du rapprochement</span>
                      <StyledInput
                        value={reconciliationReason}
                        minLength={10}
                        maxLength={500}
                        placeholder="Ex. paiement sélectionné par erreur"
                        disabled={reconciling}
                        onChange={(event) =>
                          setReconciliationReason(event.target.value)
                        }
                      />
                    </StyledReconciliationField>
                  )}
                  <StyledReconciliationActions>
                    {reconciliationLine.reconciliation === null ? (
                      <Button
                        title="Rapprocher"
                        ariaLabel="Confirmer le rapprochement fournisseur"
                        Icon={IconLink}
                        variant="primary"
                        disabled={!selectedCandidateId || reconciling}
                        isLoading={reconciling}
                        onClick={() => void reconcile()}
                      />
                    ) : (
                      <Button
                        title="Annuler le rapprochement"
                        ariaLabel="Annuler le rapprochement fournisseur"
                        Icon={IconUnlink}
                        accent="danger"
                        disabled={
                          reconciliationReason.trim().length < 10 || reconciling
                        }
                        isLoading={reconciling}
                        onClick={() => void unreconcile()}
                      />
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
                      const disabled = detail.status === 'CONFIRMED';
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
                            {detail.status !== 'CONFIRMED' ||
                            line.debitCents === 0 ? (
                              '—'
                            ) : line.reconciliation === null ? (
                              <Button
                                title="Rapprocher"
                                ariaLabel={`Rapprocher la ligne ${line.description}`}
                                Icon={IconLink}
                                variant="secondary"
                                disabled={reconciling}
                                onClick={() => void openReconciliation(line)}
                              />
                            ) : (
                              <StyledReconciliationCell>
                                <StyledReconciliationText
                                  title={`${line.reconciliation.supplierName} · ${line.reconciliation.supplierInvoiceReference}`}
                                >
                                  {line.reconciliation.supplierName} ·{' '}
                                  {line.reconciliation.supplierInvoiceReference}
                                </StyledReconciliationText>
                                <Button
                                  title="Annuler"
                                  ariaLabel={`Annuler le rapprochement ${line.reconciliation.supplierInvoiceReference}`}
                                  Icon={IconUnlink}
                                  accent="danger"
                                  disabled={reconciling}
                                  onClick={() => void openReconciliation(line)}
                                />
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
