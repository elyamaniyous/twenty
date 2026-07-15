import { fireEvent, render, screen } from '@testing-library/react';

import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';

type ProductRow = { id: string; code: string; name: string };

const columns: ErpOperationalTableColumn<ProductRow>[] = [
  {
    key: 'code',
    header: 'Code',
    width: '120px',
    render: (row) => row.code,
  },
  {
    key: 'name',
    header: 'Nom',
    width: '280px',
    render: (row) => row.name,
  },
];

const rows: ProductRow[] = [{ id: 'product-1', code: 'AC-1', name: 'Acier' }];

describe('ErpOperationalTable', () => {
  it('renders a semantic table with stable column dimensions', () => {
    render(
      <ErpOperationalTable
        ariaLabel="Produits"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
      />,
    );

    expect(screen.getByRole('table', { name: 'Produits' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(screen.getByRole('columnheader', { name: 'Code' })).toHaveAttribute(
      'scope',
      'col',
    );
    expect(screen.getByTestId('erp-table-column-code')).toHaveStyle({
      width: '120px',
    });
    expect(screen.getByTestId('erp-table-column-name')).toHaveStyle({
      width: '280px',
    });
  });

  it('contains horizontal overflow in the focusable table wrapper', () => {
    render(
      <ErpOperationalTable
        ariaLabel="Produits"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
      />,
    );

    const scrollRegion = screen.getByTestId('erp-table-scroll');
    const table = screen.getByRole('table', { name: 'Produits' });
    expect(scrollRegion).toHaveAttribute('tabindex', '0');
    expect(scrollRegion).toHaveAttribute('role', 'region');
    expect(scrollRegion).toContainElement(table);
    expect(table).toHaveStyle({ minWidth: '400px' });
  });

  it('renders loading, empty, and error states and retries failures', () => {
    const retry = jest.fn();
    const { rerender } = render(
      <ErpOperationalTable
        ariaLabel="Produits"
        columns={columns}
        rows={[]}
        getRowKey={(row) => row.id}
        state="loading"
        loadingLabel="Chargement"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Chargement');

    rerender(
      <ErpOperationalTable
        ariaLabel="Produits"
        columns={columns}
        rows={[]}
        getRowKey={(row) => row.id}
        state="empty"
        emptyLabel="Aucun produit"
      />,
    );
    expect(screen.getByText('Aucun produit')).toBeInTheDocument();

    rerender(
      <ErpOperationalTable
        ariaLabel="Produits"
        columns={columns}
        rows={[]}
        getRowKey={(row) => row.id}
        state="error"
        errorLabel="Erreur"
        retryLabel="Réessayer"
        onRetry={retry}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Erreur');
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('keeps generic rows semantic while cell links and buttons activate only themselves', () => {
    const onLinkActivate = jest.fn();
    const onButtonActivate = jest.fn();
    const actionColumns: ErpOperationalTableColumn<ProductRow>[] = [
      ...columns,
      {
        key: 'actions',
        header: 'Actions',
        width: '120px',
        render: () => (
          <>
            <a href="#product-1" onClick={onLinkActivate}>
              Ouvrir
            </a>
            <button type="button" onClick={onButtonActivate}>
              Modifier
            </button>
          </>
        ),
      },
    ];

    render(
      <ErpOperationalTable
        ariaLabel="Produits"
        columns={actionColumns}
        rows={rows}
        getRowKey={(row) => row.id}
      />,
    );

    const row = screen.getByRole('row', {
      name: /AC-1 Acier Ouvrir Modifier/,
    });
    expect(row.tagName).toBe('TR');
    expect(row).not.toHaveAttribute('tabindex');

    fireEvent.click(row);
    expect(onLinkActivate).not.toHaveBeenCalled();
    expect(onButtonActivate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('link', { name: 'Ouvrir' }));
    expect(onLinkActivate).toHaveBeenCalledTimes(1);
    expect(onButtonActivate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(onButtonActivate).toHaveBeenCalledTimes(1);
  });
});
