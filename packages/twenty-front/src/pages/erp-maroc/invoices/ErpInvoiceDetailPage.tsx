import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import {
  ErpInvoiceDetailContent,
  getInvoiceStatusAppearance,
} from '@/erp-maroc/invoices/ErpInvoiceDetailContent';
import { getInvoiceCommandPolicy } from '@/erp-maroc/invoices/invoiceCommandPolicy';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { pollInvoicePdf } from '@/erp-maroc/invoices/pollInvoicePdf';
import { formatCivilDate } from '@/erp-maroc/utils/civilDate';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  erpInvoiceReadSchema,
  erpInvoiceSchema,
  type ErpInvoice,
  type ErpInvoiceRead,
} from 'twenty-shared/erp-maroc';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type ErpInvoiceDetailPageProps = {
  invoiceId?: string;
};

type Reconciliation =
  | { phase: 'refreshing'; message: string }
  | { phase: 'needs-ack'; message: string }
  | { phase: 'failed'; message: string };

type PdfPollingNotice =
  | { tone: 'neutral'; message: string }
  | { tone: 'warning'; message: string }
  | { tone: 'danger'; message: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledNotice = styled.div<{ tone?: 'neutral' | 'warning' | 'danger' }>`
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid
    ${({ tone }) =>
      tone === 'danger'
        ? themeCssVariables.border.color.danger
        : themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const StyledBlocked = styled.div`
  align-items: flex-start;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
`;

const requiresReconciliation = (error: unknown) =>
  !(error instanceof ErpMarocError) ||
  error.statusCode === 409 ||
  error.statusCode === 429 ||
  error.statusCode >= 500;

const reconciliationMessage = (error: unknown) =>
  error instanceof ErpMarocError && error.statusCode === 409
    ? 'Conflit de validation détecté.'
    : 'Validation à vérifier.';

const getDownloadFileName = (invoice: ErpInvoice) => {
  const source = invoice.number ?? invoice.id;
  const safeSource = source.replace(/[^A-Za-z0-9._-]/g, '_');

  return `facture-${safeSource}.pdf`;
};

export const ErpInvoiceDetailPage = ({
  invoiceId: invoiceIdProp,
}: ErpInvoiceDetailPageProps) => {
  const erpContextState = useErpMarocContext();
  const { client } = erpContextState;
  const navigate = useNavigate();
  const { id: routeInvoiceId } = useParams<{ id: string }>();
  const resolvedInvoiceId = invoiceIdProp ?? routeInvoiceId;
  const invoiceId =
    resolvedInvoiceId !== undefined && UUID_PATTERN.test(resolvedInvoiceId)
      ? resolvedInvoiceId
      : null;
  const [invoice, setInvoice] = useState<ErpInvoiceRead | null>(null);
  const [loadState, setLoadState] = useState<
    'loading' | 'ready' | 'error' | 'not-found'
  >('loading');
  const [loadGeneration, setLoadGeneration] = useState(0);
  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationNotice, setValidationNotice] = useState<string | null>(null);
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(
    null,
  );
  const [pdfPollingNotice, setPdfPollingNotice] =
    useState<PdfPollingNotice | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  // The synchronous locks close before React can render disabled controls.
  // oxlint-disable-next-line twenty/no-state-useref
  const validationLock = useRef(false);
  // oxlint-disable-next-line twenty/no-state-useref
  const validationRunGenerationRef = useRef(0);
  // oxlint-disable-next-line twenty/no-state-useref
  const downloadLock = useRef(false);
  // oxlint-disable-next-line twenty/no-state-useref
  const reconciliationAbortControllerRef = useRef<AbortController | null>(null);
  // oxlint-disable-next-line twenty/no-state-useref
  const downloadAbortControllerRef = useRef<AbortController | null>(null);
  // oxlint-disable-next-line twenty/no-state-useref
  const pdfPollAbortControllerRef = useRef<AbortController | null>(null);
  // oxlint-disable-next-line twenty/no-state-useref
  const pdfPollGenerationRef = useRef(0);
  // oxlint-disable-next-line twenty/no-state-useref
  const isMountedRef = useRef(true);
  // oxlint-disable-next-line twenty/no-state-useref
  const activeInvoiceIdRef = useRef<string | null>(invoiceId);

  const context = erpContextState.context;

  const cancelPdfPolling = useCallback(() => {
    pdfPollGenerationRef.current += 1;
    pdfPollAbortControllerRef.current?.abort();
    pdfPollAbortControllerRef.current = null;
  }, []);

  const cancelValidationRun = useCallback(() => {
    validationRunGenerationRef.current += 1;
    reconciliationAbortControllerRef.current?.abort();
    reconciliationAbortControllerRef.current = null;
    validationLock.current = false;
    if (!isMountedRef.current) return;

    setIsValidating(false);
    setIsValidationDialogOpen(false);
    setValidationNotice(null);
    setReconciliation(null);
  }, []);

  const cancelPdfDownload = useCallback(() => {
    downloadAbortControllerRef.current?.abort();
    downloadAbortControllerRef.current = null;
    downloadLock.current = false;
    if (!isMountedRef.current) return;

    setIsDownloading(false);
    setDownloadError(null);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      cancelPdfPolling();
      cancelValidationRun();
      cancelPdfDownload();
    };
  }, [cancelPdfDownload, cancelPdfPolling, cancelValidationRun]);

  useEffect(() => {
    activeInvoiceIdRef.current = invoiceId;
    cancelPdfPolling();
    cancelValidationRun();
    cancelPdfDownload();
  }, [cancelPdfDownload, cancelPdfPolling, cancelValidationRun, invoiceId]);

  useEffect(() => {
    if (invoiceId === null || erpContextState.status !== 'ready') return;

    const abortController = new AbortController();
    let isCurrent = true;
    setLoadState('loading');
    setInvoice(null);
    setValidationNotice(null);
    setReconciliation(null);
    setPdfPollingNotice(null);
    setDownloadError(null);

    client
      .request({
        method: 'GET',
        path: `/invoices/${invoiceId}`,
        schema: erpInvoiceReadSchema,
        signal: abortController.signal,
      })
      .then((loadedInvoice) => {
        if (!isCurrent || abortController.signal.aborted) return;
        setInvoice(loadedInvoice);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (!isCurrent || abortController.signal.aborted) return;
        setLoadState(
          error instanceof ErpMarocError && error.statusCode === 404
            ? 'not-found'
            : 'error',
        );
      });

    return () => {
      isCurrent = false;
      abortController.abort();
    };
  }, [client, erpContextState.status, invoiceId, loadGeneration]);

  const policy = useMemo(
    () =>
      context === null || invoice === null
        ? null
        : getInvoiceCommandPolicy({
            role: context.role,
            manageSalesDocuments:
              context.capabilities.manageSalesDocuments === true,
            createPendingPayment:
              context.capabilities.createPendingPayment === true,
            manageCreditNotes: context.capabilities.manageCreditNotes === true,
            features: {
              invoiceValidation: context.features.invoiceValidation,
              invoiceEmail: context.features.invoiceEmail,
            },
            status: invoice.status,
            lineCount: invoice.lines.length,
            legalSnapshotVerificationStatus:
              invoice.legalSnapshotVerificationStatus,
            legalMentionsReady: true,
            pdfGenerationStatus: invoice.pdfGenerationStatus,
            pdfDocumentReference: invoice.pdfDocumentReference,
            customerEmailSnapshot: invoice.customerEmailSnapshot,
            outstandingCents: invoice.collections.outstandingCents,
          }),
    [context, invoice],
  );

  const startPdfPolling = useCallback(
    async (currentInvoiceId: string) => {
      cancelPdfPolling();
      const generation = ++pdfPollGenerationRef.current;
      const abortController = new AbortController();
      pdfPollAbortControllerRef.current = abortController;
      setPdfPollingNotice({
        tone: 'neutral',
        message: 'Génération du PDF en cours.',
      });

      try {
        const result = await pollInvoicePdf({
          signal: abortController.signal,
          fetchInvoice: (signal) =>
            client.request({
              method: 'GET',
              path: `/invoices/${currentInvoiceId}`,
              schema: erpInvoiceReadSchema,
              signal,
            }),
        });
        if (
          !isMountedRef.current ||
          abortController.signal.aborted ||
          pdfPollGenerationRef.current !== generation
        )
          return;
        if (result.status === 'aborted') return;

        setInvoice(result.invoice);
        setPdfPollingNotice(
          result.status === 'generated'
            ? { tone: 'neutral', message: 'PDF généré.' }
            : result.status === 'failed'
              ? { tone: 'danger', message: 'La génération du PDF a échoué.' }
              : {
                  tone: 'warning',
                  message: 'La génération du PDF est toujours en cours.',
                },
        );
      } catch {
        if (
          !isMountedRef.current ||
          abortController.signal.aborted ||
          pdfPollGenerationRef.current !== generation
        )
          return;
        setPdfPollingNotice({
          tone: 'warning',
          message: 'La vérification de la génération du PDF a échoué.',
        });
      } finally {
        if (pdfPollAbortControllerRef.current === abortController) {
          pdfPollAbortControllerRef.current = null;
        }
      }
    },
    [cancelPdfPolling, client],
  );

  const reconcileValidation = useCallback(
    async (message: string) => {
      if (invoiceId === null) return;

      reconciliationAbortControllerRef.current?.abort();
      const abortController = new AbortController();
      reconciliationAbortControllerRef.current = abortController;
      setReconciliation({ phase: 'refreshing', message });
      try {
        const refreshedInvoice = await client.request({
          method: 'GET',
          path: `/invoices/${invoiceId}`,
          schema: erpInvoiceReadSchema,
          signal: abortController.signal,
        });
        if (
          !isMountedRef.current ||
          abortController.signal.aborted ||
          activeInvoiceIdRef.current !== invoiceId
        )
          return;

        setInvoice(refreshedInvoice);
        if (refreshedInvoice.status !== 'DRAFT') {
          validationLock.current = false;
          setReconciliation(null);
          setValidationNotice(message);
          void startPdfPolling(invoiceId);
          return;
        }

        setReconciliation({ phase: 'needs-ack', message });
      } catch {
        if (
          !isMountedRef.current ||
          abortController.signal.aborted ||
          activeInvoiceIdRef.current !== invoiceId
        )
          return;
        setReconciliation({
          phase: 'failed',
          message: 'La vérification de la validation a échoué.',
        });
      } finally {
        if (reconciliationAbortControllerRef.current === abortController) {
          reconciliationAbortControllerRef.current = null;
        }
      }
    },
    [client, invoiceId, startPdfPolling],
  );

  const runValidation = async () => {
    const currentInvoice = invoice;
    if (
      validationLock.current ||
      currentInvoice === null ||
      invoiceId === null ||
      context === null
    )
      return;

    const currentPolicy = getInvoiceCommandPolicy({
      role: context.role,
      manageSalesDocuments: context.capabilities.manageSalesDocuments === true,
      createPendingPayment: context.capabilities.createPendingPayment === true,
      manageCreditNotes: context.capabilities.manageCreditNotes === true,
      features: {
        invoiceValidation: context.features.invoiceValidation,
        invoiceEmail: context.features.invoiceEmail,
      },
      status: currentInvoice.status,
      lineCount: currentInvoice.lines.length,
      legalSnapshotVerificationStatus:
        currentInvoice.legalSnapshotVerificationStatus,
      legalMentionsReady: true,
      pdfGenerationStatus: currentInvoice.pdfGenerationStatus,
      pdfDocumentReference: currentInvoice.pdfDocumentReference,
      customerEmailSnapshot: currentInvoice.customerEmailSnapshot,
      outstandingCents: currentInvoice.collections.outstandingCents,
    });
    if (!currentPolicy.validate) return;

    const validationGeneration = ++validationRunGenerationRef.current;
    const isCurrentValidationRun = () =>
      isMountedRef.current &&
      activeInvoiceIdRef.current === invoiceId &&
      validationRunGenerationRef.current === validationGeneration;
    validationLock.current = true;
    setIsValidating(true);
    setValidationNotice(null);
    setReconciliation(null);
    let lockRemainsForReconciliation = false;
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/invoices/${invoiceId}/validate`,
          schema: erpInvoiceSchema,
        },
        { idempotency: 'forbidden' },
      );
      const validatedInvoice = await intent.execute();
      if (!isCurrentValidationRun()) return;

      setInvoice({ ...currentInvoice, ...validatedInvoice });
      if (validatedInvoice.status === 'DRAFT') {
        lockRemainsForReconciliation = true;
        setReconciliation({
          phase: 'needs-ack',
          message: 'Validation à vérifier.',
        });
        return;
      }

      void startPdfPolling(invoiceId);
    } catch (error: unknown) {
      if (!isCurrentValidationRun()) return;
      if (requiresReconciliation(error)) {
        lockRemainsForReconciliation = true;
        await reconcileValidation(reconciliationMessage(error));
        return;
      }
      if (isMountedRef.current) {
        setValidationNotice('Impossible de valider la facture.');
      }
    } finally {
      if (validationRunGenerationRef.current !== validationGeneration) return;
      if (!lockRemainsForReconciliation) {
        validationLock.current = false;
      }
      if (isMountedRef.current) {
        setIsValidating(false);
        setIsValidationDialogOpen(false);
      }
    }
  };

  const downloadPdf = async () => {
    if (downloadLock.current || invoice === null || invoiceId === null) return;

    const requestedInvoiceId = invoiceId;
    const requestedInvoice = invoice;
    const abortController = new AbortController();
    downloadAbortControllerRef.current = abortController;
    downloadLock.current = true;
    setIsDownloading(true);
    setDownloadError(null);
    const isCurrentDownload = () =>
      isMountedRef.current &&
      !abortController.signal.aborted &&
      activeInvoiceIdRef.current === requestedInvoiceId &&
      downloadAbortControllerRef.current === abortController;
    try {
      const blob = await client.pdf({
        method: 'GET',
        path: `/invoices/${requestedInvoiceId}/pdf`,
        responseType: 'pdf',
        signal: abortController.signal,
      });
      if (!isCurrentDownload()) return;
      if (typeof URL.createObjectURL !== 'function')
        throw new Error('Blob URL');

      const objectUrl = URL.createObjectURL(blob);
      try {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = getDownloadFileName(requestedInvoice);
        link.style.display = 'none';
        document.body.appendChild(link);
        try {
          link.click();
        } finally {
          link.remove();
        }
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch {
      if (isCurrentDownload()) {
        setDownloadError('Impossible de télécharger le PDF.');
      }
    } finally {
      if (downloadAbortControllerRef.current !== abortController) return;

      downloadAbortControllerRef.current = null;
      downloadLock.current = false;
      if (isMountedRef.current) setIsDownloading(false);
    }
  };

  if (erpContextState.status === 'loading') {
    return (
      <ErpPageShell
        title="Factures"
        state="loading"
        loadingLabel="Chargement des permissions ERP Maroc"
      />
    );
  }
  if (erpContextState.status === 'forbidden') {
    return (
      <ErpPageShell title="Factures">
        <StyledBlocked>
          Vous n'avez pas la permission de consulter cette facture.
        </StyledBlocked>
      </ErpPageShell>
    );
  }
  if (erpContextState.status === 'error' || context === null) {
    return (
      <ErpPageShell
        title="Factures"
        state="error"
        errorLabel="Impossible de vérifier les permissions ERP Maroc"
      />
    );
  }
  if (invoiceId === null) {
    return (
      <ErpPageShell
        title="Factures"
        state="empty"
        emptyLabel="Facture introuvable"
      />
    );
  }
  if (loadState === 'loading') {
    return (
      <ErpPageShell
        title="Factures"
        state="loading"
        loadingLabel="Chargement de la facture"
      />
    );
  }
  if (loadState === 'error') {
    return (
      <ErpPageShell
        title="Factures"
        state="error"
        errorLabel="Impossible de charger la facture"
        retryLabel="Réessayer"
        onRetry={() => setLoadGeneration((value) => value + 1)}
      />
    );
  }
  if (loadState === 'not-found' || invoice === null) {
    return (
      <ErpPageShell
        title="Factures"
        state="empty"
        emptyLabel="Facture introuvable"
      />
    );
  }

  const statusAppearance = getInvoiceStatusAppearance(invoice.status);
  const description = `${invoice.customerNameSnapshot ?? invoice.tier.name} · Émission ${formatCivilDate(invoice.issueDate)} · ${formatMadCents(invoice.totalTtcCents)} TTC`;

  return (
    <ErpPageShell
      title={invoice.number ?? 'Facture'}
      description={description}
      actions={
        <StyledActions>
          <ErpStatusBadge
            label={statusAppearance.label}
            tone={statusAppearance.tone}
          />
          {policy?.validate ? (
            <Button
              title="Valider"
              ariaLabel="Valider"
              accent="blue"
              disabled={isValidating || validationLock.current}
              onClick={() => {
                if (validationLock.current) return;
                setValidationNotice(null);
                setIsValidationDialogOpen(true);
              }}
            />
          ) : null}
          {policy?.viewPdf ? (
            <Button
              title="Télécharger le PDF"
              ariaLabel="Télécharger le PDF"
              variant="secondary"
              disabled={isDownloading || downloadLock.current}
              onClick={() => void downloadPdf()}
            />
          ) : null}
          {policy?.createPayment ? (
            <Button
              title="Enregistrer un règlement"
              ariaLabel="Enregistrer un règlement"
              variant="secondary"
              onClick={() => {
                const searchParams = new URLSearchParams({
                  invoiceId: invoice.id,
                  tierId: invoice.tierId,
                });
                navigate(`/erp-maroc/payments/new?${searchParams.toString()}`);
              }}
            />
          ) : null}
          {policy?.createCreditNote ? (
            <Button
              title="Créer un avoir"
              ariaLabel="Créer un avoir"
              variant="secondary"
              onClick={() => {
                const searchParams = new URLSearchParams({
                  invoiceId: invoice.id,
                });
                navigate(
                  `/erp-maroc/credit-notes/new?${searchParams.toString()}`,
                );
              }}
            />
          ) : null}
          {context.capabilities.manageInventory === true &&
          context.capabilities.manageCreditNotes === true &&
          invoice.salesInvoiceAllocations.length > 0 &&
          invoice.status !== 'DRAFT' &&
          invoice.status !== 'CANCELLED' ? (
            <Button
              title="Enregistrer un retour"
              ariaLabel="Enregistrer un retour client"
              variant="secondary"
              onClick={() => {
                const searchParams = new URLSearchParams({
                  invoiceId: invoice.id,
                });
                navigate(
                  `${erpMarocPaths.customerReturns}?${searchParams.toString()}`,
                );
              }}
            />
          ) : null}
        </StyledActions>
      }
    >
      {validationNotice === null ? null : (
        <StyledNotice role="status">{validationNotice}</StyledNotice>
      )}
      {pdfPollingNotice === null ? null : (
        <StyledNotice role="status" tone={pdfPollingNotice.tone}>
          {pdfPollingNotice.message}
        </StyledNotice>
      )}
      {downloadError === null ? null : (
        <StyledNotice role="alert" tone="danger">
          {downloadError}
        </StyledNotice>
      )}
      {reconciliation === null ? null : (
        <StyledNotice
          role={reconciliation.phase === 'failed' ? 'alert' : 'status'}
          tone={reconciliation.phase === 'failed' ? 'danger' : 'warning'}
        >
          <span>
            {reconciliation.phase === 'refreshing'
              ? 'Vérification de la validation en cours.'
              : reconciliation.message}
          </span>
          {reconciliation.phase === 'needs-ack' ? (
            <Button
              title="J'ai vérifié"
              ariaLabel="J'ai vérifié"
              variant="secondary"
              onClick={() => {
                validationLock.current = false;
                setReconciliation(null);
              }}
            />
          ) : null}
          {reconciliation.phase === 'failed' ? (
            <Button
              title="Réessayer la vérification"
              ariaLabel="Réessayer la vérification"
              variant="secondary"
              onClick={() => void reconcileValidation(reconciliation.message)}
            />
          ) : null}
        </StyledNotice>
      )}
      <ErpInvoiceDetailContent invoice={invoice} timeZone={context.timezone} />
      <ErpConfirmDialog
        isOpen={isValidationDialogOpen}
        title="Valider la facture"
        message="Confirmer la validation définitive de cette facture."
        confirmLabel="Valider"
        confirmDisabled={isValidating || reconciliation !== null}
        isConfirming={isValidating || reconciliation?.phase === 'refreshing'}
        onCancel={() => {
          if (!validationLock.current) setIsValidationDialogOpen(false);
        }}
        onConfirm={() => void runValidation()}
      />
    </ErpPageShell>
  );
};
