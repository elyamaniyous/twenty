import { Dialog } from '@/ui/feedback/dialog-manager/components/Dialog';
import { t } from '@lingui/core/macro';
import { styled } from '@linaria/react';
import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { IconAlertTriangle, IconCheck, IconX } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export type ErpConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  confirmDisabled?: boolean;
  isConfirming?: boolean;
  initialFocus?: 'cancel' | 'confirm';
  onCancel: () => void;
  onConfirm: () => void;
};

const StyledDialogContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
`;

const StyledTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  margin: 0;
  text-align: center;
`;

const StyledMessage = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.md};
  letter-spacing: 0;
  line-height: 20px;
  margin: 0;
  text-align: center;
`;

const StyledActions = styled.div`
  display: flex;
  flex-direction: column-reverse;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledActionSemantics = styled.div`
  display: flex;
  width: 100%;
`;

export const ErpConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  confirmDisabled = false,
  isConfirming = false,
  initialFocus = 'cancel',
  onCancel,
  onConfirm,
}: ErpConfirmDialogProps) => {
  const titleId = useId();
  const messageId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef(initialFocus);
  initialFocusRef.current = initialFocus;
  const resolvedConfirmLabel = confirmLabel ?? t`Confirm`;
  const resolvedCancelLabel = cancelLabel ?? t`Cancel`;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const preferredTarget = dialogRef.current?.querySelector<HTMLElement>(
      initialFocusRef.current === 'confirm'
        ? '[data-testid="erp-confirm-dialog-confirm"]'
        : '[data-testid="erp-confirm-dialog-cancel"]',
    );
    const fallbackTarget = dialogRef.current?.querySelector<HTMLElement>(
      'button:not(:disabled)',
    );
    const focusTarget =
      preferredTarget?.matches(':disabled') === false
        ? preferredTarget
        : (fallbackTarget ?? dialogRef.current);
    focusTarget?.focus();

    return () => {
      const activeElement = document.activeElement;
      const isFocusInsideAnotherModal =
        activeElement instanceof HTMLElement &&
        activeElement.closest('[role="dialog"][aria-modal="true"]') !== null;

      if (focusedElement?.isConnected && !isFocusInsideAnotherModal) {
        focusedElement.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const requestCancel = () => {
    if (isConfirming) {
      return;
    }

    onCancel();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      requestCancel();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const dialog = event.currentTarget;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>('button:not(:disabled)'),
    );

    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1);

    if (!dialog.contains(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <Dialog onClose={isConfirming ? undefined : requestCancel}>
      <StyledDialogContent
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onKeyDown={handleKeyDown}
      >
        <StyledTitle id={titleId}>{title}</StyledTitle>
        <StyledMessage id={messageId}>{message}</StyledMessage>
        <StyledActions>
          <Button
            dataTestId="erp-confirm-dialog-cancel"
            title={resolvedCancelLabel}
            ariaLabel={resolvedCancelLabel}
            Icon={IconX}
            fullWidth={true}
            variant="secondary"
            disabled={isConfirming}
            onClick={requestCancel}
          />
          <StyledActionSemantics
            data-destructive={destructive ? 'true' : 'false'}
            aria-busy={isConfirming ? 'true' : 'false'}
          >
            <Button
              dataTestId="erp-confirm-dialog-confirm"
              title={resolvedConfirmLabel}
              ariaLabel={resolvedConfirmLabel}
              Icon={destructive ? IconAlertTriangle : IconCheck}
              fullWidth={true}
              accent={destructive ? 'danger' : 'blue'}
              disabled={confirmDisabled || isConfirming}
              isLoading={isConfirming}
              onClick={onConfirm}
            />
          </StyledActionSemantics>
        </StyledActions>
      </StyledDialogContent>
    </Dialog>
  );
};
