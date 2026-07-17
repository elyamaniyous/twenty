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
  erpInventoryThresholdListSchema,
  erpInventoryThresholdSchema,
  erpReplenishmentSuggestionListSchema,
  erpStockLevelListSchema,
  type ErpInventoryThreshold,
  type ErpReplenishmentSuggestion,
  type ErpStockLevel,
} from 'twenty-shared/erp-maroc';
import { IconAdjustments } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

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
  min-height: 230px;
`;

const StyledSectionTitle = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledHeading = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  margin: 0;
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

export const ErpReplenishmentPanel = () => {
  const { client, context } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [thresholds, setThresholds] = useState<ErpInventoryThreshold[]>([]);
  const [suggestions, setSuggestions] = useState<ErpReplenishmentSuggestion[]>(
    [],
  );
  const [levels, setLevels] = useState<ErpStockLevel[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [minimumQuantity, setMinimumQuantity] = useState('0');
  const [targetQuantity, setTargetQuantity] = useState('0');
  const [reorderEnabled, setReorderEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canManage = context?.capabilities.manageInventory === true;

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    Promise.all([
      client.request({
        method: 'GET',
        path: '/inventory/thresholds',
        schema: erpInventoryThresholdListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/inventory/replenishment-suggestions',
        schema: erpReplenishmentSuggestionListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/inventory/levels',
        schema: erpStockLevelListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(([loadedThresholds, loadedSuggestions, loadedLevels]) => {
        if (abortController.signal.aborted) return;
        setThresholds(loadedThresholds);
        setSuggestions(loadedSuggestions);
        setLevels(loadedLevels);
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client, generation]);

  const warehouses = useMemo(() => {
    const byId = new Map(
      levels.map((level) => [level.warehouse.id, level.warehouse]),
    );
    return [...byId.values()].sort((left, right) =>
      left.code.localeCompare(right.code),
    );
  }, [levels]);
  const products = useMemo(() => {
    const byId = new Map(
      levels.map((level) => [level.product.id, level.product]),
    );
    return [...byId.values()].sort((left, right) =>
      left.code.localeCompare(right.code),
    );
  }, [levels]);

  const applyExistingThreshold = (
    selectedWarehouseId: string,
    selectedProductId: string,
  ) => {
    const existing = thresholds.find(
      (threshold) =>
        threshold.warehouseId === selectedWarehouseId &&
        threshold.productId === selectedProductId,
    );
    setMinimumQuantity(String(existing?.minimumQuantity ?? 0));
    setTargetQuantity(String(existing?.targetQuantity ?? 0));
    setReorderEnabled(existing?.reorderEnabled ?? true);
  };

  const openThreshold = (threshold?: ErpInventoryThreshold) => {
    const selectedWarehouseId =
      threshold?.warehouseId ?? warehouses[0]?.id ?? '';
    const selectedProductId = threshold?.productId ?? products[0]?.id ?? '';
    setWarehouseId(selectedWarehouseId);
    setProductId(selectedProductId);
    setError(null);
    if (threshold) {
      setMinimumQuantity(String(threshold.minimumQuantity));
      setTargetQuantity(String(threshold.targetQuantity));
      setReorderEnabled(threshold.reorderEnabled);
    } else {
      applyExistingThreshold(selectedWarehouseId, selectedProductId);
    }
    setIsOpen(true);
  };

  const saveThreshold = async () => {
    const minimum = Number(minimumQuantity);
    const target = Number(targetQuantity);
    if (
      warehouseId === '' ||
      productId === '' ||
      !Number.isFinite(minimum) ||
      !Number.isFinite(target) ||
      minimum < 0 ||
      target < minimum
    ) {
      setError('La cible doit être supérieure ou égale au seuil minimum.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/inventory/thresholds',
            schema: erpInventoryThresholdSchema,
            body: {
              warehouseId,
              productId,
              minimumQuantity: minimum,
              targetQuantity: target,
              reorderEnabled,
            },
          },
          { idempotency: 'required' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'Seuil de stock enregistré' });
      setIsOpen(false);
      setGeneration((value) => value + 1);
    } catch {
      setError("Le seuil n'a pas pu être enregistré.");
      enqueueErrorSnackBar({ message: 'Enregistrement impossible' });
    } finally {
      setIsSaving(false);
    }
  };

  const suggestionColumns = useMemo<
    ErpOperationalTableColumn<ErpReplenishmentSuggestion>[]
  >(
    () => [
      {
        key: 'product',
        header: 'Produit',
        width: '280px',
        render: (suggestion) =>
          `${suggestion.product.code} · ${suggestion.product.name}`,
      },
      {
        key: 'warehouse',
        header: 'Dépôt',
        width: '210px',
        render: (suggestion) => suggestion.warehouse.name,
      },
      {
        key: 'current',
        header: 'Disponible',
        width: '130px',
        align: 'right',
        render: (suggestion) =>
          `${suggestion.currentQuantity} ${suggestion.product.unit}`,
      },
      {
        key: 'minimum',
        header: 'Seuil',
        width: '120px',
        align: 'right',
        render: (suggestion) => suggestion.minimumQuantity,
      },
      {
        key: 'suggested',
        header: 'À commander',
        width: '150px',
        align: 'right',
        render: (suggestion) =>
          `${suggestion.suggestedQuantity} ${suggestion.product.unit}`,
      },
    ],
    [],
  );

  const thresholdColumns = useMemo<
    ErpOperationalTableColumn<ErpInventoryThreshold>[]
  >(
    () => [
      {
        key: 'product',
        header: 'Produit',
        width: '280px',
        render: (threshold) =>
          `${threshold.product.code} · ${threshold.product.name}`,
      },
      {
        key: 'warehouse',
        header: 'Dépôt',
        width: '210px',
        render: (threshold) => threshold.warehouse.name,
      },
      {
        key: 'minimum',
        header: 'Minimum',
        width: '130px',
        align: 'right',
        render: (threshold) => threshold.minimumQuantity,
      },
      {
        key: 'target',
        header: 'Cible',
        width: '130px',
        align: 'right',
        render: (threshold) => threshold.targetQuantity,
      },
      {
        key: 'enabled',
        header: 'Alerte',
        width: '110px',
        render: (threshold) =>
          threshold.reorderEnabled ? 'Active' : 'Inactive',
      },
      {
        key: 'action',
        header: 'Action',
        width: '130px',
        render: (threshold) =>
          canManage ? (
            <Button
              title="Modifier"
              ariaLabel={`Modifier le seuil ${threshold.product.name}`}
              variant="secondary"
              onClick={() => openThreshold(threshold)}
            />
          ) : (
            '—'
          ),
      },
    ],
    [canManage, thresholds],
  );

  return (
    <StyledContent>
      <StyledSection>
        <StyledSectionTitle>
          <StyledHeading>Alertes et propositions</StyledHeading>
        </StyledSectionTitle>
        <ErpOperationalTable
          ariaLabel="Propositions de réapprovisionnement"
          columns={suggestionColumns}
          rows={suggestions}
          getRowKey={(suggestion) => suggestion.thresholdId}
          state={state}
          loadingLabel="Calcul des besoins"
          emptyLabel="Aucun réapprovisionnement nécessaire"
          errorLabel="Impossible de calculer les besoins"
          retryLabel="Réessayer"
          onRetry={() => setGeneration((value) => value + 1)}
        />
      </StyledSection>
      <StyledSection>
        <StyledSectionTitle>
          <StyledHeading>Seuils configurés</StyledHeading>
          {canManage ? (
            <Button
              title="Configurer"
              ariaLabel="Configurer un seuil"
              Icon={IconAdjustments}
              variant="secondary"
              disabled={levels.length === 0}
              onClick={() => openThreshold()}
            />
          ) : null}
        </StyledSectionTitle>
        <ErpOperationalTable
          ariaLabel="Seuils de stock"
          columns={thresholdColumns}
          rows={thresholds}
          getRowKey={(threshold) => threshold.id}
          state={state}
          loadingLabel="Chargement des seuils"
          emptyLabel="Aucun seuil configuré"
          errorLabel="Impossible de charger les seuils"
          retryLabel="Réessayer"
          onRetry={() => setGeneration((value) => value + 1)}
        />
      </StyledSection>

      <ErpFormDrawer
        isOpen={isOpen}
        title="Seuil de réapprovisionnement"
        description="Une proposition apparaît lorsque le stock atteint le minimum."
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
              ariaLabel="Enregistrer le seuil"
              variant="primary"
              accent="blue"
              isLoading={isSaving}
              disabled={isSaving}
              onClick={() => void saveThreshold()}
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
                applyExistingThreshold(event.target.value, productId);
              }}
            >
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} · {warehouse.name}
                </option>
              ))}
            </StyledSelect>
          </StyledField>
          <StyledField>
            Produit
            <StyledSelect
              value={productId}
              disabled={isSaving}
              onChange={(event) => {
                setProductId(event.target.value);
                applyExistingThreshold(warehouseId, event.target.value);
              }}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.code} · {product.name}
                </option>
              ))}
            </StyledSelect>
          </StyledField>
          <TextInput
            label="Seuil minimum"
            type="number"
            min="0"
            step="0.001"
            value={minimumQuantity}
            disabled={isSaving}
            fullWidth
            onChange={setMinimumQuantity}
          />
          <TextInput
            label="Stock cible"
            type="number"
            min="0"
            step="0.001"
            value={targetQuantity}
            disabled={isSaving}
            fullWidth
            onChange={setTargetQuantity}
          />
          <StyledCheckbox>
            <input
              type="checkbox"
              checked={reorderEnabled}
              disabled={isSaving}
              onChange={(event) => setReorderEnabled(event.target.checked)}
            />
            Activer les propositions de réapprovisionnement
          </StyledCheckbox>
        </StyledDrawerFields>
      </ErpFormDrawer>
    </StyledContent>
  );
};
