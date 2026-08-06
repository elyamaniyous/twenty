import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// oxlint-disable-next-line eslint/no-restricted-imports -- Pages are outside the @/ modules alias.
import { ErpSalesOperationsPage } from '../ErpSalesOperationsPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

const request = jest.fn(async () => []);

describe('ErpSalesOperationsPage', () => {
  beforeEach(() => {
    request.mockClear();
    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        capabilities: {
          manageSalesDocuments: true,
          manageInventory: true,
        },
      } as never,
      error: null,
      refetch: jest.fn(),
      client: {
        request,
        createMutationIntent: jest.fn(),
      } as never,
    });
  });

  it('loads orders and returns, then exposes the controlled return workflow', async () => {
    render(<ErpSalesOperationsPage />);

    expect(await screen.findByText('Aucune commande client')).toBeVisible();
    expect(request).toHaveBeenCalledTimes(5);

    await userEvent.click(screen.getByRole('tab', { name: 'Retours' }));
    expect(screen.getByText('Aucun retour client')).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Créer un retour client' }),
    );

    expect(
      screen.getByRole('heading', { name: 'Nouveau retour client' }),
    ).toBeVisible();
    expect(screen.getByLabelText('Ligne livrée et facturée')).toBeVisible();
  });
});
