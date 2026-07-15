import { styled } from '@linaria/react';
import { IconArrowLeft, IconArrowRight } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPagination = styled.nav`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
  min-height: 44px;
  padding: 0 ${themeCssVariables.spacing[4]};
`;

export const ErpInvoiceCursorPagination = ({
  hasPrevious,
  hasNext,
  disabled,
  onPrevious,
  onNext,
}: {
  hasPrevious: boolean;
  hasNext: boolean;
  disabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) => (
  <StyledPagination aria-label="Pagination des factures">
    <Button
      title="Page précédente"
      ariaLabel="Page précédente"
      Icon={IconArrowLeft}
      variant="secondary"
      disabled={disabled || !hasPrevious}
      onClick={onPrevious}
    />
    <Button
      title="Page suivante"
      ariaLabel="Page suivante"
      Icon={IconArrowRight}
      variant="secondary"
      disabled={disabled || !hasNext}
      onClick={onNext}
    />
  </StyledPagination>
);
