import { createIdempotencyKey } from '@/erp-maroc/api/createIdempotencyKey';
import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
  type ErpOperationalTableState,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatSalesOrderDate } from '@/erp-maroc/sales-orders/salesOrderUi';
import { TextArea } from '@/ui/input/components/TextArea';
import { TextInput } from '@/ui/input/components/TextInput';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import {
  erpDeliveryNoteListSchema,
  erpDeliveryNoteSchema,
  erpWarehouseListSchema,
  type ErpDeliveryNote,
  type ErpSalesOrder,
  type ErpWarehouse,
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
`;

const StyledFields = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) minmax(
      240px,
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
  grid-template-columns: minmax(0, 1fr) 160px;
`;

const StyledLineLabel = styled.div`
  color: ${themeCssVariables.font.color.primary};

  span {
    color: ${themeCssVariables.font.color.tertiary};
    display: block;
    font-size: ${themeCssVariables.font.size.sm};
    margin-top: ${themeCssVariables.spacing[1]};
  }
`;

const StyledFormFooter = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

const StyledAlert = styled.div`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledHistory = styled.div`
  height: 240px;
  min-height: 180px;
`;

const getTodayInCasablanca = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Casablanca' });

export const ErpSalesDeliveryPanel = ({
  order,
  isOpen,
  disabled,
  onClose,
  onSaved,
}: {
  order: ErpSalesOrder;
  isOpen: boolean;
  disabled: boolean;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const { client } = useErpMarocContext();
  const [deliveries, setDeliveries] = useState<ErpDeliveryNote[]>([]);
  const [warehouses, setWarehouses] = useState<ErpWarehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(getTodayInCasablanca);
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [historyState, setHistoryState] =
    useState<ErpOperationalTableState>('loading');
  const [historyGeneration, setHistoryGeneration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remainingLines = useMemo(
    () =>
      order.lines
        .map((line) => ({
          ...line,
          remaining: line.quantity - line.quantityDelivered,
        }))
        .filter((line) => line.remaining > 1e-9),
    [order.lines],
  );

  useEffect(() => {
    if (!isOpen) return;
    setDeliveryDate(getTodayInCasablanca());
    setNotes('');
    setError(null);
    setQuantities(
      Object.fromEntries(
        remainingLines.map((line) => [line.id, String(line.remaining)]),
      ),
    );
  }, [isOpen, remainingLines]);

  useEffect(() => {
    if (!isOpen) return;
    const abortController = new AbortController();
    client
      .request({
        method: 'GET',
        path: '/warehouses',
        schema: erpWarehouseListSchema,
        signal: abortController.signal,
      })
      .then((result) => {
        if (abortController.signal.aborted) return;
        const active = result.filter((warehouse) => warehouse.isActive);
        setWarehouses(active);
        setWarehouseId(
          active.find((warehouse) => warehouse.isDefault)?.id ??
            active[0]?.id ??
            '',
        );
      })
      .catch(() => {
        if (!abortController.signal.aborted)
          setError('Impossible de charger les dépôts.');
      });
    return () => abortController.abort();
  }, [client, isOpen]);

  useEffect(() => {
    const abortController = new AbortController();
    setHistoryState('loading');
    client
      .request({
        method: 'GET',
        path: `/sales-orders/${order.id}/deliveries`,
        schema: erpDeliveryNoteListSchema,
        signal: abortController.signal,
      })
      .then((result) => {
        if (abortController.signal.aborted) return;
        setDeliveries(result);
        setHistoryState(result.length === 0 ? 'empty' : 'ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setHistoryState('error');
      });
    return () => abortController.abort();
  }, [client, historyGeneration, order.id]);

  const historyColumns = useMemo<ErpOperationalTableColumn<ErpDeliveryNote>[]>(
    () => [
      {
        key: 'number',
        header: 'Bon de livraison',
        width: '180px',
        render: (delivery) => delivery.number,
      },
      {
        key: 'date',
        header: 'Date',
        width: '130px',
        render: (delivery) => formatSalesOrderDate(delivery.deliveryDate),
      },
      {
        key: 'warehouse',
        header: 'Dépôt',
        width: '180px',
        render: (delivery) => delivery.warehouse.name,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '120px',
        render: (delivery) => (
          <ErpStatusBadge
            label={delivery.status === 'POSTED' ? 'Comptabilisé' : 'Annulé'}
            tone={delivery.status === 'POSTED' ? 'success' : 'danger'}
          />
        ),
      },
      {
        key: 'lines',
        header: 'Quantités livrées',
        width: '360px',
        render: (delivery) =>
          delivery.lines
            .map((line) =>
              `${line.salesOrderLine.description}: ${line.quantity} ${line.salesOrderLine.unit ?? ''}`.trim(),
            )
            .join(', '),
      },
    ],
    [],
  );

  const submitDelivery = async () => {
    if (disabled || isSaving) return;
    setError(null);
    if (warehouseId === '') {
      setError('Sélectionnez un dépôt actif.');
      return;
    }
    const lines = remainingLines.flatMap((line, position) => {
      const quantity = Number(quantities[line.id]?.trim() ?? '');
      return Number.isFinite(quantity) && quantity > 0
        ? [{ salesOrderLineId: line.id, quantity, position }]
        : [];
    });
    if (lines.length === 0) {
      setError('Renseignez au moins une quantité positive.');
      return;
    }
    if (
      lines.some((line) => {
        const orderLine = remainingLines.find(
          (candidate) => candidate.id === line.salesOrderLineId,
        );
        return orderLine === undefined || line.quantity > orderLine.remaining;
      })
    ) {
      setError('Une quantité dépasse le reliquat à livrer.');
      return;
    }

    setIsSaving(true);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/sales-orders/${order.id}/deliveries`,
          schema: erpDeliveryNoteSchema,
          body: {
            commandId: createIdempotencyKey(),
            warehouseId,
            deliveryDate,
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
          ? 'La commande a changé. Actualisez avant de réessayer.'
          : "La livraison n'a pas pu être enregistrée. Vérifiez aussi le stock disponible.",
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
            void submitDelivery();
          }}
        >
          <StyledFormHeader>
            <strong>Nouvelle livraison client</strong>
            <Button
              type="button"
              title="Fermer"
              ariaLabel="Fermer la livraison"
              variant="secondary"
              disabled={isSaving}
              onClick={onClose}
            />
          </StyledFormHeader>
          {error === null ? null : (
            <StyledAlert role="alert">{error}</StyledAlert>
          )}
          <StyledFields>
            <StyledSelectField>
              Dépôt de sortie
              <StyledSelect
                value={warehouseId}
                disabled={isSaving || warehouses.length === 0}
                onChange={(event) => setWarehouseId(event.target.value)}
              >
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} · {warehouse.name}
                  </option>
                ))}
              </StyledSelect>
            </StyledSelectField>
            <TextInput
              label="Date de livraison"
              type="date"
              min={order.issueDate}
              value={deliveryDate}
              disabled={isSaving}
              fullWidth
              onChange={setDeliveryDate}
            />
            <TextArea
              textAreaId="sales-delivery-notes"
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
                  label="Quantité livrée"
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
              title="Valider la sortie de stock"
              ariaLabel="Enregistrer la livraison et la sortie de stock"
              variant="primary"
              accent="blue"
              disabled={disabled || isSaving}
              isLoading={isSaving}
            />
          </StyledFormFooter>
        </StyledForm>
      ) : null}
      <StyledSectionTitle>Historique des livraisons</StyledSectionTitle>
      <StyledHistory>
        <ErpOperationalTable
          ariaLabel="Livraisons clients"
          columns={historyColumns}
          rows={deliveries}
          getRowKey={(delivery) => delivery.id}
          state={historyState}
          loadingLabel="Chargement des livraisons"
          emptyLabel="Aucune livraison enregistrée"
          errorLabel="Impossible de charger les livraisons"
          retryLabel="Réessayer"
          onRetry={() => setHistoryGeneration((value) => value + 1)}
        />
      </StyledHistory>
    </>
  );
};
