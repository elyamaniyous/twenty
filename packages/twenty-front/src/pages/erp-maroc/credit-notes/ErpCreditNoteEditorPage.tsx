import type { ErpMarocRequiredMutationIntent } from '@/erp-maroc/api/erpMarocClient';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { ErpCreditNoteEditorForm } from '@/erp-maroc/credit-notes/ErpCreditNoteEditorForm';
import {
  validateCreditNoteDraftLine,
  type CreditNoteDraftLineError,
  type CreditNoteDraftLineValues,
  type CreditNoteSourceLine,
} from '@/erp-maroc/credit-notes/creditNoteFormSchema';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  erpCreditNoteSchema,
  erpInvoiceReadSchema,
  type ErpCreditNote,
} from 'twenty-shared/erp-maroc';

const isAmbiguousError = (error: unknown) => {
  const statusCode =
    typeof error === 'object' && error !== null && 'statusCode' in error
      ? (error as { statusCode?: unknown }).statusCode
      : undefined;
  return (
    statusCode === undefined ||
    statusCode === 408 ||
    statusCode === 409 ||
    (typeof statusCode === 'number' && statusCode >= 500)
  );
};

export const ErpCreditNoteEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoiceId');
  const { client, context } = useErpMarocContext();
  const navigate = useNavigate();
  const [sourceInvoice, setSourceInvoice] = useState<{
    id: string;
    societeId: string;
    tierId: string;
    number: string | null;
    issueDate: string;
    tier: { name: string };
  } | null>(null);
  const [lines, setLines] = useState<CreditNoteDraftLineValues[]>([]);
  const [draft, setDraft] = useState<ErpCreditNote | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errors, setErrors] = useState<CreditNoteDraftLineError[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryIntent, setRetryIntent] =
    useState<ErpMarocRequiredMutationIntent<ErpCreditNote> | null>(null);

  useEffect(() => {
    let active = true;
    setState('loading');
    setErrors([]);
    setRetryIntent(null);

    if (id !== undefined) {
      void client
        .request({
          method: 'GET',
          path: `/credit-notes/${id}`,
          schema: erpCreditNoteSchema,
        })
        .then((creditNote) => {
          if (!active) return;
          setDraft(creditNote);
          setSourceInvoice({
            id: creditNote.sourceInvoiceId,
            societeId: creditNote.societeId,
            tierId: creditNote.tierId,
            number: creditNote.sourceInvoiceNumber,
            issueDate: creditNote.issueDate,
            tier: { name: creditNote.tierId },
          });
          setLines(
            creditNote.lines.map((line) => ({
              sourceInvoiceLineId: line.sourceInvoiceLineId,
              description: line.description,
              quantity: line.quantity,
              unit: line.unit,
              unitPriceHtCents: line.unitPriceHtCents,
              tvaRate: line.tvaRate,
              sourceTotalHtCents: line.amountHtCents,
              amountHtCents: String(line.amountHtCents),
            })),
          );
          setState('ready');
        })
        .catch(() => active && setState('error'));
    } else if (invoiceId !== null) {
      void client
        .request({
          method: 'GET',
          path: `/invoices/${invoiceId}`,
          schema: erpInvoiceReadSchema,
        })
        .then((invoice) => {
          if (!active) return;
          setDraft(null);
          setSourceInvoice({
            id: invoice.id,
            societeId: invoice.societeId,
            tierId: invoice.tierId,
            number: invoice.number,
            issueDate: invoice.issueDate,
            tier: { name: invoice.tier.name },
          });
          setLines(
            invoice.lines.map((line) => ({
              sourceInvoiceLineId: line.id,
              description: line.description,
              quantity: line.quantity,
              unit: line.unit,
              unitPriceHtCents: line.unitPriceHtCents,
              tvaRate: line.tvaRate,
              sourceTotalHtCents: line.totalHtCents,
              amountHtCents: String(line.totalHtCents),
            })),
          );
          setState('ready');
        })
        .catch(() => active && setState('error'));
    } else {
      setState('error');
    }

    return () => {
      active = false;
    };
  }, [client, id, invoiceId]);

  const save = async (
    intentOverride?: ErpMarocRequiredMutationIntent<ErpCreditNote>,
  ) => {
    if (
      sourceInvoice === null ||
      isSubmitting ||
      context?.capabilities.manageCreditNotes !== true
    )
      return;
    const parsedLines = lines.map((line) =>
      validateCreditNoteDraftLine({
        sourceLine: line as CreditNoteSourceLine,
        values: line,
      }),
    );
    const invalid = parsedLines.flatMap((result) =>
      result.success ? [] : result.errors,
    );
    if (invalid.length > 0) {
      setErrors(invalid);
      return;
    }

    const sourceLines = parsedLines.flatMap((result) =>
      result.success
        ? [
            {
              sourceInvoiceLineId: result.line.sourceInvoiceLineId,
              amountHtCents: result.line.amountHtCents,
            },
          ]
        : [],
    );
    const intent =
      intentOverride ??
      client.createMutationIntent(
        id === undefined
          ? {
              method: 'POST',
              path: '/credit-notes',
              schema: erpCreditNoteSchema,
              body: {
                sourceInvoiceId: sourceInvoice.id,
                societeId: sourceInvoice.societeId,
                tierId: sourceInvoice.tierId,
                issueDate: sourceInvoice.issueDate,
                currency: 'MAD',
                lines: sourceLines,
              },
            }
          : {
              method: 'PATCH',
              path: `/credit-notes/${id}`,
              schema: erpCreditNoteSchema,
              body: { lines: sourceLines },
            },
        { idempotency: 'required' },
      );

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const creditNote = await (intentOverride === undefined
        ? intent.execute()
        : intent.retry());
      setRetryIntent(null);
      if (id === undefined) {
        navigate(`/erp-maroc/credit-notes/${creditNote.id}/edit`);
      } else {
        setDraft(creditNote);
      }
    } catch (error) {
      if (isAmbiguousError(error)) setRetryIntent(intent);
      setSubmitError("Impossible d'enregistrer l’avoir.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (state === 'loading')
    return <ErpPageShell title="Avoir" state="loading" />;
  if (state === 'error' || sourceInvoice === null)
    return (
      <ErpPageShell
        title="Avoir"
        state="error"
        errorLabel="Impossible de charger l'avoir"
      />
    );

  const isDraft = draft === null || draft.status === 'DRAFT';
  const canEditDraft =
    isDraft && context?.capabilities.manageCreditNotes === true;
  return (
    <ErpPageShell title="Avoir">
      {submitError === null ? null : <div role="alert">{submitError}</div>}
      {retryIntent === null ? null : (
        <button type="button" onClick={() => void save(retryIntent)}>
          Réessayer
        </button>
      )}
      {!canEditDraft ? <p>Cet avoir ne peut plus être modifié.</p> : null}
      <ErpCreditNoteEditorForm
        sourceInvoiceLabel={sourceInvoice.number ?? sourceInvoice.id}
        tierLabel={sourceInvoice.tier.name}
        lines={lines}
        disabled={!canEditDraft || isSubmitting}
        errors={errors}
        onChange={setLines}
        onSubmit={() => save()}
      />
    </ErpPageShell>
  );
};
