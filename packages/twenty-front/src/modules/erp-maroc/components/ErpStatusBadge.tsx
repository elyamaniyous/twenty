import { styled } from '@linaria/react';
import {
  IconAlertTriangle,
  IconCheck,
  IconCircleX,
  IconClock,
  IconInfoCircle,
  type IconComponent,
} from 'twenty-ui/display';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export type ErpStatusTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

export type ErpStatusBadgeProps = {
  label: string;
  tone?: ErpStatusTone;
  Icon?: IconComponent;
  className?: string;
};

const statusAppearance = {
  neutral: {
    background: themeCssVariables.tag.background.gray,
    color: themeCssVariables.tag.text.gray,
    Icon: IconClock,
  },
  info: {
    background: themeCssVariables.tag.background.blue,
    color: themeCssVariables.tag.text.blue,
    Icon: IconInfoCircle,
  },
  success: {
    background: themeCssVariables.tag.background.green,
    color: themeCssVariables.tag.text.green,
    Icon: IconCheck,
  },
  warning: {
    background: themeCssVariables.tag.background.yellow,
    color: themeCssVariables.tag.text.yellow,
    Icon: IconAlertTriangle,
  },
  danger: {
    background: themeCssVariables.tag.background.red,
    color: themeCssVariables.tag.text.red,
    Icon: IconCircleX,
  },
} as const;

const StyledBadge = styled.span<{ tone: ErpStatusTone }>`
  align-items: center;
  background: ${({ tone }) => statusAppearance[tone].background};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${({ tone }) => statusAppearance[tone].color};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[1]};
  height: 24px;
  letter-spacing: 0;
  max-width: 100%;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledLabel = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const ErpStatusBadge = ({
  label,
  tone = 'neutral',
  Icon,
  className,
}: ErpStatusBadgeProps) => {
  const StatusIcon = Icon ?? statusAppearance[tone].Icon;

  return (
    <StyledBadge className={className} tone={tone} role="status">
      <span aria-hidden="true">
        <StatusIcon size={14} />
      </span>
      <StyledLabel>{label}</StyledLabel>
    </StyledBadge>
  );
};
