import { t } from '@lingui/core/macro';
import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { IconRefresh } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export type ErpOperationalTableState = 'ready' | 'loading' | 'empty' | 'error';

export type ErpOperationalTableColumn<Row> = {
  key: string;
  header: ReactNode;
  width: string;
  align?: 'left' | 'center' | 'right';
  render: (row: Row) => ReactNode;
};

export type ErpOperationalTableProps<Row> = {
  ariaLabel: string;
  columns: ErpOperationalTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  state?: ErpOperationalTableState;
  loadingLabel?: string;
  emptyLabel?: string;
  errorLabel?: string;
  retryLabel?: string;
  onRetry?: () => void;
};

const StyledContainer = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  width: 100%;
`;

const StyledScrollRegion = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: auto;
  overflow-y: auto;
  width: 100%;

  &:focus-visible {
    box-shadow: inset 0 0 0 2px ${themeCssVariables.color.blue};
    outline: none;
  }
`;

const StyledTable = styled.table`
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
`;

const StyledHeaderCell = styled.th<{ align: 'left' | 'center' | 'right' }>`
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  height: 36px;
  letter-spacing: 0;
  overflow: hidden;
  padding: 0 ${themeCssVariables.spacing[3]};
  text-align: ${({ align }) => align};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledCell = styled.td<{ align: 'left' | 'center' | 'right' }>`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  height: 40px;
  max-width: 0;
  overflow: hidden;
  padding: 0 ${themeCssVariables.spacing[3]};
  text-align: ${({ align }) => align};
  text-overflow: ellipsis;
  white-space: nowrap;
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
`;

const getMinimumTableWidth = <Row,>(
  columns: ErpOperationalTableColumn<Row>[],
) => {
  const pixelWidths = columns.map(({ width }) => /^(\d+)px$/.exec(width));

  if (pixelWidths.some((match) => match === null)) {
    return '100%';
  }

  return `${pixelWidths.reduce(
    (total, match) => total + Number(match?.[1] ?? 0),
    0,
  )}px`;
};

export const ErpOperationalTable = <Row,>({
  ariaLabel,
  columns,
  rows,
  getRowKey,
  state = 'ready',
  loadingLabel,
  emptyLabel,
  errorLabel,
  retryLabel,
  onRetry,
}: ErpOperationalTableProps<Row>) => {
  const effectiveState =
    state === 'ready' && rows.length === 0 ? 'empty' : state;
  const resolvedLoadingLabel = loadingLabel ?? t`Loading`;
  const resolvedEmptyLabel = emptyLabel ?? t`No results`;
  const resolvedErrorLabel = errorLabel ?? t`Unable to load data`;
  const resolvedRetryLabel = retryLabel ?? t`Retry`;

  if (effectiveState !== 'ready') {
    return (
      <StyledContainer>
        <StyledState
          role={effectiveState === 'error' ? 'alert' : 'status'}
          aria-live={effectiveState === 'loading' ? 'polite' : undefined}
        >
          <span>
            {effectiveState === 'loading'
              ? resolvedLoadingLabel
              : effectiveState === 'empty'
                ? resolvedEmptyLabel
                : resolvedErrorLabel}
          </span>
          {effectiveState === 'error' && onRetry !== undefined ? (
            <Button
              title={resolvedRetryLabel}
              ariaLabel={resolvedRetryLabel}
              Icon={IconRefresh}
              variant="secondary"
              onClick={onRetry}
            />
          ) : null}
        </StyledState>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer>
      <StyledScrollRegion
        data-testid="erp-table-scroll"
        role="region"
        aria-label={t`${ariaLabel} table`}
        tabIndex={0}
      >
        <StyledTable
          aria-label={ariaLabel}
          style={{ minWidth: getMinimumTableWidth(columns) }}
        >
          <colgroup>
            {columns.map((column) => (
              <col
                key={column.key}
                data-testid={`erp-table-column-${column.key}`}
                style={{ width: column.width }}
              />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((column) => (
                <StyledHeaderCell
                  key={column.key}
                  scope="col"
                  align={column.align ?? 'left'}
                >
                  {column.header}
                </StyledHeaderCell>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <StyledCell key={column.key} align={column.align ?? 'left'}>
                    {column.render(row)}
                  </StyledCell>
                ))}
              </tr>
            ))}
          </tbody>
        </StyledTable>
      </StyledScrollRegion>
    </StyledContainer>
  );
};
