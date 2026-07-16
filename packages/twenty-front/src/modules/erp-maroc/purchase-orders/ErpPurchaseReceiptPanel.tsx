import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
  type ErpOperationalTableState,
} from '@/erp-maroc/components/ErpOperationalTable';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatPurchaseOrderDate } from '@/erp-maroc/purchase-orders/purchaseOrderUi';
import { TextArea } from '@/ui/input/components/TextArea';
import { TextInput } from '@/ui/input/components/TextInput';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import {
  erpPurchaseReceiptListSchema,
  erpPurchaseReceiptSchema,
  type ErpPurchaseOrder,
  type ErpPurchaseReceipt,
} from 'twenty-shared/erp-maroc';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledSectionTitle = styled.h2`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  margin: 0;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledForm = styled.form`
  background: ${themeCssVariables.background.secondary};
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledFormHeader = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;

  strong {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.md};
  }
`;

const StyledFields = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: minmax(180px, 1fr) minmax(240px, 2fr);

  @media (max-width: 768px) {
    grid-template-columns: minmax(0, 1fr);
  }
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
  grid-template-columns: minmax(0, 1fr) 160px;

  @media (max-width: 600px) {
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

const StyledFormFooter = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

const StyledAlert = styled.div`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledHistory = styled.div`
  height: 220px;
  min-height: 160px;
`;

const getTodayInCasablanca = () =>
  new Date().toLocaleDateString('en-CA', {
    timeZone: 'Africa/Casablanca',
  });

