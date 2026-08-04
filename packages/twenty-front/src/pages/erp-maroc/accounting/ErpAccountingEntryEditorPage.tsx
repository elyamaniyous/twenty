import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  erpAccountingEntrySchema,
  erpAccountingReferencesSchema,
  type ErpAccountingReferences,
} from 'twenty-shared/erp-maroc';
import { IconCheck, IconPlus, IconTrash } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type DraftLine = {
  key: number;
  accountCode: string;
  label: string;
  debit: string;
  credit: string;
};

const emptyReferences: ErpAccountingReferences = { accounts: [], journals: [] };

const localDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

let nextLineKey = 2;
const newLine = (): DraftLine => ({
  key: nextLineKey++,
  accountCode: '',
  label: '',
  debit: '',
  credit: '',
});

const parseMad = (value: string): number | null => {
  if (value.trim() === '') return 0;
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
};

const StyledForm = styled.form`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const StyledFields = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: minmax(150px, 1fr) minmax(150px, 1fr) minmax(
      260px,
      2fr
    );
  padding: ${themeCssVariables.spacing[4]};

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const controlCss = `
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 34px;
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledInput = styled.input`
  ${controlCss}
`;
const StyledSelect = styled.select`
  ${controlCss}
`;

const StyledLines = styled.section`
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  min-width: 760px;
`;

const StyledLineHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};

  h2 {
    font-size: ${themeCssVariables.font.size.md};
    letter-spacing: 0;
    margin: 0;
  }
`;

const StyledLine = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(220px, 1.2fr) minmax(
      280px,
      2fr
    ) 130px 130px 36px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const StyledTotals = styled.div`
  align-items: center;
  display: grid;
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(220px, 1.2fr) minmax(
      280px,
      2fr
    ) 130px 130px 36px;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  span:nth-of-type(2),
  span:nth-of-type(3) {
    text-align: right;
  }
`;

const StyledAlert = styled.div`
  background: ${themeCssVariables.background.danger};
  color: ${themeCssVariables.font.color.danger};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

