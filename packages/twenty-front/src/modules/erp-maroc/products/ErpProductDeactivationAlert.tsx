import type { ProductReconciliationState } from '@/erp-maroc/products/productForm';
import { RootStackingContextZIndices } from '@/ui/layout/constants/RootStackingContextZIndices';
import { styled } from '@linaria/react';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledDeactivationAlert = styled.div`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  left: 50%;
  max-width: min(420px, calc(100vw - 32px));
  padding: ${themeCssVariables.spacing[3]};
  position: fixed;
  top: ${themeCssVariables.spacing[4]};
  transform: translateX(-50%);
  width: max-content;
  z-index: ${RootStackingContextZIndices.Dialog + 1};
`;

export const ErpProductDeactivationAlert = ({
  reconciliation,
  message,
  onRetry,
  onAcknowledge,
}: {
  reconciliation: Exclude<ProductReconciliationState, null>;
  message: string;
  onRetry: () => void;
  onAcknowledge: () => void;
}) => (
  <StyledDeactivationAlert role="alert">
    <strong>
      {reconciliation === 'failed' ? 'Échec de vérification' : message}
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
  </StyledDeactivationAlert>
);
