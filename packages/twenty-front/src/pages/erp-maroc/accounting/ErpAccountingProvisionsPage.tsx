import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import {
  ErpStatusBadge,
  type ErpStatusTone,
} from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  erpAccountingProvisionListSchema,
  erpAccountingProvisionSchema,
  erpAccountingReferencesSchema,
  type ErpAccountingProvision,
  type ErpAccountingProvisionList,
  type ErpAccountingProvisionType,
  type ErpAccountingReferences,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const EMPTY_LIST: ErpAccountingProvisionList = { items: [] };
const EMPTY_REFERENCES: ErpAccountingReferences = {
  accounts: [],
  journals: [],
};

const STATUS: Record<
  ErpAccountingProvision['status'],
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'Brouillon', tone: 'warning' },
  ACTIVE: { label: 'Active', tone: 'success' },
  REVERSED: { label: 'Reprise totale', tone: 'neutral' },
  CANCELLED: { label: 'Annulée', tone: 'danger' },
};

const TYPES: Record<ErpAccountingProvisionType, string> = {
  RISK_AND_CHARGE: 'Risques et charges',
  RECEIVABLE_IMPAIRMENT: 'Dépréciation créances',
  INVENTORY_IMPAIRMENT: 'Dépréciation stocks',
  ASSET_IMPAIRMENT: 'Dépréciation actifs',
  OTHER: 'Autre provision',
};

type ProvisionForm = {
  id: string | null;
  type: ErpAccountingProvisionType;
  label: string;
  provisionDate: string;
  reviewDate: string;
  journalCode: string;
  expenseAccountCode: string;
  provisionAccountCode: string;
  reversalAccountCode: string;
  amount: string;
};

const localDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseMad = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
};

const emptyForm = (references: ErpAccountingReferences): ProvisionForm => ({
  id: null,
  type: 'RISK_AND_CHARGE',
  label: '',
  provisionDate: localDate(),
  reviewDate: '',
  journalCode:
    references.journals.find(
      (journal) => journal.isActive && journal.type === 'OD',
    )?.code ??
    references.journals.find((journal) => journal.isActive)?.code ??
    '',
  expenseAccountCode:
    references.accounts.find(
      (account) => account.isActive && /^6(?:19|5)/.test(account.code),
    )?.code ?? '',
  provisionAccountCode:
    references.accounts.find(
      (account) => account.isActive && /^(?:15|29|39|49|59)/.test(account.code),
    )?.code ?? '',
  reversalAccountCode:
    references.accounts.find(
      (account) => account.isActive && /^7(?:19|5)/.test(account.code),
    )?.code ?? '',
  amount: '',
});

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
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
const StyledTextarea = styled.textarea`
  ${controlCss}
  height: 72px;
  padding-bottom: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[2]};
  resize: vertical;
`;

const StyledForm = styled.form`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  padding: ${themeCssVariables.spacing[4]};

  @media (max-width: 1050px) {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }

  @media (max-width: 650px) {
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

const StyledWideField = styled(StyledField)`
  grid-column: span 2;

  @media (max-width: 650px) {
    grid-column: span 1;
  }
`;

const StyledFormActions = styled.div`
  align-items: end;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

const StyledRowActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledActionPanel = styled.section`
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: 160px minmax(260px, 1fr) auto;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  h2 {
    font-size: ${themeCssVariables.font.size.md};
    grid-column: 1 / -1;
    letter-spacing: 0;
    margin: 0;
  }

  @media (max-width: 750px) {
    grid-template-columns: 1fr;
  }
`;

