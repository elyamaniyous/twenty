import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import type { ErpMarocRequiredMutationIntent } from '@/erp-maroc/api/erpMarocClient';
import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { ErpPaymentDetailContent } from '@/erp-maroc/payments/ErpPaymentDetailContent';
import { getPaymentCommandPolicy } from '@/erp-maroc/payments/paymentCommandPolicy';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { erpPaymentSchema, type ErpPayment } from 'twenty-shared/erp-maroc';

const isAmbiguousTerminationError = (error: unknown) =>
  !(error instanceof ErpMarocError) ||
  error.statusCode === 408 ||
  error.statusCode === 409 ||
  error.statusCode >= 500;

export const ErpPaymentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { client, context } = useErpMarocContext();
  const [payment, setPayment] = useState<ErpPayment | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'ready',
  );
  const [isTerminationDialogOpen, setIsTerminationDialogOpen] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [terminationError, setTerminationError] = useState<string | null>(null);
  const [terminationRetryIntent, setTerminationRetryIntent] =
    useState<ErpMarocRequiredMutationIntent<ErpPayment> | null>(null);

  useEffect(() => {
    setTerminationRetryIntent(null);
    setTerminationError(null);
    setIsTerminationDialogOpen(false);

    if (id === undefined) {
      setPayment(null);
      setLoadState('ready');
      return;
    }

    const abortController = new AbortController();
    let isCurrent = true;

    setPayment(null);
    setLoadState('loading');

    void client
      .request({
        method: 'GET',
        path: `/payments/${id}`,
        schema: erpPaymentSchema,
        signal: abortController.signal,
      })
      .then((result) => {
        if (!isCurrent || abortController.signal.aborted) return;

        setPayment(result);
        setLoadState('ready');
      })
      .catch(() => {
        if (!isCurrent || abortController.signal.aborted) return;

        setLoadState('error');
      });

    return () => {
      isCurrent = false;
      abortController.abort();
    };
  }, [client, id]);

  const canTerminate = useMemo(
    () =>
      payment !== null &&
      context !== null &&
      getPaymentCommandPolicy({
        role: context.role,
        capabilities: context.capabilities,
        kind: payment.kind,
        status: payment.status,
        isOwnPayment: payment.createdByTwentyUserId === context.twentyUserId,
      }).terminate,
    [context, payment],
  );

  const confirmTermination = async () => {
    if (payment === null || isTerminating || terminationRetryIntent !== null)
      return;

    setIsTerminating(true);
    setTerminationError(null);
    let intent: ErpMarocRequiredMutationIntent<ErpPayment> | null = null;

    try {
      intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/payments/${payment.id}/terminate`,
          schema: erpPaymentSchema,
          body: { reason: 'Terminaison confirmée depuis le CRM.' },
        },
        { idempotency: 'required' },
      );
      const result = await intent.execute();

      setPayment(result);
      setTerminationRetryIntent(null);
      setIsTerminationDialogOpen(false);
    } catch (error) {
      if (intent !== null && isAmbiguousTerminationError(error)) {
        setTerminationRetryIntent(intent);
        setTerminationError('Impossible de terminer le règlement');
        return;
      }

      setTerminationError('Impossible de terminer le règlement');
    } finally {
      setIsTerminating(false);
    }
  };

  const retryTermination = async () => {
    if (isTerminating || terminationRetryIntent === null) return;

    setIsTerminating(true);
    setTerminationError(null);

    try {
      const result = await terminationRetryIntent.retry();

      setPayment(result);
      setTerminationRetryIntent(null);
      setIsTerminationDialogOpen(false);
    } catch (error) {
      if (!isAmbiguousTerminationError(error)) {
        setTerminationRetryIntent(null);
      }

      setTerminationError('Impossible de terminer le règlement');
    } finally {
      setIsTerminating(false);
    }
  };

  if (loadState === 'loading') {
    return (
      <ErpPageShell
        title="Règlement"
        state="loading"
        loadingLabel="Chargement du règlement"
      />
    );
  }

  if (loadState === 'error') {
    return (
      <ErpPageShell
        title="Règlement"
        state="error"
        errorLabel="Impossible de charger le règlement"
      />
    );
  }

  return (
    <ErpPageShell
      title="Règlement"
      actions={
        canTerminate ? (
          <button
            type="button"
            disabled={isTerminating}
            onClick={() => {
              setTerminationError(null);
              setIsTerminationDialogOpen(true);
            }}
          >
            Terminer le règlement
          </button>
        ) : null
      }
    >
      {terminationError !== null && <div role="alert">{terminationError}</div>}
      {payment && <ErpPaymentDetailContent payment={payment} />}
      <ErpConfirmDialog
        isOpen={isTerminationDialogOpen}
        title="Terminer le règlement"
        message="Confirmer la terminaison de ce règlement."
        cancelLabel="Annuler"
        destructive={true}
        isConfirming={isTerminating}
        onCancel={() => {
          setTerminationError(null);
          setTerminationRetryIntent(null);
          setIsTerminationDialogOpen(false);
        }}
        confirmLabel={
          terminationRetryIntent === null
            ? 'Terminer le règlement'
            : 'Réessayer la terminaison du règlement'
        }
        onConfirm={() =>
          void (terminationRetryIntent === null
            ? confirmTermination()
            : retryTermination())
        }
      />
    </ErpPageShell>
  );
};
