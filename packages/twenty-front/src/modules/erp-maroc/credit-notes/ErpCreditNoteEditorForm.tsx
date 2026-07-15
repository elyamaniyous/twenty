import { type FormEvent } from 'react';

import type {
  CreditNoteDraftLineError,
  CreditNoteDraftLineValues,
} from './creditNoteFormSchema';

type ErpCreditNoteEditorFormProps = {
  sourceInvoiceLabel: string;
  tierLabel: string;
  lines: readonly CreditNoteDraftLineValues[];
  disabled: boolean;
  errors: readonly CreditNoteDraftLineError[];
  onChange: (lines: CreditNoteDraftLineValues[]) => void;
  onSubmit: () => void | Promise<void>;
};

export const ErpCreditNoteEditorForm = ({
  sourceInvoiceLabel,
  tierLabel,
  lines,
  disabled,
  errors,
  onChange,
  onSubmit,
}: ErpCreditNoteEditorFormProps) => {
  const updateAmountHtCents = (lineIndex: number, amountHtCents: string) => {
    if (disabled) return;

    onChange(
      lines.map((line, index) =>
        index === lineIndex ? { ...line, amountHtCents } : line,
      ),
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;

    void onSubmit();
  };

  return (
    <form noValidate onSubmit={handleSubmit}>
      {errors.length > 0 ? (
        <div role="alert">
          {errors.map((error) => (
            <span key={`${error.path}-${error.code}`}>{error.message}</span>
          ))}
        </div>
      ) : null}
      <dl>
        <div>
          <dt>Facture source</dt>
          <dd>{sourceInvoiceLabel}</dd>
        </div>
        <div>
          <dt>Client</dt>
          <dd>{tierLabel}</dd>
        </div>
      </dl>
      <ol>
        {lines.map((line, index) => {
          const amountInputId = `credit-note-line-${line.sourceInvoiceLineId}-amount-ht-cents`;
          const amountLabel = `Montant HT (centimes) - ${line.description}`;

          return (
            <li key={line.sourceInvoiceLineId}>
              <dl>
                <div>
                  <dt>Description</dt>
                  <dd>{line.description}</dd>
                </div>
                <div>
                  <dt>Quantité</dt>
                  <dd>{`${line.quantity} ${line.unit ?? ''}`.trim()}</dd>
                </div>
                <div>
                  <dt>Prix unitaire HT</dt>
                  <dd>{`${line.unitPriceHtCents} centimes`}</dd>
                </div>
                <div>
                  <dt>TVA</dt>
                  <dd>{`${line.tvaRate} %`}</dd>
                </div>
              </dl>
              <label htmlFor={amountInputId}>{amountLabel}</label>
              <input
                id={amountInputId}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={line.amountHtCents}
                disabled={disabled}
                onChange={(event) =>
                  updateAmountHtCents(index, event.target.value)
                }
              />
            </li>
          );
        })}
      </ol>
      <button type="submit" disabled={disabled}>
        Enregistrer l’avoir
      </button>
    </form>
  );
};
