import { TextInput } from '@/ui/input/components/TextInput';
import { styled } from '@linaria/react';
import { useLayoutEffect, useRef } from 'react';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledFilters = styled.div`
  align-items: flex-end;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const StyledSearch = styled.div`
  flex: 1 1 240px;
  max-width: 360px;
`;

const StyledSegment = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledFilterButton = styled.span`
  display: inline-flex;
  flex: 0 0 108px;

  > div {
    width: 100%;
  }
`;

const StyledLoadedLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin-left: auto;
`;

const FilterButton = ({
  label,
  isPressed,
  onClick,
}: {
  label: string;
  isPressed: boolean;
  onClick: () => void;
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    containerRef.current
      ?.querySelector('button')
      ?.setAttribute('aria-pressed', String(isPressed));
  }, [isPressed]);

  return (
    <StyledFilterButton ref={containerRef}>
      <Button
        title={label}
        ariaLabel={label}
        variant={isPressed ? 'primary' : 'secondary'}
        size="small"
        fullWidth
        justify="center"
        onClick={onClick}
      />
    </StyledFilterButton>
  );
};

export type ErpTierFiltersProps = {
  search: string;
  typeFilter: string;
  activeFilter: string;
  onChange: (changes: Record<string, string | null>) => void;
};

export const ErpTierFilters = ({
  search,
  typeFilter,
  activeFilter,
  onChange,
}: ErpTierFiltersProps) => (
  <StyledFilters>
    <StyledSearch>
      <TextInput
        label="Rechercher des tiers"
        value={search}
        onChange={(value) => onChange({ search: value || null })}
        fullWidth
      />
    </StyledSearch>
    <StyledSegment aria-label="Filtrer par type">
      {[
        ['all', 'Tous types'],
        ['CLIENT', 'Clients'],
        ['FOURNISSEUR', 'Fournisseurs'],
        ['MIXTE', 'Mixtes'],
      ].map(([value, label]) => (
        <FilterButton
          key={value}
          label={label}
          isPressed={typeFilter === value}
          onClick={() => onChange({ type: value === 'all' ? null : value })}
        />
      ))}
    </StyledSegment>
    <StyledSegment aria-label="Filtrer par état">
      {[
        ['all', 'Tous états'],
        ['active', 'Actifs'],
        ['inactive', 'Inactifs'],
      ].map(([value, label]) => (
        <FilterButton
          key={value}
          label={label}
          isPressed={activeFilter === value}
          onClick={() => onChange({ active: value === 'all' ? null : value })}
        />
      ))}
    </StyledSegment>
    <StyledLoadedLabel>Page chargée</StyledLoadedLabel>
  </StyledFilters>
);
