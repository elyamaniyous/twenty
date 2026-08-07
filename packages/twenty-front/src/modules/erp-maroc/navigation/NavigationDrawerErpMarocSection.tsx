import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { NavigationDrawerAnimatedCollapseWrapper } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerAnimatedCollapseWrapper';
import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { NavigationDrawerSectionTitle } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSectionTitle';
import { useLingui } from '@lingui/react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useActiveZowkaSpace } from './useActiveZowkaSpace';
import {
  getVisibleZowkaGroups,
  isZowkaNavigationItemActive,
  zowkaSpaceDefinitions,
} from './zowkaSpaces';

export const NavigationDrawerErpMarocSection = () => {
  const { i18n } = useLingui();
  const { pathname } = useLocation();
  const state = useErpMarocContext();
  const activeSpaceId = useActiveZowkaSpace();
  const activeSpace = zowkaSpaceDefinitions[activeSpaceId];
  const visibleGroups = useMemo(
    () =>
      state.status === 'ready'
        ? getVisibleZowkaGroups(activeSpace, state.context)
        : [],
    [activeSpace, state],
  );
  const activeGroupId = visibleGroups.find((group) =>
    group.items.some((item) => isZowkaNavigationItemActive(item, pathname)),
  )?.id;
  const [openGroupId, setOpenGroupId] = useState<string | null>(
    activeGroupId ?? visibleGroups[0]?.id ?? null,
  );

  useEffect(() => {
    setOpenGroupId(activeGroupId ?? visibleGroups[0]?.id ?? null);
  }, [activeGroupId, activeSpaceId, visibleGroups]);

  if (state.status !== 'ready') {
    return null;
  }

  const showHomeItem = activeSpace.homeItem.isVisible?.(state.context) ?? true;

  return (
    <NavigationDrawerSection>
      <NavigationDrawerAnimatedCollapseWrapper>
        <NavigationDrawerSectionTitle
          label={i18n._(activeSpace.navigationLabel)}
        />
      </NavigationDrawerAnimatedCollapseWrapper>

      {showHomeItem && (
        <NavigationDrawerItem
          label={i18n._(activeSpace.homeItem.label)}
          to={activeSpace.homeItem.path}
          Icon={activeSpace.homeItem.Icon}
          active={isZowkaNavigationItemActive(activeSpace.homeItem, pathname)}
        />
      )}

      {visibleGroups.map((group) => {
        const isOpen = openGroupId === group.id;

        return (
          <div key={group.id}>
            <NavigationDrawerAnimatedCollapseWrapper>
              <NavigationDrawerSectionTitle
                label={i18n._(group.label)}
                isOpen={isOpen}
                onClick={() => setOpenGroupId(isOpen ? null : group.id)}
              />
            </NavigationDrawerAnimatedCollapseWrapper>
            {isOpen &&
              group.items.map((item) => (
                <NavigationDrawerItem
                  key={item.id}
                  label={i18n._(item.label)}
                  to={item.path}
                  Icon={item.Icon}
                  indentationLevel={2}
                  active={isZowkaNavigationItemActive(item, pathname)}
                />
              ))}
          </div>
        );
      })}
    </NavigationDrawerSection>
  );
};
