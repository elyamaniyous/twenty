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
  flex: 1 1 260px;
  max-width: 420px;
`;

const StyledSegment = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledFilterButton = styled.span`
  display: inline-flex;
  flex: 0 0 88px;

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

export const ErpProductFilters = ({
  search,
  activeFilter,
  onChange,
}: {
  search: string;
  activeFilter: string;
  onChange: (changes: Record<string, string | null>) => void;
}) => (
  <StyledFilters>
    <StyledSearch>
      <TextInput
        label="Rechercher des produits"
        value={search}
        onChange={(value) => onChange({ search: value || null })}
        fullWidth
      />
    </StyledSearch>
    <StyledSegment aria-label="Filtrer par état">
      {[
        ['all', 'Tous'],
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
