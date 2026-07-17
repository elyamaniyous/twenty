import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { TextInput } from '@/ui/input/components/TextInput';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import {
  erpSalesOrderSchema,
  erpStockLevelListSchema,
  erpWarehouseListSchema,
  type ErpSalesOrder,
  type ErpSalesOrderAllocation,
  type ErpSalesOrderLine,
  type ErpStockLevel,
  type ErpWarehouse,
} from 'twenty-shared/erp-maroc';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export type ErpSalesStockAction = 'reserve' | 'prepare';

type AllocationRow = {
  id: string;
  line: ErpSalesOrderLine;
  allocation: ErpSalesOrderAllocation;
};

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

const StyledSelectField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  max-width: 360px;
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

const StyledFooter = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

const StyledAlert = styled.div`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
`;

const sumAllocated = (line: ErpSalesOrderLine) =>
  line.allocations.reduce(
    (total, allocation) => total + allocation.quantityReserved,
    0,
  );

export const ErpSalesReservationPanel = ({
  order,
  mode,
  disabled,
  onClose,
  onSaved,
}: {
  order: ErpSalesOrder;
  mode: ErpSalesStockAction | null;
  disabled: boolean;
  onClose: () => void;
  onSaved: (order: ErpSalesOrder) => void;
}) => {
  const { client } = useErpMarocContext();
  const [warehouses, setWarehouses] = useState<ErpWarehouse[]>([]);
  const [levels, setLevels] = useState<ErpStockLevel[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stockLines = useMemo(
    () =>
      order.lines.filter(
        (line) =>
          line.product?.type === 'PRODUIT' &&
          line.quantity - line.quantityDelivered - sumAllocated(line) > 1e-9,
      ),
    [order.lines],
  );

  const allocationRows = useMemo<AllocationRow[]>(
    () =>
      order.lines.flatMap((line) =>
        line.allocations
          .filter(
            (allocation) =>
              allocation.quantityReserved > 1e-9 ||
              allocation.quantityPrepared > 1e-9,
          )
          .map((allocation) => ({
            id: allocation.id,
            line,
            allocation,
          })),
      ),
    [order.lines],
  );

  const preparationWarehouses = useMemo(
    () =>
      Array.from(
        new Map(
          allocationRows.map(({ allocation }) => [
            allocation.warehouse.id,
            allocation.warehouse,
          ]),
        ).values(),
      ),
    [allocationRows],
  );

  const preparationRows = useMemo(
    () =>
      allocationRows.filter(
        ({ allocation }) => allocation.warehouseId === warehouseId,
      ),
    [allocationRows, warehouseId],
  );

  useEffect(() => {
    if (mode !== 'reserve') return;
    const abortController = new AbortController();
    Promise.all([
      client.request({
        method: 'GET',
        path: '/warehouses',
        schema: erpWarehouseListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/inventory/levels',
        schema: erpStockLevelListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(([loadedWarehouses, loadedLevels]) => {
        if (abortController.signal.aborted) return;
        const active = loadedWarehouses.filter(
          (warehouse) => warehouse.isActive,
        );
        setWarehouses(active);
        setLevels(loadedLevels);
        setWarehouseId(
          active.find((warehouse) => warehouse.isDefault)?.id ??
            active[0]?.id ??
            '',
        );
      })
      .catch(() => {
        if (!abortController.signal.aborted) {
          setError('Impossible de charger la disponibilité des dépôts.');
        }
      });
    return () => abortController.abort();
  }, [client, mode]);

  useEffect(() => {
    if (mode !== 'prepare') return;
    const selected = preparationWarehouses[0]?.id ?? '';
    setWarehouseId(selected);
  }, [mode, preparationWarehouses]);

  useEffect(() => {
    if (mode !== 'prepare') return;
    setQuantities(
      Object.fromEntries(
        preparationRows.map(({ line, allocation }) => [
          line.id,
          String(allocation.quantityPrepared),
        ]),
      ),
    );
  }, [mode, preparationRows]);

  useEffect(() => {
    if (mode !== null) setError(null);
  }, [mode]);

  const allocationColumns = useMemo<ErpOperationalTableColumn<AllocationRow>[]>(
    () => [
      {
        key: 'line',
        header: 'Article',
        width: '300px',
        render: ({ line }) => line.description,
      },
      {
        key: 'warehouse',
        header: 'Dépôt',
        width: '220px',
        render: ({ allocation }) =>
          `${allocation.warehouse.code} · ${allocation.warehouse.name}`,
      },
      {
        key: 'reserved',
        header: 'Réservé',
        width: '130px',
        align: 'right',
        render: ({ line, allocation }) =>
          `${allocation.quantityReserved} ${line.unit ?? ''}`.trim(),
      },
      {
        key: 'prepared',
        header: 'Préparé',
        width: '130px',
        align: 'right',
        render: ({ line, allocation }) =>
          `${allocation.quantityPrepared} ${line.unit ?? ''}`.trim(),
      },
      {
        key: 'remaining',
        header: 'À préparer',
        width: '140px',
        align: 'right',
        render: ({ line, allocation }) =>
          `${allocation.quantityReserved - allocation.quantityPrepared} ${line.unit ?? ''}`.trim(),
      },
    ],
    [],
  );

  const availableFor = (line: ErpSalesOrderLine) =>
    levels.find(
      (level) =>
        level.warehouse.id === warehouseId &&
        level.product.id === line.productId,
    )?.availableQuantity ?? 0;

  const reserve = async () => {
    if (isSaving || disabled) return;
    if (stockLines.length > 0 && warehouseId === '') {
      setError('Sélectionnez un dépôt actif.');
      return;
    }
    const insufficient = stockLines.find(
      (line) =>
        availableFor(line) + 1e-9 <
        line.quantity - line.quantityDelivered - sumAllocated(line),
    );
    if (insufficient) {
      setError(
        `Stock disponible insuffisant pour ${insufficient.description}.`,
      );
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path:
            order.status === 'DRAFT'
              ? `/sales-orders/${order.id}/confirm`
              : `/sales-orders/${order.id}/reservations`,
          schema: erpSalesOrderSchema,
          body: stockLines.length > 0 ? { warehouseId } : {},
        },
        { idempotency: 'forbidden' },
      );
      onSaved(await intent.execute());
      onClose();
    } catch (caught) {
      setError(
        caught instanceof ErpMarocError && caught.statusCode === 409
          ? 'Le stock ou la commande a changé. Actualisez avant de réessayer.'
          : "La réservation n'a pas pu être enregistrée.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const prepare = async () => {
    if (isSaving || disabled || warehouseId === '') return;
    const lines = preparationRows.map(({ line, allocation }) => ({
      salesOrderLineId: line.id,
      quantityPrepared: Number(quantities[line.id]?.trim() ?? ''),
      maximum: allocation.quantityReserved,
    }));
    if (
      lines.some(
        (line) =>
          !Number.isFinite(line.quantityPrepared) ||
          line.quantityPrepared < 0 ||
          line.quantityPrepared > line.maximum + 1e-9,
      )
    ) {
      setError('Une quantité préparée dépasse la quantité réservée.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/sales-orders/${order.id}/preparation`,
          schema: erpSalesOrderSchema,
          body: {
            warehouseId,
            lines: lines.map(({ salesOrderLineId, quantityPrepared }) => ({
              salesOrderLineId,
              quantityPrepared,
            })),
          },
        },
        { idempotency: 'forbidden' },
      );
      onSaved(await intent.execute());
      onClose();
    } catch {
      setError(
        "La préparation n'a pas pu être enregistrée. Actualisez la commande.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <StyledSectionTitle>Réservation et préparation</StyledSectionTitle>
      {mode === null ? null : (
        <StyledForm
          onSubmit={(event) => {
            event.preventDefault();
            void (mode === 'reserve' ? reserve() : prepare());
          }}
        >
          <StyledFormHeader>
            <strong>
              {mode === 'reserve'
                ? 'Réserver le stock'
                : 'Préparer la commande'}
            </strong>
            <Button
              type="button"
              title="Fermer"
              ariaLabel="Fermer la préparation"
              variant="secondary"
              disabled={isSaving}
              onClick={onClose}
            />
          </StyledFormHeader>
          {error === null ? null : (
            <StyledAlert role="alert">{error}</StyledAlert>
          )}
          <StyledSelectField>
            Dépôt
            <StyledSelect
              value={warehouseId}
              disabled={isSaving}
              onChange={(event) => setWarehouseId(event.target.value)}
            >
              {(mode === 'reserve' ? warehouses : preparationWarehouses).map(
                (warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} · {warehouse.name}
                  </option>
                ),
              )}
            </StyledSelect>
          </StyledSelectField>
          {mode === 'reserve' ? (
            <StyledLines>
              {stockLines.map((line) => (
                <StyledLineLabel key={line.id}>
                  {line.description}
                  <span>
                    À réserver{' '}
                    {line.quantity -
                      line.quantityDelivered -
                      sumAllocated(line)}{' '}
                    {line.unit ?? ''} · Disponible {availableFor(line)}
                  </span>
                </StyledLineLabel>
              ))}
            </StyledLines>
          ) : (
            <StyledLines>
              {preparationRows.map(({ line, allocation }) => (
                <StyledLine key={allocation.id}>
                  <StyledLineLabel>
                    {line.description}
                    <span>
                      Réservé {allocation.quantityReserved} {line.unit ?? ''}
                    </span>
                  </StyledLineLabel>
                  <TextInput
                    label="Quantité préparée"
                    type="number"
                    min="0"
                    max={String(allocation.quantityReserved)}
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
          )}
          <StyledFooter>
            <Button
              type="submit"
              title={
                mode === 'reserve'
                  ? order.status === 'DRAFT'
                    ? 'Confirmer et réserver'
                    : 'Réserver le reliquat'
                  : 'Enregistrer la préparation'
              }
              ariaLabel={
                mode === 'reserve'
                  ? 'Enregistrer la réservation de stock'
                  : 'Enregistrer les quantités préparées'
              }
              accent="blue"
              disabled={disabled || isSaving}
              isLoading={isSaving}
            />
          </StyledFooter>
        </StyledForm>
      )}
      <ErpOperationalTable
        ariaLabel="Allocations de stock de la commande"
        columns={allocationColumns}
        rows={allocationRows}
        getRowKey={(row) => row.id}
        emptyLabel="Aucun stock réservé"
      />
    </>
  );
};