const StyledAlert = styled.div`
  background: ${themeCssVariables.background.danger};
  color: ${themeCssVariables.font.color.danger};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

export const ErpAccountingProvisionsPage = () => {
  const { client, context } = useErpMarocContext();
  const [list, setList] = useState(EMPTY_LIST);
  const [references, setReferences] = useState(EMPTY_REFERENCES);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState<ProvisionForm | null>(null);
  const [postTarget, setPostTarget] = useState<ErpAccountingProvision | null>(
    null,
  );
  const [actionTarget, setActionTarget] =
    useState<ErpAccountingProvision | null>(null);
  const [actionKind, setActionKind] = useState<'reverse' | 'cancel' | null>(
    null,
  );
  const [actionAmount, setActionAmount] = useState('');
  const [actionDate, setActionDate] = useState(localDate());
  const [actionReason, setActionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;
    setLoadState('loading');
    const query = statusFilter === '' ? '' : `?status=${statusFilter}`;
    void Promise.all([
      client.request({
        method: 'GET',
        path: `/accounting/provisions${query}`,
        schema: erpAccountingProvisionListSchema,
      }),
      client.request({
        method: 'GET',
        path: '/accounting/references',
        schema: erpAccountingReferencesSchema,
      }),
    ])
      .then(([nextList, nextReferences]) => {
        if (!active) return;
        setList(nextList);
        setReferences(nextReferences);
        setLoadState('ready');
      })
      .catch(() => {
        if (active) setLoadState('error');
      });
    return () => {
      active = false;
    };
  }, [client, statusFilter]);

  useEffect(() => load(), [load]);

  const replaceProvision = (provision: ErpAccountingProvision) => {
    setList((current) => {
      if (statusFilter !== '' && provision.status !== statusFilter) {
        return {
          items: current.items.filter((item) => item.id !== provision.id),
        };
      }
      const exists = current.items.some((item) => item.id === provision.id);
      return {
        items: exists
          ? current.items.map((item) =>
              item.id === provision.id ? provision : item,
            )
          : [provision, ...current.items],
      };
    });
  };

  const mutate = async (options: {
    method: 'POST' | 'PATCH';
    path: string;
    body: unknown;
  }) => {
    const intent = client.createMutationIntent(
      { ...options, schema: erpAccountingProvisionSchema },
      { idempotency: 'required' },
    );
    const provision = await intent.execute();
    replaceProvision(provision);
    return provision;
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (form === null || context === null || isSubmitting) return;
    const amountCents = parseMad(form.amount);
    if (
      amountCents === null ||
      form.label.trim().length < 2 ||
      form.journalCode === '' ||
      form.expenseAccountCode === '' ||
      form.provisionAccountCode === '' ||
      form.reversalAccountCode === ''
    ) {
      setError('Les champs comptables et le montant sont obligatoires.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await mutate({
        method: form.id === null ? 'POST' : 'PATCH',
        path:
          form.id === null
            ? '/accounting/provisions'
            : `/accounting/provisions/${form.id}`,
        body: {
          societeId: context.societeId,
          type: form.type,
          label: form.label.trim(),
          provisionDate: form.provisionDate,
          reviewDate: form.reviewDate || null,
          journalCode: form.journalCode,
          expenseAccountCode: form.expenseAccountCode,
          provisionAccountCode: form.provisionAccountCode,
          reversalAccountCode: form.reversalAccountCode,
          amountCents,
        },
      });
      setForm(null);
    } catch {
      setError("Impossible d'enregistrer la provision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const post = async () => {
    if (postTarget === null || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await mutate({
        method: 'POST',
        path: `/accounting/provisions/${postTarget.id}/post`,
        body: {},
      });
      setPostTarget(null);
    } catch {
      setError('La dotation comptable n’a pas pu être validée.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeAction = async () => {
    if (actionTarget === null || actionKind === null || isSubmitting) return;
    const amountCents =
      actionKind === 'reverse' ? parseMad(actionAmount) : null;
    if (
      actionReason.trim().length < 10 ||
      (actionKind === 'reverse' && amountCents === null)
    ) {
      setError('Le montant et un motif détaillé sont obligatoires.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await mutate({
        method: 'POST',
        path: `/accounting/provisions/${actionTarget.id}/${actionKind}`,
        body:
          actionKind === 'reverse'
            ? {
                amountCents,
                entryDate: actionDate,
                reason: actionReason.trim(),
              }
            : { reason: actionReason.trim() },
      });
      setActionTarget(null);
      setActionKind(null);
      setActionReason('');
      setActionAmount('');
    } catch {
      setError(
        actionKind === 'reverse'
          ? "Impossible d'enregistrer la reprise."
          : "Impossible d'annuler la provision.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (provision: ErpAccountingProvision) => {
    setForm({
      id: provision.id,
      type: provision.type,
      label: provision.label,
      provisionDate: provision.provisionDate,
      reviewDate: provision.reviewDate ?? '',
      journalCode: provision.journalCode,
      expenseAccountCode: provision.expenseAccountCode,
      provisionAccountCode: provision.provisionAccountCode,
      reversalAccountCode: provision.reversalAccountCode,
      amount: (provision.amountCents / 100).toFixed(2),
    });
  };

  const openAction = (
    provision: ErpAccountingProvision,
    kind: 'reverse' | 'cancel',
  ) => {
    setActionTarget(provision);
    setActionKind(kind);
    setActionAmount(
      kind === 'reverse'
        ? (provision.remainingAmountCents / 100).toFixed(2)
        : '',
    );
    setActionDate(localDate());
    setActionReason('');
  };

  const columns: ErpOperationalTableColumn<ErpAccountingProvision>[] = [
    {
      key: 'label',
      header: 'Provision',
      width: '260px',
      render: (provision) => provision.label,
    },
    {
      key: 'type',
      header: 'Nature',
      width: '180px',
      render: (provision) => TYPES[provision.type],
    },
    {
      key: 'date',
      header: 'Date',
      width: '110px',
      render: (provision) =>
        provision.provisionDate.split('-').reverse().join('/'),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '130px',
      render: (provision) => (
        <ErpStatusBadge
          label={STATUS[provision.status].label}
          tone={STATUS[provision.status].tone}
        />
      ),
    },
    {
      key: 'amount',
      header: 'Dotation',
      width: '140px',
      align: 'right',
      render: (provision) => formatMadCents(provision.amountCents),
    },
    {
      key: 'remaining',
      header: 'Solde',
      width: '140px',
      align: 'right',
      render: (provision) => formatMadCents(provision.remainingAmountCents),
    },
    {
      key: 'entry',
      header: 'Écriture',
      width: '100px',
      render: (provision) =>
        provision.dotationEntryId === null ? (
          '—'
        ) : (
          <Link
            to={`/erp-maroc/accounting/entries/${provision.dotationEntryId}`}
          >
            Voir
          </Link>
        ),
    },
    {
      key: 'reversals',
      header: 'Reprises',
      width: '130px',
      render: (provision) => {
        const last = provision.reversals.at(-1);
        return last === undefined ? (
          '—'
        ) : (
          <span>
            {provision.reversals.length} ·{' '}
            <Link
              to={`/erp-maroc/accounting/entries/${last.accountingEntryId}`}
            >
              Voir
            </Link>
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '310px',
      render: (provision) => (
        <StyledRowActions>
          {provision.status === 'DRAFT' ? (
            <>
              <Button
                title="Modifier"
                ariaLabel={`Modifier ${provision.label}`}
                Icon={IconPencil}
                variant="secondary"
                onClick={() => openEdit(provision)}
              />
              <Button
                title="Comptabiliser"
                ariaLabel={`Comptabiliser ${provision.label}`}
                Icon={IconCheck}
                accent="blue"
                onClick={() => setPostTarget(provision)}
              />
              <Button
                title="Annuler"
                ariaLabel={`Annuler ${provision.label}`}
                Icon={IconX}
                accent="danger"
                onClick={() => openAction(provision, 'cancel')}
              />
            </>
          ) : null}
          {provision.status === 'ACTIVE' ? (
            <Button
              title="Reprendre"
              ariaLabel={`Reprendre ${provision.label}`}
              Icon={IconRefresh}
              variant="secondary"
              onClick={() => openAction(provision, 'reverse')}
            />
          ) : null}
        </StyledRowActions>
      ),
    },
  ];

  return (
    <ErpPageShell
      title="Provisions comptables"
      description="Dotations, reprises et soldes par exercice"
      state={loadState}
      loadingLabel="Chargement des provisions"
      errorLabel="Impossible de charger les provisions"
      actions={
        <Button
          title="Nouvelle provision"
          ariaLabel="Créer une provision"
          Icon={IconPlus}
          accent="blue"
          disabled={loadState !== 'ready' || isSubmitting}
          onClick={() => setForm(emptyForm(references))}
        />
      }
    >
      <StyledContent>
        {error === null ? null : (
          <StyledAlert role="alert">{error}</StyledAlert>
        )}
        <StyledToolbar>
          <label htmlFor="provision-status-filter">Statut</label>
          <StyledSelect
            id="provision-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={{ width: 180 }}
          >
            <option value="">Tous</option>
            {Object.entries(STATUS).map(([value, item]) => (
              <option key={value} value={value}>
                {item.label}
              </option>
            ))}
          </StyledSelect>
        </StyledToolbar>
        {form === null ? null : (
          <StyledForm onSubmit={save}>
            <StyledField>
              Nature
              <StyledSelect
                value={form.type}
                onChange={(event) =>
                  setForm({
                    ...form,
                    type: event.target.value as ErpAccountingProvisionType,
                  })
                }
              >
                {Object.entries(TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </StyledSelect>
            </StyledField>
            <StyledWideField>
              Libellé
              <StyledInput
                value={form.label}
                maxLength={255}
                onChange={(event) =>
                  setForm({ ...form, label: event.target.value })
                }
              />
            </StyledWideField>
            <StyledField>
              Montant (MAD)
              <StyledInput
                inputMode="decimal"
                value={form.amount}
                onChange={(event) =>
                  setForm({ ...form, amount: event.target.value })
                }
              />
            </StyledField>
            <StyledField>
              Date de dotation
              <StyledInput
                type="date"
                value={form.provisionDate}
                onChange={(event) =>
                  setForm({ ...form, provisionDate: event.target.value })
                }
              />
            </StyledField>
            <StyledField>
              Date de revue
              <StyledInput
                type="date"
                value={form.reviewDate}
                onChange={(event) =>
                  setForm({ ...form, reviewDate: event.target.value })
                }
              />
            </StyledField>
            <StyledField>
              Journal
              <StyledSelect
                value={form.journalCode}
                onChange={(event) =>
                  setForm({ ...form, journalCode: event.target.value })
                }
              >
                <option value="">Journal</option>
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
              Compte de dotation
              <StyledSelect
                value={form.expenseAccountCode}
                onChange={(event) =>
                  setForm({ ...form, expenseAccountCode: event.target.value })
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
            </StyledField>
            <StyledField>
              Compte de provision
              <StyledSelect
                value={form.provisionAccountCode}
                onChange={(event) =>
                  setForm({ ...form, provisionAccountCode: event.target.value })
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
            </StyledField>
            <StyledField>
              Compte de reprise
              <StyledSelect
                value={form.reversalAccountCode}
                onChange={(event) =>
                  setForm({ ...form, reversalAccountCode: event.target.value })
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
            </StyledField>
            <StyledFormActions>
              <Button
                type="button"
                title="Fermer"
                ariaLabel="Fermer le formulaire"
                Icon={IconX}
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => setForm(null)}
              />
              <Button
                type="submit"
                title="Enregistrer"
                ariaLabel="Enregistrer la provision"
                Icon={IconCheck}
                accent="blue"
                disabled={isSubmitting}
                isLoading={isSubmitting}
              />
            </StyledFormActions>
          </StyledForm>
        )}
        {actionTarget === null || actionKind === null ? null : (
          <StyledActionPanel>
            <h2>
              {actionKind === 'reverse' ? 'Reprise de provision' : 'Annulation'}
              {' · '}
              {actionTarget.label}
            </h2>
            {actionKind === 'reverse' ? (
              <>
                <StyledField>
                  Montant (MAD)
                  <StyledInput
                    inputMode="decimal"
                    value={actionAmount}
                    onChange={(event) => setActionAmount(event.target.value)}
                  />
                </StyledField>
                <StyledField>
                  Date comptable
                  <StyledInput
                    type="date"
                    value={actionDate}
                    onChange={(event) => setActionDate(event.target.value)}
                  />
                </StyledField>
              </>
            ) : null}
            <StyledField>
              Motif
              <StyledTextarea
                value={actionReason}
                maxLength={1000}
                onChange={(event) => setActionReason(event.target.value)}
              />
            </StyledField>
            <StyledFormActions>
              <Button
                title="Fermer"
                ariaLabel="Fermer l'action"
                Icon={IconX}
                variant="secondary"
                onClick={() => {
                  setActionTarget(null);
                  setActionKind(null);
                }}
              />
              <Button
                title={actionKind === 'reverse' ? 'Enregistrer' : 'Annuler'}
                ariaLabel={
                  actionKind === 'reverse'
                    ? 'Enregistrer la reprise'
                    : 'Confirmer l’annulation'
                }
                Icon={actionKind === 'reverse' ? IconRefresh : IconX}
                accent={actionKind === 'reverse' ? 'blue' : 'danger'}
                disabled={isSubmitting || actionReason.trim().length < 10}
                isLoading={isSubmitting}
                onClick={() => void executeAction()}
              />
            </StyledFormActions>
          </StyledActionPanel>
        )}
        <ErpOperationalTable
          ariaLabel="Provisions comptables"
          columns={columns}
          rows={list.items}
          getRowKey={(provision) => provision.id}
          emptyLabel="Aucune provision"
        />
      </StyledContent>
      <ErpConfirmDialog
        isOpen={postTarget !== null}
        title="Comptabiliser la dotation"
        message="La dotation sera validée et ne pourra plus être modifiée."
        confirmLabel="Comptabiliser"
        cancelLabel="Annuler"
        isConfirming={isSubmitting}
        onCancel={() => setPostTarget(null)}
        onConfirm={() => void post()}
      />
    </ErpPageShell>
  );
};
