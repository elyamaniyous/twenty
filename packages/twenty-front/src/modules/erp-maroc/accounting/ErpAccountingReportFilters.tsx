import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type ErpAccountingReportFiltersProps = {
  from: string;
  to: string;
  includeDraft: boolean;
  disabled?: boolean;
  leading?: ReactNode;
  onChange: (changes: Record<string, string | null>) => void;
};

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledFilter = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledDate = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

export const ErpAccountingReportFilters = ({
  from,
  to,
  includeDraft,
  disabled = false,
  leading,
  onChange,
}: ErpAccountingReportFiltersProps) => (
  <StyledToolbar>
    {leading}
    <StyledFilter>
      Du
      <StyledDate
        type="date"
        aria-label="Date comptable de début"
        value={from}
        disabled={disabled}
        onChange={(event) => onChange({ from: event.target.value || null })}
      />
    </StyledFilter>
    <StyledFilter>
      Au
      <StyledDate
        type="date"
        aria-label="Date comptable de fin"
        value={to}
        disabled={disabled}
        onChange={(event) => onChange({ to: event.target.value || null })}
      />
    </StyledFilter>
    <StyledFilter>
      <input
        type="checkbox"
        aria-label="Inclure les écritures à contrôler"
        checked={includeDraft}
        disabled={disabled}
        onChange={(event) =>
          onChange({ includeDraft: event.target.checked ? 'true' : null })
        }
      />
      Inclure les brouillons
    </StyledFilter>
  </StyledToolbar>
);