export const ErpPurchaseReceiptPanel = ({
  order,
  isOpen,
  disabled,
  onClose,
  onSaved,
}: {
  order: ErpPurchaseOrder;
  isOpen: boolean;
  disabled: boolean;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const { client } = useErpMarocContext();
  const [receipts, setReceipts] = useState<ErpPurchaseReceipt[]>([]);
  const [historyState, setHistoryState] =
    useState<ErpOperationalTableState>('loading');
  const [historyGeneration, setHistoryGeneration] = useState(0);
  const [receiptDate, setReceiptDate] = useState(getTodayInCasablanca);
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remainingLines = useMemo(
    () =>
      order.lines
        .map((line) => ({
          ...line,
          remaining: line.quantity - line.quantityReceived,
        }))
        .filter((line) => line.remaining > 1e-9),
    [order.lines],
  );

  useEffect(() => {
    if (!isOpen) return;
    setReceiptDate(getTodayInCasablanca());
    setNotes('');
    setError(null);
    setQuantities(
      Object.fromEntries(
        remainingLines.map((line) => [line.id, String(line.remaining)]),
      ),
    );
  }, [isOpen, remainingLines]);

  useEffect(() => {
    const abortController = new AbortController();
    setHistoryState('loading');
    client
      .request({
        method: 'GET',
        path: `/purchase-orders/${order.id}/receipts`,
        schema: erpPurchaseReceiptListSchema,
        signal: abortController.signal,
      })
      .then((result) => {
        if (abortController.signal.aborted) return;
        setReceipts(result);
        setHistoryState(result.length === 0 ? 'empty' : 'ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setHistoryState('error');
      });

    return () => abortController.abort();
  }, [client, historyGeneration, order.id]);

  const historyColumns = useMemo<
    ErpOperationalTableColumn<ErpPurchaseReceipt>[]
  >(
    () => [
      {
        key: 'number',
        header: 'Réception',
        width: '170px',
        render: (receipt) => receipt.number,
      },
      {
        key: 'date',
        header: 'Date',
        width: '130px',
        render: (receipt) => formatPurchaseOrderDate(receipt.receiptDate),
      },
      {
        key: 'lines',
        header: 'Quantités reçues',
        width: '360px',
        render: (receipt) =>
          receipt.lines
            .map((line) =>
              `${line.purchaseOrderLine.description}: ${line.quantity} ${line.purchaseOrderLine.unit ?? ''}`.trim(),
            )
            .join(', '),
      },
      {
        key: 'notes',
        header: 'Notes',
        width: '260px',
        render: (receipt) => receipt.notes ?? 'Aucune note',
      },
    ],
    [],
  );

  const submitReceipt = async () => {
    if (disabled || isSaving) return;
    setError(null);

    const lines = remainingLines.flatMap((line) => {
      const value = quantities[line.id]?.trim() ?? '';
      if (value === '') return [];
      const quantity = Number(value);
      return Number.isFinite(quantity) && quantity > 0
        ? [{ purchaseOrderLineId: line.id, quantity }]
        : [];
    });
    if (lines.length === 0) {
      setError('Renseignez au moins une quantité positive.');
      return;
    }
    const exceedsRemaining = lines.some((line) => {
      const orderLine = remainingLines.find(
        (candidate) => candidate.id === line.purchaseOrderLineId,
      );
      return (
        orderLine === undefined || line.quantity > orderLine.remaining + 1e-9
      );
    });
    if (exceedsRemaining) {
      setError('Une quantité dépasse le reliquat à réceptionner.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(receiptDate)) {
      setError('La date de réception est obligatoire.');
      return;
    }

    setIsSaving(true);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/purchase-orders/${order.id}/receipts`,
          schema: erpPurchaseReceiptSchema,
          body: {
            receiptDate,
            notes: notes.trim() || null,
            lines,
          },
        },
        { idempotency: 'forbidden' },
      );
      await intent.execute();
      setHistoryGeneration((value) => value + 1);
      onClose();
      onSaved();
    } catch (caught) {
      setError(
        caught instanceof ErpMarocError && caught.statusCode === 409
          ? 'Le bon a changé. Actualisez avant de réessayer.'
          : "La réception n'a pas pu être enregistrée.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {isOpen ? (
        <StyledForm
          onSubmit={(event) => {
            event.preventDefault();
            void submitReceipt();
          }}
        >
          <StyledFormHeader>
            <strong>Nouvelle réception fournisseur</strong>
            <Button
              type="button"
              title="Fermer"
              ariaLabel="Fermer la réception"
              variant="secondary"
              disabled={isSaving}
              onClick={onClose}
            />
          </StyledFormHeader>
          {error === null ? null : (
            <StyledAlert role="alert">{error}</StyledAlert>
          )}
          <StyledFields>
            <TextInput
              label="Date de réception"
              type="date"
              min={order.issueDate}
              value={receiptDate}
              disabled={isSaving}
              fullWidth
              onChange={setReceiptDate}
            />
            <TextArea
              textAreaId="purchase-receipt-notes"
              label="Notes"
              value={notes}
              disabled={isSaving}
              minRows={2}
              onChange={setNotes}
            />
          </StyledFields>
          <StyledLines>
            {remainingLines.map((line) => (
              <StyledLine key={line.id}>
                <StyledLineLabel>
                  {line.description}
                  <span>
                    Reste {line.remaining} {line.unit ?? ''}
                  </span>
                </StyledLineLabel>
                <TextInput
                  label="Quantité reçue"
                  type="number"
                  min="0"
                  max={String(line.remaining)}
                  step="any"
                  value={quantities[line.id] ?? ''}
                  disabled={isSaving}
                  fullWidth
                  onChange={(value) =>
                    setQuantities((current) => ({
                      ...current,
                      [line.id]: value,
                    }))
                  }
                />
              </StyledLine>
            ))}
          </StyledLines>
          <StyledFormFooter>
            <Button
              type="submit"
              title="Enregistrer la réception"
              ariaLabel="Enregistrer la réception fournisseur"
              variant="primary"
              accent="blue"
              disabled={disabled || isSaving}
              isLoading={isSaving}
            />
          </StyledFormFooter>
        </StyledForm>
      ) : null}
      <StyledSectionTitle>Historique des réceptions</StyledSectionTitle>
      <StyledHistory>
        <ErpOperationalTable
          ariaLabel="Réceptions fournisseur"
          columns={historyColumns}
          rows={receipts}
          getRowKey={(receipt) => receipt.id}
          state={historyState}
          loadingLabel="Chargement des réceptions"
          emptyLabel="Aucune réception enregistrée"
          errorLabel="Impossible de charger les réceptions"
          retryLabel="Réessayer"
          onRetry={() => setHistoryGeneration((value) => value + 1)}
        />
      </StyledHistory>
    </>
  );
};
