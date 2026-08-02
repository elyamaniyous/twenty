import { PageBody } from '@/ui/layout/page/components/PageBody';
import { t } from '@lingui/core/macro';
import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { IconRefresh } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export type ErpPageShellState = 'ready' | 'loading' | 'empty' | 'error';

export type ErpPageShellProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  state?: ErpPageShellState;
  loadingLabel?: string;
  emptyLabel?: string;
  errorLabel?: string;
  retryLabel?: string;
  emptyAction?: ReactNode;
  onRetry?: () => void;
};

const StyledShell = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  width: 100%;
`;

const StyledHeader = styled.header`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  min-height: 56px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};

  @media (max-width: 720px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const StyledHeadingGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[0.5]};
  min-width: 0;
`;

const StyledTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  line-height: 24px;
  margin: 0;
  overflow-wrap: anywhere;
`;

const StyledDescription = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  letter-spacing: 0;
  line-height: 18px;
  margin: 0;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};

  @media (max-width: 720px) {
    width: 100%;
  }
`;

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const StyledState = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[3]};
  justify-content: center;
  min-height: 160px;
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
`;

export const ErpPageShell = ({
  title,
  description,
  actions,
  children,
  state = 'ready',
  loadingLabel,
  emptyLabel,
  errorLabel,
  retryLabel,
  emptyAction,
  onRetry,
}: ErpPageShellProps) => {
  const resolvedLoadingLabel = loadingLabel ?? t`Loading`;
  const resolvedEmptyLabel = emptyLabel ?? t`No results`;
  const resolvedErrorLabel = errorLabel ?? t`Something went wrong`;
  const resolvedRetryLabel = retryLabel ?? t`Retry`;

  const stateContent =
    state === 'loading' ? (
      <StyledState role="status" aria-live="polite">
        {resolvedLoadingLabel}
      </StyledState>
    ) : state === 'empty' ? (
      <StyledState>
        <span>{resolvedEmptyLabel}</span>
        {emptyAction}
      </StyledState>
    ) : state === 'error' ? (
      <StyledState role="alert">
        <span>{resolvedErrorLabel}</span>
        {onRetry === undefined ? null : (
          <Button
            title={resolvedRetryLabel}
            ariaLabel={resolvedRetryLabel}
            Icon={IconRefresh}
            variant="secondary"
            onClick={onRetry}
          />
        )}
      </StyledState>
    ) : (
      children
    );

  return (
    <PageBody>
      <StyledShell data-testid="erp-page-shell" data-density="compact">
        <StyledHeader>
          <StyledHeadingGroup>
            <StyledTitle>{title}</StyledTitle>
            {description === undefined ? null : (
              <StyledDescription>{description}</StyledDescription>
            )}
          </StyledHeadingGroup>
          {actions === undefined ? null : (
            <StyledActions aria-label={t`Page actions`}>
              {actions}
            </StyledActions>
          )}
        </StyledHeader>
        <StyledContent>{stateContent}</StyledContent>
      </StyledShell>
    </PageBody>
  );
};
