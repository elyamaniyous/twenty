import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { styled } from '@linaria/react';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  erpAccountingAccountSchema,
  erpAccountingJournalSchema,
  erpAccountingReferencesSchema,
  type ErpAccountingAccount,
  type ErpAccountingJournal,
  type ErpAccountingReferences,
} from 'twenty-shared/erp-maroc';
import { IconCheck, IconPlus, IconX } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const EMPTY: ErpAccountingReferences = { accounts: [], journals: [] };

const StyledContent = styled.div`
  display: grid;
  flex: 1 1 auto;
  grid-template-rows: minmax(320px, 1.4fr) minmax(260px, 1fr);
  min-height: 0;
  overflow: auto;
`;

const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  min-height: 0;

  & + & {
    border-top: 1px solid ${themeCssVariables.border.color.medium};
  }
`;

const StyledSectionHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};

  h2 {
    font-size: ${themeCssVariables.font.size.md};
    letter-spacing: 0;
    margin: 0;
  }
`;

const StyledCreateForm = styled.form`
  align-items: center;
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: 100px minmax(220px, 1fr) 120px 36px;
  min-width: min(100%, 520px);

  &[data-kind='journal'] {
    grid-template-columns: 100px minmax(220px, 1fr) 140px 36px;
  }

  @media (max-width: 800px) {
    grid-template-columns: 1fr 1fr;
    width: 100%;

    &[data-kind='journal'] {
      grid-template-columns: 1fr 1fr;
    }
  }
`;

const controlCss = `
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 32px;
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

const StyledAlert = styled.div`
  background: ${themeCssVariables.background.danger};
  color: ${themeCssVariables.font.color.danger};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

