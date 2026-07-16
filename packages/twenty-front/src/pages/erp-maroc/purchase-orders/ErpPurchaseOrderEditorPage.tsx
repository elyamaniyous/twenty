import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { ErpPurchaseOrderEditorForm } from '@/erp-maroc/purchase-orders/ErpPurchaseOrderEditorForm';
import {
  createEmptyPurchaseOrderValues,
  parsePurchaseOrderForm,
  type PurchaseOrderEditorFormValues,
  type PurchaseOrderFormError,
} from '@/erp-maroc/purchase-orders/purchaseOrderForm';
import { styled } from '@linaria/react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { generatePath, useNavigate } from 'react-router-dom';
import {
  erpPurchaseOrderSchema,
  erpTierListSchema,
  type ErpTier,
} from 'twenty-shared/erp-maroc';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledBlocked = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  padding: ${themeCssVariables.spacing[4]};
`;

export const ErpPurchaseOrderEditorPage = () => {
  const { client, context } = useErpMarocContext();
  const navigate = useNavigate();
  const [initialNow] = useState(() => new Date());
  const form = useForm<PurchaseOrderEditorFormValues>({
    defaultValues: createEmptyPurchaseOrderValues(initialNow),
  });
  const [suppliers, setSuppliers] = useState<ErpTier[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [generation, setGeneration] = useState(0);
  const [errors, setErrors] = useState<PurchaseOrderFormError[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canManage = context?.capabilities.manageSalesDocuments === true;

  useEffect(() => {
    const abortController = new AbortController();
    setLoadState('loading');

    client
      .request({
        method: 'GET',
        path: '/tiers',
        schema: erpTierListSchema,
        signal: abortController.signal,
      })
      .then((tiers) => {
        if (abortController.signal.aborted) return;
        const loadedSuppliers = tiers.filter(
          (tier) =>
            tier.isActive &&
            (tier.type === 'FOURNISSEUR' || tier.type === 'MIXTE'),
        );
        setSuppliers(loadedSuppliers);
        form.reset({
          ...createEmptyPurchaseOrderValues(initialNow),
          supplierId: loadedSuppliers[0]?.id ?? '',
        });
        setLoadState('ready');
      })
      .catch(() => {
        if (abortController.signal.aborted) return;
        setLoadState('error');
      });

    return () => abortController.abort();
  }, [client, form, generation, initialNow]);

  const handleSubmit = async (values: PurchaseOrderEditorFormValues) => {
    if (!canManage || isSubmitting) return;

    const parsed = parsePurchaseOrderForm({
      societeId: context?.societeId ?? '',
      values,
    });
    if (parsed.status === 'invalid') {
      setErrors(parsed.errors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);
    setSaveError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/purchase-orders',
          schema: erpPurchaseOrderSchema,
          body: parsed.payload,
        },
        { idempotency: 'forbidden' },
      );
      const order = await intent.execute();
      void navigate(
        generatePath(erpMarocPaths.purchaseOrderDetail, { id: order.id }),
      );
    } catch {
      setSaveError(
        'Impossible de créer le bon de commande. Vérifiez la liste avant de recommencer.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canManage) {
    return (
      <ErpPageShell title="Nouveau bon de commande">
        <StyledBlocked>
          Vous n'avez pas la permission de gérer les achats.
        </StyledBlocked>
      </ErpPageShell>
    );
  }

  if (loadState !== 'ready') {
    return (
      <ErpPageShell
        title="Nouveau bon de commande"
        state={loadState}
        loadingLabel="Chargement des fournisseurs"
        errorLabel="Impossible de charger les fournisseurs"
        retryLabel="Réessayer"
        onRetry={() => setGeneration((value) => value + 1)}
      />
    );
  }

  return (
    <ErpPageShell
      title="Nouveau bon de commande"
      description="Commande fournisseur en MAD"
    >
      <ErpPurchaseOrderEditorForm
        form={form}
        suppliers={suppliers}
        disabled={isSubmitting}
        errors={errors}
        saveError={saveError}
        onSubmit={handleSubmit}
      />
    </ErpPageShell>
  );
};
