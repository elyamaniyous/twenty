import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import { ErpTierSelect } from '@/erp-maroc/tiers/ErpTierSelect';
import {
  TIER_ACCOUNT_OPTIONS,
  TIER_TYPE_OPTIONS,
  type ReconciliationState,
  type TierFormValues,
} from '@/erp-maroc/tiers/tierForm';
import { TextInput } from '@/ui/input/components/TextInput';
import { styled } from '@linaria/react';
import type { FormEventHandler } from 'react';
import { Controller, type Control, type UseFormReturn } from 'react-hook-form';
import { Button, Toggle } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledDrawerForm = styled.form`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
`;

const StyledDrawerBody = styled.div`
  box-sizing: border-box;
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: auto;
  padding: ${themeCssVariables.spacing[4]};
  width: 100%;

  @media (max-width: 768px) {
    grid-template-columns: minmax(0, 1fr);
    overflow-x: hidden;
    padding: ${themeCssVariables.spacing[3]};
  }

  @media (pointer: coarse) {
    button,
    [role='button'] {
      min-height: 44px;
    }
  }
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

const StyledAlert = styled.div`
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
}: {
  control: Control<TierFormValues>;
  name: Exclude<
    keyof TierFormValues,
    'type' | 'compteCollectifCode' | 'isActive'
  >;
  label: string;
  type?: 'text' | 'number';
  inputMode?: 'decimal';
  required?: boolean;
}) => (
  <Controller
    control={control}
    name={name}
    rules={{ required }}
    render={({ field, fieldState }) => (
      <TextInput
        ref={field.ref}
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

export type ErpTierFormDrawerProps = {
  isOpen: boolean;
  mode: 'create' | 'edit';
  form: UseFormReturn<TierFormValues>;
  isBusy: boolean;
  canManageTiers: boolean;
  mutationError: string | null;
  reconciliation: ReconciliationState;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
  onRetryReconciliation: () => void;
  onAcknowledgeReconciliation: () => void;
};

export const ErpTierFormDrawer = ({
  isOpen,
  mode,
  form,
  isBusy,
  canManageTiers,
  mutationError,
  reconciliation,
  onSubmit,
  onClose,
  onRetryReconciliation,
  onAcknowledgeReconciliation,
}: ErpTierFormDrawerProps) => (
  <ErpFormDrawer
    isOpen={isOpen}
    title={mode === 'edit' ? 'Modifier le tiers' : 'Nouveau tiers'}
    description="Renseignez les informations du tiers."
    isBusy={isBusy}
    onClose={onClose}
  >
    <StyledDrawerForm onSubmit={onSubmit}>
      <StyledDrawerBody>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <ErpTierSelect
              dropdownId="erp-tier-form-type"
              label="Type"
              value={field.value}
              options={TIER_TYPE_OPTIONS}
              disabled={isBusy || !canManageTiers}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={form.control}
          name="compteCollectifCode"
          render={({ field }) => (
            <ErpTierSelect
              dropdownId="erp-tier-form-account"
              label="Compte collectif"
              value={field.value}
              options={TIER_ACCOUNT_OPTIONS}
              disabled={isBusy || !canManageTiers}
              onChange={field.onChange}
            />
          )}
        />
        <StyledFullWidth>
          <FormTextField
            control={form.control}
            name="name"
            label="Nom"
            required
          />
        </StyledFullWidth>
        <FormTextField control={form.control} name="email" label="E-mail" />
        <FormTextField control={form.control} name="phone" label="Téléphone" />
        <FormTextField control={form.control} name="ice" label="ICE" />
        <FormTextField
          control={form.control}
          name="identifiantFiscal"
          label="Identifiant fiscal"
        />
        <StyledFullWidth>
          <FormTextField
            control={form.control}
            name="address"
            label="Adresse"
          />
        </StyledFullWidth>
        <FormTextField control={form.control} name="city" label="Ville" />
        <FormTextField
          control={form.control}
          name="paymentDelayDays"
          label="Délai de paiement (jours)"
          type="number"
        />
        <FormTextField
          control={form.control}
          name="creditLimit"
          label="Plafond de crédit (MAD)"
          inputMode="decimal"
        />
        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <StyledToggleField>
              <Toggle
                id="erp-tier-active"
                value={field.value}
                disabled={isBusy || !canManageTiers}
                onChange={field.onChange}
              />
              <StyledToggleLabel htmlFor="erp-tier-active">
                Actif
              </StyledToggleLabel>
            </StyledToggleField>
          )}
        />
        {mutationError === null ? null : (
          <StyledAlert role="alert">
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
                onClick={onRetryReconciliation}
              />
            ) : null}
            {reconciliation === 'ready' ? (
              <Button
                type="button"
                title="J’ai vérifié, autoriser un nouvel essai"
                ariaLabel="J’ai vérifié, autoriser un nouvel essai"
                variant="secondary"
                onClick={onAcknowledgeReconciliation}
              />
            ) : null}
          </StyledAlert>
        )}
      </StyledDrawerBody>
      <StyledDrawerFooter>
        <Button
          type="button"
          title="Annuler"
          ariaLabel="Annuler"
          variant="secondary"
          disabled={isBusy}
          onClick={onClose}
        />
        <Button
          type="submit"
          title="Enregistrer"
          ariaLabel="Enregistrer"
          accent="blue"
          disabled={!canManageTiers || isBusy || reconciliation !== null}
          isLoading={isBusy}
        />
      </StyledDrawerFooter>
    </StyledDrawerForm>
  </ErpFormDrawer>
);
