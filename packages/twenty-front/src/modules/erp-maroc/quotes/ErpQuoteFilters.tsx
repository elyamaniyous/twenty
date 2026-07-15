import { ErpTierSelect } from '@/erp-maroc/tiers/ErpTierSelect';
import { styled } from '@linaria/react';
import { useLayoutEffect, useRef } from 'react';
import type { ErpQuote, ErpTier } from 'twenty-shared/erp-maroc';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const STATUS_OPTIONS: ReadonlyArray<{
  value: 'all' | ErpQuote['status'];
  label: string;
}> = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'DRAFT', label: 'Brouillons' },
  { value: 'SENT', label: 'Envoyés' },
  { value: 'ACCEPTED', label: 'Acceptés' },
  { value: 'REJECTED', label: 'Refusés' },
  { value: 'EXPIRED', label: 'Expirés' },
  { value: 'CONVERTED', label: 'Convertis' },
];

const StyledFilters = styled.div`
  align-items: flex-end;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const StyledStatusGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledFilterButton = styled.span`
  display: inline-flex;
`;

const StyledTierFilter = styled.div`
  flex: 0 1 260px;
  min-width: 210px;
`;

const StyledLoadedLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin-left: auto;
`;

const StatusFilterButton = ({
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

export const ErpQuoteFilters = ({
  status,
  tierId,
  tiers,
  onChange,
}: {
  status: string;
  tierId: string;
  tiers: ErpTier[];
  onChange: (changes: Record<string, string | null>) => void;
}) => (
  <StyledFilters>
    <StyledStatusGroup aria-label="Filtrer les devis par statut">
      {STATUS_OPTIONS.map((option) => (
        <StatusFilterButton
          key={option.value}
          label={option.label}
          pressed={status === option.value}
          onClick={() =>
            onChange({ status: option.value === 'all' ? null : option.value })
          }
        />
      ))}
    </StyledStatusGroup>
    <StyledTierFilter>
      <ErpTierSelect
        dropdownId="erp-quote-tier-filter"
        label="Client"
        value={tierId}
        options={[
          { value: '', label: 'Tous les clients' },
          ...tiers.map(({ id, name }) => ({ value: id, label: name })),
        ]}
        onChange={(value) => onChange({ tierId: value || null })}
      />
    </StyledTierFilter>
    <StyledLoadedLabel>Page chargée</StyledLoadedLabel>
  </StyledFilters>
);
