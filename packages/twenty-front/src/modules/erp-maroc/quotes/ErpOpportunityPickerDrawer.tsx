import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import type {
  OpportunityQuotePayloadError,
  TwentyOpportunityRecord,
} from '@/erp-maroc/quotes/buildOpportunityQuotePayload';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export type QuoteReconciliationState =
  | null
  | 'refreshing'
  | 'failed'
  | 'needs-ack';

type OpportunityPickerState = {
  records: TwentyOpportunityRecord[];
  loading: boolean;
  error: unknown;
  hasNextPage: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
  loadingLabel?: string;
  errorLabel?: string;
  emptyLabel?: string;
  retryLabel?: string;
};

const StyledContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  min-height: 0;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledOpportunityButton = styled.button<{ selected: boolean }>`
  background: ${({ selected }) =>
    selected
      ? themeCssVariables.background.transparent.blue
      : themeCssVariables.background.primary};
  border: 1px solid
    ${({ selected }) =>
      selected
        ? themeCssVariables.color.blue
        : themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  letter-spacing: 0;
  padding: ${themeCssVariables.spacing[3]};
  text-align: left;
  width: 100%;

  &:disabled {
    opacity: 0.7;
  }
`;

const StyledOpportunityName = styled.span`
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledOpportunityMeta = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledState = styled.div`
  align-items: flex-start;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]} 0;
`;

const StyledAlert = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const opportunityAmountLabel = (opportunity: TwentyOpportunityRecord) => {
  if (opportunity.amount === null) return 'Montant indisponible';
  try {
    const amountMicros = opportunity.amount.amountMicros;
    if (!Number.isSafeInteger(amountMicros) || amountMicros % 10_000 !== 0) {
      throw new TypeError('Opportunity amount must use exact cents');
    }
    return `${formatMadCents(amountMicros / 10_000)} (${opportunity.amount.currencyCode})`;
  } catch {
    return `Montant invalide (${opportunity.amount.currencyCode})`;
  }
};

const opportunityContactLabel = (opportunity: TwentyOpportunityRecord) => {
  const name = opportunity.pointOfContact?.name;
  if (typeof name === 'string') return name;
  if (name === null || name === undefined) return 'Contact indisponible';
  return (
    `${name.firstName ?? ''} ${name.lastName ?? ''}`.trim() ||
    'Contact indisponible'
  );
};

export const ErpOpportunityPickerDrawer = ({
  isOpen,
  selected,
  picker,
  errors,
  mutationError,
  reconciliation,
  canManage,
  isSubmitting,
  onSelect,
  onClose,
  onSubmit,
  onRetryReconciliation,
  onAcknowledge,
}: {
  isOpen: boolean;
  selected: TwentyOpportunityRecord | null;
  picker: OpportunityPickerState;
  errors: OpportunityQuotePayloadError[];
  mutationError: string | null;
  reconciliation: QuoteReconciliationState;
  canManage: boolean;
  isSubmitting: boolean;
  onSelect: (opportunity: TwentyOpportunityRecord) => void;
  onClose: () => void;
  onSubmit: () => void;
  onRetryReconciliation: () => void;
  onAcknowledge: () => void;
}) => {
  const footer = (
    <>
      <Button
        title="Annuler"
        ariaLabel="Annuler"
        variant="secondary"
        disabled={isSubmitting || reconciliation !== null}
        onClick={onClose}
      />
      <Button
        title="Créer le devis"
        ariaLabel="Créer le devis"
        variant="primary"
        disabled={
          !canManage ||
          selected === null ||
          isSubmitting ||
          reconciliation !== null
        }
        onClick={onSubmit}
      />
    </>
  );

  return (
    <ErpFormDrawer
      isOpen={isOpen}
      title="Créer depuis une opportunité"
      description="Sélectionnez une opportunité CRM à convertir en brouillon de devis."
      footer={footer}
      isBusy={isSubmitting || reconciliation !== null}
      onClose={onClose}
    >
      <StyledContent>
        {picker.loading && picker.records.length === 0 ? (
          <StyledState role="status">
            {picker.loadingLabel ?? 'Chargement des opportunités'}
          </StyledState>
        ) : picker.error !== undefined ? (
          <StyledState role="alert">
            <span>
              {picker.errorLabel ?? 'Impossible de charger les opportunités'}
            </span>
            <Button
              title={picker.retryLabel ?? 'Réessayer les opportunités'}
              ariaLabel={picker.retryLabel ?? 'Réessayer les opportunités'}
              variant="secondary"
              onClick={picker.onRetry}
            />
          </StyledState>
        ) : picker.records.length === 0 ? (
          <StyledState>
            {picker.emptyLabel ?? 'Aucune opportunité sur la page chargée'}
          </StyledState>
        ) : (
          <StyledList aria-label="Opportunités CRM">
            {picker.records.map((opportunity) => (
              <StyledOpportunityButton
                key={opportunity.id}
                type="button"
                disabled={isSubmitting || reconciliation !== null}
                selected={selected?.id === opportunity.id}
                aria-pressed={selected?.id === opportunity.id}
                onClick={() => onSelect(opportunity)}
              >
                <StyledOpportunityName>
                  {opportunity.name}
                </StyledOpportunityName>
                <StyledOpportunityMeta>
                  {opportunity.company?.name ?? 'Société indisponible'} ·{' '}
                  {opportunityContactLabel(opportunity)} ·{' '}
                  {opportunityAmountLabel(opportunity)}
                </StyledOpportunityMeta>
              </StyledOpportunityButton>
            ))}
          </StyledList>
        )}

        {picker.hasNextPage && picker.error === undefined ? (
          <Button
            title="Charger plus"
            ariaLabel="Charger plus"
            variant="secondary"
            disabled={picker.loading}
            onClick={picker.onLoadMore}
          />
        ) : null}

        {errors.length === 0 ? null : (
          <StyledAlert role="alert">
            {errors.map((error) => (
              <span key={`${error.field}-${error.code}`}>{error.message}</span>
            ))}
          </StyledAlert>
        )}

        {mutationError === null ? null : (
          <StyledAlert role="alert">{mutationError}</StyledAlert>
        )}

        {reconciliation === null ? null : (
          <StyledAlert role="alert">
            <strong>
              {reconciliation === 'refreshing'
                ? 'Vérification du devis'
                : reconciliation === 'failed'
                  ? 'Échec de vérification'
                  : 'État à vérifier'}
            </strong>
            <span>
              Aucun nouvel envoi ne sera effectué avant la vérification de la
              liste.
            </span>
            {reconciliation === 'failed' ? (
              <Button
                title="Réessayer la vérification"
                ariaLabel="Réessayer la vérification"
                variant="secondary"
                onClick={onRetryReconciliation}
              />
            ) : reconciliation === 'needs-ack' ? (
              <Button
                title="J'ai vérifié"
                ariaLabel="J'ai vérifié"
                variant="secondary"
                onClick={onAcknowledge}
              />
            ) : null}
          </StyledAlert>
        )}
      </StyledContent>
    </ErpFormDrawer>
  );
};
