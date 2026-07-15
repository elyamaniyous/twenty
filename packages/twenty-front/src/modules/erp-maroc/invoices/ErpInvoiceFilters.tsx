import { styled } from '@linaria/react';
import { useLayoutEffect, useRef } from 'react';
import type { ErpInvoiceRead } from 'twenty-shared/erp-maroc';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type InvoiceFilterChange = Record<string, string | null>;

const STATUS_OPTIONS: ReadonlyArray<{
  value: 'all' | ErpInvoiceRead['status'];
  label: string;
}> = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'DRAFT', label: 'Brouillons' },
  { value: 'VALIDATED', label: 'Validées' },
  { value: 'SENT', label: 'Envoyées' },
  { value: 'PARTIALLY_PAID', label: 'Partiellement réglées' },
  { value: 'PAID', label: 'Payées' },
  { value: 'OVERDUE', label: 'Échues' },
  { value: 'CANCELLED', label: 'Annulées' },
];

const DELIVERY_OPTIONS = [
  { value: 'all', label: 'Tous les courriels' },
  { value: 'PENDING', label: 'Courriels en attente' },
  { value: 'PROCESSING', label: 'Courriels en cours' },
  { value: 'SENT', label: 'Courriels envoyés' },
  { value: 'FAILED', label: 'Courriels échoués' },
  { value: 'RECONCILIATION_REQUIRED', label: 'Vérification requise' },
] as const;

const StyledFilters = styled.div`
  align-items: flex-end;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const StyledGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledFilterButton = styled.span`
  display: inline-flex;
`;

const StyledLimit = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  margin-left: auto;
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 28px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledLoadedLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const FilterButton = ({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) => {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    ref.current
      ?.querySelector('button')
      ?.setAttribute('aria-pressed', String(pressed));
  }, [pressed]);

  return (
    <StyledFilterButton ref={ref}>
      <Button
        title={label}
        ariaLabel={label}
        variant={pressed ? 'primary' : 'secondary'}
        size="small"
        onClick={onClick}
      />
    </StyledFilterButton>
  );
};

export const ErpInvoiceFilters = ({
  status,
  delivery,
  limit,
  showLoadedPage,
  onChange,
}: {
  status: string;
  delivery: string;
  limit: string;
  showLoadedPage: boolean;
  onChange: (changes: InvoiceFilterChange) => void;
}) => (
  <StyledFilters>
    <StyledGroup aria-label="Filtrer les factures par statut">
      {STATUS_OPTIONS.map((option) => (
        <FilterButton
          key={option.value}
          label={option.label}
          pressed={status === option.value}
          onClick={() =>
            onChange({ status: option.value === 'all' ? null : option.value })
          }
        />
      ))}
    </StyledGroup>
    <StyledGroup aria-label="Filtrer les factures par courriel">
      {DELIVERY_OPTIONS.map((option) => (
        <FilterButton
          key={option.value}
          label={option.label}
          pressed={delivery === option.value}
          onClick={() =>
            onChange({ delivery: option.value === 'all' ? null : option.value })
          }
        />
      ))}
    </StyledGroup>
    <StyledLimit>
      Factures par page
      <StyledSelect
        aria-label="Factures par page"
        value={limit || '50'}
        onChange={(event) =>
          onChange({
            limit: event.target.value === '50' ? null : event.target.value,
          })
        }
      >
        <option value="25">25</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </StyledSelect>
    </StyledLimit>
    {showLoadedPage ? (
      <StyledLoadedLabel>Page chargée</StyledLoadedLabel>
    ) : null}
  </StyledFilters>
);
