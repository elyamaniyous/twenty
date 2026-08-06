import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// oxlint-disable-next-line eslint/no-restricted-imports -- Pages are outside the @/ modules alias.
import { ErpInventoryPage } from '../ErpInventoryPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

const request = jest.fn(async () => []);

describe('ErpInventoryPage', () => {
  beforeEach(() => {
    request.mockClear();
    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        capabilities: { manageInventory: true },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: {
        request,
        createMutationIntent: jest.fn(),
      } as never,
    });
  });

  it('loads the operational stock datasets and opens the warehouse form', async () => {
    render(<ErpInventoryPage />);

    expect(await screen.findByText('Aucun produit stocké')).toBeVisible();
    expect(request).toHaveBeenCalledTimes(7);

    await userEvent.click(screen.getByRole('tab', { name: 'Entrepôts' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer un entrepôt' }),
    );

    expect(
      screen.getByRole('heading', { name: 'Nouvel entrepôt' }),
    ).toBeVisible();
    expect(screen.getByLabelText('Code')).toBeVisible();
    expect(screen.getByLabelText('Nom')).toBeVisible();
  });
});
