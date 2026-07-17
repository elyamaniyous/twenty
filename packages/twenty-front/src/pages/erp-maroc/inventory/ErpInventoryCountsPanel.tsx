import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { TextInput } from '@/ui/input/components/TextInput';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import {
  erpInventoryCountListSchema,
  erpInventoryCountSchema,
  erpStockLevelListSchema,
  erpWarehouseListSchema,
  type ErpInventoryCount,
  type ErpStockLevel,
  type ErpWarehouse,
} from 'twenty-shared/erp-maroc';
import { IconListCheck } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const statusLabels: Record<ErpInventoryCount['status'], string> = {
  DRAFT: 'À valider',
  VALIDATED: 'Validé',
  CANCELLED: 'Annulé',
};

const today = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Casablanca' });

const StyledPanel = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
`;

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  min-height: 48px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledDrawerFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledField = styled.label`
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

const StyledCountGrid = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
`;

const StyledCountRow = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(0, 1fr) 128px;
  padding: ${themeCssVariables.spacing[2]} 0;
`;

const StyledProduct = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledExpected = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  display: block;
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledError = styled.div`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
`;

const getNetVariance = (count: ErpInventoryCount) =>
  count.lines.reduce(
    (total, line) =>
      total +
      (line.varianceQuantity ?? line.countedQuantity - line.expectedQuantity),
    0,
  );

