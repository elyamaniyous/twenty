import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';

import {
  ErpLineItemEditor,
  type ErpLineItemDraft,
} from '@/erp-maroc/components/ErpLineItemEditor';

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: () => undefined,
});

const initialItems: ErpLineItemDraft[] = [
  {
    id: 'line-1',
    description: 'Acier',
    quantity: '2',
    unitPriceHt: '100.00',
    tvaRate: 20,
  },
  {
    id: 'line-2',
    description: 'Transport',
    quantity: '1',
    unitPriceHt: '50.00',
    tvaRate: 0,
  },
];

const EditorHarness = ({
  onDirtyChange = jest.fn(),
  defaultItems = initialItems,
}: {
  onDirtyChange?: jest.Mock;
  defaultItems?: ErpLineItemDraft[];
}) => {
  const [items, setItems] = useState(defaultItems);

  return (
    <ErpLineItemEditor
      items={items}
      onChange={setItems}
      onDirtyChange={onDirtyChange}
    />
  );
};

describe('ErpLineItemEditor', () => {
  it('preserves a keyed row DOM node while updating its values and totals', () => {
    render(<EditorHarness />);

    const firstRow = screen.getByTestId('erp-line-item-line-1');
    expect(within(firstRow).getByTestId('line-total-ht')).toHaveTextContent(
      '200,00 MAD',
    );
    expect(within(firstRow).getByTestId('line-total-ttc')).toHaveTextContent(
      '240,00 MAD',
    );
    expect(screen.getByTestId('document-total-ttc')).toHaveTextContent(
      '290,00 MAD',
    );

    fireEvent.change(screen.getByLabelText('Quantité 1'), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByLabelText('Prix unitaire HT 1'), {
      target: { value: '19.99' },
    });
    expect(screen.getByTestId('erp-line-item-line-1')).toBe(firstRow);
    expect(within(firstRow).getByTestId('line-total-ht')).toHaveTextContent(
      '59,97 MAD',
    );
    expect(within(firstRow).getByTestId('line-total-ttc')).toHaveTextContent(
      '71,96 MAD',
    );
  });

  it('renders exact document TVA totals for used rates without unused rows', () => {
    const itemsByRate: ErpLineItemDraft[] = [
      {
        id: 'line-7',
        description: 'TVA 7',
        quantity: '2',
        unitPriceHt: '100.00',
        tvaRate: 7,
      },
      {
        id: 'line-20-a',
        description: 'TVA 20 A',
        quantity: '1',
        unitPriceHt: '50.00',
        tvaRate: 20,
      },
      {
        id: 'line-20-b',
        description: 'TVA 20 B',
        quantity: '3',
        unitPriceHt: '10.00',
        tvaRate: 20,
      },
    ];

    render(<EditorHarness defaultItems={itemsByRate} />);

    expect(screen.getByTestId('document-tva-rate-7')).toHaveTextContent(
      'TVA 7 %14,00 MAD',
    );
    expect(screen.getByTestId('document-tva-rate-20')).toHaveTextContent(
      'TVA 20 %16,00 MAD',
    );
    expect(screen.getAllByTestId(/^document-tva-slot-/)).toHaveLength(2);
    expect(screen.queryByTestId('document-tva-slot-0')).not.toBeInTheDocument();
    expect(screen.getByText('Total HT').nextElementSibling).toHaveTextContent(
      '280,00 MAD',
    );
    expect(screen.getByTestId('document-total-ttc')).toHaveTextContent(
      '310,00 MAD',
    );
  });

  it.each([
    ['an invalid quantity', { quantity: 'deux' }],
    ['an invalid unit price', { unitPriceHt: 'cent' }],
    [
      'a line total beyond safe integer precision',
      { quantity: '2', unitPriceHt: '90071992547409.91' },
    ],
  ])('shows a calculation error instead of zero for %s', (_, patch) => {
    const invalidItem = { ...initialItems[0], ...patch, tvaRate: 0 as const };

    render(<EditorHarness defaultItems={[invalidItem]} />);

    expect(screen.getByTestId('line-total-ht')).toHaveTextContent(
      'Calcul impossible',
    );
    expect(screen.getByTestId('line-total-ttc')).toHaveTextContent(
      'Calcul impossible',
    );
    expect(screen.getByTestId('document-total-ttc')).toHaveTextContent(
      'Calcul impossible',
    );
    expect(screen.queryByText('0,00 MAD')).not.toBeInTheDocument();
  });

  it('formats line and document totals at the safe-integer boundary', () => {
    const boundaryItems: ErpLineItemDraft[] = [
      {
        ...initialItems[0],
        id: 'boundary-a',
        quantity: '1',
        unitPriceHt: '45035996273704.95',
        tvaRate: 0,
      },
      {
        ...initialItems[0],
        id: 'boundary-b',
        quantity: '1',
        unitPriceHt: '45035996273704.96',
        tvaRate: 0,
      },
    ];

    render(<EditorHarness defaultItems={boundaryItems} />);

    expect(screen.getByTestId('document-total-ttc')).toHaveTextContent(
      '90 071 992 547 409,91 MAD',
    );
    expect(screen.queryByText('Calcul impossible')).not.toBeInTheDocument();
  });

  it('shows a document calculation error when safe line totals overflow during aggregation', () => {
    const overflowingDocumentItems: ErpLineItemDraft[] = [
      {
        ...initialItems[0],
        id: 'overflow-a',
        quantity: '1',
        unitPriceHt: '45035996273704.95',
        tvaRate: 0,
      },
      {
        ...initialItems[0],
        id: 'overflow-b',
        quantity: '1',
        unitPriceHt: '45035996273704.96',
        tvaRate: 0,
      },
      {
        ...initialItems[0],
        id: 'overflow-c',
        quantity: '1',
        unitPriceHt: '0.01',
        tvaRate: 0,
      },
    ];

    expect(() =>
      render(<EditorHarness defaultItems={overflowingDocumentItems} />),
    ).not.toThrow();

    expect(screen.getAllByTestId('line-total-ttc')[0]).not.toHaveTextContent(
      'Calcul impossible',
    );
    expect(screen.getByTestId('document-total-ttc')).toHaveTextContent(
      'Calcul impossible',
    );
    expect(screen.getByTestId('document-total-ttc')).not.toHaveTextContent(
      '0,00 MAD',
    );
  });

  it('offers only the supported TVA rates', () => {
    render(<EditorHarness />);

    const tva = screen.getByRole('button', { name: 'TVA 1' });
    fireEvent.click(tva);

    const options = screen.getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      '0 %',
      '7 %',
      '10 %',
      '14 %',
      '20 %',
    ]);

    fireEvent.click(screen.getByRole('option', { name: '7 %' }));
    expect(screen.getByRole('button', { name: 'TVA 1' })).toHaveTextContent(
      '7 %',
    );
  });

  it('uses one named focus target and opens the TVA Select with Enter and Space', () => {
    render(<EditorHarness />);

    const tva = screen.getByRole('button', { name: 'TVA 1' });
    tva.focus();

    expect(tva).toHaveFocus();
    expect(tva).toHaveAttribute('tabindex', '0');
    expect(tva.querySelector('[role="button"]')).not.toBeInTheDocument();

    fireEvent.keyDown(tva, { key: 'Enter' });
    expect(screen.getAllByRole('option')).toHaveLength(5);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('option')).not.toBeInTheDocument();

    fireEvent.keyDown(tva, { key: ' ' });
    expect(screen.getAllByRole('option')).toHaveLength(5);
  });

  it('supports keyboard option selection after opening the TVA Select', () => {
    render(<EditorHarness />);

    const tva = screen.getByRole('button', { name: 'TVA 1' });
    tva.focus();
    fireEvent.keyDown(tva, { key: 'Enter' });
    fireEvent.keyDown(document, {
      key: 'ArrowUp',
      code: 'ArrowUp',
      keyCode: 38,
    });
    fireEvent.keyDown(document, { key: 'Enter', code: 'Enter', keyCode: 13 });

    expect(screen.getByRole('button', { name: 'TVA 1' })).toHaveTextContent(
      '14 %',
    );
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('adds, removes, and reorders keyed row nodes with labelled buttons', () => {
    render(<EditorHarness />);

    const firstRow = screen.getByTestId('erp-line-item-line-1');
    const secondRow = screen.getByTestId('erp-line-item-line-2');

    fireEvent.click(screen.getByRole('button', { name: 'Monter la ligne 2' }));
    const reorderedRows = screen.getAllByTestId(/^erp-line-item-/);
    expect(reorderedRows).toEqual([secondRow, firstRow]);
    expect(screen.getAllByLabelText(/Description \d/)[0]).toHaveValue(
      'Transport',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une ligne' }));
    expect(screen.getAllByTestId(/^erp-line-item-/)).toHaveLength(3);

    fireEvent.click(
      screen.getByRole('button', { name: 'Supprimer la ligne 3' }),
    );
    expect(screen.getAllByTestId(/^erp-line-item-/)).toHaveLength(2);
  });

  it('provides keyboard reorder alternatives and reports dirty state', () => {
    const onDirtyChange = jest.fn();
    render(<EditorHarness onDirtyChange={onDirtyChange} />);

    fireEvent.keyDown(screen.getByLabelText('Description 2'), {
      key: 'ArrowUp',
      altKey: true,
    });

    expect(screen.getAllByLabelText(/Description \d/)[0]).toHaveValue(
      'Transport',
    );
    expect(onDirtyChange).toHaveBeenCalledWith(true);
  });

  it('keeps rows in a horizontal container and footer controls in responsive siblings', () => {
    render(<EditorHarness />);

    const rowsScroll = screen.getByTestId('erp-line-items-scroll');
    const footer = screen.getByTestId('erp-line-items-footer');
    const totals = screen.getByTestId('erp-document-totals');

    expect(rowsScroll).toContainElement(
      screen.getByTestId('erp-line-item-line-1'),
    );
    expect(footer).toContainElement(
      screen.getByRole('button', { name: 'Ajouter une ligne' }),
    );
    expect(footer).toContainElement(totals);
    expect(totals.parentElement).toBe(footer);
  });
});
