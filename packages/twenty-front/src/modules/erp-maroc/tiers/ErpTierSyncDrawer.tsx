import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import type {
  TwentyCompanySyncPreview,
  TwentyCompanySyncSource,
} from '@/erp-maroc/tiers/buildTwentyCompanySyncPreview';
import {
  ErpTierSelect,
  type ErpTierSelectOption,
} from '@/erp-maroc/tiers/ErpTierSelect';
import {
  PREVIEW_FIELDS,
  TIER_ACCOUNT_OPTIONS,
  TIER_TYPE_OPTIONS,
  isCollectiveAccount,
  isTierType,
  tierPreviewValueLabel,
  type ReconciliationState,
  type SyncFormValues,
  type TwentyCompanyRecord,
  type TwentyPersonRecord,
} from '@/erp-maroc/tiers/tierForm';
import { TextInput } from '@/ui/input/components/TextInput';
import { styled } from '@linaria/react';
import type { FormEventHandler } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
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

const StyledPicker = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledPickerState = styled.div`
  align-items: flex-start;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
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

const StyledPreviewRegion = styled.div`
  grid-column: 1 / -1;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  width: 100%;
`;

const StyledPreview = styled.table`
  border-collapse: collapse;
  min-width: 720px;
  table-layout: fixed;
  width: 100%;

  th,
  td {
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.sm};
    overflow-wrap: anywhere;
    padding: ${themeCssVariables.spacing[2]};
    text-align: left;
    vertical-align: top;
  }

  th {
    color: ${themeCssVariables.font.color.secondary};
    font-weight: ${themeCssVariables.font.weight.semiBold};
  }
`;

const StyledPreviewValue = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledDrawerFooter = styled.footer`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
  padding: ${themeCssVariables.spacing[3]};