export const ErpAccountingEntryEditorPage = () => {
  const { client, context } = useErpMarocContext();
  const navigate = useNavigate();
  const [references, setReferences] =
    useState<ErpAccountingReferences>(emptyReferences);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [journalCode, setJournalCode] = useState('');
  const [entryDate, setEntryDate] = useState(localDate());
  const [label, setLabel] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([newLine(), newLine()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void client
      .request({
        method: 'GET',
        path: '/accounting/references',
        schema: erpAccountingReferencesSchema,
      })
      .then((result) => {
        if (!active) return;
        setReferences(result);
        const preferred =
          result.journals.find(
            (journal) => journal.isActive && journal.type === 'OD',
          ) ?? result.journals.find((journal) => journal.isActive);
        setJournalCode(preferred?.code ?? '');
        setLoadState('ready');
      })
      .catch(() => {
        if (active) setLoadState('error');
      });
    return () => {
      active = false;
    };
  }, [client]);

  const amounts = useMemo(
    () =>
      lines.map((line) => ({
        debit: parseMad(line.debit),
        credit: parseMad(line.credit),
      })),
    [lines],
  );
  const totalDebit = amounts.reduce(
    (sum, amount) => sum + (amount.debit ?? 0),
    0,
  );
  const totalCredit = amounts.reduce(
    (sum, amount) => sum + (amount.credit ?? 0),
    0,
  );

  const updateLine = (key: number, changes: Partial<DraftLine>) => {
    setLines((current) =>
      current.map((line) =>
        line.key === key ? { ...line, ...changes } : line,
      ),
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting || context === null) return;
    const invalidAmount = amounts.some(
      (amount) =>
        amount.debit === null ||
        amount.credit === null ||
        !(
          ((amount.debit ?? 0) > 0 && amount.credit === 0) ||
          ((amount.credit ?? 0) > 0 && amount.debit === 0)
        ),
    );
    if (
      journalCode === '' ||
      label.trim().length < 2 ||
      lines.some(
        (line) => line.accountCode === '' || line.label.trim().length < 2,
      ) ||
      invalidAmount ||
      totalDebit <= 0 ||
      totalDebit !== totalCredit
    ) {
      setError(
        "L'écriture doit être complète, équilibrée et comporter un montant par ligne.",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/accounting/entries',
          schema: erpAccountingEntrySchema,
          body: {
            societeId: context.societeId,
            journalCode,
            entryDate,
            label: label.trim(),
            lines: lines.map((line, index) => ({
              accountCode: line.accountCode,
              label: line.label.trim(),
              debitCents: amounts[index].debit,
              creditCents: amounts[index].credit,
            })),
          },
        },
        { idempotency: 'required' },
      );
      const created = await intent.execute();
      navigate(`/erp-maroc/accounting/entries/${created.id}`);
    } catch {
      setError("Impossible de créer l'écriture comptable.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ErpPageShell
      title="Nouvelle opération diverse"
      description="Saisie comptable en brouillon"
      state={loadState}
      loadingLabel="Chargement du plan comptable"
      errorLabel="Impossible de charger les référentiels comptables"
      actions={
        <Button
          title="Enregistrer"
          ariaLabel="Enregistrer l'opération diverse"
          Icon={IconCheck}
          accent="blue"
          disabled={isSubmitting || loadState !== 'ready'}
          isLoading={isSubmitting}
          onClick={() =>
            document
              .querySelector<HTMLFormElement>('#manual-accounting-entry-form')
              ?.requestSubmit()
          }
        />
      }
    >
      <StyledForm id="manual-accounting-entry-form" onSubmit={submit}>
        {error === null ? null : (
          <StyledAlert role="alert">{error}</StyledAlert>
        )}
        <StyledFields>
          <StyledField>
            Journal
            <StyledSelect
              value={journalCode}
              onChange={(event) => setJournalCode(event.target.value)}
            >
              {references.journals
                .filter((journal) => journal.isActive)
                .map((journal) => (
                  <option key={journal.id} value={journal.code}>
                    {journal.code} · {journal.libelle}
                  </option>
                ))}
            </StyledSelect>
          </StyledField>
          <StyledField>
            Date comptable
            <StyledInput
              type="date"
              value={entryDate}
              onChange={(event) => setEntryDate(event.target.value)}
            />
          </StyledField>
          <StyledField>
            Libellé
            <StyledInput
              value={label}
              maxLength={255}
              onChange={(event) => setLabel(event.target.value)}
            />
          </StyledField>
        </StyledFields>
        <div style={{ overflow: 'auto' }}>
          <StyledLines>
            <StyledLineHeader>
              <h2>Lignes comptables</h2>
              <Button
                type="button"
                title="Ajouter une ligne"
                ariaLabel="Ajouter une ligne comptable"
                Icon={IconPlus}
                variant="secondary"
                onClick={() => setLines((current) => [...current, newLine()])}
              />
            </StyledLineHeader>
            {lines.map((line) => (
              <StyledLine key={line.key}>
                <StyledSelect
                  aria-label="Compte comptable"
                  value={line.accountCode}
                  onChange={(event) =>
                    updateLine(line.key, { accountCode: event.target.value })
                  }
                >
                  <option value="">Compte</option>
                  {references.accounts
                    .filter((account) => account.isActive)
                    .map((account) => (
                      <option key={account.id} value={account.code}>
                        {account.code} · {account.libelle}
                      </option>
                    ))}
                </StyledSelect>
                <StyledInput
                  aria-label="Libellé de ligne"
                  placeholder="Libellé"
                  value={line.label}
                  onChange={(event) =>
                    updateLine(line.key, { label: event.target.value })
                  }
                />
                <StyledInput
                  aria-label="Débit en dirhams"
                  inputMode="decimal"
                  placeholder="Débit"
                  value={line.debit}
                  onChange={(event) =>
                    updateLine(line.key, {
                      debit: event.target.value,
                      credit: '',
                    })
                  }
                />
                <StyledInput
                  aria-label="Crédit en dirhams"
                  inputMode="decimal"
                  placeholder="Crédit"
                  value={line.credit}
                  onChange={(event) =>
                    updateLine(line.key, {
                      credit: event.target.value,
                      debit: '',
                    })
                  }
                />
                <Button
                  type="button"
                  title="Supprimer"
                  ariaLabel="Supprimer la ligne"
                  Icon={IconTrash}
                  variant="secondary"
                  disabled={lines.length <= 2}
                  onClick={() =>
                    setLines((current) =>
                      current.filter((item) => item.key !== line.key),
                    )
                  }
                />
              </StyledLine>
            ))}
            <StyledTotals>
              <span />
              <span>Totaux</span>
              <span>{formatMadCents(totalDebit)}</span>
              <span>{formatMadCents(totalCredit)}</span>
              <span />
            </StyledTotals>
          </StyledLines>
        </div>
      </StyledForm>
    </ErpPageShell>
  );
};
