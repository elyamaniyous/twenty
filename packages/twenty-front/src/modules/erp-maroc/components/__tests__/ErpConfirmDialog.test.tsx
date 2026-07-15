import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useState } from 'react';

import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';

const DialogHarness = ({
  onConfirm = jest.fn(),
  onCancel = jest.fn(),
  isConfirming = false,
  confirmDisabled = false,
  initialFocus = 'cancel',
}: {
  onConfirm?: jest.Mock;
  onCancel?: jest.Mock;
  isConfirming?: boolean;
  confirmDisabled?: boolean;
  initialFocus?: 'cancel' | 'confirm';
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Ouvrir
      </button>
      <ErpConfirmDialog
        isOpen={isOpen}
        title="Supprimer le produit"
        message="Cette action est définitive."
        cancelLabel="Annuler"
        confirmLabel="Supprimer"
        destructive={true}
        isConfirming={isConfirming}
        confirmDisabled={confirmDisabled}
        initialFocus={initialFocus}
        onCancel={() => {
          onCancel();
          setIsOpen(false);
        }}
        onConfirm={onConfirm}
      />
    </>
  );
};

describe('ErpConfirmDialog', () => {
  it('focuses cancel initially, closes on Escape, and returns focus', async () => {
    render(<DialogHarness />);
    const trigger = screen.getByRole('button', { name: 'Ouvrir' });

    act(() => trigger.focus());
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toHaveAccessibleName(
      'Supprimer le produit',
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus(),
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('supports cancel and destructive confirm commands', () => {
    const onConfirm = jest.fn();
    render(<DialogHarness onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    const confirm = screen.getByRole('button', { name: 'Supprimer' });
    expect(confirm.closest('[data-destructive]')).toHaveAttribute(
      'data-destructive',
      'true',
    );
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cycles Tab and Shift+Tab within the dialog even if focus moves outside', async () => {
    render(<DialogHarness />);
    const trigger = screen.getByRole('button', { name: 'Ouvrir' });

    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    const cancel = screen.getByRole('button', { name: 'Annuler' });
    const confirm = screen.getByRole('button', { name: 'Supprimer' });
    await waitFor(() => expect(cancel).toHaveFocus());

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(cancel).toHaveFocus();

    act(() => trigger.focus());
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(cancel).toHaveFocus();

    act(() => trigger.focus());
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();
  });

  it('cycles only enabled buttons belonging to this dialog', async () => {
    render(
      <>
        <button type="button">Other dialog button</button>
        <DialogHarness />
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'Ouvrir' });

    act(() => trigger.focus());
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    const cancel = screen.getByRole('button', { name: 'Annuler' });
    const confirm = screen.getByRole('button', { name: 'Supprimer' });
    await waitFor(() => expect(cancel).toHaveFocus());

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(cancel).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();
  });

  it.each([['disabled', { confirmDisabled: true }]])(
    'focuses enabled cancel inside the dialog when confirm initial focus is %s',
    async (_state, confirmState) => {
      render(
        <>
          <button type="button">Outside action</button>
          <DialogHarness initialFocus="confirm" {...confirmState} />
        </>,
      );
      const trigger = screen.getByRole('button', { name: 'Ouvrir' });

      act(() => trigger.focus());
      fireEvent.click(trigger);

      const dialog = screen.getByRole('dialog');
      const cancel = screen.getByRole('button', { name: 'Annuler' });
      expect(dialog).toContainElement(cancel);
      expect(cancel).toBeEnabled();
      await waitFor(() => expect(cancel).toHaveFocus());
    },
  );

  it('disables cancel and ignores cancel clicks while confirmation is pending', async () => {
    const onCancel = jest.fn();
    render(<DialogHarness onCancel={onCancel} isConfirming={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    const dialog = screen.getByRole('dialog');
    const cancel = screen.getByRole('button', { name: 'Annuler' });

    expect(cancel).toBeDisabled();
    await waitFor(() => expect(dialog).toHaveFocus());

    fireEvent.click(cancel);

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('ignores Escape while confirmation is pending', () => {
    const onCancel = jest.fn();
    render(<DialogHarness onCancel={onCancel} isConfirming={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('falls back to the enabled in-dialog button and returns focus after closing', async () => {
    render(<DialogHarness initialFocus="confirm" confirmDisabled={true} />);
    const trigger = screen.getByRole('button', { name: 'Ouvrir' });

    act(() => trigger.focus());
    fireEvent.click(trigger);
    const cancel = screen.getByRole('button', { name: 'Annuler' });
    await waitFor(() => expect(cancel).toHaveFocus());

    fireEvent.click(cancel);

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('disables confirmation while disabled or loading', () => {
    const onConfirm = jest.fn();
    const { rerender } = render(
      <DialogHarness onConfirm={onConfirm} confirmDisabled={true} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeDisabled();

    rerender(<DialogHarness onConfirm={onConfirm} isConfirming={true} />);
    const confirm = screen.getByRole('button', { name: 'Supprimer' });
    expect(confirm).toBeDisabled();
    expect(confirm.closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('restores focus within an underlying dialog without stealing it when that dialog closes first', async () => {
    const StackedDialogHarness = () => {
      const [isUnderlyingOpen, setIsUnderlyingOpen] = useState(false);
      const [isTopOpen, setIsTopOpen] = useState(false);

      return (
        <>
          <button type="button" onClick={() => setIsUnderlyingOpen(true)}>
            Open underlying
          </button>
          <button type="button" onClick={() => setIsTopOpen(true)}>
            Open top
          </button>
          <button type="button" onClick={() => setIsUnderlyingOpen(false)}>
            Remove underlying
          </button>
          <ErpConfirmDialog
            isOpen={isUnderlyingOpen}
            title="Underlying dialog"
            message="Underlying message"
            onCancel={() => setIsUnderlyingOpen(false)}
            onConfirm={jest.fn()}
          />
          <ErpConfirmDialog
            isOpen={isTopOpen}
            title="Top dialog"
            message="Top message"
            onCancel={() => setIsTopOpen(false)}
            onConfirm={jest.fn()}
          />
        </>
      );
    };

    render(<StackedDialogHarness />);
    const underlyingTrigger = screen.getByRole('button', {
      name: 'Open underlying',
    });
    act(() => underlyingTrigger.focus());
    fireEvent.click(underlyingTrigger);
    const underlyingDialog = screen.getByRole('dialog', {
      name: 'Underlying dialog',
    });
    const underlyingCancel = within(underlyingDialog).getByRole('button', {
      name: 'Cancel',
    });
    await waitFor(() => expect(underlyingCancel).toHaveFocus());

    fireEvent.click(screen.getByRole('button', { name: 'Open top' }));
    const topDialog = screen.getByRole('dialog', { name: 'Top dialog' });
    const topCancel = within(topDialog).getByRole('button', { name: 'Cancel' });
    await waitFor(() => expect(topCancel).toHaveFocus());

    fireEvent.click(topCancel);
    await waitFor(() => expect(underlyingCancel).toHaveFocus());

    fireEvent.click(screen.getByRole('button', { name: 'Open top' }));
    const reopenedTopDialog = screen.getByRole('dialog', {
      name: 'Top dialog',
    });
    const reopenedTopCancel = within(reopenedTopDialog).getByRole('button', {
      name: 'Cancel',
    });
    await waitFor(() => expect(reopenedTopCancel).toHaveFocus());

    fireEvent.click(screen.getByRole('button', { name: 'Remove underlying' }));

    expect(reopenedTopCancel).toHaveFocus();
  });

  it('does not let a stale close timer steal focus from a reopened dialog', async () => {
    jest.useFakeTimers();

    try {
      render(<DialogHarness />);
      const trigger = screen.getByRole('button', { name: 'Ouvrir' });

      act(() => trigger.focus());
      fireEvent.click(trigger);
      const cancel = screen.getByRole('button', { name: 'Annuler' });
      expect(cancel).toHaveFocus();

      fireEvent.click(cancel);
      fireEvent.click(trigger);
      const reopenedCancel = screen.getByRole('button', { name: 'Annuler' });
      expect(reopenedCancel).toHaveFocus();

      act(() => jest.runOnlyPendingTimers());

      expect(reopenedCancel).toHaveFocus();
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not attempt to restore focus to a detached trigger', () => {
    const onCancel = jest.fn();
    const { rerender } = render(
      <>
        <button type="button">Detached trigger</button>
        <ErpConfirmDialog
          isOpen={false}
          title="Dialog"
          message="Message"
          onCancel={onCancel}
          onConfirm={jest.fn()}
        />
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'Detached trigger' });
    const focusSpy = jest.spyOn(trigger, 'focus');

    act(() => trigger.focus());
    rerender(
      <>
        <button type="button">Detached trigger</button>
        <ErpConfirmDialog
          isOpen={true}
          title="Dialog"
          message="Message"
          onCancel={onCancel}
          onConfirm={jest.fn()}
        />
      </>,
    );
    focusSpy.mockClear();

    rerender(
      <ErpConfirmDialog
        isOpen={false}
        title="Dialog"
        message="Message"
        onCancel={onCancel}
        onConfirm={jest.fn()}
      />,
    );

    expect(trigger.isConnected).toBe(false);
    expect(focusSpy).not.toHaveBeenCalled();
  });
});
