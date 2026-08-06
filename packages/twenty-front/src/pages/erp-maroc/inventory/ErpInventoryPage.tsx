import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  erpInventoryCountListSchema,
  erpInventoryCountSchema,
  erpInventoryThresholdListSchema,
  erpInventoryThresholdSchema,
  erpProductListSchema,
  erpReplenishmentSuggestionListSchema,
  erpStockLevelListSchema,
  erpStockMovementListSchema,
  erpStockMovementSchema,
  erpWarehouseListSchema,
  erpWarehouseSchema,
  type ErpInventoryCount,
  type ErpInventoryThreshold,
  type ErpProduct,
  type ErpReplenishmentSuggestion,
  type ErpStockLevel,
  type ErpStockMovement,
  type ErpWarehouse,
} from 'twenty-shared/erp-maroc';
import { IconCheck, IconPlus, IconRefresh, IconX } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { type ZodType } from 'zod';

type View = 'stock' | 'movements' | 'counts' | 'replenishment' | 'warehouses';
type Drawer = 'warehouse' | 'adjustment' | 'transfer' | 'count' | 'threshold';
type CountAction = { kind: 'validate' | 'cancel'; count: ErpInventoryCount };

const today = () => new Date().toISOString().slice(0, 10);
const formatQuantity = (value: number) =>
  new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 3 }).format(value);
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('fr-MA').format(new Date(`${value}T12:00:00`));
const moneyToCents = (value: string) => {
  if (value.trim() === '') return null;
  const amount = Number(value.replace(',', '.'));
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
};

const movementLabels: Record<ErpStockMovement['type'], string> = {
  PURCHASE_RECEIPT: 'Réception achat',
  SALES_DELIVERY: 'Livraison client',
  SALES_DELIVERY_CANCEL: 'Annulation livraison',
  CUSTOMER_RETURN: 'Retour client',
  ADJUSTMENT_IN: 'Ajustement entrant',
  ADJUSTMENT_OUT: 'Ajustement sortant',
  TRANSFER_IN: 'Transfert entrant',
  TRANSFER_OUT: 'Transfert sortant',
  INVENTORY_CORRECTION_IN: 'Correction inventaire +',
  INVENTORY_CORRECTION_OUT: 'Correction inventaire -',
};

