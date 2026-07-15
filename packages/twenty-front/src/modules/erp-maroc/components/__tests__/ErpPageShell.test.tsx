import { fireEvent, render, screen } from '@testing-library/react';

import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';

describe('ErpPageShell', () => {
  it('renders a compact operational header, actions, and page content', () => {
    render(
      <ErpPageShell
        title="Produits"
        description="Catalogue de vente"
        actions={<button type="button">Créer</button>}
      >
        <div>Table des produits</div>
      </ErpPageShell>,
    );

    expect(
      screen.getByRole('heading', { name: 'Produits' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer' })).toBeInTheDocument();
    expect(screen.getByText('Table des produits')).toBeInTheDocument();
    expect(screen.getByTestId('erp-page-shell')).toHaveAttribute(
      'data-density',
      'compact',
    );
  });

  it('renders translated loading, empty, and error states with action slots', () => {
    const retry = jest.fn();
    const { rerender } = render(
      <ErpPageShell
        title="Produits"
        state="loading"
        loadingLabel="Chargement"
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Chargement');

    rerender(
      <ErpPageShell
        title="Produits"
        state="empty"
        emptyLabel="Aucun produit"
        emptyAction={<button type="button">Créer le premier</button>}
      />,
    );
    expect(screen.getByText('Aucun produit')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Créer le premier' }),
    ).toBeInTheDocument();

    rerender(
      <ErpPageShell
        title="Produits"
        state="error"
        errorLabel="Chargement impossible"
        retryLabel="Réessayer"
        onRetry={retry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Chargement impossible',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
