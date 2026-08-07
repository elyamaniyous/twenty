import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { resolveZowkaSpaceForPath, type ZowkaSpaceId } from './zowkaSpaces';

const STORAGE_PREFIX = 'zowka.active-space';

const readStoredSpace = (storageKey: string): ZowkaSpaceId => {
  let value: string | null = null;

  try {
    value = window.localStorage.getItem(storageKey);
  } catch {
    return 'crm';
  }

  return value === 'crm' || value === 'finance' || value === 'hr'
    ? value
    : 'crm';
};

export const useActiveZowkaSpace = () => {
  const { pathname } = useLocation();
  const state = useErpMarocContext();
  const storageKey =
    state.status === 'ready'
      ? `${STORAGE_PREFIX}:${state.context.societeId}:${state.context.twentyUserId}`
      : STORAGE_PREFIX;
  const storedSpace = readStoredSpace(storageKey);
  const resolvedSpace = resolveZowkaSpaceForPath(pathname, storedSpace);
  const activeSpace =
    state.status === 'ready' && state.spaceAccess?.[resolvedSpace] === false
      ? 'crm'
      : resolvedSpace;

  useEffect(() => {
    if (state.status === 'ready') {
      try {
        window.localStorage.setItem(storageKey, activeSpace);
      } catch {
        // Navigation remains functional when browser storage is unavailable.
      }
    }
  }, [activeSpace, state.status, storageKey]);

  return activeSpace;
};
