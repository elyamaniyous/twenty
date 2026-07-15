import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';

import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';

const DrawerHarness = ({ isBusy = false }: { isBusy?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Ouvrir le formulaire
      </button>
      <ErpFormDrawer
        isOpen={isOpen}
        title="Nouveau produit"
        description="Renseignez les informations du produit."
        isBusy={isBusy}
        initialFocusRef={codeInputRef}
        onClose={() => setIsOpen(false)}
        footer={
          <button type="button" onClick={() => undefined}>
            Enregistrer
          </button>
        }
      >
        <label htmlFor="drawer-code">Code</label>
        <input ref={codeInputRef} id="drawer-code" />
      </ErpFormDrawer>
    </>
  );
};

describe('ErpFormDrawer', () => {
  it('names and describes the dialog, focuses the requested field, and traps both Tab directions', async () => {
    const user = userEvent.setup();

    const view = render(<DrawerHarness />);
    await user.click(
      screen.getByRole('button', { name: 'Ouvrir le formulaire' }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Nouveau produit' });
    expect(view.container).not.toContainElement(dialog);
    expect(view.container).toHaveAttribute('aria-hidden', 'true');
    expect(view.container).toHaveAttribute('inert');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription(
      'Renseignez les informations du produit.',
    );
    expect(screen.getByRole('textbox', { name: 'Code' })).toHaveFocus();

    screen.getByRole('button', { name: 'Enregistrer' }).focus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Fermer' })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toHaveFocus();
  });

  it('restores exact app-root isolation state when the drawer closes', async () => {
    const user = userEvent.setup();
    const preIsolatedRoot = document.createElement('div');
    preIsolatedRoot.setAttribute('aria-hidden', 'false');
    preIsolatedRoot.setAttribute('inert', 'preserved');
    document.body.append(preIsolatedRoot);

    const view = render(<DrawerHarness />);
    const opener = screen.getByRole('button', {
      name: 'Ouvrir le formulaire',
    });
    await user.click(opener);

    expect(preIsolatedRoot).toHaveAttribute('aria-hidden', 'true');
    expect(preIsolatedRoot).toHaveAttribute('inert', '');

    await user.keyboard('{Escape}');

    expect(view.container).not.toHaveAttribute('aria-hidden');
    expect(view.container).not.toHaveAttribute('inert');
    expect(preIsolatedRoot).toHaveAttribute('aria-hidden', 'false');
    expect(preIsolatedRoot).toHaveAttribute('inert', 'preserved');
    expect(opener).toHaveFocus();

    preIsolatedRoot.remove();
  });

  it('contains programmatic document focus inside the active drawer', async () => {
    const user = userEvent.setup();

    render(<DrawerHarness />);
    const outsideButton = screen.getByRole('button', {
      name: 'Ouvrir le formulaire',
    });
    await user.click(outsideButton);
    const codeInput = screen.getByRole('textbox', { name: 'Code' });

    outsideButton.focus();

    expect(codeInput).toHaveFocus();
  });

  it('closes from Escape, the close control, or the backdrop only while idle', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DrawerHarness isBusy />);

    const opener = screen.getByRole('button', {
      name: 'Ouvrir le formulaire',
    });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Nouveau produit' });

    await user.keyboard('{Escape}');
    fireEvent.click(dialog.parentElement as HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(dialog).toBeVisible();

    rerender(<DrawerHarness />);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    await user.click(opener);
    fireEvent.click(
      screen.getByRole('dialog', { name: 'Nouveau produit' })
        .parentElement as HTMLElement,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(opener);
    await user.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('restores focus through nested drawers without a delayed stale focus change', async () => {
    const user = userEvent.setup();

    const NestedDrawers = () => {
      const [outerOpen, setOuterOpen] = useState(false);
      const [innerOpen, setInnerOpen] = useState(false);

      return (
        <>
          <button type="button" onClick={() => setOuterOpen(true)}>
            Ouvrir le produit
          </button>
          <ErpFormDrawer
            isOpen={outerOpen}
            title="Produit"
            description="Formulaire produit"
            onClose={() => setOuterOpen(false)}
          >
            <button type="button" onClick={() => setInnerOpen(true)}>
              Ouvrir les détails
            </button>
          </ErpFormDrawer>
          <ErpFormDrawer
            isOpen={innerOpen}
            title="Détails"
            description="Détails du produit"
            onClose={() => setInnerOpen(false)}
          >
            <input aria-label="Détail" />
          </ErpFormDrawer>
        </>
      );
    };

    const view = render(<NestedDrawers />);
    const outerOpener = screen.getByRole('button', {
      name: 'Ouvrir le produit',
    });
    await user.click(outerOpener);
    const outerDialog = screen.getByRole('dialog', { name: 'Produit' });
    const outerPortalRoot = outerDialog.parentElement?.parentElement;
    expect(view.container).toHaveAttribute('aria-hidden', 'true');
    expect(outerPortalRoot).not.toHaveAttribute('aria-hidden');
    expect(outerPortalRoot).not.toHaveAttribute('inert');
    const innerOpener = screen.getByRole('button', {
      name: 'Ouvrir les détails',
    });
    await user.click(innerOpener);

    expect(view.container).toHaveAttribute('aria-hidden', 'true');
    expect(view.container).toHaveAttribute('inert');
    expect(outerPortalRoot).toHaveAttribute('aria-hidden', 'true');
    expect(outerPortalRoot).toHaveAttribute('inert');
    expect(screen.getByRole('textbox', { name: 'Détail' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Détails' })).toBeNull();
    expect(view.container).toHaveAttribute('aria-hidden', 'true');
    expect(outerPortalRoot).not.toHaveAttribute('aria-hidden');
    expect(outerPortalRoot).not.toHaveAttribute('inert');
    expect(innerOpener).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Produit' })).toBeNull();
    expect(view.container).not.toHaveAttribute('aria-hidden');
    expect(view.container).not.toHaveAttribute('inert');
    expect(outerOpener).toHaveFocus();
  });
});
