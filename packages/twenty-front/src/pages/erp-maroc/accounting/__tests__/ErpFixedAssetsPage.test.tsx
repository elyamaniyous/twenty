import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ErpFixedAssetsPage } from '../ErpFixedAssetsPage';

jest.mock('@/erp-maroc/context/useErpMarocContext', () => ({
  useErpMarocContext: jest.fn(),
}));

const request = jest.fn(async ({ path }: { path: string }) => {
  if (path === '/accounting/fixed-assets/categories') return { items: [] };
  if (path === '/accounting/references') {
    return { accounts: [], journals: [] };
  }
  return {
    items: [],
    summary: {
      acquisitionCostCents: 0,
      accumulatedDepreciationCents: 0,
      netBookValueCents: 0,
    },
  };
});

describe('ErpFixedAssetsPage', () => {
  beforeEach(() => {
    request.mockClear();
    jest.mocked(useErpMarocContext).mockReturnValue({
      status: 'ready',
      context: {
        societeId: '11111111-1111-4111-8111-111111111111',
      } as never,
      error: null,
      refetch: jest.fn(),
      client: {
        request,
        createMutationIntent: jest.fn(),
      } as never,
    });
  });

  it('loads the register and opens the category accounting form', async () => {
    render(<ErpFixedAssetsPage />);

    expect(
      await screen.findByText(
        'Créez une catégorie comptable avant la première immobilisation.',
      ),
    ).toBeVisible();
    expect(request).toHaveBeenCalledTimes(3);

    await userEvent.click(screen.getByRole('tab', { name: 'Catégories' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Nouvelle catégorie' }),
    );

    expect(screen.getByLabelText('Code')).toBeVisible();
    expect(screen.getByText('Compte d’actif')).toBeVisible();
    expect(screen.getByLabelText('Durée par défaut (mois)')).toBeVisible();
  });
});
