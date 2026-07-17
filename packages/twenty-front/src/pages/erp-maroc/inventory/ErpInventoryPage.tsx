import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { TextInput } from '@/ui/input/components/TextInput';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import {
  erpStockLevelListSchema,
  erpStockMovementListSchema,
  erpStockMovementSchema,
  erpWarehouseListSchema,
  erpWarehouseSchema,
  type ErpStockLevel,
  type ErpStockMovement,
  type ErpWarehouse,
} from 'twenty-shared/erp-maroc';
import {
  IconAdjustments,
  IconBox,
  IconBuildingSkyscraper,
  IconLink,
  IconListCheck,
  IconRefreshAlert,
} from 'twenty-ui/display';
import { Button, TabButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { ErpInventoryCountsPanel } from './ErpInventoryCountsPanel';
import { ErpReplenishmentPanel } from './ErpReplenishmentPanel';

type DrawerMode = 'warehouse' | 'adjustment' | 'transfer' | null;

const movementLabels: Record<ErpStockMovement['type'], string> = {
  PURCHASE_RECEIPT: 'Réception fournisseur',
  SALES_DELIVERY: 'Livraison client',
  SALES_DELIVERY_CANCEL: 'Annulation livraison client',
  ADJUSTMENT_IN: 'Ajustement entrée',
  ADJUSTMENT_OUT: 'Ajustement sortie',
  TRANSFER_IN: 'Transfert entrant',
  TRANSFER_OUT: 'Transfert sortant',
  INVENTORY_CORRECTION_IN: 'Correction inventaire entrée',
  INVENTORY_CORRECTION_OUT: 'Correction inventaire sortie',
};

const today = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Casablanca' });

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledTabs = styled.div`
  align-items: stretch;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[1]};
  height: 40px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const StyledSection = styled.section`
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  min-height: 260px;
`;

const StyledSectionTitle = styled.h2`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  margin: 0;
  padding: ${themeCssVariables.spacing[3]};
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

const StyledCheckbox = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledError = styled.div`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
`;

export const ErpInventoryPage = () => {
  const { client, context } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [warehouses, setWarehouses] = useState<ErpWarehouse[]>([]);
  const [levels, setLevels] = useState<ErpStockLevel[]>([]);
  const [movements, setMovements] = useState<ErpStockMovement[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [drawer, setDrawer] = useState<DrawerMode>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'stock' | 'counts' | 'replenishment'>(
    'stock',
  );

  const [warehouseCode, setWarehouseCode] = useState('');
  const [warehouseName, setWarehouseName] = useState('');
  const [warehouseAddress, setWarehouseAddress] = useState('');
  const [warehouseDefault, setWarehouseDefault] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState('');
  const [occurredAt, setOccurredAt] = useState(today);
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');

  const canManage = context?.capabilities.manageInventory === true;
  const activeWarehouses = useMemo(
    () => warehouses.filter((warehouse) => warehouse.isActive),
    [warehouses],
  );
  const products = useMemo(() => {
    const byId = new Map(
      levels.map((level) => [level.product.id, level.product]),
    );
    return [...byId.values()].sort((left, right) =>
      left.code.localeCompare(right.code),
    );
  }, [levels]);

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
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
      client.request({
        method: 'GET',
        path: '/inventory/movements',
        schema: erpStockMovementListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(([loadedWarehouses, loadedLevels, loadedMovements]) => {
        if (abortController.signal.aborted) return;
        setWarehouses(loadedWarehouses);
        setLevels(loadedLevels);
        setMovements(loadedMovements);
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client, generation]);

  const resetMovementForm = () => {
    const defaultWarehouse =
      activeWarehouses.find((warehouse) => warehouse.isDefault) ??
      activeWarehouses[0];
    setWarehouseId(defaultWarehouse?.id ?? '');
    setDestinationWarehouseId(
      activeWarehouses.find(
        (warehouse) => warehouse.id !== defaultWarehouse?.id,
      )?.id ?? '',
    );
    setProductId(products[0]?.id ?? '');
    setDirection('IN');
    setQuantity('');
    setOccurredAt(today());
    setReference('');
    setReason('');
    setError(null);
  };

  const openDrawer = (mode: Exclude<DrawerMode, null>) => {
    if (!canManage) return;
    if (mode === 'warehouse') {
      setWarehouseCode('');
      setWarehouseName('');
      setWarehouseAddress('');
      setWarehouseDefault(warehouses.length === 0);
      setError(null);
    } else {
      resetMovementForm();
    }
    setDrawer(mode);
  };

  const closeDrawer = () => {
    if (!isSaving) setDrawer(null);
  };

  const saveWarehouse = async () => {
    if (warehouseCode.trim() === '' || warehouseName.trim() === '') {
      setError('Le code et le nom du dépôt sont obligatoires.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/warehouses',
          schema: erpWarehouseSchema,
          body: {
            code: warehouseCode.trim(),
            name: warehouseName.trim(),
            address: warehouseAddress.trim() || null,
            isDefault: warehouseDefault,
          },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      enqueueSuccessSnackBar({ message: 'Dépôt créé' });
      setDrawer(null);
      setGeneration((value) => value + 1);
    } catch {
      setError("Le dépôt n'a pas pu être créé.");
      enqueueErrorSnackBar({ message: 'Création du dépôt impossible' });
    } finally {
      setIsSaving(false);
    }
  };

  const saveMovement = async () => {
    const parsedQuantity = Number(quantity);
    if (
      warehouseId === '' ||
      productId === '' ||
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0 ||
      reason.trim() === ''
    ) {
      setError('Dépôt, produit, quantité et motif sont obligatoires.');
      return;
    }
    if (drawer === 'transfer' && destinationWarehouseId === '') {
      setError('Sélectionnez le dépôt de destination.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const isTransfer = drawer === 'transfer';
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: isTransfer ? '/inventory/transfers' : '/inventory/adjustments',
          schema: isTransfer
            ? erpStockMovementListSchema
            : erpStockMovementSchema,
          body: isTransfer
            ? {
                fromWarehouseId: warehouseId,
                toWarehouseId: destinationWarehouseId,
                productId,
                quantity: parsedQuantity,
                occurredAt,
                reference: reference.trim() || null,
                reason: reason.trim(),
              }
            : {
                warehouseId,
                productId,
                quantityDelta:
                  direction === 'IN' ? parsedQuantity : -parsedQuantity,
                occurredAt,
                reference: reference.trim() || null,
                reason: reason.trim(),
              },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      enqueueSuccessSnackBar({
        message: isTransfer ? 'Transfert enregistré' : 'Stock ajusté',
      });
      setDrawer(null);
      setGeneration((value) => value + 1);
    } catch {
      setError(
        drawer === 'transfer'
          ? 'Transfert refusé. Vérifiez le stock disponible.'
          : 'Ajustement refusé. Vérifiez le stock disponible.',
      );
      enqueueErrorSnackBar({ message: 'Mouvement de stock impossible' });
    } finally {
      setIsSaving(false);
    }
  };

  const levelColumns = useMemo<ErpOperationalTableColumn<ErpStockLevel>[]>(
    () => [
      {
        key: 'product',
        header: 'Produit',
        width: '300px',
        render: (level) => `${level.product.code} · ${level.product.name}`,
      },
      {
        key: 'warehouse',
        header: 'Dépôt',
        width: '240px',
        render: (level) => `${level.warehouse.code} · ${level.warehouse.name}`,
      },
      {
        key: 'quantity',
        header: 'Physique',
        width: '130px',
        align: 'right',
        render: (level) => `${level.quantity} ${level.product.unit}`,
      },
      {
        key: 'reserved',
        header: 'Réservé',
        width: '130px',
        align: 'right',
        render: (level) => `${level.reservedQuantity} ${level.product.unit}`,
      },
      {
        key: 'prepared',
        header: 'Préparé',
        width: '130px',
        align: 'right',
        render: (level) => `${level.preparedQuantity} ${level.product.unit}`,
      },
      {
        key: 'available',
        header: 'Disponible',
        width: '140px',
        align: 'right',
        render: (level) => `${level.availableQuantity} ${level.product.unit}`,
      },
    ],
    [],
  );

  const movementColumns = useMemo<
    ErpOperationalTableColumn<ErpStockMovement>[]
  >(
    () => [
      {
        key: 'date',
        header: 'Date',
        width: '130px',
        render: (movement) => movement.occurredAt,
      },
      {
        key: 'type',
        header: 'Mouvement',
        width: '190px',
        render: (movement) => movementLabels[movement.type],
      },
      {
        key: 'product',
        header: 'Produit',
        width: '260px',
        render: (movement) =>
          `${movement.product.code} · ${movement.product.name}`,
      },
      {
        key: 'warehouse',
        header: 'Dépôt',
        width: '210px',
        render: (movement) => movement.warehouse.name,
      },
      {
        key: 'quantity',
        header: 'Quantité',
        width: '140px',
        align: 'right',
        render: (movement) =>
          `${movement.quantityDelta > 0 ? '+' : ''}${movement.quantityDelta} ${movement.product.unit}`,
      },
      {
        key: 'after',
        header: 'Après mouvement',
        width: '160px',
        align: 'right',
        render: (movement) =>
          `${movement.quantityAfter} ${movement.product.unit}`,
      },
      {
        key: 'reference',
        header: 'Référence',
        width: '180px',
        render: (movement) => movement.reference ?? '—',
      },
    ],
    [],
  );

  const drawerTitle =
    drawer === 'warehouse'
      ? 'Nouveau dépôt'
      : drawer === 'transfer'
        ? 'Transférer du stock'
        : 'Ajuster le stock';

  return (
    <ErpPageShell
      title="Stock"
      description="Niveaux, dépôts et mouvements de marchandises"
      actions={
        canManage && view === 'stock' ? (
          <StyledActions>
            <Button
              title="Nouveau dépôt"
              ariaLabel="Nouveau dépôt"
              Icon={IconBuildingSkyscraper}
              variant="secondary"
              onClick={() => openDrawer('warehouse')}
            />
            <Button
              title="Ajuster le stock"
              ariaLabel="Ajuster le stock"
              Icon={IconAdjustments}
              variant="secondary"
              disabled={products.length === 0}
              onClick={() => openDrawer('adjustment')}
            />
            <Button
              title="Transférer du stock"
              ariaLabel="Transférer du stock"
              Icon={IconLink}
              variant="primary"
              accent="blue"
              disabled={products.length === 0 || activeWarehouses.length < 2}
              onClick={() => openDrawer('transfer')}
            />
          </StyledActions>
        ) : null
      }
    >
      <StyledTabs role="tablist" aria-label="Gestion du stock">
        <TabButton
          id="inventory-stock"
          title="Stock"
          LeftIcon={IconBox}
          active={view === 'stock'}
          onClick={() => setView('stock')}
        />
        <TabButton
          id="inventory-counts"
          title="Inventaires"
          LeftIcon={IconListCheck}
          active={view === 'counts'}
          onClick={() => setView('counts')}
        />
        <TabButton
          id="inventory-replenishment"
          title="Réapprovisionnement"
          LeftIcon={IconRefreshAlert}
          active={view === 'replenishment'}
          onClick={() => setView('replenishment')}
        />
      </StyledTabs>
      {view === 'stock' ? (
        <StyledContent>
          <StyledSection>
            <StyledSectionTitle>Stock disponible</StyledSectionTitle>
            <ErpOperationalTable
              ariaLabel="Niveaux de stock"
              columns={levelColumns}
              rows={levels}
              getRowKey={(level) => `${level.warehouse.id}:${level.product.id}`}
              state={state}
              loadingLabel="Chargement du stock"
              emptyLabel="Aucun produit stockable"
              errorLabel="Impossible de charger le stock"
              retryLabel="Réessayer"
              onRetry={() => setGeneration((value) => value + 1)}
            />
          </StyledSection>
          <StyledSection>
            <StyledSectionTitle>Derniers mouvements</StyledSectionTitle>
            <ErpOperationalTable
              ariaLabel="Mouvements de stock"
              columns={movementColumns}
              rows={movements}
              getRowKey={(movement) => movement.id}
              state={
                state === 'ready' && movements.length === 0 ? 'empty' : state
              }
              loadingLabel="Chargement des mouvements"
              emptyLabel="Aucun mouvement de stock"
              errorLabel="Impossible de charger les mouvements"
              retryLabel="Réessayer"
              onRetry={() => setGeneration((value) => value + 1)}
            />
          </StyledSection>
        </StyledContent>
      ) : view === 'counts' ? (
        <ErpInventoryCountsPanel />
      ) : (
        <ErpReplenishmentPanel />
      )}

      <ErpFormDrawer
        isOpen={drawer !== null}
        title={drawerTitle}
        description="Les mouvements validés restent dans l’historique du stock."
        isBusy={isSaving}
        onClose={closeDrawer}
        footer={
          <>
            <Button
              title="Annuler"
              ariaLabel="Annuler"
              variant="secondary"
              disabled={isSaving}
              onClick={closeDrawer}
            />
            <Button
              title="Enregistrer"
              ariaLabel="Enregistrer"
              variant="primary"
              accent="blue"
              isLoading={isSaving}
              disabled={isSaving}
              onClick={() =>
                void (drawer === 'warehouse' ? saveWarehouse() : saveMovement())
              }
            />
          </>
        }
      >
        <StyledDrawerFields>
          {error === null ? null : (
            <StyledError role="alert">{error}</StyledError>
          )}
          {drawer === 'warehouse' ? (
            <>
              <TextInput
                label="Code"
                value={warehouseCode}
                disabled={isSaving}
                fullWidth
                onChange={setWarehouseCode}
              />
              <TextInput
                label="Nom"
                value={warehouseName}
                disabled={isSaving}
                fullWidth
                onChange={setWarehouseName}
              />
              <TextInput
                label="Adresse"
                value={warehouseAddress}
                disabled={isSaving}
                fullWidth
                onChange={setWarehouseAddress}
              />
              <StyledCheckbox>
                <input
                  type="checkbox"
                  checked={warehouseDefault}
                  disabled={isSaving}
                  onChange={(event) =>
                    setWarehouseDefault(event.target.checked)
                  }
                />
                Dépôt principal
              </StyledCheckbox>
            </>
          ) : (
            <>
              <StyledField>
                {drawer === 'transfer' ? 'Dépôt source' : 'Dépôt'}
                <StyledSelect
                  value={warehouseId}
                  disabled={isSaving}
                  onChange={(event) => {
                    const value = event.target.value;
                    setWarehouseId(value);
                    if (destinationWarehouseId === value) {
                      setDestinationWarehouseId(
                        activeWarehouses.find(
                          (warehouse) => warehouse.id !== value,
                        )?.id ?? '',
                      );
                    }
                  }}
                >
                  {activeWarehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.code} · {warehouse.name}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
              {drawer === 'transfer' ? (
                <StyledField>
                  Dépôt destination
                  <StyledSelect
                    value={destinationWarehouseId}
                    disabled={isSaving}
                    onChange={(event) =>
                      setDestinationWarehouseId(event.target.value)
                    }
                  >
                    {activeWarehouses
                      .filter((warehouse) => warehouse.id !== warehouseId)
                      .map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.code} · {warehouse.name}
                        </option>
                      ))}
                  </StyledSelect>
                </StyledField>
              ) : (
                <StyledField>
                  Sens
                  <StyledSelect
                    value={direction}
                    disabled={isSaving}
                    onChange={(event) =>
                      setDirection(event.target.value as 'IN' | 'OUT')
                    }
                  >
                    <option value="IN">Entrée</option>
                    <option value="OUT">Sortie</option>
                  </StyledSelect>
                </StyledField>
              )}
              <StyledField>
                Produit
                <StyledSelect
                  value={productId}
                  disabled={isSaving}
                  onChange={(event) => setProductId(event.target.value)}
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.code} · {product.name}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
              <TextInput
                label="Quantité"
                type="number"
                min="0.001"
                step="0.001"
                value={quantity}
                disabled={isSaving}
                fullWidth
                onChange={setQuantity}
              />
              <TextInput
                label="Date"
                type="date"
                value={occurredAt}
                disabled={isSaving}
                fullWidth
                onChange={setOccurredAt}
              />
              <TextInput
                label="Référence"
                value={reference}
                disabled={isSaving}
                fullWidth
                onChange={setReference}
              />
              <TextInput
                label="Motif"
                value={reason}
                disabled={isSaving}
                fullWidth
                onChange={setReason}
              />
            </>
          )}
        </StyledDrawerFields>
      </ErpFormDrawer>
    </ErpPageShell>
  );
};
