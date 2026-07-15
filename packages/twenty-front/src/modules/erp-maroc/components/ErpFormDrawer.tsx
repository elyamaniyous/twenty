import { RootStackingContextZIndices } from '@/ui/layout/constants/RootStackingContextZIndices';
import { styled } from '@linaria/react';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { IconX } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type OpenDrawer = {
  instanceId: string;
  portalRoot: HTMLDivElement;
  drawer: HTMLElement;
  lastFocusedElement: HTMLElement | null;
};

type IsolationSnapshot = {
  ariaHidden: string | null;
  inert: string | null;
};

const openDrawerStack: OpenDrawer[] = [];
const isolationSnapshots = new Map<HTMLElement, IsolationSnapshot>();
let isFocusContainmentActive = false;

const isolateElement = (element: HTMLElement) => {
  if (!isolationSnapshots.has(element)) {
    isolationSnapshots.set(element, {
      ariaHidden: element.getAttribute('aria-hidden'),
      inert: element.getAttribute('inert'),
    });
  }

  element.setAttribute('aria-hidden', 'true');
  element.setAttribute('inert', '');
};

const restoreIsolation = (element: HTMLElement) => {
  const snapshot = isolationSnapshots.get(element);
  if (snapshot === undefined) return;

  if (snapshot.ariaHidden === null) {
    element.removeAttribute('aria-hidden');
  } else {
    element.setAttribute('aria-hidden', snapshot.ariaHidden);
  }

  if (snapshot.inert === null) {
    element.removeAttribute('inert');
  } else {
    element.setAttribute('inert', snapshot.inert);
  }

  isolationSnapshots.delete(element);
};

const focusTopDrawer = () => {
  const topDrawer = openDrawerStack.at(-1);
  if (topDrawer === undefined) return;

  const lastFocusedElement = topDrawer.lastFocusedElement;
  const focusTarget =
    lastFocusedElement?.isConnected === true &&
    topDrawer.drawer.contains(lastFocusedElement)
      ? lastFocusedElement
      : (topDrawer.drawer.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
        topDrawer.drawer);

  focusTarget.focus();
};

const handleDocumentFocusIn = (event: FocusEvent) => {
  const topDrawer = openDrawerStack.at(-1);
  if (topDrawer === undefined) return;

  if (
    event.target instanceof HTMLElement &&
    topDrawer.drawer.contains(event.target)
  ) {
    topDrawer.lastFocusedElement = event.target;
    return;
  }

  focusTopDrawer();
};

const syncDrawerIsolation = () => {
  const topDrawer = openDrawerStack.at(-1);
  const drawerPortalRoots = new Set<HTMLElement>(
    openDrawerStack.map(({ portalRoot }) => portalRoot),
  );
  const elementsToIsolate = new Set<HTMLElement>();

  if (topDrawer !== undefined) {
    isolationSnapshots.forEach((_, element) => {
      if (!drawerPortalRoots.has(element)) elementsToIsolate.add(element);
    });
    openDrawerStack.slice(0, -1).forEach(({ portalRoot }) => {
      elementsToIsolate.add(portalRoot);
    });
  }

  isolationSnapshots.forEach((_, element) => {
    if (!elementsToIsolate.has(element)) restoreIsolation(element);
  });

  elementsToIsolate.forEach(isolateElement);

  if (topDrawer === undefined) {
    if (isFocusContainmentActive) {
      document.removeEventListener('focusin', handleDocumentFocusIn);
      isFocusContainmentActive = false;
    }
    return;
  }

  if (!isFocusContainmentActive) {
    document.addEventListener('focusin', handleDocumentFocusIn);
    isFocusContainmentActive = true;
  }
};

const StyledBackdrop = styled.div`
  background: ${themeCssVariables.background.overlayPrimary};
  inset: 0;
  position: fixed;
  z-index: ${RootStackingContextZIndices.SidePanel};
`;

