import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
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
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { formatCivilDate } from '@/erp-maroc/utils/civilDate';
import { TextArea } from '@/ui/input/components/TextArea';
import { TextInput } from '@/ui/input/components/TextInput';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  erpCustomerReturnEligibleLineListSchema,
  erpCustomerReturnListSchema,
  erpCustomerReturnSchema,
  type ErpCustomerReturn,
  type ErpCustomerReturnEligibleLine,
} from 'twenty-shared/erp-maroc';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUS_APPEARANCE: Record<
  ErpCustomerReturn['status'],
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'À valider', tone: 'warning' },
  VALIDATED: { label: 'Validé', tone: 'success' },
  CANCELLED: { label: 'Annulé', tone: 'danger' },
};

const todayInCasablanca = () =>
  new Date().toLocaleDateString('en-CA', {
    timeZone: 'Africa/Casablanca',
  });

const StyledActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const StyledForm = styled.form`
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledFormHeader = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;

  h2 {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.md};
    letter-spacing: 0;
    margin: 0;
  }
`;

const StyledFields = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: minmax(220px, 1fr) minmax(180px, 1fr) minmax(
      260px,
      2fr
    );

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledSelectField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  height: 32px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledLines = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledLine = styled.div`
  align-items: end;
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: minmax(0, 1fr) 180px;

  @media (max-width: 700px) {
    align-items: stretch;
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledLineLabel = styled.div`
  color: ${themeCssVariables.font.color.primary};
  min-width: 0;

  span {
    color: ${themeCssVariables.font.color.tertiary};
    display: block;
    font-size: ${themeCssVariables.font.size.sm};
    margin-top: ${themeCssVariables.spacing[1]};
  }
