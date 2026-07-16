import { ErpLineItemEditor } from '@/erp-maroc/components/ErpLineItemEditor';
import type {
  PurchaseOrderEditorFormValues,
  PurchaseOrderFormError,
} from '@/erp-maroc/purchase-orders/purchaseOrderForm';
import { ErpTierSelect } from '@/erp-maroc/tiers/ErpTierSelect';
import { TextArea } from '@/ui/input/components/TextArea';
import { TextInput } from '@/ui/input/components/TextInput';
import { styled } from '@linaria/react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import type { ErpTier } from 'twenty-shared/erp-maroc';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledForm = styled.form`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
`;

const StyledBody = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-height: 0;
  overflow: auto;
  padding: ${themeCssVariables.spacing[4]};

  @media (max-width: 768px) {
    grid-template-columns: minmax(0, 1fr);
    padding: ${themeCssVariables.spacing[3]};
  }
`;

const StyledFullWidth = styled.div`
  grid-column: 1 / -1;
  min-width: 0;
`;

const StyledErrors = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  color: ${themeCssVariables.font.color.danger};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  grid-column: 1 / -1;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledFooter = styled.footer`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  justify-content: flex-end;
  padding: ${themeCssVariables.spacing[3]};
`;

export const ErpPurchaseOrderEditorForm = ({
  form,
  suppliers,
  disabled,
  errors,
  saveError,
  onSubmit,
}: {
  form: UseFormReturn<PurchaseOrderEditorFormValues>;
  suppliers: ErpTier[];
  disabled: boolean;
  errors: PurchaseOrderFormError[];
  saveError: string | null;
  onSubmit: (values: PurchaseOrderEditorFormValues) => void | Promise<void>;
}) => (
  <StyledForm onSubmit={form.handleSubmit(onSubmit)} noValidate>
    <StyledBody>
      {errors.length > 0 || saveError !== null ? (
        <StyledErrors role="alert">
          {errors.map((error) => (
            <span key={`${error.path}-${error.code}`}>{error.message}</span>
          ))}
          {saveError === null ? null : <span>{saveError}</span>}
        </StyledErrors>
      ) : null}
      <Controller
        control={form.control}
        name="supplierId"
        render={({ field }) => (
          <ErpTierSelect
            dropdownId="purchase-order-supplier"
            label="Fournisseur"
            options={[
              { label: 'Sélectionner un fournisseur', value: '' },
              ...suppliers.map(({ id, name }) => ({ label: name, value: id })),
            ]}
            value={field.value}
            disabled={disabled}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="issueDate"
        render={({ field }) => (
          <TextInput
            ref={field.ref}
            label="Date d'émission"
            type="date"
            value={field.value}
            disabled={disabled}
            fullWidth
            onBlur={field.onBlur}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={form.control}
        name="expectedDeliveryDate"
        render={({ field }) => (
          <TextInput
            ref={field.ref}
            label="Livraison prévue"
            type="date"
            value={field.value ?? ''}
            disabled={disabled}
            fullWidth
            onBlur={field.onBlur}
            onChange={field.onChange}
          />
        )}
      />
      <StyledFullWidth>
        <Controller
          control={form.control}
          name="notes"
          render={({ field }) => (
            <TextArea
              textAreaId="purchase-order-notes"
              label="Notes"
              value={field.value ?? ''}
              disabled={disabled}
              minRows={3}
              onBlur={field.onBlur}
              onChange={field.onChange}
            />
          )}
        />
      </StyledFullWidth>
      <StyledFullWidth>
        <Controller
          control={form.control}
          name="lines"
          render={({ field }) => (
            <ErpLineItemEditor
              items={field.value}
              disabled={disabled}
              onChange={field.onChange}
            />
          )}
        />
      </StyledFullWidth>
    </StyledBody>
    <StyledFooter>
      <Button
        type="submit"
        title="Créer le bon de commande"
        ariaLabel="Créer le bon de commande"
        variant="primary"
        accent="blue"
        disabled={disabled}
        isLoading={disabled}
      />
    </StyledFooter>
  </StyledForm>
);
