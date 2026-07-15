import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { ErpProductFilters } from '@/erp-maroc/products/ErpProductFilters';
import { ErpProductFormDrawer } from '@/erp-maroc/products/ErpProductFormDrawer';
import { ErpProductDeactivationAlert } from '@/erp-maroc/products/ErpProductDeactivationAlert';
import {
  EMPTY_PRODUCT_FORM,
  PRODUCT_TVA_RATES,
  REQUIRED_PRODUCT_FIELDS,
  productToFormValues,
  type ProductDrawerState,
  type ProductFormValues,
  type ProductReconciliationState,
} from '@/erp-maroc/products/productForm';
import {
  formatMadDecimal,
  parseMadDecimalToTransportNumber,
} from '@/erp-maroc/utils/money';
import {
  canonicalizeErpQueryState,
  updateErpQueryState,
} from '@/erp-maroc/utils/queryState';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import {
  erpProductListSchema,
  erpProductSchema,
  type ErpProduct,
} from 'twenty-shared/erp-maroc';
import { IconEdit, IconPlus, IconPower } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPageContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const getReconciliationMessage = (error: unknown) => {
  if (!(error instanceof ErpMarocError) || error.statusCode >= 500) {
    return 'État à vérifier';
  }
  if (error.statusCode === 409) {
    return 'Conflit ERP : vérifiez les données actualisées';
  }
  if (error.statusCode === 429) {
    return 'Limitation ERP : vérifiez les données actualisées';
  }
  return null;
};

