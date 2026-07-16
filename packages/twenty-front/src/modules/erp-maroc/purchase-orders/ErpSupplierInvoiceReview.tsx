import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { ErpSupplierPaymentPreparationPanel } from '@/erp-maroc/purchase-orders/ErpSupplierPaymentPreparationPanel';
import { getSupplierInvoiceReviewActions } from '@/erp-maroc/purchase-orders/supplierInvoiceReviewPolicy';
import { formatPurchaseOrderDate } from '@/erp-maroc/purchase-orders/purchaseOrderUi';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { TextArea } from '@/ui/input/components/TextArea';
import { TextInput } from '@/ui/input/components/TextInput';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import {
  erpAccountingEntrySchema,
  erpSupplierInvoiceDetailSchema,
  type ErpSupplierInvoiceDetail,
} from 'twenty-shared/erp-maroc';
import { IconCheck } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledSection = styled.section`
  border-top: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex-direction: column;
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  h2 {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.md};
    letter-spacing: 0;
    margin: 0;
  }
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledSummary = styled.dl`
  display: grid;
  gap: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
  padding: ${themeCssVariables.spacing[4]};

  dt {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
    margin-bottom: ${themeCssVariables.spacing[1]};
  }

  dd {
    color: ${themeCssVariables.font.color.primary};
    margin: 0;
    overflow-wrap: anywhere;
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StyledMessage = styled.div<{ danger?: boolean }>`
  background: ${themeCssVariables.background.secondary};
  border-top: 1px solid ${themeCssVariables.border.color.light};
  color: ${({ danger }) =>
    danger
      ? themeCssVariables.font.color.danger
      : themeCssVariables.font.color.secondary};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledForm = styled.form`
  background: ${themeCssVariables.background.secondary};
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: ${themeCssVariables.spacing[4]};

  @media (max-width: 768px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledWide = styled.div`
  grid-column: 1 / -1;
`;

const StyledLines = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  grid-column: 1 / -1;
`;

const StyledLine = styled.div`
  align-items: end;
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: minmax(180px, 1fr) 120px 140px 100px;

  @media (max-width: 768px) {
    align-items: stretch;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StyledLineName = styled.div`
  color: ${themeCssVariables.font.color.primary};
  min-width: 0;

  span {
    color: ${themeCssVariables.font.color.tertiary};
    display: block;
    font-size: ${themeCssVariables.font.size.sm};
  }
`;

const StyledSelectField = styled.div`
  min-width: 0;
`;

const StyledSelectLabel = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: block;
  font-size: ${themeCssVariables.font.size.sm};
  margin-bottom: ${themeCssVariables.spacing[1]};
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  color: ${themeCssVariables.font.color.primary};
  height: 32px;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledFooter = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  grid-column: 1 / -1;
  justify-content: flex-end;
`;

const tvaRates = [0, 7, 10, 14, 20] as const;

const matchAppearance = {
  MATCHED: { label: 'Conforme', tone: 'success' },
  DISCREPANCY: { label: 'Écart à valider', tone: 'warning' },
  BLOCKED: { label: 'Bloquée', tone: 'danger' },
} as const;

const statusAppearance = {
  PENDING_REVIEW: { label: 'À contrôler', tone: 'warning' },
  APPROVED: { label: 'Validée', tone: 'success' },
  CANCELLED: { label: 'Annulée', tone: 'neutral' },
} as const;

type LineForm = { quantity: string; unitPriceHt: string; tvaRate: string };

export const ErpSupplierInvoiceReview = ({
  invoiceId,
  onClose,
  onChanged,
}: {
  invoiceId: string;
  onClose: () => void;
  onChanged: () => void;
}) => {
  const { client, context } = useErpMarocContext();
  const [invoice, setInvoice] = useState<ErpSupplierInvoiceDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [isMutating, setIsMutating] = useState(false);
  const [mode, setMode] = useState<'correct' | 'cancel' | null>(null);
  const [externalReference, setExternalReference] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Record<string, LineForm>>({});
  const [overrideReason, setOverrideReason] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [validateEntryOpen, setValidateEntryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canManage = context?.capabilities.manageSupplierAccounting === true;

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    client
      .request({
        method: 'GET',
        path: `/supplier-invoices/${invoiceId}`,
        schema: erpSupplierInvoiceDetailSchema,
        signal: abortController.signal,
      })
      .then((result) => {
        if (abortController.signal.aborted) return;
        setInvoice(result);
        setExternalReference(result.externalReference);
        setIssueDate(result.issueDate);
        setDueDate(result.dueDate);
        setNotes(result.notes ?? '');
        setLines(
          Object.fromEntries(
            result.lines.map((line) => [
              line.id,
              {
                quantity: String(line.quantity),
                unitPriceHt: String(line.unitPriceHtCents / 100),
                tvaRate: String(line.tvaRate),
              },
            ]),
          ),
        );
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client, generation, invoiceId]);

  const actions = useMemo(
    () =>
      invoice === null
        ? null
        : getSupplierInvoiceReviewActions(invoice, canManage),
    [canManage, invoice],
  );

  const updateLine = (lineId: string, field: keyof LineForm, value: string) => {
    setLines((current) => ({
      ...current,
      [lineId]: {
        ...(current[lineId] ?? {
          quantity: '',
          unitPriceHt: '',
          tvaRate: '',
        }),
        [field]: value,
      },
    }));
  };

  const refresh = (updated?: ErpSupplierInvoiceDetail) => {
    if (updated) setInvoice(updated);
    setMode(null);
    setError(null);
    setGeneration((value) => value + 1);
    onChanged();
  };

  const approve = async () => {
    if (!invoice || !actions?.canApprove || isMutating) return;
    if (actions.requiresOverrideReason && overrideReason.trim().length < 10) {
      setError('Le motif de dérogation doit contenir au moins 10 caractères.');
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/supplier-invoices/${invoice.id}/approve`,
          schema: erpSupplierInvoiceDetailSchema,
          body: {
            overrideReason: actions.requiresOverrideReason
              ? overrideReason.trim()
              : null,
          },
        },
        { idempotency: 'forbidden' },
      );
      refresh(await intent.execute());
    } catch (caught) {
      setError(
        caught instanceof ErpMarocError && caught.statusCode === 409
          ? 'La facture doit être rechargée ou corrigée avant validation.'
          : "La facture n'a pas pu être validée.",
      );
    } finally {
      setIsMutating(false);
    }
  };

  const correct = async () => {
    if (!invoice || !actions?.canCorrect || isMutating) return;
    const payloadLines = invoice.lines.map((line) => ({
      purchaseOrderLineId: line.purchaseOrderLineId,
      quantity: Number(lines[line.id]?.quantity),
      unitPriceHt: Number(lines[line.id]?.unitPriceHt),
      tvaRate: Number(lines[line.id]?.tvaRate),
    }));
    if (
      !externalReference.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(issueDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
      dueDate < issueDate ||
      payloadLines.some(
        (line) =>
          !Number.isFinite(line.quantity) ||
          line.quantity <= 0 ||
          !Number.isFinite(line.unitPriceHt) ||
          line.unitPriceHt < 0 ||
          !tvaRates.includes(line.tvaRate as (typeof tvaRates)[number]),
      )
    ) {
      setError('Les informations de correction sont invalides.');
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'PATCH',
          path: `/supplier-invoices/${invoice.id}`,
          schema: erpSupplierInvoiceDetailSchema,
          body: {
            externalReference: externalReference.trim(),
            issueDate,
            dueDate,
            notes: notes.trim() || null,
            lines: payloadLines,
          },
        },
        { idempotency: 'forbidden' },
      );
      refresh(await intent.execute());
    } catch {
      setError("La facture n'a pas pu être corrigée.");
    } finally {
      setIsMutating(false);
    }
  };

  const cancel = async () => {
    if (
      !invoice ||
      !actions?.canCancel ||
      cancellationReason.trim().length < 10 ||
      isMutating
    ) {
      setError("Le motif d'annulation doit contenir au moins 10 caractères.");
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/supplier-invoices/${invoice.id}/cancel`,
          schema: erpSupplierInvoiceDetailSchema,
          body: { reason: cancellationReason.trim() },
        },
        { idempotency: 'forbidden' },
      );
      refresh(await intent.execute());
    } catch {
      setError("La facture n'a pas pu être annulée.");
    } finally {
      setIsMutating(false);
    }
  };

  const validateAccountingEntry = async () => {
    if (
      invoice?.accountingEntry?.status !== 'DRAFT' ||
      !canManage ||
      isMutating
    ) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/accounting/entries/${invoice.accountingEntry.id}/validate`,
          schema: erpAccountingEntrySchema,
          body: {},
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setValidateEntryOpen(false);
      refresh();
    } catch {
      setError("L'écriture d'achat n'a pas pu être validée.");
    } finally {
      setIsMutating(false);
    }
  };

  if (state === 'loading') {
    return <StyledMessage>Chargement de la facture fournisseur</StyledMessage>;
  }
  if (state === 'error' || invoice === null || actions === null) {
    return (
      <StyledMessage danger>
        Impossible de charger la facture fournisseur.{' '}
        <Button
          title="Réessayer"
          ariaLabel="Réessayer le chargement"
          variant="secondary"
          onClick={() => setGeneration((value) => value + 1)}
        />
      </StyledMessage>
    );
  }

  const match = matchAppearance[invoice.matchStatus];
  const status = statusAppearance[invoice.status];

  return (
    <StyledSection>
      <StyledHeader>
        <h2>Facture fournisseur {invoice.externalReference}</h2>
        <StyledActions>
          <ErpStatusBadge label={status.label} tone={status.tone} />
          <ErpStatusBadge label={match.label} tone={match.tone} />
          {canManage && invoice.accountingEntry?.status === 'DRAFT' ? (
            <Button
              title="Valider AC"
              ariaLabel="Valider l'écriture comptable d'achat"
              Icon={IconCheck}
              accent="blue"
              disabled={isMutating}
              onClick={() => setValidateEntryOpen(true)}
            />
          ) : null}
          {actions.canCorrect ? (
            <Button
              title="Corriger"
              ariaLabel="Corriger la facture fournisseur"
              variant="secondary"
              disabled={isMutating}
              onClick={() => setMode('correct')}
            />
          ) : null}
          {actions.canCancel ? (
            <Button
              title="Annuler"
              ariaLabel="Annuler la facture fournisseur"
              variant="secondary"
              accent="danger"
              disabled={isMutating}
              onClick={() => setMode('cancel')}
            />
          ) : null}
          <Button
            title="Fermer"
            ariaLabel="Fermer la revue fournisseur"
            variant="secondary"
            disabled={isMutating}
            onClick={onClose}
          />
        </StyledActions>
      </StyledHeader>
      <StyledSummary>
        <div>
          <dt>Fournisseur</dt>
          <dd>{invoice.supplier.name}</dd>
        </div>
        <div>
          <dt>Bon de commande</dt>
          <dd>{invoice.purchaseOrder.number}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{formatPurchaseOrderDate(invoice.issueDate)}</dd>
        </div>
        <div>
          <dt>Échéance</dt>
          <dd>{formatPurchaseOrderDate(invoice.dueDate)}</dd>
        </div>
        <div>
          <dt>Total HT</dt>
          <dd>{formatMadCents(invoice.totalHtCents)}</dd>
        </div>
        <div>
          <dt>TVA récupérable</dt>
          <dd>{formatMadCents(invoice.totalTvaCents)}</dd>
        </div>
        <div>
          <dt>Total TTC</dt>
          <dd>{formatMadCents(invoice.totalTtcCents)}</dd>
        </div>
        <div>
          <dt>Écriture comptable</dt>
          <dd>
            {invoice.accountingEntry
              ? `${invoice.accountingEntry.journal.code} · ${invoice.accountingEntry.status}`
              : 'Non générée'}
          </dd>
        </div>
      </StyledSummary>
      {actions.isBlocked ? (
        <StyledMessage danger>
          La quantité facturée dépasse la quantité réceptionnée. Corrigez la
          facture ou enregistrez la réception manquante avant validation.
        </StyledMessage>
      ) : null}
      {error === null ? null : (
        <StyledMessage danger role="alert">
          {error}
        </StyledMessage>
      )}
      {mode === 'correct' ? (
        <StyledForm
          onSubmit={(event) => {
            event.preventDefault();
            void correct();
          }}
        >
          <TextInput
            label="Référence fournisseur"
            value={externalReference}
            disabled={isMutating}
            fullWidth
            onChange={setExternalReference}
          />
          <TextInput
            label="Date de facture"
            type="date"
            value={issueDate}
            disabled={isMutating}
            fullWidth
            onChange={setIssueDate}
          />
          <TextInput
            label="Date d'échéance"
            type="date"
            min={issueDate}
            value={dueDate}
            disabled={isMutating}
            fullWidth
            onChange={setDueDate}
          />
          <StyledWide>
            <TextArea
              textAreaId="supplier-invoice-correction-notes"
              label="Notes"
              value={notes}
              disabled={isMutating}
              minRows={2}
              onChange={setNotes}
            />
          </StyledWide>
          <StyledLines>
            {invoice.lines.map((line) => (
              <StyledLine key={line.id}>
                <StyledLineName>
                  {line.purchaseOrderLine.description}
                  <span>Reçue {line.receivedQuantitySnapshot}</span>
                </StyledLineName>
                <TextInput
                  label="Quantité"
                  type="number"
                  min="0"
                  step="any"
                  value={lines[line.id]?.quantity ?? ''}
                  disabled={isMutating}
                  fullWidth
                  onChange={(value) => updateLine(line.id, 'quantity', value)}
                />
                <TextInput
                  label="Prix unitaire HT"
                  type="number"
                  min="0"
                  step="0.01"
                  value={lines[line.id]?.unitPriceHt ?? ''}
                  disabled={isMutating}
                  fullWidth
                  onChange={(value) =>
                    updateLine(line.id, 'unitPriceHt', value)
                  }
                />
                <StyledSelectField>
                  <StyledSelectLabel htmlFor={`review-tva-${line.id}`}>
                    TVA
                  </StyledSelectLabel>
                  <StyledSelect
                    id={`review-tva-${line.id}`}
                    value={lines[line.id]?.tvaRate ?? ''}
                    disabled={isMutating}
                    onChange={(event) =>
                      updateLine(line.id, 'tvaRate', event.target.value)
                    }
                  >
                    {tvaRates.map((rate) => (
                      <option key={rate} value={rate}>
                        {rate} %
                      </option>
                    ))}
                  </StyledSelect>
                </StyledSelectField>
              </StyledLine>
            ))}
          </StyledLines>
          <StyledFooter>
            <Button
              type="button"
              title="Fermer"
              ariaLabel="Fermer la correction"
              variant="secondary"
              disabled={isMutating}
              onClick={() => setMode(null)}
            />
            <Button
              type="submit"
              title="Recontrôler"
              ariaLabel="Corriger et recontrôler la facture"
              accent="blue"
              disabled={isMutating}
              isLoading={isMutating}
            />
          </StyledFooter>
        </StyledForm>
      ) : null}
      {mode === 'cancel' ? (
        <StyledForm
          onSubmit={(event) => {
            event.preventDefault();
            void cancel();
          }}
        >
          <StyledWide>
            <TextArea
              textAreaId="supplier-invoice-cancellation-reason"
              label="Motif d'annulation"
              value={cancellationReason}
              disabled={isMutating}
              minRows={2}
              onChange={setCancellationReason}
            />
          </StyledWide>
          <StyledFooter>
            <Button
              type="button"
              title="Fermer"
              ariaLabel="Fermer l'annulation"
              variant="secondary"
              disabled={isMutating}
              onClick={() => setMode(null)}
            />
            <Button
              type="submit"
              title="Confirmer l'annulation"
              ariaLabel="Confirmer l'annulation de la facture"
              accent="danger"
              disabled={isMutating}
              isLoading={isMutating}
            />
          </StyledFooter>
        </StyledForm>
      ) : null}
      {actions.canApprove ? (
        <StyledForm
          onSubmit={(event) => {
            event.preventDefault();
            void approve();
          }}
        >
          {actions.requiresOverrideReason ? (
            <StyledWide>
              <TextArea
                textAreaId="supplier-invoice-override-reason"
                label="Motif de dérogation"
                value={overrideReason}
                disabled={isMutating}
                minRows={2}
                onChange={setOverrideReason}
              />
            </StyledWide>
          ) : null}
          <StyledFooter>
            <Button
              type="submit"
              title="Valider et générer l'écriture"
              ariaLabel="Valider la facture et générer l'écriture comptable"
              accent="blue"
              disabled={isMutating}
              isLoading={isMutating}
            />
          </StyledFooter>
        </StyledForm>
      ) : null}
      {invoice.status === 'APPROVED' ? (
        <ErpSupplierPaymentPreparationPanel
          invoice={invoice}
          canManage={canManage}
          onChanged={() => {
            setGeneration((value) => value + 1);
            onChanged();
          }}
        />
      ) : null}
      <ErpConfirmDialog
        isOpen={validateEntryOpen}
        title="Valider l'écriture d'achat"
        message="Cette décision rend l'écriture AC définitive et disponible pour le lettrage fournisseur."
        confirmLabel="Valider l'écriture"
        cancelLabel="Annuler"
        isConfirming={isMutating}
        onCancel={() => setValidateEntryOpen(false)}
        onConfirm={() => void validateAccountingEntry()}
      />
    </StyledSection>
  );
};