const StyledDrawer = styled.aside`
  background: ${themeCssVariables.background.primary};
  border-left: 1px solid ${themeCssVariables.border.color.medium};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  max-width: 100%;
  position: absolute;
  right: 0;
  top: 0;
  width: min(480px, 100vw);
`;

const StyledHeader = styled.header`
  align-items: flex-start;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  min-height: 56px;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledHeading = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  letter-spacing: 0;
  margin: 0;
`;

const StyledDescription = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  letter-spacing: 0;
  line-height: 20px;
  margin: 0;
`;

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
`;

const StyledFooter = styled.footer`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
  padding: ${themeCssVariables.spacing[3]};
`;

export type ErpFormDrawerProps = {
  isOpen: boolean;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  isBusy?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
};

export const ErpFormDrawer = ({
  isOpen,
  title,
  description,
  children,
  footer,
  isBusy = false,
  initialFocusRef,
  onClose,
}: ErpFormDrawerProps): ReactElement | null => {
  const titleId = useId();
  const descriptionId = useId();
  const instanceId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [portalRoot] = useState(() => document.createElement('div'));
  const isTopmost = () => openDrawerStack.at(-1)?.instanceId === instanceId;

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    const drawer = drawerRef.current;
    if (drawer === null) return;

    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (openDrawerStack.length === 0) {
      Array.from(document.body.children).forEach((element) => {
        if (element instanceof HTMLElement) isolateElement(element);
      });
    }
    document.body.append(portalRoot);
    const openDrawer: OpenDrawer = {
      instanceId,
      portalRoot,
      drawer,
      lastFocusedElement: null,
    };
    openDrawerStack.push(openDrawer);
    syncDrawerIsolation();

    const requestedFocus = initialFocusRef?.current;
    const contentFocus =
      contentRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      null;
    const panelFocus =
      drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? null;
    const focusTarget =
      requestedFocus !== null &&
      requestedFocus !== undefined &&
      drawer.contains(requestedFocus)
        ? requestedFocus
        : (contentFocus ?? panelFocus ?? drawer);
    focusTarget?.focus();

    return () => {
      const stackIndex = openDrawerStack.findLastIndex(
        (entry) => entry.instanceId === instanceId,
      );
      const wasTopmost = stackIndex === openDrawerStack.length - 1;
      if (stackIndex !== -1) {
        openDrawerStack.splice(stackIndex, 1);
      }
      restoreIsolation(portalRoot);
      portalRoot.remove();
      syncDrawerIsolation();

      if (wasTopmost && opener?.isConnected) {
        opener.focus();
      }
    };
  }, [initialFocusRef, instanceId, isOpen, portalRoot]);

  if (!isOpen) {
    return null;
  }

  const requestClose = () => {
    if (!isBusy && isTopmost()) {
      onClose();
    }
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!isTopmost()) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      requestClose();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((element) => element.getAttribute('aria-hidden') !== 'true');
    const first = focusable[0];
    const last = focusable.at(-1);

    if (first === undefined || last === undefined) {
      event.preventDefault();
      event.currentTarget.focus();
      return;
    }

    if (!event.currentTarget.contains(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <StyledBackdrop onClick={handleBackdropClick}>
      <StyledDrawer
        ref={drawerRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={isBusy ? 'true' : undefined}
        onKeyDown={handleKeyDown}
      >
        <StyledHeader>
          <StyledHeading>
            <StyledTitle id={titleId}>{title}</StyledTitle>
            <StyledDescription id={descriptionId}>
              {description}
            </StyledDescription>
          </StyledHeading>
          <Button
            title="Fermer"
            ariaLabel="Fermer"
            Icon={IconX}
            variant="tertiary"
            disabled={isBusy}
            onClick={requestClose}
          />
        </StyledHeader>
        <StyledContent ref={contentRef}>{children}</StyledContent>
        {footer === undefined ? null : <StyledFooter>{footer}</StyledFooter>}
      </StyledDrawer>
    </StyledBackdrop>,
    portalRoot,
  ) as unknown as ReactElement;
};
