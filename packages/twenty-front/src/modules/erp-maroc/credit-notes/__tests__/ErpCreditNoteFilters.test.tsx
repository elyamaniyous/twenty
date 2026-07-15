import { fireEvent, render, screen } from '@testing-library/react';

import {
  ErpCreditNoteFilters,
  type ErpCreditNoteFilterValues,
} from '../ErpCreditNoteFilters';

const values: ErpCreditNoteFilterValues = {
  status: 'all',
  tierId: '',
  sourceInvoiceId: '',
  from: '',
  to: '',
};

const renderFilters = (overrides = {}) => {
  const onChange = jest.fn();

  render(
    <ErpCreditNoteFilters
      values={values}
      disabled={false}
      onChange={onChange}
      {...overrides}
    />,
  );

  return onChange;
};

describe('ErpCreditNoteFilters', () => {
  it.each([
    ['Statut', 'VALIDATED', { ...values, status: 'VALIDATED' }],
    ['Tiers', 'tier-42', { ...values, tierId: 'tier-42' }],
    [
      'Facture source',
      'invoice-42',
      { ...values, sourceInvoiceId: 'invoice-42' },
    ],
    ['Du', '2026-07-01', { ...values, from: '2026-07-01' }],
    ['Au', '2026-07-31', { ...values, to: '2026-07-31' }],
  ])('emits a full immutable state update for %s', (label, value, expected) => {
    const onChange = renderFilters();
    const control = screen.getByLabelText(label);

    fireEvent.change(control, { target: { value } });

    expect(onChange).toHaveBeenCalledWith(expected);
    expect(values).toEqual({
      status: 'all',
      tierId: '',
      sourceInvoiceId: '',
      from: '',
      to: '',
    });
  });

  it('does not emit filter changes when disabled', () => {
    const onChange = renderFilters({ disabled: true });
    const status = screen.getByLabelText('Statut');

    expect(status).toBeDisabled();
    fireEvent.change(status, { target: { value: 'VALIDATED' } });

    expect(onChange).not.toHaveBeenCalled();
  });
});
