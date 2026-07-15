import { useState, type FormEvent } from 'react';

import type {
  PaymentFormError,
  PaymentFormValues,
  PaymentMethod,
} from './paymentFormSchema';

type ErpPaymentEditorFormProps = {
  invoiceId?: string;
  disabled: boolean;
  errors: PaymentFormError[];
  submissionError: string | null;
  onSubmit: (values: PaymentFormValues) => void | Promise<void>;
};

const initialValues: PaymentFormValues = {
  tierId: '',
  amountCents: '',
  currency: 'MAD',
  paymentDate: '',
  method: '',
  reference: null,
  notes: null,
};

export const ErpPaymentEditorForm = ({
  invoiceId,
  disabled,
  errors,
  submissionError,
  onSubmit,
}: ErpPaymentEditorFormProps) => {
  const [values, setValues] = useState<PaymentFormValues>(initialValues);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {invoiceId === undefined ? null : (
        <input type="hidden" name="invoiceId" value={invoiceId} />
      )}
      {errors.length > 0 || submissionError !== null ? (
        <div role="alert">
          {errors.map((error) => (
            <span key={`${error.path}-${error.code}`}>{error.message}</span>
          ))}
          {submissionError === null ? null : <span>{submissionError}</span>}
        </div>
      ) : null}
      <label htmlFor="payment-client">Client</label>
      <input
        id="payment-client"
        name="client"
        value={values.tierId}
        disabled={disabled}
        onChange={(event) =>
          setValues((current) => ({ ...current, tierId: event.target.value }))
        }
      />
      <label htmlFor="payment-amount-cents">Montant (centimes)</label>
      <input
        id="payment-amount-cents"
        name="amountCents"
        inputMode="numeric"
        value={values.amountCents}
        disabled={disabled}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            amountCents: event.target.value,
          }))
        }
      />
      <label htmlFor="payment-date">Date de paiement</label>
      <input
        id="payment-date"
        name="paymentDate"
        type="date"
        value={values.paymentDate}
        disabled={disabled}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            paymentDate: event.target.value,
          }))
        }
      />
      <label htmlFor="payment-method">Mode de paiement</label>
      <select
        id="payment-method"
        name="method"
        value={values.method ?? ''}
        disabled={disabled}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            method: event.target.value as PaymentMethod | '',
          }))
        }
      >
        <option value="">Sélectionner un mode</option>
        <option value="BANK_TRANSFER">Virement bancaire</option>
        <option value="CHECK">Chèque</option>
        <option value="CASH">Espèces</option>
        <option value="CARD">Carte</option>
        <option value="DIRECT_DEBIT">Prélèvement</option>
        <option value="OTHER">Autre</option>
      </select>
      <label htmlFor="payment-reference">Référence</label>
      <input
        id="payment-reference"
        name="reference"
        value={values.reference ?? ''}
        disabled={disabled}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            reference: event.target.value,
          }))
        }
      />
      <label htmlFor="payment-notes">Note</label>
      <textarea
        id="payment-notes"
        name="notes"
        value={values.notes ?? ''}
        disabled={disabled}
        onChange={(event) =>
          setValues((current) => ({ ...current, notes: event.target.value }))
        }
      />
      <button type="submit" disabled={disabled}>
        Créer le règlement
      </button>
    </form>
  );
};
