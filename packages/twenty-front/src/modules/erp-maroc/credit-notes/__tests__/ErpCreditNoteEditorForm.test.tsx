import { fireEvent, render, screen } from '@testing-library/react';

import { ErpCreditNoteEditorForm } from '../ErpCreditNoteEditorForm';
import type { CreditNoteDraftLineValues } from '../creditNoteFormSchema';

const lines: CreditNoteDraftLineValues[] = [
  {
    sourceInvoiceLineId: 'c9c90690-4f4a-4e2e-91ce-3700f16a8ca2',
    description: 'Audit operationnel',
    quantity: 2,
    unit: 'jour',
    unitPriceHtCents: 50_000,
    tvaRate: 20,
    sourceTotalHtCents: 100_000,
    amountHtCents: '25000',
  },
];

const renderForm = (overrides = {}) => {
  const onChange = jest.fn();
  const onSubmit = jest.fn();

  render(
    <ErpCreditNoteEditorForm
      sourceInvoiceLabel="FAC-2026-0042"
      tierLabel="Atlas Conseil"
      lines={lines}
      disabled={false}
      errors={[]}
      onChange={onChange}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );

  return { onChange, onSubmit };
};

describe('ErpCreditNoteEditorForm', () => {
  it('keeps client and source fields informational while exposing only HT cents for editing', () => {
    renderForm();

    expect(screen.getByText('FAC-2026-0042')).toBeVisible();
    expect(screen.getByText('Atlas Conseil')).toBeVisible();
    expect(screen.getByText('Audit operationnel')).toBeVisible();
    expect(screen.getByText('2 jour')).toBeVisible();
    expect(screen.getByText('50000 centimes')).toBeVisible();
    expect(screen.getByText('20 %')).toBeVisible();
    expect(screen.queryByLabelText('Client')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Facture source')).not.toBeInTheDocument();
    expect(
      screen.getByRole('spinbutton', {
        name: 'Montant HT (centimes) - Audit operationnel',
      }),
    ).toBeVisible();
  });

  it('emits an immutable lines update for an HT-cent amount edit', () => {
    const { onChange } = renderForm();

    fireEvent.change(
      screen.getByRole('spinbutton', {
        name: 'Montant HT (centimes) - Audit operationnel',
      }),
      { target: { value: '30000' } },
    );

    expect(onChange).toHaveBeenCalledWith([
      { ...lines[0], amountHtCents: '30000' },
    ]);
    expect(lines[0]?.amountHtCents).toBe('25000');
  });

  it('renders errors and blocks editing and submission when disabled', () => {
    const { onChange, onSubmit } = renderForm({
      disabled: true,
      errors: [
        {
          path: 'lines.0.amountHtCents',
          code: 'AMOUNT_HT_CENTS_INVALID',
          message: 'Montant invalide',
        },
      ],
    });

    const amountInput = screen.getByRole('spinbutton', {
      name: 'Montant HT (centimes) - Audit operationnel',
    });
    const submitButton = screen.getByRole('button', {
      name: 'Enregistrer l’avoir',
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Montant invalide');
    expect(amountInput).toBeDisabled();
    expect(submitButton).toBeDisabled();

    fireEvent.change(amountInput, { target: { value: '30000' } });
    fireEvent.click(submitButton);

    expect(onChange).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