export const ErpInventoryCountsPanel = () => {
  const { client, context } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [counts, setCounts] = useState<ErpInventoryCount[]>([]);
  const [warehouses, setWarehouses] = useState<ErpWarehouse[]>([]);
  const [levels, setLevels] = useState<ErpStockLevel[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyCountId, setBusyCountId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState('');
  const [countedAt, setCountedAt] = useState(today);
  const [notes, setNotes] = useState('');
  const [countedQuantities, setCountedQuantities] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState<string | null>(null);
  const canManage = context?.capabilities.manageInventory === true;

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    Promise.all([
      client.request({
        method: 'GET',
        path: '/inventory/counts',
        schema: erpInventoryCountListSchema,
        signal: abortController.signal,
      }),
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
      .then(([loadedCounts, loadedWarehouses, loadedLevels]) => {
        if (abortController.signal.aborted) return;
        setCounts(loadedCounts);
        setWarehouses(
          loadedWarehouses.filter((warehouse) => warehouse.isActive),
        );
        setLevels(loadedLevels);
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client, generation]);

  const levelsForWarehouse = useMemo(
    () => levels.filter((level) => level.warehouse.id === warehouseId),
    [levels, warehouseId],
  );

  const resetQuantities = (selectedWarehouseId: string) => {
    setCountedQuantities(
      Object.fromEntries(
        levels
          .filter((level) => level.warehouse.id === selectedWarehouseId)
          .map((level) => [level.product.id, String(level.quantity)]),
      ),
    );
  };

  const openCount = () => {
    const defaultWarehouse =
      warehouses.find((warehouse) => warehouse.isDefault) ?? warehouses[0];
    const selectedWarehouseId = defaultWarehouse?.id ?? '';
    setWarehouseId(selectedWarehouseId);
    setCountedAt(today());
    setNotes('');
    setError(null);
    resetQuantities(selectedWarehouseId);
    setIsOpen(true);
  };

  const saveCount = async () => {
    const lines = levelsForWarehouse.map((level) => ({
      productId: level.product.id,
      countedQuantity: Number(countedQuantities[level.product.id]),
    }));
    if (
      warehouseId === '' ||
      lines.length === 0 ||
      lines.some(
        (line) =>
          !Number.isFinite(line.countedQuantity) || line.countedQuantity < 0,
      )
    ) {
      setError(
        'Renseignez une quantité positive ou nulle pour chaque produit.',
      );
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/inventory/counts',
            schema: erpInventoryCountSchema,
            body: {
              warehouseId,
              countedAt,
              notes: notes.trim() || null,
              lines,
            },
          },
          { idempotency: 'required' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'Inventaire enregistré' });
      setIsOpen(false);
      setGeneration((value) => value + 1);
    } catch {
      setError("L'inventaire n'a pas pu être enregistré.");
      enqueueErrorSnackBar({ message: 'Enregistrement impossible' });
    } finally {
      setIsSaving(false);
    }
  };

  const transitionCount = async (
    count: ErpInventoryCount,
    action: 'validate' | 'cancel',
  ) => {
    setBusyCountId(count.id);
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: `/inventory/counts/${count.id}/${action}`,
            schema: erpInventoryCountSchema,
            body: {},
          },
          { idempotency: 'required' },
        )
        .execute();
      enqueueSuccessSnackBar({
        message:
          action === 'validate' ? 'Inventaire validé' : 'Inventaire annulé',
      });
      setGeneration((value) => value + 1);
    } catch {
      enqueueErrorSnackBar({
        message:
          action === 'validate'
            ? "La correction de stock n'a pas pu être appliquée"
            : "L'inventaire n'a pas pu être annulé",
      });
    } finally {
      setBusyCountId(null);
    }
  };

  const columns = useMemo<ErpOperationalTableColumn<ErpInventoryCount>[]>(
    () => [
      {
        key: 'number',
        header: 'Numéro',
        width: '170px',
        render: (count) => count.number,
      },
      {
        key: 'date',
        header: 'Date',
        width: '125px',
        render: (count) => count.countedAt,
      },
      {
        key: 'warehouse',
        header: 'Dépôt',
        width: '220px',
        render: (count) => `${count.warehouse.code} · ${count.warehouse.name}`,
      },
      {
        key: 'lines',
        header: 'Produits',
        width: '110px',
        align: 'right',
        render: (count) => count.lines.length,
      },
      {
        key: 'variance',
        header: 'Écart net',
        width: '130px',
        align: 'right',
        render: (count) => {
          const variance = getNetVariance(count);
          return `${variance > 0 ? '+' : ''}${variance}`;
        },
      },
      {
        key: 'status',
        header: 'Statut',
        width: '120px',
        render: (count) => statusLabels[count.status],
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '210px',
        render: (count) =>
          count.status === 'DRAFT' && canManage ? (
            <StyledActions>
              <Button
                title="Valider"
                ariaLabel={`Valider ${count.number}`}
                variant="primary"
                accent="blue"
                disabled={busyCountId !== null}
                isLoading={busyCountId === count.id}
                onClick={() => void transitionCount(count, 'validate')}
              />
              <Button
                title="Annuler"
                ariaLabel={`Annuler ${count.number}`}
                variant="secondary"
                disabled={busyCountId !== null}
                onClick={() => void transitionCount(count, 'cancel')}
              />
            </StyledActions>
          ) : (
            '—'
          ),
      },
    ],
    [busyCountId, canManage],
  );

  return (
    <StyledPanel>
      <StyledToolbar>
        {canManage ? (
          <Button
            title="Nouvel inventaire"
            ariaLabel="Nouvel inventaire"
            Icon={IconListCheck}
            variant="primary"
            accent="blue"
            disabled={warehouses.length === 0 || levels.length === 0}
            onClick={openCount}
          />
        ) : null}
      </StyledToolbar>
      <ErpOperationalTable
        ariaLabel="Inventaires physiques"
        columns={columns}
        rows={counts}
        getRowKey={(count) => count.id}
        state={state}
        loadingLabel="Chargement des inventaires"
        emptyLabel="Aucun inventaire physique"
        errorLabel="Impossible de charger les inventaires"
        retryLabel="Réessayer"
        onRetry={() => setGeneration((value) => value + 1)}
      />

      <ErpFormDrawer
        isOpen={isOpen}
        title="Nouvel inventaire physique"
        description="Les écarts seront appliqués uniquement après validation."
        isBusy={isSaving}
        onClose={() => !isSaving && setIsOpen(false)}
        footer={
          <>
            <Button
              title="Annuler"
              ariaLabel="Annuler"
              variant="secondary"
              disabled={isSaving}
              onClick={() => setIsOpen(false)}
            />
            <Button
              title="Enregistrer"
              ariaLabel="Enregistrer l'inventaire"
              variant="primary"
              accent="blue"
              isLoading={isSaving}
              disabled={isSaving}
              onClick={() => void saveCount()}
            />
          </>
        }
      >
        <StyledDrawerFields>
          {error === null ? null : (
            <StyledError role="alert">{error}</StyledError>
          )}
          <StyledField>
            Dépôt
            <StyledSelect
              value={warehouseId}
              disabled={isSaving}
              onChange={(event) => {
                setWarehouseId(event.target.value);
                resetQuantities(event.target.value);
              }}
            >
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} · {warehouse.name}
                </option>
              ))}
            </StyledSelect>
          </StyledField>
          <TextInput
            label="Date du comptage"
            type="date"
            value={countedAt}
            disabled={isSaving}
            fullWidth
            onChange={setCountedAt}
          />
          <TextInput
            label="Notes"
            value={notes}
            disabled={isSaving}
            fullWidth
            onChange={setNotes}
          />
          <StyledCountGrid>
            {levelsForWarehouse.map((level) => (
              <StyledCountRow key={level.product.id}>
                <StyledProduct>
                  {level.product.code} · {level.product.name}
                  <StyledExpected>
                    Stock attendu : {level.quantity} {level.product.unit}
                  </StyledExpected>
                </StyledProduct>
                <TextInput
                  label="Compté"
                  type="number"
                  min="0"
                  step="0.001"
                  value={countedQuantities[level.product.id] ?? ''}
                  disabled={isSaving}
                  fullWidth
                  onChange={(value) =>
                    setCountedQuantities((current) => ({
                      ...current,
                      [level.product.id]: value,
                    }))
                  }
                />
              </StyledCountRow>
            ))}
          </StyledCountGrid>
        </StyledDrawerFields>
      </ErpFormDrawer>
    </StyledPanel>
  );
};
