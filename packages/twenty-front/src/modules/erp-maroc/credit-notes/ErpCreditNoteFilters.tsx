export type ErpCreditNoteFilterValues = {
  status: 'all' | 'DRAFT' | 'VALIDATED' | 'CANCELLED';
  tierId: string;
  sourceInvoiceId: string;
  from: string;
  to: string;
};

type ErpCreditNoteFiltersProps = {
  values: ErpCreditNoteFilterValues;
  disabled: boolean;
  onChange: (values: ErpCreditNoteFilterValues) => void;
};

const statusOptions: ReadonlyArray<{
  value: ErpCreditNoteFilterValues['status'];
  label: string;
}> = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'DRAFT', label: 'Brouillons' },
  { value: 'VALIDATED', label: 'Validés' },
  { value: 'CANCELLED', label: 'Annulés' },
];

export const ErpCreditNoteFilters = ({
  values,
  disabled,
  onChange,
}: ErpCreditNoteFiltersProps) => {
  const updateValue = <Key extends keyof ErpCreditNoteFilterValues>(
    key: Key,
    value: ErpCreditNoteFilterValues[Key],
  ) => {
    if (disabled) return;

    onChange({ ...values, [key]: value });
  };

  return (
    <fieldset disabled={disabled}>
      <label htmlFor="credit-note-status">Statut</label>
      <select
        id="credit-note-status"
        value={values.status}
        onChange={(event) =>
          updateValue(
            'status',
            event.target.value as ErpCreditNoteFilterValues['status'],
          )
        }
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <label htmlFor="credit-note-tier">Tiers</label>
      <input
        id="credit-note-tier"
        value={values.tierId}
        onChange={(event) => updateValue('tierId', event.target.value)}
      />
      <label htmlFor="credit-note-source-invoice">Facture source</label>
      <input
        id="credit-note-source-invoice"
        value={values.sourceInvoiceId}
        onChange={(event) => updateValue('sourceInvoiceId', event.target.value)}
      />
      <label htmlFor="credit-note-from">Du</label>
      <input
        id="credit-note-from"
        type="date"
        value={values.from}
        onChange={(event) => updateValue('from', event.target.value)}
      />
      <label htmlFor="credit-note-to">Au</label>
      <input
        id="credit-note-to"
        type="date"
        value={values.to}
        onChange={(event) => updateValue('to', event.target.value)}
      />
    </fieldset>
  );
};