`;

type PickerState<Record> = {
  options: Record[];
  loadedCount: number;
  loading: boolean;
  error: unknown;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
};

export type ErpTierSyncDrawerProps = {
  isOpen: boolean;
  form: UseFormReturn<SyncFormValues>;
  preview: TwentyCompanySyncPreview | null;
  selectedCompanyId: string;
  overwriteConfirmed: boolean;
  companyPicker: PickerState<TwentyCompanyRecord>;
  targetedCompanyResolution: {
    status: 'not-required' | 'loading' | 'error' | 'unresolved' | 'resolved';
    onRetry: () => void;
  };
  peoplePicker: PickerState<TwentyPersonRecord>;
  linkedPersonResolution: {
    status: 'not-required' | 'loading' | 'error' | 'unresolved' | 'resolved';
    selectedPersonId: string;
    onRetry: () => void;
  };
  mutation: {
    isBusy: boolean;
    canManageTiers: boolean;
    error: string | null;
    reconciliation: ReconciliationState;
  };
  onSelectCompany: (companyId: string) => void;
  onSelectPerson: (personId: string) => void;
  onChangePreviewSource: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
  onRetryReconciliation: () => void;
  onAcknowledgeReconciliation: () => void;
};

export const ErpTierSyncDrawer = ({
  isOpen,
  form,
  preview,
  selectedCompanyId,
  overwriteConfirmed,
  companyPicker,
  targetedCompanyResolution,
  peoplePicker,
  linkedPersonResolution,
  mutation,
  onSelectCompany,
  onSelectPerson,
  onChangePreviewSource,
  onSubmit,
  onClose,
  onRetryReconciliation,
  onAcknowledgeReconciliation,
}: ErpTierSyncDrawerProps) => {
  const sources = form.watch('sources');
  const manualValues = form.watch('manualValues');
  const personOptions = peoplePicker.options.map((person) => ({
    label:
      `${person.name.firstName} ${person.name.lastName}`.trim() ||
      'Contact sans nom',
    value: person.id,
  }));
  if (
    linkedPersonResolution.selectedPersonId !== '' &&
    personOptions.every(
      ({ value }) => value !== linkedPersonResolution.selectedPersonId,
    )
  ) {
    personOptions.unshift({
      label:
        linkedPersonResolution.status === 'loading'
          ? 'Contact lié en cours de chargement'
          : 'Contact lié indisponible',
      value: linkedPersonResolution.selectedPersonId,
    });
  }

  const resolvedPreviewValue = (
    key: (typeof PREVIEW_FIELDS)[number]['key'],
  ) => {
    if (preview === null) return null;
    const previewField = preview[key];
    const source = sources[key];
    if (source === 'manual') return manualValues[key];
    if (source === previewField.selected) return previewField.proposed;
    return source === 'crm' ? previewField.crm : previewField.erp;
  };

  const renderManualPreviewControl = (
    key: (typeof PREVIEW_FIELDS)[number]['key'],
    label: string,
  ) => {
    const manualLabel = `Valeur manuelle pour ${label}`;
    return (
      <Controller
        control={form.control}
        name={`manualValues.${key}`}
        render={({ field }) => {
          const onChange = (value: string) => {
            field.onChange(value);
            onChangePreviewSource();
          };

          if (key === 'type') {
            return (
              <ErpTierSelect
                dropdownId="erp-tier-sync-manual-type"
                label={manualLabel}
                value={isTierType(field.value) ? field.value : 'CLIENT'}
                options={TIER_TYPE_OPTIONS}
                onChange={onChange}
              />
            );
          }

          if (key === 'compteCollectifCode') {
            return (
              <ErpTierSelect
                dropdownId="erp-tier-sync-manual-account"
                label={manualLabel}
                value={isCollectiveAccount(field.value) ? field.value : '3421'}
                options={TIER_ACCOUNT_OPTIONS}
                onChange={onChange}
              />
            );
          }

          return (
            <TextInput
              ref={field.ref}
              label={manualLabel}
              value={field.value}
              inputMode={key === 'creditLimit' ? 'decimal' : undefined}
              onChange={onChange}
              onBlur={field.onBlur}
              fullWidth
            />
          );
        }}
      />
    );
  };

  return (
    <ErpFormDrawer
      isOpen={isOpen}
      title="Synchroniser depuis Twenty"
      description="Vérifiez les valeurs finales avant la synchronisation."
      isBusy={mutation.isBusy}
      onClose={onClose}
    >
      <StyledDrawerForm onSubmit={onSubmit}>
        <StyledDrawerBody>
          <StyledPicker>
            <Controller
              control={form.control}
              name="companySearch"
              render={({ field }) => (
                <TextInput
                  ref={field.ref}
                  label="Rechercher une société"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  fullWidth
                />
              )}
            />
            <Controller
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <ErpTierSelect
                  dropdownId="erp-tier-sync-company"
                  label="Société Twenty"
                  value={field.value}
                  options={[
                    { label: 'Sélectionner une société', value: '' },
                    ...companyPicker.options.map((company) => ({
                      label: company.name.trim() || 'Société sans nom',
                      value: company.id,
                    })),
                  ]}
                  onChange={onSelectCompany}
                />
              )}
            />
            {targetedCompanyResolution.status === 'loading' ? (
              <StyledPickerState role="status">
                Chargement de la société ciblée
              </StyledPickerState>
            ) : targetedCompanyResolution.status === 'error' ? (
              <StyledPickerState role="alert">
                <span>Impossible de charger la société ciblée</span>
                <Button
                  title="Réessayer la société ciblée"
                  ariaLabel="Réessayer la société ciblée"
                  variant="secondary"
                  size="small"
                  onClick={targetedCompanyResolution.onRetry}
                />
              </StyledPickerState>
            ) : targetedCompanyResolution.status === 'unresolved' ? (
              <StyledPickerState role="alert">
                <span>Société ciblée introuvable</span>
                <Button
                  title="Réessayer la société ciblée"
                  ariaLabel="Réessayer la société ciblée"
                  variant="secondary"
                  size="small"
                  onClick={targetedCompanyResolution.onRetry}
                />
              </StyledPickerState>
            ) : targetedCompanyResolution.status ===
              'resolved' ? null : companyPicker.loading ? (
              <StyledPickerState role="status">
                Chargement des sociétés
              </StyledPickerState>
            ) : companyPicker.error ? (
              <StyledPickerState role="alert">
                <span>Impossible de charger les sociétés</span>
                <Button
                  title="Réessayer les sociétés"
                  ariaLabel="Réessayer les sociétés"
                  variant="secondary"
                  size="small"
                  onClick={companyPicker.onRetry}
                />
              </StyledPickerState>
            ) : companyPicker.loadedCount === 0 ? (
              <StyledPickerState>Aucune société trouvée</StyledPickerState>
            ) : null}
            {companyPicker.hasNextPage && !companyPicker.error ? (
              <Button
                title="Charger plus de sociétés"
                ariaLabel="Charger plus de sociétés"
                variant="secondary"
                size="small"
                disabled={companyPicker.loading}
                onClick={companyPicker.onLoadMore}
              />
            ) : null}
          </StyledPicker>
          <StyledPicker>
            <Controller
              control={form.control}
              name="personId"
              render={({ field }) => (
                <ErpTierSelect
                  dropdownId="erp-tier-sync-person"
                  label="Contact Twenty"
                  value={field.value}
                  disabled={selectedCompanyId === ''}
                  options={[
                    { label: 'Aucun contact', value: '' },
                    ...personOptions,
                  ]}
                  onChange={onSelectPerson}
                />
              )}
            />
            {selectedCompanyId !== '' && peoplePicker.loading ? (
              <StyledPickerState role="status">
                Chargement des contacts
              </StyledPickerState>
            ) : selectedCompanyId !== '' && peoplePicker.error ? (
              <StyledPickerState role="alert">
                <span>Impossible de charger les contacts</span>
                <Button
                  title="Réessayer les contacts"
                  ariaLabel="Réessayer les contacts"
                  variant="secondary"
                  size="small"
                  onClick={peoplePicker.onRetry}
                />
              </StyledPickerState>
            ) : selectedCompanyId !== '' && peoplePicker.loadedCount === 0 ? (
              <StyledPickerState>Aucun contact trouvé</StyledPickerState>
            ) : null}
            {linkedPersonResolution.status === 'loading' ? (
              <StyledPickerState role="status">
                Chargement du contact lié
              </StyledPickerState>
            ) : linkedPersonResolution.status === 'error' ? (
              <StyledPickerState role="alert">
                <span>Impossible de charger le contact lié</span>
                <Button
                  title="Réessayer le contact lié"
                  ariaLabel="Réessayer le contact lié"
                  variant="secondary"
                  size="small"
                  onClick={linkedPersonResolution.onRetry}
                />
              </StyledPickerState>
            ) : linkedPersonResolution.status === 'unresolved' ? (
              <StyledPickerState role="alert">
                <span>Contact lié introuvable</span>
                <Button
                  title="Réessayer le contact lié"
                  ariaLabel="Réessayer le contact lié"
                  variant="secondary"
                  size="small"
                  onClick={linkedPersonResolution.onRetry}
                />
              </StyledPickerState>
            ) : null}
            {selectedCompanyId !== '' &&
            peoplePicker.hasNextPage &&
            !peoplePicker.error ? (
              <Button
                title="Charger plus de contacts"
                ariaLabel="Charger plus de contacts"
                variant="secondary"
                size="small"
                disabled={peoplePicker.loading}
                onClick={peoplePicker.onLoadMore}
              />
            ) : null}
          </StyledPicker>
          {preview === null ? (
            <StyledAlert role="alert">
              Sélectionnez une société Twenty
            </StyledAlert>
          ) : (
            <StyledPreviewRegion
              role="region"
              aria-label="Aperçu de synchronisation"
              tabIndex={0}
            >
              <StyledPreview aria-label="Aperçu de synchronisation">
                <thead>
                  <tr>
                    <th>Champ</th>
                    <th>CRM</th>
                    <th>ERP actuel</th>
                    <th>Valeur envoyée</th>
                  </tr>
                </thead>
                <tbody>
                  {PREVIEW_FIELDS.map(({ key, label }) => {
                    const previewField = preview[key];
                    const sourceOptions: ErpTierSelectOption<TwentyCompanySyncSource>[] =
                      [
                        { label: 'ERP actuel', value: 'erp' },
                        { label: 'Valeur manuelle', value: 'manual' },
                      ];
                    if (previewField.crm !== null) {
                      sourceOptions.splice(1, 0, {
                        label: 'Twenty',
                        value: 'crm',
                      });
                    }
                    return (
                      <tr key={key}>
                        <th scope="row">{label}</th>
                        <td>{tierPreviewValueLabel(previewField.crm)}</td>
                        <td>{tierPreviewValueLabel(previewField.erp)}</td>
                        <td>
                          <StyledPreviewValue>
                            <Controller
                              control={form.control}
                              name={`sources.${key}`}
                              render={({ field }) => (
                                <>
                                  <ErpTierSelect<TwentyCompanySyncSource>
                                    dropdownId={`erp-tier-sync-source-${key}`}
                                    label={`Source pour ${label}`}
                                    value={field.value}
                                    options={sourceOptions}
                                    onChange={(value) => {
                                      field.onChange(value);
                                      onChangePreviewSource();
                                    }}
                                  />
                                  {field.value === 'manual'
                                    ? renderManualPreviewControl(key, label)
                                    : null}
                                  <output
                                    aria-label={`Valeur envoyée pour ${label}`}
                                  >
                                    {tierPreviewValueLabel(
                                      resolvedPreviewValue(key),
                                    )}
                                  </output>
                                </>
                              )}
                            />
                          </StyledPreviewValue>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </StyledPreview>
            </StyledPreviewRegion>
          )}
          {preview === null ? null : (
            <StyledToggleField>
              <Controller
                control={form.control}
                name="overwriteConfirmed"
                render={({ field }) => (
                  <Toggle
                    id="erp-tier-sync-confirmed"
                    value={field.value}
                    disabled={mutation.isBusy || !mutation.canManageTiers}
                    onChange={field.onChange}
                  />
                )}
              />
              <StyledToggleLabel htmlFor="erp-tier-sync-confirmed">
                Je confirme les valeurs modifiées
              </StyledToggleLabel>
            </StyledToggleField>
          )}
          {mutation.error === null ? null : (
            <StyledAlert role="alert">
              <strong>
                {mutation.reconciliation === 'failed'
                  ? 'Échec de vérification'
                  : mutation.error}
              </strong>
              {mutation.reconciliation === 'refreshing' ? (
                <span>Actualisation de la liste avant tout nouvel essai</span>
              ) : null}
              {mutation.reconciliation === 'failed' ? (
                <Button
                  type="button"
                  title="Réessayer l’actualisation"
                  ariaLabel="Réessayer l’actualisation"
                  variant="secondary"
                  onClick={onRetryReconciliation}
                />
              ) : null}
              {mutation.reconciliation === 'ready' ? (
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
            disabled={mutation.isBusy}
            onClick={onClose}
          />
          <Button
            type="submit"
            title="Synchroniser"
            ariaLabel="Synchroniser"
            accent="blue"
            disabled={
              preview === null ||
              !overwriteConfirmed ||
              !mutation.canManageTiers ||
              mutation.isBusy ||
              mutation.reconciliation !== null ||
              (targetedCompanyResolution.status !== 'not-required' &&
                targetedCompanyResolution.status !== 'resolved') ||
              (linkedPersonResolution.status !== 'not-required' &&
                linkedPersonResolution.status !== 'resolved')
            }
            isLoading={mutation.isBusy}
          />
        </StyledDrawerFooter>
      </StyledDrawerForm>
    </ErpFormDrawer>
  );
};