`;

const StyledFooter = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

const StyledAlert = styled.div<{ danger?: boolean }>`
  color: ${({ danger }) =>
    danger
      ? themeCssVariables.font.color.danger
      : themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledTable = styled.div`
  display: flex;
  flex: 1 0 320px;
  min-height: 320px;
`;

type PendingAction =
  | { kind: 'validate'; item: ErpCustomerReturn }
  | { kind: 'cancel'; item: ErpCustomerReturn }
  | null;

export const ErpCustomerReturnsPage = () => {
  const { client, context } = useErpMarocContext();
  const [searchParams] = useSearchParams();
  const invoiceIdValue = searchParams.get('invoiceId');
  const invoiceId =
    invoiceIdValue !== null && UUID_PATTERN.test(invoiceIdValue)
      ? invoiceIdValue
      : null;
  const [returns, setReturns] = useState<ErpCustomerReturn[]>([]);
  const [eligibleLines, setEligibleLines] = useState<
    ErpCustomerReturnEligibleLine[]
  >([]);
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [eligibleState, setEligibleState] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >(invoiceId === null ? 'idle' : 'loading');
  const [generation, setGeneration] = useState(0);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState('');
  const [returnDate, setReturnDate] = useState(todayInCasablanca);
  const [reason, setReason] = useState('Retour de marchandises');
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);

  const canManage =
    context?.capabilities.manageInventory === true &&
    context.capabilities.manageCreditNotes === true;

  useEffect(() => {
    const abortController = new AbortController();
    setListState('loading');
    client
      .request({
        method: 'GET',
        path: '/customer-returns',
        schema: erpCustomerReturnListSchema,
        signal: abortController.signal,
      })
      .then((result) => {
        if (abortController.signal.aborted) return;
        setReturns(result);
        setListState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setListState('error');
      });
    return () => abortController.abort();
  }, [client, generation]);

  useEffect(() => {
    if (invoiceId === null) {
      setEligibleLines([]);
      setEligibleState('idle');
      return;
    }
    const abortController = new AbortController();
    setEligibleState('loading');
    client
      .request({
        method: 'GET',
        path: `/customer-returns/eligible-lines?invoiceId=${encodeURIComponent(invoiceId)}`,
        schema: erpCustomerReturnEligibleLineListSchema,
        signal: abortController.signal,
      })
      .then((result) => {
        if (abortController.signal.aborted) return;
        setEligibleLines(result);
        setSelectedDeliveryId((current) =>
          result.some((line) => line.deliveryNoteId === current)
            ? current
            : (result[0]?.deliveryNoteId ?? ''),
        );
        setQuantities({});
        setEligibleState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setEligibleState('error');
      });
    return () => abortController.abort();
  }, [client, generation, invoiceId]);

  const deliveries = useMemo(
    () =>
      Array.from(
        new Map(
          eligibleLines.map((line) => [
            line.deliveryNoteId,
            {
              id: line.deliveryNoteId,
              number: line.deliveryNoteNumber,
              warehouse: line.warehouse,
            },
          ]),
        ).values(),
      ),
    [eligibleLines],
  );
  const selectedLines = useMemo(
    () =>
      eligibleLines.filter(
        (line) => line.deliveryNoteId === selectedDeliveryId,
      ),
    [eligibleLines, selectedDeliveryId],
  );

  const submitReturn = async () => {
    if (invoiceId === null || !canManage || isSaving) return;
    const lines = selectedLines.flatMap((line) => {
      const value = quantities[line.salesInvoiceAllocationId]?.trim() ?? '';
      const quantity = Number(value);
      return value !== '' && Number.isFinite(quantity) && quantity > 0
        ? [
            {
              salesInvoiceAllocationId: line.salesInvoiceAllocationId,
              quantity,
            },
          ]
        : [];
    });
    if (
      reason.trim() === '' ||
      selectedDeliveryId === '' ||
      lines.length === 0
    ) {
      setError('Livraison, motif et au moins une quantité sont obligatoires.');
      return;
    }
    const exceedsAvailable = lines.some((line) => {
      const source = selectedLines.find(
        (candidate) =>
          candidate.salesInvoiceAllocationId === line.salesInvoiceAllocationId,
      );
      return (
        source === undefined || line.quantity > source.quantityAvailable + 1e-9
      );
    });
    if (exceedsAvailable) {
      setError('Une quantité dépasse la quantité encore retournable.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(returnDate)) {
      setError('La date de retour est obligatoire.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/customer-returns',
          schema: erpCustomerReturnSchema,
          body: {
            sourceInvoiceId: invoiceId,
            deliveryNoteId: selectedDeliveryId,
            returnDate,
            reason: reason.trim(),
            notes: notes.trim() || null,
            lines,
          },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setNotes('');
      setQuantities({});
      setGeneration((value) => value + 1);
    } catch (caught) {
      setError(
        caught instanceof ErpMarocError && caught.statusCode === 409
          ? 'Les quantités disponibles ont changé. Actualisez puis réessayez.'
          : "Le retour n'a pas pu être enregistré.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const executePendingAction = async () => {
    if (pendingAction === null || isSaving) return;
    const action = pendingAction;
    setIsSaving(true);
    setError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/customer-returns/${action.item.id}/${action.kind}`,
          schema: erpCustomerReturnSchema,
          body:
            action.kind === 'cancel'
              ? { reason: 'Annulation manuelle depuis Twenty' }
              : undefined,
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setPendingAction(null);
      setGeneration((value) => value + 1);
    } catch {
      setPendingAction(null);
      setError(
        action.kind === 'validate'
          ? 'La validation a échoué. Les stocks et avoirs sont restés inchangés.'
          : "L'annulation a échoué.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const columns = useMemo<ErpOperationalTableColumn<ErpCustomerReturn>[]>(
    () => [
      {
        key: 'number',
        header: 'Retour',
        width: '160px',
        render: (row) => row.number,
      },
      {
        key: 'date',
        header: 'Date',
        width: '120px',
        render: (row) => formatCivilDate(row.returnDate),
      },
      {
        key: 'customer',
        header: 'Client',
        width: '220px',
        render: (row) => row.customer.name,
      },
      {
        key: 'invoice',
        header: 'Facture source',
        width: '170px',
        render: (row) => (
          <Link to={`${erpMarocPaths.invoices}/${row.sourceInvoice.id}`}>
            {row.sourceInvoice.number ?? 'Facture'}
          </Link>
        ),
      },
      {
        key: 'delivery',
        header: 'Livraison / dépôt',
        width: '240px',
        render: (row) => `${row.deliveryNote.number} · ${row.warehouse.code}`,
      },
      {
        key: 'quantity',
        header: 'Quantité',
        width: '120px',
        align: 'right',
        render: (row) =>
          row.lines.reduce((sum, line) => sum + line.quantity, 0),
      },
      {
        key: 'status',
        header: 'Statut',
        width: '140px',
        render: (row) => {
          const appearance = STATUS_APPEARANCE[row.status];
          return (
            <ErpStatusBadge label={appearance.label} tone={appearance.tone} />
          );
        },
      },
      {
        key: 'creditNote',
        header: 'Avoir généré',
        width: '170px',
        render: (row) =>
          row.creditNote === null ? (
            'Non généré'
          ) : (
            <Link to={`${erpMarocPaths.creditNotes}/${row.creditNote.id}`}>
              {row.creditNote.number ?? 'Brouillon'}
            </Link>
          ),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '220px',
        render: (row) =>
          row.status === 'DRAFT' && canManage ? (
            <StyledActions>
              <Button
                title="Valider"
                ariaLabel={`Valider ${row.number}`}
                accent="blue"
                disabled={isSaving}
                onClick={() =>
                  setPendingAction({ kind: 'validate', item: row })
                }
              />
              <Button
                title="Annuler"
                ariaLabel={`Annuler ${row.number}`}
                variant="secondary"
                disabled={isSaving}
                onClick={() => setPendingAction({ kind: 'cancel', item: row })}
              />
            </StyledActions>
          ) : (
            '—'
          ),
      },
    ],
    [canManage, isSaving],
  );

  return (
    <ErpPageShell
      title="Retours clients"
      description="Contrôle humain, remise en stock et génération de l'avoir"
      actions={
        invoiceId === null ? undefined : (
          <Button
            title="Fermer la saisie"
            ariaLabel="Fermer la saisie du retour"
            variant="secondary"
            to={erpMarocPaths.customerReturns}
          />
        )
      }
    >
      <StyledContent>
        {invoiceId !== null ? (
          <StyledForm
            onSubmit={(event) => {
              event.preventDefault();
              void submitReturn();
            }}
          >
            <StyledFormHeader>
              <h2>Nouveau retour depuis la facture</h2>
            </StyledFormHeader>
            {eligibleState === 'loading' ? (
              <StyledAlert>Chargement des lignes livrées…</StyledAlert>
            ) : null}
            {eligibleState === 'error' ? (
              <StyledAlert danger>
                Impossible de charger les lignes retournables.
              </StyledAlert>
            ) : null}
            {eligibleState === 'ready' && eligibleLines.length === 0 ? (
              <StyledAlert>
                Aucune quantité physique ne peut encore être retournée.
              </StyledAlert>
            ) : null}
            {error === null ? null : (
              <StyledAlert danger role="alert">
                {error}
              </StyledAlert>
            )}
            {eligibleState === 'ready' && eligibleLines.length > 0 ? (
              <>
                <StyledFields>
                  <StyledSelectField>
                    Livraison et dépôt
                    <StyledSelect
                      value={selectedDeliveryId}
                      disabled={isSaving}
                      onChange={(event) => {
                        setSelectedDeliveryId(event.target.value);
                        setQuantities({});
                      }}
                    >
                      {deliveries.map((delivery) => (
                        <option key={delivery.id} value={delivery.id}>
                          {delivery.number} · {delivery.warehouse.name}
                        </option>
                      ))}
                    </StyledSelect>
                  </StyledSelectField>
                  <TextInput
                    label="Date du retour"
                    type="date"
                    value={returnDate}
                    disabled={isSaving}
                    fullWidth
                    onChange={setReturnDate}
                  />
                  <TextInput
                    label="Motif"
                    value={reason}
                    disabled={isSaving}
                    fullWidth
                    onChange={setReason}
                  />
                </StyledFields>
                <TextArea
                  textAreaId="customer-return-notes"
                  label="Notes"
                  value={notes}
                  disabled={isSaving}
                  minRows={2}
                  onChange={setNotes}
                />
                <StyledLines>
                  {selectedLines.map((line) => (
                    <StyledLine key={line.salesInvoiceAllocationId}>
                      <StyledLineLabel>
                        {line.product.code} · {line.description}
                        <span>
                          Maximum {line.quantityAvailable} {line.unit ?? ''} ·
                          déjà retourné {line.quantityReturned}
                        </span>
                      </StyledLineLabel>
                      <TextInput
                        label="Quantité retournée"
                        type="number"
                        min="0"
                        max={String(line.quantityAvailable)}
                        step="any"
                        value={quantities[line.salesInvoiceAllocationId] ?? ''}
                        disabled={isSaving}
                        fullWidth
                        onChange={(value) =>
                          setQuantities((current) => ({
                            ...current,
                            [line.salesInvoiceAllocationId]: value,
                          }))
                        }
                      />
                    </StyledLine>
                  ))}
                </StyledLines>
                <StyledFooter>
                  <Button
                    type="submit"
                    title="Créer le brouillon"
                    ariaLabel="Créer le brouillon de retour client"
                    accent="blue"
                    disabled={!canManage || isSaving}
                    isLoading={isSaving}
                  />
                </StyledFooter>
              </>
            ) : null}
          </StyledForm>
        ) : null}
        {invoiceId === null && error !== null ? (
          <StyledForm>
            <StyledAlert danger role="alert">
              {error}
            </StyledAlert>
          </StyledForm>
        ) : null}
        <StyledTable>
          <ErpOperationalTable
            ariaLabel="Retours clients"
            columns={columns}
            rows={returns}
            getRowKey={(row) => row.id}
            state={listState}
            loadingLabel="Chargement des retours"
            emptyLabel="Aucun retour client enregistré"
            errorLabel="Impossible de charger les retours"
            retryLabel="Réessayer"
            onRetry={() => setGeneration((value) => value + 1)}
          />
        </StyledTable>
      </StyledContent>
      <ErpConfirmDialog
        isOpen={pendingAction !== null}
        title={
          pendingAction?.kind === 'validate'
            ? 'Valider le retour'
            : 'Annuler le retour'
        }
        message={
          pendingAction?.kind === 'validate'
            ? "Cette action remet les articles en stock et crée l'avoir brouillon associé."
            : 'Ce brouillon sera annulé sans modifier le stock.'
        }
        confirmLabel={
          pendingAction?.kind === 'validate' ? 'Valider' : 'Annuler le retour'
        }
        destructive={pendingAction?.kind === 'cancel'}
        isConfirming={isSaving}
        onCancel={() => {
          if (!isSaving) setPendingAction(null);
        }}
        onConfirm={() => void executePendingAction()}
      />
    </ErpPageShell>
  );
};
