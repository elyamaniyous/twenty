import { ErpLineItemEditor } from '@/erp-maroc/components/ErpLineItemEditor';
import { ErpTierSelect } from '@/erp-maroc/tiers/ErpTierSelect';
import { TextArea } from '@/ui/input/components/TextArea';
import { TextInput } from '@/ui/input/components/TextInput';
import { styled } from '@linaria/react';
import type { ReactNode } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import type { ErpTier } from 'twenty-shared/erp-maroc';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import type { InvoiceEditorFormValues } from './invoiceEditorForm';
import type { InvoiceFormError } from './invoiceFormSchema';

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
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledSelectLabel = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: block;
  font-size: ${themeCssVariables.font.size.sm};
  margin-bottom: ${themeCssVariables.spacing[1]};
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  min-height: 32px;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;
`;

type ErpInvoiceEditorFormProps = {
  form: UseFormReturn<InvoiceEditorFormValues>;
  tiers: ErpTier[];
  mode: 'create' | 'edit';
  disabled: boolean;
  saveDisabled: boolean;
  isSubmitting: boolean;
  errors: InvoiceFormError[];
  saveError: string | null;
  reconciliationSlot?: ReactNode;
  onSubmit: (values: InvoiceEditorFormValues) => void | Promise<void>;
};

const paymentOptions = [
  { label: 'Aucun', value: '' },
  { label: 'Virement bancaire', value: 'BANK_TRANSFER' },
  { label: 'Chèque', value: 'CHECK' },
  { label: 'Espèces', value: 'CASH' },
  { label: 'Carte', value: 'CARD' },
  { label: 'Prélèvement', value: 'DIRECT_DEBIT' },
  { label: 'Autre', value: 'OTHER' },
] as const;

export const ErpInvoiceEditorForm = ({
  form,
  tiers,
  mode,
  disabled,
  saveDisabled,
  isSubmitting,
  errors,
  saveError,
  reconciliationSlot,
  onSubmit,
}: ErpInvoiceEditorFormProps) => {
  const tierOptions = [
    { label: 'Sélectionner un tiers', value: '' },
    ...tiers.map(({ id, name }) => ({ label: name, value: id })),
  ];

  return (
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
        {reconciliationSlot}
        <Controller
          control={form.control}
          name="tierId"
          render={({ field }) => (
            <ErpTierSelect
              dropdownId="invoice-tier"
              label="Tiers"
              options={tierOptions}
              value={field.value}
              disabled={disabled}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={form.control}
          name="title"
          render={({ field }) => (
            <TextInput
              ref={field.ref}
              label="Titre"
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
          name="dueDate"
          render={({ field }) => (
            <TextInput
              ref={field.ref}
              label="Date d'échéance"
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
          name="paymentMethod"
          render={({ field }) => (
            <div>
              <StyledSelectLabel htmlFor="invoice-payment-method">
                Mode de paiement
              </StyledSelectLabel>
              <StyledSelect
                id="invoice-payment-method"
                value={field.value ?? ''}
                disabled={disabled}
                onBlur={field.onBlur}
                onChange={field.onChange}
              >
                {paymentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </StyledSelect>
            </div>
          )}
        />
        <Controller
          control={form.control}
          name="paymentReference"
          render={({ field }) => (
            <TextInput
              ref={field.ref}
              label="Référence de paiement"
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
                textAreaId="invoice-notes"
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
          title={mode === 'create' ? 'Créer la facture' : 'Enregistrer'}
          ariaLabel={mode === 'create' ? 'Créer la facture' : 'Enregistrer'}
          variant="primary"
          accent="blue"
          disabled={disabled || saveDisabled || isSubmitting}
          isLoading={isSubmitting}
        />
      </StyledFooter>
    </StyledForm>
  );
};