const StyledWorkspace = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
`;

const StyledTabs = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[1]};
  min-height: 44px;
  overflow-x: auto;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledTab = styled.button<{ active: boolean }>`
  background: transparent;
  border: 0;
  border-bottom: 2px solid
    ${({ active }) =>
      active ? themeCssVariables.color.blue : 'transparent'};
  color: ${({ active }) =>
    active
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  font: inherit;
  height: 44px;
  letter-spacing: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
  white-space: nowrap;
`;

const StyledFilters = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(220px, 1fr) minmax(180px, 280px);
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const inputStyle = `
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 32px;
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledInput = styled.input`
  ${inputStyle}
`;

const StyledSelect = styled.select`
  ${inputStyle}
`;

const StyledTextarea = styled.textarea`
  ${inputStyle}
  height: 88px;
  padding-bottom: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[2]};
  resize: vertical;
`;

const StyledDrawerBody = styled.form`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  min-height: 0;
  overflow: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  letter-spacing: 0;
`;

const StyledCheck = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledCountLines = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-direction: column;
`;

const StyledCountLine = styled.label`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(0, 1fr) 120px;
  padding: ${themeCssVariables.spacing[2]};

  &:last-child {
    border-bottom: 0;
  }
`;

const StyledProductLabel = styled.span`
  color: ${themeCssVariables.font.color.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledSplit = styled.div`
  display: grid;
  flex: 1 1 auto;
  grid-template-rows: minmax(180px, 1fr) minmax(220px, 1.2fr);
  min-height: 0;
`;

const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  & + & {
    border-top: 1px solid ${themeCssVariables.border.color.medium};
  }
`;

const StyledSectionTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  letter-spacing: 0;
  margin: 0;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const statusAppearance = {
  DRAFT: { label: 'Brouillon', tone: 'warning' as const },
  VALIDATED: { label: 'Validé', tone: 'success' as const },
  CANCELLED: { label: 'Annulé', tone: 'danger' as const },
};

export const ErpInventoryPage = () => {
  const { client, context } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [view, setView] = useState<View>('stock');
  const [drawer, setDrawer] = useState<Drawer | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [warehouses, setWarehouses] = useState<ErpWarehouse[]>([]);
  const [products, setProducts] = useState<ErpProduct[]>([]);
  const [levels, setLevels] = useState<ErpStockLevel[]>([]);
  const [movements, setMovements] = useState<ErpStockMovement[]>([]);
  const [counts, setCounts] = useState<ErpInventoryCount[]>([]);
  const [thresholds, setThresholds] = useState<ErpInventoryThreshold[]>([]);
  const [suggestions, setSuggestions] = useState<ErpReplenishmentSuggestion[]>([]);
  const [countAction, setCountAction] = useState<CountAction | null>(null);
  const [warehouseForm, setWarehouseForm] = useState({
    code: '', name: '', address: '', isDefault: false,
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    warehouseId: '', productId: '', quantityDelta: '', unitCostMad: '',
    occurredAt: today(), reference: '', reason: '',
  });
  const [transferForm, setTransferForm] = useState({
    fromWarehouseId: '', toWarehouseId: '', productId: '', quantity: '',
    occurredAt: today(), reference: '', reason: '',
  });
  const [countForm, setCountForm] = useState({
    warehouseId: '', countedAt: today(), notes: '', values: {} as Record<string, string>,
  });
  const [thresholdForm, setThresholdForm] = useState({
    warehouseId: '', productId: '', minimumQuantity: '', targetQuantity: '',
    reorderEnabled: true,
  });

  const stockProducts = useMemo(
    () => products.filter((product) => product.type === 'PRODUIT' && product.isActive),
    [products],
  );
  const canManage = context?.capabilities.manageInventory === true;

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [nextWarehouses, nextProducts, nextLevels, nextMovements, nextCounts, nextThresholds, nextSuggestions] =
        await Promise.all([
          client.request({ method: 'GET', path: '/warehouses', schema: erpWarehouseListSchema }),
          client.request({ method: 'GET', path: '/products', schema: erpProductListSchema }),
          client.request({ method: 'GET', path: '/inventory/levels', schema: erpStockLevelListSchema }),
          client.request({ method: 'GET', path: '/inventory/movements', schema: erpStockMovementListSchema }),
          client.request({ method: 'GET', path: '/inventory/counts', schema: erpInventoryCountListSchema }),
          client.request({ method: 'GET', path: '/inventory/thresholds', schema: erpInventoryThresholdListSchema }),
          client.request({ method: 'GET', path: '/inventory/replenishment-suggestions', schema: erpReplenishmentSuggestionListSchema }),
        ]);
      setWarehouses(nextWarehouses);
      setProducts(nextProducts);
      setLevels(nextLevels);
      setMovements(nextMovements);
      setCounts(nextCounts);
      setThresholds(nextThresholds);
      setSuggestions(nextSuggestions);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [generation, load]);

  const refresh = () => setGeneration((current) => current + 1);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const matchesFilter = (warehouseId: string, values: string[]) =>
    (warehouseFilter === 'all' || warehouseFilter === warehouseId) &&
    (normalizedSearch === '' ||
      values.some((value) => value.toLocaleLowerCase().includes(normalizedSearch)));

  const filteredLevels = levels.filter((level) =>
    matchesFilter(level.warehouse.id, [level.product.code, level.product.name, level.warehouse.code]),
  );
  const filteredMovements = movements.filter((movement) =>
    matchesFilter(movement.warehouse.id, [movement.product.code, movement.product.name, movement.reference ?? '', movementLabels[movement.type]]),
  );

  const runMutation = async (
    path: string,
    schema: ZodType,
    body: unknown,
    successMessage: string,
  ) => {
    setBusy(true);
    try {
      await client
        .createMutationIntent({ method: 'POST', path, schema, body })
        .execute();
      enqueueSuccessSnackBar({ message: successMessage });
      setDrawer(null);
      setCountAction(null);
      await load();
      return true;
    } catch {
      enqueueErrorSnackBar({ message: "L'opération stock a échoué" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openDrawer = (nextDrawer: Drawer) => {
    const warehouseId = warehouses.find((warehouse) => warehouse.isDefault)?.id ?? warehouses[0]?.id ?? '';
    const productId = stockProducts[0]?.id ?? '';
    if (nextDrawer === 'adjustment') {
      setAdjustmentForm({ warehouseId, productId, quantityDelta: '', unitCostMad: '', occurredAt: today(), reference: '', reason: '' });
    } else if (nextDrawer === 'transfer') {
      setTransferForm({ fromWarehouseId: warehouseId, toWarehouseId: warehouses.find((item) => item.id !== warehouseId)?.id ?? '', productId, quantity: '', occurredAt: today(), reference: '', reason: '' });
    } else if (nextDrawer === 'count') {
      const values = Object.fromEntries(
        stockProducts.map((product) => [
          product.id,
          String(levels.find((level) => level.warehouse.id === warehouseId && level.product.id === product.id)?.quantity ?? 0),
        ]),
      );
      setCountForm({ warehouseId, countedAt: today(), notes: '', values });
    } else if (nextDrawer === 'threshold') {
      setThresholdForm({ warehouseId, productId, minimumQuantity: '', targetQuantity: '', reorderEnabled: true });
    }
    setDrawer(nextDrawer);
  };

  const submitDrawer = async () => {
    if (drawer === 'warehouse') {
      const completed = await runMutation('/warehouses', erpWarehouseSchema, {
        code: warehouseForm.code, name: warehouseForm.name, address: warehouseForm.address || null,
        isDefault: warehouseForm.isDefault,
      }, 'Entrepôt créé');
      if (completed) setWarehouseForm({ code: '', name: '', address: '', isDefault: false });
    } else if (drawer === 'adjustment') {
      const quantityDelta = Number(adjustmentForm.quantityDelta.replace(',', '.'));
      const unitCostCents = moneyToCents(adjustmentForm.unitCostMad);
      await runMutation('/inventory/adjustments', erpStockMovementSchema, {
        warehouseId: adjustmentForm.warehouseId, productId: adjustmentForm.productId,
        quantityDelta, unitCostCents: quantityDelta > 0 ? unitCostCents : null,
        occurredAt: adjustmentForm.occurredAt, reference: adjustmentForm.reference || null,
        reason: adjustmentForm.reason,
      }, 'Stock ajusté');
    } else if (drawer === 'transfer') {
      await runMutation('/inventory/transfers', erpStockMovementListSchema, {
        ...transferForm, quantity: Number(transferForm.quantity.replace(',', '.')),
        reference: transferForm.reference || null,
      }, 'Transfert enregistré');
    } else if (drawer === 'count') {
      const lines = stockProducts.map((product) => ({
        productId: product.id,
        countedQuantity: Number((countForm.values[product.id] ?? '0').replace(',', '.')),
      }));
      await runMutation('/inventory/counts', erpInventoryCountSchema, {
        warehouseId: countForm.warehouseId, countedAt: countForm.countedAt,
        notes: countForm.notes || null, lines,
      }, 'Inventaire créé');
    } else if (drawer === 'threshold') {
      await runMutation('/inventory/thresholds', erpInventoryThresholdSchema, {
        warehouseId: thresholdForm.warehouseId, productId: thresholdForm.productId,
        minimumQuantity: Number(thresholdForm.minimumQuantity.replace(',', '.')),
        targetQuantity: Number(thresholdForm.targetQuantity.replace(',', '.')),
        reorderEnabled: thresholdForm.reorderEnabled,
      }, 'Seuil de stock enregistré');
    }
  };

  const changeCountWarehouse = (warehouseId: string) => {
    setCountForm((current) => ({
      ...current,
      warehouseId,
      values: Object.fromEntries(stockProducts.map((product) => [
        product.id,
        String(levels.find((level) => level.warehouse.id === warehouseId && level.product.id === product.id)?.quantity ?? 0),
      ])),
    }));
  };

  const stockColumns: ErpOperationalTableColumn<ErpStockLevel>[] = [
    { key: 'product', header: 'Produit', width: '260px', render: (row) => `${row.product.code} · ${row.product.name}` },
    { key: 'warehouse', header: 'Entrepôt', width: '160px', render: (row) => row.warehouse.code },
    { key: 'quantity', header: 'Physique', width: '110px', align: 'right', render: (row) => formatQuantity(row.quantity) },
    { key: 'reserved', header: 'Réservé', width: '110px', align: 'right', render: (row) => formatQuantity(row.reservedQuantity) },
    { key: 'prepared', header: 'Préparé', width: '110px', align: 'right', render: (row) => formatQuantity(row.preparedQuantity) },
    { key: 'available', header: 'Disponible', width: '120px', align: 'right', render: (row) => formatQuantity(row.availableQuantity) },
    { key: 'cost', header: 'Coût moyen', width: '130px', align: 'right', render: (row) => formatMadCents(row.averageUnitCostCents) },
    { key: 'value', header: 'Valeur', width: '140px', align: 'right', render: (row) => formatMadCents(row.inventoryValueCents) },
  ];

  const movementColumns: ErpOperationalTableColumn<ErpStockMovement>[] = [
    { key: 'date', header: 'Date', width: '110px', render: (row) => formatDate(row.occurredAt) },
    { key: 'type', header: 'Mouvement', width: '190px', render: (row) => movementLabels[row.type] },
    { key: 'product', header: 'Produit', width: '240px', render: (row) => `${row.product.code} · ${row.product.name}` },
    { key: 'warehouse', header: 'Entrepôt', width: '130px', render: (row) => row.warehouse.code },
    { key: 'delta', header: 'Variation', width: '110px', align: 'right', render: (row) => formatQuantity(row.quantityDelta) },
    { key: 'after', header: 'Après', width: '100px', align: 'right', render: (row) => formatQuantity(row.quantityAfter) },
    { key: 'value', header: 'Valeur', width: '130px', align: 'right', render: (row) => formatMadCents(row.valueDeltaCents) },
    { key: 'reference', header: 'Référence', width: '170px', render: (row) => row.reference ?? '—' },
  ];

  const countColumns: ErpOperationalTableColumn<ErpInventoryCount>[] = [
    { key: 'number', header: 'Inventaire', width: '160px', render: (row) => row.number },
    { key: 'date', header: 'Date', width: '110px', render: (row) => formatDate(row.countedAt) },
    { key: 'warehouse', header: 'Entrepôt', width: '150px', render: (row) => row.warehouse.code },
    { key: 'status', header: 'Statut', width: '120px', render: (row) => <ErpStatusBadge {...statusAppearance[row.status]} /> },
    { key: 'lines', header: 'Articles', width: '100px', align: 'right', render: (row) => row.lines.length },
    { key: 'variance', header: 'Écart net', width: '110px', align: 'right', render: (row) => formatQuantity(row.lines.reduce((total, line) => total + (line.varianceQuantity ?? line.countedQuantity - line.expectedQuantity), 0)) },
    { key: 'actions', header: '', width: '150px', align: 'right', render: (row) => row.status === 'DRAFT' && canManage ? (
      <StyledActions>
        <Button title="Valider" ariaLabel={`Valider ${row.number}`} Icon={IconCheck} variant="secondary" onClick={() => setCountAction({ kind: 'validate', count: row })} />
        <Button title="Annuler" ariaLabel={`Annuler ${row.number}`} Icon={IconX} variant="secondary" onClick={() => setCountAction({ kind: 'cancel', count: row })} />
      </StyledActions>
    ) : null },
  ];

  const thresholdColumns: ErpOperationalTableColumn<ErpInventoryThreshold>[] = [
    { key: 'product', header: 'Produit', width: '260px', render: (row) => `${row.product.code} · ${row.product.name}` },
    { key: 'warehouse', header: 'Entrepôt', width: '140px', render: (row) => row.warehouse.code },
    { key: 'minimum', header: 'Minimum', width: '110px', align: 'right', render: (row) => formatQuantity(row.minimumQuantity) },
    { key: 'target', header: 'Cible', width: '110px', align: 'right', render: (row) => formatQuantity(row.targetQuantity) },
    { key: 'enabled', header: 'Réappro.', width: '120px', render: (row) => <ErpStatusBadge label={row.reorderEnabled ? 'Actif' : 'Inactif'} tone={row.reorderEnabled ? 'success' : 'neutral'} /> },
  ];

  const suggestionColumns: ErpOperationalTableColumn<ErpReplenishmentSuggestion>[] = [
    { key: 'product', header: 'Produit', width: '260px', render: (row) => `${row.product.code} · ${row.product.name}` },
    { key: 'warehouse', header: 'Entrepôt', width: '140px', render: (row) => row.warehouse.code },
    { key: 'physical', header: 'Physique', width: '100px', align: 'right', render: (row) => formatQuantity(row.physicalQuantity) },
    { key: 'available', header: 'Disponible', width: '110px', align: 'right', render: (row) => formatQuantity(row.availableQuantity) },
    { key: 'minimum', header: 'Minimum', width: '100px', align: 'right', render: (row) => formatQuantity(row.minimumQuantity) },
    { key: 'target', header: 'Cible', width: '100px', align: 'right', render: (row) => formatQuantity(row.targetQuantity) },
    { key: 'suggested', header: 'À commander', width: '130px', align: 'right', render: (row) => formatQuantity(row.suggestedQuantity) },
  ];

  const warehouseColumns: ErpOperationalTableColumn<ErpWarehouse>[] = [
    { key: 'code', header: 'Code', width: '130px', render: (row) => row.code },
    { key: 'name', header: 'Nom', width: '240px', render: (row) => row.name },
    { key: 'address', header: 'Adresse', width: '320px', render: (row) => row.address ?? '—' },
    { key: 'default', header: 'Type', width: '130px', render: (row) => <ErpStatusBadge label={row.isDefault ? 'Principal' : 'Secondaire'} tone={row.isDefault ? 'info' : 'neutral'} /> },
    { key: 'active', header: 'Statut', width: '110px', render: (row) => <ErpStatusBadge label={row.isActive ? 'Actif' : 'Inactif'} tone={row.isActive ? 'success' : 'neutral'} /> },
  ];

  const views: Array<{ key: View; label: string }> = [
    { key: 'stock', label: 'État du stock' },
    { key: 'movements', label: 'Mouvements' },
    { key: 'counts', label: 'Inventaires' },
    { key: 'replenishment', label: 'Réapprovisionnement' },
    { key: 'warehouses', label: 'Entrepôts' },
  ];

  const pageActions = (
    <>
      <Button title="Actualiser" ariaLabel="Actualiser les stocks" Icon={IconRefresh} variant="secondary" onClick={refresh} />
      {canManage && view === 'stock' ? (
        <><Button title="Ajuster" ariaLabel="Créer un ajustement" Icon={IconPlus} variant="secondary" onClick={() => openDrawer('adjustment')} />
        <Button title="Transférer" ariaLabel="Créer un transfert" Icon={IconPlus} variant="primary" onClick={() => openDrawer('transfer')} /></>
      ) : canManage && view === 'counts' ? (
        <Button title="Nouvel inventaire" ariaLabel="Créer un inventaire" Icon={IconPlus} variant="primary" onClick={() => openDrawer('count')} />
      ) : canManage && view === 'replenishment' ? (
        <Button title="Configurer un seuil" ariaLabel="Configurer un seuil" Icon={IconPlus} variant="primary" onClick={() => openDrawer('threshold')} />
      ) : canManage && view === 'warehouses' ? (
        <Button title="Nouvel entrepôt" ariaLabel="Créer un entrepôt" Icon={IconPlus} variant="primary" onClick={() => openDrawer('warehouse')} />
      ) : null}
    </>
  );

  const drawerTitles: Record<Drawer, [string, string]> = {
    warehouse: ['Nouvel entrepôt', 'Ajoutez un dépôt ou un lieu de stockage.'],
    adjustment: ['Ajustement de stock', 'Corrigez une quantité avec une justification auditée.'],
    transfer: ['Transfert de stock', 'Déplacez un article entre deux entrepôts.'],
    count: ['Inventaire physique', 'Saisissez les quantités réellement comptées.'],
    threshold: ['Seuil de réapprovisionnement', 'Définissez le minimum et la quantité cible.'],
  };

  return (
    <ErpPageShell
      title="Stocks et logistique"
      description="Entrepôts, disponibilités, mouvements, inventaires et réapprovisionnement"
      actions={pageActions}
      state={status}
      loadingLabel="Chargement des stocks…"
      errorLabel="Impossible de charger les données de stock."
      onRetry={refresh}
    >
      <StyledWorkspace>
        <StyledTabs role="tablist" aria-label="Vues de stock">
          {views.map((item) => (
            <StyledTab key={item.key} type="button" role="tab" active={view === item.key} aria-selected={view === item.key} onClick={() => setView(item.key)}>
              {item.label}
            </StyledTab>
          ))}
        </StyledTabs>
        {view === 'stock' || view === 'movements' ? (
          <StyledFilters>
            <StyledInput aria-label="Rechercher dans les stocks" placeholder="Produit, référence ou mouvement" value={search} onChange={(event) => setSearch(event.target.value)} />
            <StyledSelect aria-label="Filtrer par entrepôt" value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}>
              <option value="all">Tous les entrepôts</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>)}
            </StyledSelect>
          </StyledFilters>
        ) : null}
        {view === 'stock' ? (
          <ErpOperationalTable ariaLabel="État du stock" columns={stockColumns} rows={filteredLevels} getRowKey={(row) => `${row.warehouse.id}-${row.product.id}`} emptyLabel="Aucun produit stocké" />
        ) : view === 'movements' ? (
          <ErpOperationalTable ariaLabel="Mouvements de stock" columns={movementColumns} rows={filteredMovements} getRowKey={(row) => row.id} emptyLabel="Aucun mouvement de stock" />
        ) : view === 'counts' ? (
          <ErpOperationalTable ariaLabel="Inventaires physiques" columns={countColumns} rows={counts} getRowKey={(row) => row.id} emptyLabel="Aucun inventaire physique" />
        ) : view === 'replenishment' ? (
          <StyledSplit>
            <StyledSection><StyledSectionTitle>Seuils configurés</StyledSectionTitle><ErpOperationalTable ariaLabel="Seuils de réapprovisionnement" columns={thresholdColumns} rows={thresholds} getRowKey={(row) => row.id} emptyLabel="Aucun seuil configuré" /></StyledSection>
            <StyledSection><StyledSectionTitle>Propositions à traiter</StyledSectionTitle><ErpOperationalTable ariaLabel="Propositions de réapprovisionnement" columns={suggestionColumns} rows={suggestions} getRowKey={(row) => row.thresholdId} emptyLabel="Aucun réapprovisionnement nécessaire" /></StyledSection>
          </StyledSplit>
        ) : (
          <ErpOperationalTable ariaLabel="Entrepôts" columns={warehouseColumns} rows={warehouses} getRowKey={(row) => row.id} emptyLabel="Aucun entrepôt" />
        )}
      </StyledWorkspace>

      <ErpFormDrawer
        isOpen={drawer !== null}
        title={drawer === null ? 'Stock' : drawerTitles[drawer][0]}
        description={drawer === null ? '' : drawerTitles[drawer][1]}
        isBusy={busy}
        onClose={() => !busy && setDrawer(null)}
        footer={<><Button title="Annuler" ariaLabel="Fermer le formulaire" variant="secondary" onClick={() => setDrawer(null)} /><Button title="Enregistrer" ariaLabel="Enregistrer l'opération" Icon={IconCheck} variant="primary" disabled={busy} onClick={() => void submitDrawer()} /></>}
      >
        <StyledDrawerBody onSubmit={(event) => { event.preventDefault(); void submitDrawer(); }}>
          {drawer === 'warehouse' ? (
            <><StyledField>Code<StyledInput required value={warehouseForm.code} onChange={(event) => setWarehouseForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} /></StyledField>
            <StyledField>Nom<StyledInput required value={warehouseForm.name} onChange={(event) => setWarehouseForm((current) => ({ ...current, name: event.target.value }))} /></StyledField>
            <StyledField>Adresse<StyledTextarea value={warehouseForm.address} onChange={(event) => setWarehouseForm((current) => ({ ...current, address: event.target.value }))} /></StyledField>
            <StyledCheck><input type="checkbox" checked={warehouseForm.isDefault} onChange={(event) => setWarehouseForm((current) => ({ ...current, isDefault: event.target.checked }))} />Entrepôt principal</StyledCheck></>
          ) : drawer === 'adjustment' ? (
            <><StyledField>Entrepôt<StyledSelect required value={adjustmentForm.warehouseId} onChange={(event) => setAdjustmentForm((current) => ({ ...current, warehouseId: event.target.value }))}>{warehouses.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</StyledSelect></StyledField>
            <StyledField>Produit<StyledSelect required value={adjustmentForm.productId} onChange={(event) => setAdjustmentForm((current) => ({ ...current, productId: event.target.value }))}>{stockProducts.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</StyledSelect></StyledField>
            <StyledField>Variation de quantité<StyledInput required inputMode="decimal" placeholder="10 ou -3" value={adjustmentForm.quantityDelta} onChange={(event) => setAdjustmentForm((current) => ({ ...current, quantityDelta: event.target.value }))} /></StyledField>
            <StyledField>Coût unitaire MAD pour une entrée<StyledInput inputMode="decimal" value={adjustmentForm.unitCostMad} onChange={(event) => setAdjustmentForm((current) => ({ ...current, unitCostMad: event.target.value }))} /></StyledField>
            <StyledField>Date<StyledInput required type="date" value={adjustmentForm.occurredAt} onChange={(event) => setAdjustmentForm((current) => ({ ...current, occurredAt: event.target.value }))} /></StyledField>
            <StyledField>Référence<StyledInput value={adjustmentForm.reference} onChange={(event) => setAdjustmentForm((current) => ({ ...current, reference: event.target.value }))} /></StyledField>
            <StyledField>Justification<StyledTextarea required value={adjustmentForm.reason} onChange={(event) => setAdjustmentForm((current) => ({ ...current, reason: event.target.value }))} /></StyledField></>
          ) : drawer === 'transfer' ? (
            <><StyledField>Entrepôt source<StyledSelect required value={transferForm.fromWarehouseId} onChange={(event) => setTransferForm((current) => ({ ...current, fromWarehouseId: event.target.value }))}>{warehouses.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</StyledSelect></StyledField>
            <StyledField>Entrepôt destination<StyledSelect required value={transferForm.toWarehouseId} onChange={(event) => setTransferForm((current) => ({ ...current, toWarehouseId: event.target.value }))}><option value="">Sélectionner</option>{warehouses.filter((item) => item.id !== transferForm.fromWarehouseId).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</StyledSelect></StyledField>
            <StyledField>Produit<StyledSelect required value={transferForm.productId} onChange={(event) => setTransferForm((current) => ({ ...current, productId: event.target.value }))}>{stockProducts.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</StyledSelect></StyledField>
            <StyledField>Quantité<StyledInput required inputMode="decimal" value={transferForm.quantity} onChange={(event) => setTransferForm((current) => ({ ...current, quantity: event.target.value }))} /></StyledField>
            <StyledField>Date<StyledInput required type="date" value={transferForm.occurredAt} onChange={(event) => setTransferForm((current) => ({ ...current, occurredAt: event.target.value }))} /></StyledField>
            <StyledField>Référence<StyledInput value={transferForm.reference} onChange={(event) => setTransferForm((current) => ({ ...current, reference: event.target.value }))} /></StyledField>
            <StyledField>Motif<StyledTextarea required value={transferForm.reason} onChange={(event) => setTransferForm((current) => ({ ...current, reason: event.target.value }))} /></StyledField></>
          ) : drawer === 'count' ? (
            <><StyledField>Entrepôt<StyledSelect required value={countForm.warehouseId} onChange={(event) => changeCountWarehouse(event.target.value)}>{warehouses.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</StyledSelect></StyledField>
            <StyledField>Date de comptage<StyledInput required type="date" value={countForm.countedAt} onChange={(event) => setCountForm((current) => ({ ...current, countedAt: event.target.value }))} /></StyledField>
            <StyledCountLines>{stockProducts.map((product) => <StyledCountLine key={product.id}><StyledProductLabel>{product.code} · {product.name}</StyledProductLabel><StyledInput aria-label={`Quantité comptée ${product.name}`} inputMode="decimal" value={countForm.values[product.id] ?? '0'} onChange={(event) => setCountForm((current) => ({ ...current, values: { ...current.values, [product.id]: event.target.value } }))} /></StyledCountLine>)}</StyledCountLines>
            <StyledField>Notes<StyledTextarea value={countForm.notes} onChange={(event) => setCountForm((current) => ({ ...current, notes: event.target.value }))} /></StyledField></>
          ) : drawer === 'threshold' ? (
            <><StyledField>Entrepôt<StyledSelect required value={thresholdForm.warehouseId} onChange={(event) => setThresholdForm((current) => ({ ...current, warehouseId: event.target.value }))}>{warehouses.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</StyledSelect></StyledField>
            <StyledField>Produit<StyledSelect required value={thresholdForm.productId} onChange={(event) => setThresholdForm((current) => ({ ...current, productId: event.target.value }))}>{stockProducts.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</StyledSelect></StyledField>
            <StyledField>Quantité minimum<StyledInput required inputMode="decimal" value={thresholdForm.minimumQuantity} onChange={(event) => setThresholdForm((current) => ({ ...current, minimumQuantity: event.target.value }))} /></StyledField>
            <StyledField>Quantité cible<StyledInput required inputMode="decimal" value={thresholdForm.targetQuantity} onChange={(event) => setThresholdForm((current) => ({ ...current, targetQuantity: event.target.value }))} /></StyledField>
            <StyledCheck><input type="checkbox" checked={thresholdForm.reorderEnabled} onChange={(event) => setThresholdForm((current) => ({ ...current, reorderEnabled: event.target.checked }))} />Activer les propositions de réapprovisionnement</StyledCheck></>
          ) : null}
        </StyledDrawerBody>
      </ErpFormDrawer>

      <ErpConfirmDialog
        isOpen={countAction !== null}
        title={countAction?.kind === 'validate' ? "Valider l'inventaire" : "Annuler l'inventaire"}
        message={countAction?.kind === 'validate' ? 'Les écarts modifieront immédiatement le stock physique. Cette action est auditée.' : "L'inventaire sera annulé sans modifier le stock."}
        confirmLabel={countAction?.kind === 'validate' ? 'Valider et corriger' : 'Annuler l’inventaire'}
        destructive={countAction?.kind === 'cancel'}
        isConfirming={busy}
        onCancel={() => setCountAction(null)}
        onConfirm={() => {
          if (countAction === null) return;
          void runMutation(`/inventory/counts/${countAction.count.id}/${countAction.kind}`, erpInventoryCountSchema, {}, countAction.kind === 'validate' ? 'Inventaire validé' : 'Inventaire annulé');
        }}
      />
    </ErpPageShell>
  );
};
