import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
  type ErpOperationalTableState,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatPurchaseOrderDate } from '@/erp-maroc/purchase-orders/purchaseOrderUi';
import {
  formatMadCents,
  parseMadDecimalToCents,
} from '@/erp-maroc/utils/money';
import { TextArea } from '@/ui/input/components/TextArea';
import { TextInput } from '@/ui/input/components/TextInput';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import {
  erpSupplierPaymentPreparationListSchema,
  erpSupplierPaymentPreparationSchema,
  type ErpSupplierInvoiceDetail,
  type ErpSupplierPaymentPreparation,
} from 'twenty-shared/erp-maroc';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPanel = styled.section`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  h3 {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.md};
    letter-spacing: 0;
    margin: 0;
  }
`;

const StyledTotals = styled.dl`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[4]};
  margin: 0;

  div {
    display: flex;
    gap: ${themeCssVariables.spacing[1]};
  }

  dt {
    color: ${themeCssVariables.font.color.tertiary};
  }

  dd {
    color: ${themeCssVariables.font.color.primary};
    margin: 0;
  }
`;

const StyledForm = styled.form`
  background: ${themeCssVariables.background.secondary};
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: ${themeCssVariables.spacing[4]};

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledSelectField = styled.div`
  min-width: 0;
`;

const StyledLabel = styled.label`
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

const StyledWide = styled.div`
  grid-column: 1 / -1;
`;

const StyledFooter = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  grid-column: 1 / -1;
  justify-content: flex-end;
`;

const StyledHistory = styled.div`
  height: 220px;
  min-height: 160px;