export const ErpProductsPage = () => {
  const { client, context } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<ErpProduct[]>([]);
  const [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [listGeneration, setListGeneration] = useState(0);
  const [drawer, setDrawer] = useState<ProductDrawerState | null>(null);
  const [productToDeactivate, setProductToDeactivate] =
    useState<ErpProduct | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [reconciliation, setReconciliation] =
    useState<ProductReconciliationState>(null);
  const [deactivationReconciliation, setDeactivationReconciliation] =
    useState<ProductReconciliationState>(null);
  const [deactivationMessage, setDeactivationMessage] = useState<string | null>(
    null,
  );
  // The lock must update synchronously before React can process a second submit.
  // oxlint-disable-next-line twenty/no-state-useref
  const mutationLock = useRef(false);
  // This request-lifecycle marker must not trigger another list request render.
  // oxlint-disable-next-line twenty/no-state-useref
  const hasLoadedProducts = useRef(false);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<ProductFormValues>({
    defaultValues: EMPTY_PRODUCT_FORM,
  });
  const hasCatalogPermission = () =>
    context?.capabilities.manageCatalog === true;
  const canManageCatalog = hasCatalogPermission();

  const canonicalSearchParams = useMemo(
    () => canonicalizeErpQueryState('products', searchParams),
    [searchParams],
  );

  useEffect(() => {
    if (searchParams.toString() !== canonicalSearchParams.toString()) {
      setSearchParams(canonicalSearchParams, { replace: true });
    }
  }, [canonicalSearchParams, searchParams, setSearchParams]);

  useEffect(() => {
    const abortController = new AbortController();
    let isCurrent = true;
    const isBackgroundRefresh = hasLoadedProducts.current;
    if (!isBackgroundRefresh) {
      setListStatus('loading');
    }

    client
      .request({
        method: 'GET',
        path: '/products',
        schema: erpProductListSchema,
        signal: abortController.signal,
      })
      .then((loadedProducts) => {
        if (!isCurrent || abortController.signal.aborted) return;
        hasLoadedProducts.current = true;
        setProducts(loadedProducts);
        setListStatus('ready');
        setReconciliation((current) =>
          current === 'refreshing' ? 'ready' : current,
        );
        setDeactivationReconciliation((current) =>
          current === 'refreshing' ? 'ready' : current,
        );
      })
      .catch(() => {
        if (!isCurrent || abortController.signal.aborted) return;
        setListStatus('error');
        setReconciliation((current) =>
          current === 'refreshing' ? 'failed' : current,
        );
        setDeactivationReconciliation((current) =>
          current === 'refreshing' ? 'failed' : current,
        );
      });

    return () => {
      isCurrent = false;
      abortController.abort();
    };
  }, [client, listGeneration]);

  const search = canonicalSearchParams.get('search') ?? '';
  const activeFilter = canonicalSearchParams.get('active') ?? 'all';
  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        normalizedSearch === '' ||
        [product.code, product.name, product.type, product.unit].some((value) =>
          value.toLocaleLowerCase().includes(normalizedSearch),
        );
      const matchesActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' ? product.isActive : !product.isActive);
      return matchesSearch && matchesActive;
    });
  }, [activeFilter, products, search]);

  const updateFilters = (changes: Record<string, string | null>) =>
    setSearchParams(
      updateErpQueryState('products', canonicalSearchParams, changes),
    );

  const retryList = () => {
    setReconciliation((current) =>
      current === 'failed' ? 'refreshing' : current,
    );
    setDeactivationReconciliation((current) =>
      current === 'failed' ? 'refreshing' : current,
    );
    setListGeneration((current) => current + 1);
  };

  const openCreate = () => {
    if (!hasCatalogPermission()) return;
    form.reset(EMPTY_PRODUCT_FORM);
    setMutationError(null);
    setReconciliation(null);
    setDrawer({ mode: 'create' });
  };

  const openEdit = (product: ErpProduct) => {
    if (!hasCatalogPermission()) return;
    form.reset(productToFormValues(product));
    setMutationError(null);
    setReconciliation(null);
    setDrawer({ mode: 'edit', product });
  };

  const closeDrawer = () => {
    if (mutationLock.current) return;
    setDrawer(null);
    setMutationError(null);
    setReconciliation(null);
  };

  const submitProduct = form.handleSubmit(async (values) => {
    if (
      drawer === null ||
      context === null ||
      !hasCatalogPermission() ||
      mutationLock.current ||
      reconciliation !== null
    )
      return;

    let hasMissingRequiredField = false;
    for (const fieldName of REQUIRED_PRODUCT_FIELDS) {
      if (values[fieldName].trim() === '') {
        form.setError(fieldName, { type: 'required' });
        hasMissingRequiredField = true;
      }
    }
    if (hasMissingRequiredField) return;

    const tvaRate = Number(values.tvaRate);
    let defaultPriceHt: number;
    try {
      defaultPriceHt = parseMadDecimalToTransportNumber(values.defaultPriceHt);
    } catch {
      setMutationError('Vérifiez le prix HT et le taux de TVA');
      return;
    }
    if (!Number.isSafeInteger(tvaRate) || !PRODUCT_TVA_RATES.has(tvaRate)) {
      setMutationError('Vérifiez le prix HT et le taux de TVA');
      return;
    }

    const body = {
      societeId: context.societeId,
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description.trim() || null,
      type: values.type.trim(),
      unit: values.unit.trim(),
      defaultPriceHt,
      tvaRate,
      incomeAccountCode: values.incomeAccountCode.trim() || null,
      isActive: values.isActive,
    };

    mutationLock.current = true;
    setIsMutating(true);
    setMutationError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: drawer.mode === 'create' ? 'POST' : 'PATCH',
          path:
            drawer.mode === 'create'
              ? '/products'
              : `/products/${drawer.product.id}`,
          schema: erpProductSchema,
          body,
        },
        { idempotency: 'forbidden' },
      );
      const saved = await intent.execute();
      setProducts((current) =>
        drawer.mode === 'create'
          ? [...current, saved]
          : current.map((product) =>
              product.id === saved.id ? saved : product,
            ),
      );
      enqueueSuccessSnackBar({
        message:
          drawer.mode === 'create' ? 'Produit créé' : 'Produit mis à jour',
      });
      setDrawer(null);
      form.reset(EMPTY_PRODUCT_FORM);
    } catch (error) {
      const reconciliationMessage = getReconciliationMessage(error);
      if (reconciliationMessage !== null) {
        setMutationError(reconciliationMessage);
        setReconciliation('refreshing');
        setListGeneration((current) => current + 1);
      } else {
        setMutationError('La modification a été refusée');
      }
      enqueueErrorSnackBar({ message: 'Impossible d’enregistrer le produit' });
    } finally {
      mutationLock.current = false;
      setIsMutating(false);
    }
  });

  const deactivate = async () => {
    if (
      productToDeactivate === null ||
      !hasCatalogPermission() ||
      mutationLock.current ||
      deactivationReconciliation !== null
    )
      return;
    mutationLock.current = true;
    setIsDeactivating(true);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'DELETE',
          path: `/products/${productToDeactivate.id}`,
          schema: erpProductSchema,
        },
        { idempotency: 'forbidden' },
      );
      const saved = await intent.execute();
      setProducts((current) =>
        current.map((product) => (product.id === saved.id ? saved : product)),
      );
      setProductToDeactivate(null);
      setDeactivationReconciliation(null);
      setDeactivationMessage(null);
      enqueueSuccessSnackBar({ message: 'Produit désactivé' });
    } catch (error) {
      const reconciliationMessage = getReconciliationMessage(error);
      if (reconciliationMessage !== null) {
        setDeactivationMessage(reconciliationMessage);
        setDeactivationReconciliation('refreshing');
        setListGeneration((current) => current + 1);
      }
      enqueueErrorSnackBar({ message: 'Impossible de désactiver le produit' });
    } finally {
      mutationLock.current = false;
      setIsDeactivating(false);
    }
  };

  const columns: ErpOperationalTableColumn<ErpProduct>[] = [
    { key: 'code', header: 'Code', width: '120px', render: (row) => row.code },
    { key: 'name', header: 'Nom', width: '220px', render: (row) => row.name },
    { key: 'type', header: 'Type', width: '120px', render: (row) => row.type },
    { key: 'unit', header: 'Unité', width: '100px', render: (row) => row.unit },
    {
      key: 'price',
      header: 'Prix HT',
      width: '120px',
      align: 'right',
      render: (row) => formatMadDecimal(row.defaultPriceHt),
    },
    {
      key: 'tva',
      header: 'TVA',
      width: '80px',
      align: 'right',
      render: (row) => `${row.tvaRate}%`,
    },
    {
      key: 'state',
      header: 'État',
      width: '100px',
      render: (row) => (
        <ErpStatusBadge
          label={row.isActive ? 'Actif' : 'Inactif'}
          tone={row.isActive ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '210px',
      render: (row) => (
        <StyledActions>
          {canManageCatalog ? (
            <Button
              title="Modifier"
              ariaLabel={`Modifier ${row.name}`}
              Icon={IconEdit}
              variant="tertiary"
              size="small"
              onClick={() => openEdit(row)}
            />
          ) : null}
          {canManageCatalog && row.isActive ? (
            <Button
              title="Désactiver"
              ariaLabel={`Désactiver ${row.name}`}
              Icon={IconPower}
              variant="tertiary"
              size="small"
              onClick={() => {
                if (hasCatalogPermission()) {
                  setDeactivationMessage(null);
                  setProductToDeactivate(row);
                }
              }}
            />
          ) : null}
        </StyledActions>
      ),
    },
  ];

  return (
    <ErpPageShell
      title="Produits"
      actions={
        canManageCatalog ? (
          <Button
            title="Nouveau produit"
            ariaLabel="Nouveau produit"
            Icon={IconPlus}
            accent="blue"
            onClick={openCreate}
          />
        ) : null
      }
    >
      <StyledPageContent>
        <ErpProductFilters
          search={search}
          activeFilter={activeFilter}
          onChange={updateFilters}
        />
        <ErpOperationalTable
          ariaLabel="Produits"
          columns={columns}
          rows={filteredProducts}
          getRowKey={(row) => row.id}
          state={listStatus}
          loadingLabel="Chargement des produits"
          emptyLabel="Aucun produit sur la page chargée"
          errorLabel="Impossible de charger les produits"
          retryLabel="Réessayer"
          onRetry={retryList}
        />
      </StyledPageContent>

      <ErpProductFormDrawer
        isOpen={drawer !== null}
        isEditing={drawer?.mode === 'edit'}
        isMutating={isMutating}
        canManageCatalog={canManageCatalog}
        mutationError={mutationError}
        reconciliation={reconciliation}
        codeInputRef={codeInputRef}
        form={form}
        onClose={closeDrawer}
        onSubmit={submitProduct}
        onRetry={retryList}
        onAcknowledge={() => {
          setReconciliation(null);
          setMutationError(null);
        }}
      />

      {deactivationReconciliation === null ? null : (
        <ErpProductDeactivationAlert
          reconciliation={deactivationReconciliation}
          message={deactivationMessage ?? 'État à vérifier'}
          onRetry={retryList}
          onAcknowledge={() => {
            setDeactivationReconciliation(null);
            setDeactivationMessage(null);
          }}
        />
      )}

      <ErpConfirmDialog
        isOpen={productToDeactivate !== null}
        title="Désactiver le produit"
        message="Le produit restera visible avec l’état inactif."
        confirmLabel="Désactiver"
        destructive
        confirmDisabled={
          !canManageCatalog || deactivationReconciliation !== null
        }
        isConfirming={isDeactivating}
        onCancel={() => {
          if (deactivationReconciliation === null) {
            setProductToDeactivate(null);
          }
        }}
        onConfirm={deactivate}
      />
    </ErpPageShell>
  );
};