export const ErpAccountingReferencesPage = () => {
  const { client, context } = useErpMarocContext();
  const [references, setReferences] = useState(EMPTY);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountCode, setAccountCode] = useState('');
  const [accountLabel, setAccountLabel] = useState('');
  const [accountClass, setAccountClass] = useState('');
  const [journalCode, setJournalCode] = useState('');
  const [journalLabel, setJournalLabel] = useState('');
  const [journalType, setJournalType] =
    useState<ErpAccountingJournal['type']>('OD');
  const canManage = context?.role === 'OWNER' || context?.role === 'ADMIN';

  const load = useCallback(() => {
    let active = true;
    setState('loading');
    void client
      .request({
        method: 'GET',
        path: '/accounting/references',
        schema: erpAccountingReferencesSchema,
      })
      .then((result) => {
        if (!active) return;
        setReferences(result);
        setState('ready');
      })
      .catch(() => {
        if (active) setState('error');
      });
    return () => {
      active = false;
    };
  }, [client]);

  useEffect(() => load(), [generation, load]);

  const mutate = async <T,>(options: {
    path: string;
    method: 'POST' | 'PATCH';
    body: unknown;
    schema:
      | typeof erpAccountingAccountSchema
      | typeof erpAccountingJournalSchema;
  }) => {
    if (pendingId !== null) return null;
    setPendingId(options.path);
    setError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: options.method,
          path: options.path,
          body: options.body,
          schema: options.schema,
        },
        { idempotency: 'required' },
      );
      const result = (await intent.execute()) as T;
      setGeneration((value) => value + 1);
      return result;
    } catch {
      setError("L'opération sur le référentiel comptable a échoué.");
      return null;
    } finally {
      setPendingId(null);
    }
  };

  const createAccount = async (event: FormEvent) => {
    event.preventDefault();
    const classe = Number(accountClass);
    if (
      !accountCode.trim() ||
      !accountLabel.trim() ||
      !Number.isInteger(classe)
    ) {
      setError('Le compte, son libellé et sa classe sont obligatoires.');
      return;
    }
    const created = await mutate<ErpAccountingAccount>({
      method: 'POST',
      path: '/accounting/references/accounts',
      body: { code: accountCode.trim(), libelle: accountLabel.trim(), classe },
      schema: erpAccountingAccountSchema,
    });
    if (created !== null) {
      setAccountCode('');
      setAccountLabel('');
      setAccountClass('');
    }
  };

  const createJournal = async (event: FormEvent) => {
    event.preventDefault();
    if (!journalCode.trim() || !journalLabel.trim()) {
      setError('Le code et le libellé du journal sont obligatoires.');
      return;
    }
    const created = await mutate<ErpAccountingJournal>({
      method: 'POST',
      path: '/accounting/references/journals',
      body: {
        code: journalCode.trim(),
        libelle: journalLabel.trim(),
        type: journalType,
      },
      schema: erpAccountingJournalSchema,
    });
    if (created !== null) {
      setJournalCode('');
      setJournalLabel('');
      setJournalType('OD');
    }
  };

  const accountColumns = useMemo<
    ErpOperationalTableColumn<ErpAccountingAccount>[]
  >(
    () => [
      {
        key: 'code',
        header: 'Compte',
        width: '130px',
        render: (item) => item.code,
      },
      {
        key: 'label',
        header: 'Libellé',
        width: '360px',
        render: (item) => item.libelle,
      },
      {
        key: 'class',
        header: 'Classe',
        width: '90px',
        render: (item) => item.classe,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '120px',
        render: (item) => (
          <ErpStatusBadge
            label={item.isActive ? 'Actif' : 'Inactif'}
            tone={item.isActive ? 'success' : 'neutral'}
          />
        ),
      },
      {
        key: 'action',
        header: '',
        width: '56px',
        render: (item) =>
          canManage ? (
            <Button
              title={item.isActive ? 'Désactiver' : 'Activer'}
              ariaLabel={`${item.isActive ? 'Désactiver' : 'Activer'} le compte ${item.code}`}
              Icon={item.isActive ? IconX : IconCheck}
              variant="secondary"
              disabled={pendingId !== null}
              isLoading={
                pendingId === `/accounting/references/accounts/${item.id}`
              }
              onClick={() =>
                void mutate({
                  method: 'PATCH',
                  path: `/accounting/references/accounts/${item.id}`,
                  body: { isActive: !item.isActive },
                  schema: erpAccountingAccountSchema,
                })
              }
            />
          ) : null,
      },
    ],
    [canManage, pendingId],
  );

  const journalColumns = useMemo<
    ErpOperationalTableColumn<ErpAccountingJournal>[]
  >(
    () => [
      {
        key: 'code',
        header: 'Journal',
        width: '130px',
        render: (item) => item.code,
      },
      {
        key: 'label',
        header: 'Libellé',
        width: '320px',
        render: (item) => item.libelle,
      },
      {
        key: 'type',
        header: 'Type',
        width: '130px',
        render: (item) => item.type,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '120px',
        render: (item) => (
          <ErpStatusBadge
            label={item.isActive ? 'Actif' : 'Inactif'}
            tone={item.isActive ? 'success' : 'neutral'}
          />
        ),
      },
      {
        key: 'action',
        header: '',
        width: '56px',
        render: (item) =>
          canManage ? (
            <Button
              title={item.isActive ? 'Désactiver' : 'Activer'}
              ariaLabel={`${item.isActive ? 'Désactiver' : 'Activer'} le journal ${item.code}`}
              Icon={item.isActive ? IconX : IconCheck}
              variant="secondary"
              disabled={pendingId !== null}
              isLoading={
                pendingId === `/accounting/references/journals/${item.id}`
              }
              onClick={() =>
                void mutate({
                  method: 'PATCH',
                  path: `/accounting/references/journals/${item.id}`,
                  body: { isActive: !item.isActive },
                  schema: erpAccountingJournalSchema,
                })
              }
            />
          ) : null,
      },
    ],
    [canManage, pendingId],
  );

  return (
    <ErpPageShell
      title="Référentiels comptables"
      description="Plan comptable et journaux"
      state={state}
      loadingLabel="Chargement des référentiels"
      errorLabel="Impossible de charger les référentiels"
      onRetry={() => setGeneration((value) => value + 1)}
    >
      {error === null ? null : <StyledAlert role="alert">{error}</StyledAlert>}
      <StyledContent>
        <StyledSection>
          <StyledSectionHeader>
            <h2>Plan comptable</h2>
            {canManage ? (
              <StyledCreateForm onSubmit={createAccount}>
                <StyledInput
                  aria-label="Code du compte"
                  placeholder="Compte"
                  value={accountCode}
                  onChange={(event) => setAccountCode(event.target.value)}
                />
                <StyledInput
                  aria-label="Libellé du compte"
                  placeholder="Libellé"
                  value={accountLabel}
                  onChange={(event) => setAccountLabel(event.target.value)}
                />
                <StyledSelect
                  aria-label="Classe comptable"
                  value={accountClass}
                  onChange={(event) => setAccountClass(event.target.value)}
                >
                  <option value="">Classe</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </StyledSelect>
                <Button
                  type="submit"
                  title="Ajouter"
                  ariaLabel="Ajouter le compte"
                  Icon={IconPlus}
                  variant="secondary"
                  disabled={pendingId !== null}
                />
              </StyledCreateForm>
            ) : null}
          </StyledSectionHeader>
          <ErpOperationalTable
            ariaLabel="Plan comptable"
            columns={accountColumns}
            rows={references.accounts}
            getRowKey={(item) => item.id}
            emptyLabel="Aucun compte comptable"
          />
        </StyledSection>
        <StyledSection>
          <StyledSectionHeader>
            <h2>Journaux</h2>
            {canManage ? (
              <StyledCreateForm data-kind="journal" onSubmit={createJournal}>
                <StyledInput
                  aria-label="Code du journal"
                  placeholder="Code"
                  value={journalCode}
                  onChange={(event) => setJournalCode(event.target.value)}
                />
                <StyledInput
                  aria-label="Libellé du journal"
                  placeholder="Libellé"
                  value={journalLabel}
                  onChange={(event) => setJournalLabel(event.target.value)}
                />
                <StyledSelect
                  aria-label="Type de journal"
                  value={journalType}
                  onChange={(event) =>
                    setJournalType(
                      event.target.value as ErpAccountingJournal['type'],
                    )
                  }
                >
                  {['VENTE', 'ACHAT', 'BANQUE', 'CAISSE', 'OD', 'PAIE'].map(
                    (type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ),
                  )}
                </StyledSelect>
                <Button
                  type="submit"
                  title="Ajouter"
                  ariaLabel="Ajouter le journal"
                  Icon={IconPlus}
                  variant="secondary"
                  disabled={pendingId !== null}
                />
              </StyledCreateForm>
            ) : null}
          </StyledSectionHeader>
          <ErpOperationalTable
            ariaLabel="Journaux comptables"
            columns={journalColumns}
            rows={references.journals}
            getRowKey={(item) => item.id}
            emptyLabel="Aucun journal comptable"
          />
        </StyledSection>
      </StyledContent>
    </ErpPageShell>
  );
};
