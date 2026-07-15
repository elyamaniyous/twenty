import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { ErpTierSelect } from '@/erp-maroc/tiers/ErpTierSelect';

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: () => undefined,
});

const typeOptions = [
  { label: 'Client', value: 'CLIENT' },
  { label: 'Fournisseur', value: 'FOURNISSEUR' },
  { label: 'Mixte', value: 'MIXTE' },
] as const;

const SelectHarness = ({
  disabled = false,
  options = [...typeOptions],
}: {
  disabled?: boolean;
  options?: Array<{ label: string; value: string }>;
}) => {
  const [value, setValue] = useState(options[0].value);

  return (
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ErpTierSelect
        dropdownId="tier-type"
        label="Type"
        options={options}
        value={value}
        disabled={disabled}
        onChange={setValue}
      />
    </MemoryRouter>
  );
};

describe('ErpTierSelect', () => {
  it('names its focus target with the field and selected value through keyboard selection', async () => {
    const user = userEvent.setup();

    render(<SelectHarness />);

    const select = screen.getByRole('button', { name: 'Type Client' });
    select.focus();
    await user.keyboard('{Enter}');
    expect(screen.getAllByRole('option')).toHaveLength(3);
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(
      screen.getByRole('button', { name: 'Type Fournisseur' }),
    ).toHaveFocus();
  });

  it.each([
    ['the disabled prop', { disabled: true, options: [...typeOptions] }],
    [
      'a single available option',
      { disabled: false, options: [typeOptions[0]] },
    ],
  ])('exposes effective disabled state for %s', (_case, props) => {
    render(<SelectHarness disabled={props.disabled} options={props.options} />);

    const select = screen.getByRole('button', { name: 'Type Client' });
    expect(select).toHaveAttribute('aria-disabled', 'true');
    expect(select).toHaveAttribute('tabindex', '-1');
    expect(select).toHaveAttribute('aria-expanded', 'false');
  });
});
