import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import type {
  ProductFormValues,
  ProductReconciliationState,
} from '@/erp-maroc/products/productForm';
import { TextInput } from '@/ui/input/components/TextInput';
import { styled } from '@linaria/react';
import type { FormEventHandler, MutableRefObject } from 'react';
import { Controller, type Control, type UseFormReturn } from 'react-hook-form';
import { Button, Toggle } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledForm = styled.form`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
`;

const StyledFormBody = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: auto;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledFullWidth = styled.div`
  grid-column: 1 / -1;
`;

const StyledToggleField = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[2]};
  grid-column: 1 / -1;
`;

const StyledToggleLabel = styled.label`
  cursor: pointer;
`;

const StyledMutationAlert = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  grid-column: 1 / -1;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledDrawerFooter = styled.footer`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
  padding: ${themeCssVariables.spacing[3]};
`;

const FormTextField = ({
  control,
  name,
  label,
  type = 'text',
  inputMode,
  required = false,
  inputRef,
}: {
  control: Control<ProductFormValues>;
  name: Exclude<keyof ProductFormValues, 'isActive'>;
  label: string;
  type?: 'text' | 'number';
  inputMode?: 'decimal';
  required?: boolean;
  inputRef?: MutableRefObject<HTMLInputElement | null>;
}) => (
  <Controller
    control={control}
    name={name}
    rules={{ required }}
    render={({ field, fieldState }) => (
      <TextInput
        ref={(element) => {
          field.ref(element);
          if (inputRef !== undefined) inputRef.current = element;
        }}
        label={label}
        type={type}
        inputMode={inputMode}
        value={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        required={required}
        error={fieldState.error ? `${label} requis` : undefined}
        fullWidth
      />
    )}
  />
);

export const ErpProductFormDrawer = ({
  isOpen,
  isEditing,
  isMutating,
  canManageCatalog,
  mutationError,
  reconciliation,
  codeInputRef,
  form,
  onClose,
  onSubmit,
  onRetry,
  onAcknowledge,
}: {
  isOpen: boolean;
  isEditing: boolean;
  isMutating: boolean;
  canManageCatalog: boolean;
  mutationError: string | null;
  reconciliation: ProductReconciliationState;
  codeInputRef: MutableRefObject<HTMLInputElement | null>;
  form: UseFormReturn<ProductFormValues>;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onRetry: () => void;
  onAcknowledge: () => void;
}) => (
  <ErpFormDrawer
    isOpen={isOpen}
    title={isEditing ? 'Modifier le produit' : 'Nouveau produit'}
    description="Renseignez les informations du produit."
    isBusy={isMutating}
    initialFocusRef={codeInputRef}
    onClose={onClose}
  >
    <StyledForm onSubmit={onSubmit}>
      <StyledFormBody>
        <FormTextField
          control={form.control}
          name="code"
          label="Code"
          inputRef={codeInputRef}
          required
        />
        <FormTextField
          control={form.control}
          name="name"
          label="Nom"
          required
        />
        <StyledFullWidth>
          <FormTextField
            control={form.control}
            name="description"
            label="Description"
          />
        </StyledFullWidth>
        <FormTextField
          control={form.control}
          name="type"
          label="Type"
          required
        />
        <FormTextField
          control={form.control}
          name="unit"
          label="Unité"
          required
        />
        <FormTextField
          control={form.control}
          name="defaultPriceHt"
          label="Prix HT (MAD)"
          inputMode="decimal"
          required
        />
        <FormTextField
          control={form.control}
          name="tvaRate"
          label="TVA (%)"
          type="number"
          required
        />
        <FormTextField
          control={form.control}
          name="incomeAccountCode"
          label="Compte de produit"
        />
        <FormTextField
          control={form.control}
          name="expenseAccountCode"
          label="Compte de charge achat"
        />
        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <StyledToggleField>
              <Toggle
                id="erp-product-active"
                value={field.value}
                disabled={isMutating || !canManageCatalog}
                onChange={field.onChange}
              />
              <StyledToggleLabel htmlFor="erp-product-active">
                Actif
              </StyledToggleLabel>
            </StyledToggleField>
          )}
        />
        {mutationError === null ? null : (
          <StyledMutationAlert role="alert">
            <strong>
              {reconciliation === 'failed'
                ? 'Échec de vérification'
                : mutationError}
            </strong>
            {reconciliation === 'refreshing' ? (
              <span>Actualisation de la liste avant tout nouvel essai</span>
            ) : null}
            {reconciliation === 'failed' ? (
              <Button
                type="button"
                title="Réessayer l’actualisation"
                ariaLabel="Réessayer l’actualisation"
                variant="secondary"
                onClick={onRetry}
              />
            ) : null}
            {reconciliation === 'ready' ? (
              <Button
                type="button"
                title="J’ai vérifié, autoriser un nouvel essai"
                ariaLabel="J’ai vérifié, autoriser un nouvel essai"
                variant="secondary"
                onClick={onAcknowledge}
              />
            ) : null}
          </StyledMutationAlert>
        )}
      </StyledFormBody>
      <StyledDrawerFooter>
        <Button
          type="button"
          title="Annuler"
          ariaLabel="Annuler"
          variant="secondary"
          disabled={isMutating}
          onClick={onClose}
        />
        <Button
          type="submit"
          title="Enregistrer"
          ariaLabel="Enregistrer"
          accent="blue"
          disabled={!canManageCatalog || isMutating || reconciliation !== null}
          isLoading={isMutating}
        />
      </StyledDrawerFooter>
    </StyledForm>
  </ErpFormDrawer>
);