`;

const StyledAlert = styled.div`
  color: ${themeCssVariables.font.color.danger};
  grid-column: 1 / -1;
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  justify-content: flex-end;
`;

const todayInCasablanca = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Casablanca' });

const methods = [
  ['BANK_TRANSFER', 'Virement'],
  ['CHECK', 'Chèque'],
  ['CASH', 'Espèces'],
  ['CARD', 'Carte'],
  ['DIRECT_DEBIT', 'Prélèvement'],
  ['OTHER', 'Autre'],
] as const;

const statusAppearance = {
  READY: { label: 'Prêt', tone: 'warning' },
  EXECUTED: { label: 'Payé', tone: 'success' },
  CANCELLED: { label: 'Annulé', tone: 'neutral' },
} as const;

export const ErpSupplierPaymentPreparationPanel = ({
  invoice,
  canManage,
  onChanged,
}: {
  invoice: ErpSupplierInvoiceDetail;
  canManage: boolean;
  onChanged: () => void;
}) => {
  const { client } = useErpMarocContext();
  const [items, setItems] = useState<ErpSupplierPaymentPreparation[]>([]);
  const [state, setState] = useState<ErpOperationalTableState>('loading');
  const [generation, setGeneration] = useState(0);
  const [readyAmountCents, setReadyAmountCents] = useState(0);
  const [executedAmountCents, setExecutedAmountCents] = useState(0);
  const [cancelledAmountCents, setCancelledAmountCents] = useState(0);
  const [remainingAmountCents, setRemainingAmountCents] = useState(0);
  const [amount, setAmount] = useState('');
  const [plannedPaymentDate, setPlannedPaymentDate] =
    useState(todayInCasablanca);
  const [method, setMethod] =
    useState<(typeof methods)[number][0]>('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [cancellationId, setCancellationId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [executionDate, setExecutionDate] = useState(todayInCasablanca);
  const [executionAccountCode, setExecutionAccountCode] = useState('5141');
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    client
      .request({
        method: 'GET',
        path: `/supplier-invoices/${invoice.id}/payment-preparations`,
        schema: erpSupplierPaymentPreparationListSchema,
        signal: abortController.signal,
      })
      .then((result) => {
        if (abortController.signal.aborted) return;
        setItems(result.items);
        setReadyAmountCents(result.readyAmountCents);
        setExecutedAmountCents(result.executedAmountCents);
        setCancelledAmountCents(result.cancelledAmountCents);
        setRemainingAmountCents(result.remainingToPrepareCents);
        setState(result.items.length === 0 ? 'empty' : 'ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client, generation, invoice.id]);

  const columns = useMemo<
    ErpOperationalTableColumn<ErpSupplierPaymentPreparation>[]
  >(
    () => [
      {
        key: 'date',
        header: 'Date',
        width: '120px',
        render: (item) =>
          formatPurchaseOrderDate(item.paymentDate ?? item.plannedPaymentDate),
      },
      {
        key: 'method',
        header: 'Mode',
        width: '130px',
        render: (item) =>
          methods.find(([value]) => value === item.method)?.[1] ?? item.method,
      },
      {
        key: 'reference',
        header: 'Référence',
        width: '180px',
        render: (item) => item.reference ?? '—',
      },
      {
        key: 'amount',
        header: 'Montant',
        width: '140px',
        align: 'right',
        render: (item) => formatMadCents(item.amountCents),
      },
      {
        key: 'status',
        header: 'Statut',
        width: '110px',
        render: (item) => {
          const appearance = statusAppearance[item.status];
          return (
            <ErpStatusBadge label={appearance.label} tone={appearance.tone} />
          );
        },
      },
      {
        key: 'entry',
        header: 'Écriture',
        width: '120px',
        render: (item) =>
          item.accountingEntry === null || item.accountingEntry === undefined
            ? '—'
            : `${item.accountingEntry.journal.code} · ${item.accountingEntry.status}`,
      },
      {
        key: 'action',
        header: '',
        width: '190px',
        align: 'right',
        render: (item) =>
          item.status === 'READY' && canManage ? (
            <StyledActions>
              <Button
                title="Exécuter"
                ariaLabel="Exécuter le paiement fournisseur"
                accent="blue"
                onClick={() => {
                  setExecutionId(item.id);
                  setExecutionDate(todayInCasablanca());
                  setExecutionAccountCode(
                    item.method === 'CASH' ? '5161' : '5141',
                  );
                  setCancellationId(null);
                }}
              />
              <Button
                title="Annuler"
                ariaLabel="Annuler la préparation de paiement"
                variant="secondary"
                accent="danger"
                onClick={() => {
                  setCancellationId(item.id);
                  setCancellationReason('');
                  setExecutionId(null);
                }}
              />
            </StyledActions>
          ) : null,
      },
    ],
    [canManage],
  );

  const createPreparation = async () => {
    if (!canManage || isMutating) return;
    setError(null);
    let amountCents: number;
    try {
      amountCents = parseMadDecimalToCents(amount);
    } catch {
      setError('Le montant doit être un montant MAD positif valide.');
      return;
    }
    if (amountCents <= 0 || amountCents > remainingAmountCents) {
      setError('Le montant dépasse le solde restant à préparer.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plannedPaymentDate)) {
      setError('La date prévue est invalide.');
      return;
    }
    setIsMutating(true);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/supplier-invoices/${invoice.id}/payment-preparations`,
          schema: erpSupplierPaymentPreparationSchema,
          body: {
            amountCents,
            plannedPaymentDate,
            method,
            reference: reference.trim() || null,
            notes: notes.trim() || null,
          },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setAmount('');
      setReference('');
      setNotes('');
      setGeneration((value) => value + 1);
      onChanged();
    } catch (caught) {
      setError(
        caught instanceof ErpMarocError && caught.statusCode === 409
          ? 'Le montant préparé dépasse le solde ou la facture a changé.'
          : "La préparation de paiement n'a pas pu être enregistrée.",
      );
    } finally {
      setIsMutating(false);
    }
  };

  const cancelPreparation = async () => {
    if (
      cancellationId === null ||
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
          path: `/supplier-payment-preparations/${cancellationId}/cancel`,
          schema: erpSupplierPaymentPreparationSchema,
          body: { reason: cancellationReason.trim() },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setCancellationId(null);
      setCancellationReason('');
      setGeneration((value) => value + 1);
      onChanged();
    } catch {
      setError("La préparation n'a pas pu être annulée.");
    } finally {
      setIsMutating(false);
    }
  };

  const executePreparation = async () => {
    if (executionId === null || isMutating) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(executionDate)) {
      setError('La date de paiement est invalide.');
      return;
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9.-]{0,31}$/.test(executionAccountCode)) {
      setError('Le compte de trésorerie est invalide.');
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/supplier-payment-preparations/${executionId}/execute`,
          schema: erpSupplierPaymentPreparationSchema,
          body: {
            paymentDate: executionDate,
            treasuryAccountCode: executionAccountCode,
          },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setExecutionId(null);
      setGeneration((value) => value + 1);
      onChanged();
    } catch (caught) {
      setError(
        caught instanceof ErpMarocError && caught.statusCode === 409
          ? "Le paiement a déjà été traité ou l'état a changé."
          : "Le paiement fournisseur n'a pas pu être exécuté.",
      );
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <StyledPanel>
      <StyledHeader>
        <h3>Préparation du paiement fournisseur</h3>
        <StyledTotals>
          <div>
            <dt>Prêt</dt>
            <dd>{formatMadCents(readyAmountCents)}</dd>
          </div>
          <div>
            <dt>Payé</dt>
            <dd>{formatMadCents(executedAmountCents)}</dd>
          </div>
          <div>
            <dt>Annulé</dt>
            <dd>{formatMadCents(cancelledAmountCents)}</dd>
          </div>
          <div>
            <dt>Reste</dt>
            <dd>{formatMadCents(remainingAmountCents)}</dd>
          </div>
        </StyledTotals>
      </StyledHeader>
      {canManage && remainingAmountCents > 0 ? (
        <StyledForm
          onSubmit={(event) => {
            event.preventDefault();
            void createPreparation();
          }}
        >
          {error === null ? null : (
            <StyledAlert role="alert">{error}</StyledAlert>
          )}
          <TextInput
            label="Montant (MAD)"
            value={amount}
            inputMode="decimal"
            disabled={isMutating}
            fullWidth
            onChange={setAmount}
          />
          <TextInput
            label="Date prévue"
            type="date"
            value={plannedPaymentDate}
            disabled={isMutating}
            fullWidth
            onChange={setPlannedPaymentDate}
          />
          <StyledSelectField>
            <StyledLabel htmlFor="supplier-payment-method">Mode</StyledLabel>
            <StyledSelect
              id="supplier-payment-method"
              value={method}
              disabled={isMutating}
              onChange={(event) =>
                setMethod(event.target.value as (typeof methods)[number][0])
              }
            >
              {methods.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </StyledSelect>
          </StyledSelectField>
          <TextInput
            label="Référence"
            value={reference}
            disabled={isMutating}
            fullWidth
            onChange={setReference}
          />
          <StyledWide>
            <TextArea
              textAreaId="supplier-payment-notes"
              label="Notes"
              value={notes}
              disabled={isMutating}
              minRows={2}
              onChange={setNotes}
            />
          </StyledWide>
          <StyledFooter>
            <Button
              type="submit"
              title="Préparer"
              ariaLabel="Préparer le paiement fournisseur"
              accent="blue"
              disabled={isMutating}
              isLoading={isMutating}
            />
          </StyledFooter>
        </StyledForm>
      ) : error === null ? null : (
        <StyledAlert role="alert">{error}</StyledAlert>
      )}
      {cancellationId === null ? null : (
        <StyledForm
          onSubmit={(event) => {
            event.preventDefault();
            void cancelPreparation();
          }}
        >
          <StyledWide>
            <TextArea
              textAreaId="supplier-payment-cancellation-reason"
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
              onClick={() => setCancellationId(null)}
            />
            <Button
              type="submit"
              title="Confirmer l'annulation"
              ariaLabel="Confirmer l'annulation de la préparation"
              accent="danger"
              disabled={isMutating}
              isLoading={isMutating}
            />
          </StyledFooter>
        </StyledForm>
      )}
      {executionId === null ? null : (
        <StyledForm
          onSubmit={(event) => {
            event.preventDefault();
            void executePreparation();
          }}
        >
          {error === null ? null : (
            <StyledAlert role="alert">{error}</StyledAlert>
          )}
          <TextInput
            label="Date réelle du paiement"
            type="date"
            value={executionDate}
            disabled={isMutating}
            fullWidth
            onChange={setExecutionDate}
          />
          <TextInput
            label="Compte de trésorerie"
            value={executionAccountCode}
            disabled={isMutating}
            fullWidth
            onChange={setExecutionAccountCode}
          />
          <StyledFooter>
            <Button
              type="button"
              title="Fermer"
              ariaLabel="Fermer l'exécution du paiement"
              variant="secondary"
              disabled={isMutating}
              onClick={() => setExecutionId(null)}
            />
            <Button
              type="submit"
              title="Confirmer le paiement"
              ariaLabel="Confirmer le paiement fournisseur"
              accent="blue"
              disabled={isMutating}
              isLoading={isMutating}
            />
          </StyledFooter>
        </StyledForm>
      )}
      <StyledHistory>
        <ErpOperationalTable
          ariaLabel="Préparations de paiement fournisseur"
          columns={columns}
          rows={items}
          getRowKey={(item) => item.id}
          state={state}
          loadingLabel="Chargement des préparations"
          emptyLabel="Aucun paiement préparé"
          errorLabel="Impossible de charger les préparations"
          retryLabel="Réessayer"
          onRetry={() => setGeneration((value) => value + 1)}
        />
      </StyledHistory>
    </StyledPanel>
  );
};
