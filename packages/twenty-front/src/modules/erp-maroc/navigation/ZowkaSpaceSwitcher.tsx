import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { NavigationDrawerAnimatedCollapseWrapper } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerAnimatedCollapseWrapper';
import { styled } from '@linaria/react';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { useNavigate } from 'react-router-dom';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useActiveZowkaSpace } from './useActiveZowkaSpace';
import {
  getZowkaSpaceHomePath,
  ZOWKA_SPACE_IDS,
  zowkaSpaceDefinitions,
} from './zowkaSpaces';

const StyledSwitcher = styled.div<{ $spaceCount: number }>`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  display: grid;
  gap: ${themeCssVariables.spacing[0.5]};
  grid-template-columns: repeat(
    ${({ $spaceCount }) => $spaceCount},
    minmax(0, 1fr)
  );
  height: ${themeCssVariables.spacing[8]};
  padding: ${themeCssVariables.spacing[0.5]};
  width: 100%;
`;

const StyledSpaceButton = styled.button<{ $active: boolean }>`
  align-items: center;
  background: ${({ $active }) =>
    $active ? themeCssVariables.background.transparent.light : 'transparent'};
  border: 0;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ $active }) =>
    $active
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  font-family: ${themeCssVariables.font.family};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[1]};
  justify-content: center;
  min-width: 0;
  overflow: hidden;
  padding: 0 ${themeCssVariables.spacing[1]};
  white-space: nowrap;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledLabel = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ZowkaSpaceSwitcher = () => {
  const { i18n } = useLingui();
  const navigate = useNavigate();
  const state = useErpMarocContext();
  const activeSpace = useActiveZowkaSpace();

  if (state.status !== 'ready') {
    return null;
  }

  const availableSpaces = ZOWKA_SPACE_IDS.filter(
    (spaceId) => state.spaceAccess?.[spaceId] ?? true,
  );

  return (
    <NavigationDrawerAnimatedCollapseWrapper>
      <StyledSwitcher
        role="tablist"
        aria-label={i18n._(msg`Espaces Zowka`)}
        $spaceCount={availableSpaces.length}
      >
        {availableSpaces.map((spaceId) => {
          const space = zowkaSpaceDefinitions[spaceId];
          const isActive = activeSpace === spaceId;

          return (
            <StyledSpaceButton
              key={spaceId}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={i18n._(space.label)}
              $active={isActive}
              onClick={() => navigate(getZowkaSpaceHomePath(spaceId))}
            >
              <space.Icon size={16} />
              <StyledLabel>{i18n._(space.label)}</StyledLabel>
            </StyledSpaceButton>
          );
        })}
      </StyledSwitcher>
    </NavigationDrawerAnimatedCollapseWrapper>
  );
};
