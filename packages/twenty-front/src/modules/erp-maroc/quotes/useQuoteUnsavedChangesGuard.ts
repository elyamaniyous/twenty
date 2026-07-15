import { useCallback, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

type UseQuoteUnsavedChangesGuardOptions = {
  shouldBlock: boolean;
  isNavigationLocked: boolean;
};

const scheduleBypassReset = (bypassRef: { current: boolean }) => {
  queueMicrotask(() => {
    bypassRef.current = false;
  });
};

export const useQuoteUnsavedChangesGuard = ({
  shouldBlock,
  isNavigationLocked,
}: UseQuoteUnsavedChangesGuardOptions) => {
  // The blocker callback must read bypass before React can render new state.
  // oxlint-disable-next-line twenty/no-state-useref
  const bypassRef = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (bypassRef.current) {
      return false;
    }

    if (
      currentLocation.pathname === nextLocation.pathname &&
      currentLocation.search === nextLocation.search &&
      currentLocation.hash === nextLocation.hash
    ) {
      return false;
    }

    return shouldBlock || isNavigationLocked;
  });

  useEffect(() => {
    if (shouldBlock || isNavigationLocked) {
      bypassRef.current = false;
    }
  }, [isNavigationLocked, shouldBlock]);

  useEffect(() => {
    if (!shouldBlock && !isNavigationLocked) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (bypassRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';

      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isNavigationLocked, shouldBlock]);

  const allowNextNavigation = useCallback(() => {
    bypassRef.current = true;
  }, []);

  const runWithBypass = useCallback(
    <T>(callback: () => T): T => {
      allowNextNavigation();

      try {
        return callback();
      } finally {
        scheduleBypassReset(bypassRef);
      }
    },
    [allowNextNavigation],
  );

  const cancelNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }

    bypassRef.current = false;
  }, [blocker]);

  const confirmNavigation = useCallback(() => {
    if (blocker.state !== 'blocked' || isNavigationLocked) {
      return;
    }

    allowNextNavigation();
    blocker.proceed();
    scheduleBypassReset(bypassRef);
  }, [allowNextNavigation, blocker, isNavigationLocked]);

  return {
    isBlocked: blocker.state === 'blocked',
    confirmDisabled: isNavigationLocked,
    allowNextNavigation,
    runWithBypass,
    cancelNavigation,
    confirmNavigation,
  };
};
