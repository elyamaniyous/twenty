import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import { parseBankStatementReturnPath } from '@/erp-maroc/accounting/bankStatementAccountingNavigation';
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
import { useEffect, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  erpAccountingEntrySchema,
  type ErpAccountingEntry,
  type ErpAccountingEntryLine,
} from 'twenty-shared/erp-maroc';
import { IconArrowLeft, IconCheck, IconX } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const STATUS: Record<
  ErpAccountingEntry['status'],
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'À contrôler', tone: 'warning' },
  VALIDATED: { label: 'Validée', tone: 'success' },
  LOCKED: { label: 'Verrouillée', tone: 'neutral' },
  REJECTED: { label: 'Rejetée', tone: 'danger' },
};

const SOURCE: Record<ErpAccountingEntry['sourceType'], string> = {
  MANUAL: 'Saisie manuelle',
  INVOICE: 'Facture',
  PAYMENT: 'Règlement',
  CREDIT_NOTE: 'Avoir',
  SUPPLIER_INVOICE: 'Facture fournisseur',
  SUPPLIER_PAYMENT: 'Paiement fournisseur',
  PAYROLL: 'Paie',
  EXPENSE_NOTE: 'Note de frais',
  CLOSING: 'Clôture',
  OPENING_BALANCE: 'À-nouveau',
};

const sourcePath = (entry: ErpAccountingEntry) => {
  if (entry.label.startsWith('Contrepassation ')) return null;
  if (entry.sourceType === 'INVOICE') {
    return `/erp-maroc/invoices/${entry.sourceId}`;
  }
  if (entry.sourceType === 'PAYMENT') {
    return `/erp-maroc/payments/${entry.sourceId}`;
  }
  if (entry.sourceType === 'CREDIT_NOTE') {
    return `/erp-maroc/credit-notes/${entry.sourceId}`;
  }
  return null;
};

const lineColumns: ErpOperationalTableColumn<ErpAccountingEntryLine>[] = [
  {
    key: 'account',
    header: 'Compte',
    width: '210px',
    render: (line) => `${line.accountCode} · ${line.accountLabel}`,
  },
  {
    key: 'label',
    header: 'Libellé',
    width: '360px',
    render: (line) => line.label,
  },
  {
    key: 'debit',
    header: 'Débit',
    width: '150px',
    align: 'right',
    render: (line) =>
      line.debitCents === 0 ? '—' : formatMadCents(line.debitCents),
  },
  {
    key: 'credit',
    header: 'Crédit',
    width: '150px',
    align: 'right',
    render: (line) =>
      line.creditCents === 0 ? '—' : formatMadCents(line.creditCents),
  },
];

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
`;

const StyledSummary = styled.dl`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
  grid-template-columns: repeat(4, minmax(140px, 1fr));
  margin: 0;
  padding: ${themeCssVariables.spacing[4]};

  div {
    min-width: 0;
  }

  dt {
    color: ${themeCssVariables.font.color.secondary};
    font-size: ${themeCssVariables.font.size.sm};
    margin-bottom: ${themeCssVariables.spacing[1]};
  }

  dd {
    color: ${themeCssVariables.font.color.primary};
    margin: 0;
    overflow-wrap: anywhere;
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }
`;

const StyledLines = styled.section`
  display: flex;
  flex: 1 0 260px;
  flex-direction: column;
  min-height: 260px;
`;

const StyledSectionTitle = styled.h2`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  font-size: ${themeCssVariables.font.size.md};
  letter-spacing: 0;
  margin: 0;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledDecision = styled.section`
  background: ${themeCssVariables.background.secondary};
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledTextarea = styled.textarea`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  min-height: 84px;
  padding: ${themeCssVariables.spacing[2]};
  resize: vertical;
  width: 100%;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

const StyledAlert = styled.div`
  background: ${themeCssVariables.tag.background.red};
  color: ${themeCssVariables.tag.text.red};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

export const ErpEntryDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = parseBankStatementReturnPath(searchParams.get('returnTo'));
  const { client, context } = useErpMarocContext();
  const [entry, setEntry] = useState<ErpAccountingEntry | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (id === undefined) {
      setLoadState('error');
      return;
    }
    let active = true;
    setLoadState('loading');
    void client
      .request({
        method: 'GET',
        path: `/accounting/entries/${id}`,
        schema: erpAccountingEntrySchema,
      })
      .then((result) => {
        if (!active) return;
        setEntry(result);
        setLoadState('ready');
      })
      .catch(() => {
        if (active) setLoadState('error');
      });
    return () => {
      active = false;
    };
  }, [client, id]);

  const canReview =
    entry?.status === 'DRAFT' &&
    context !== null &&
    ['OWNER', 'ADMIN', 'COMPTABLE'].includes(context.role);

  const execute = async (action: 'validate' | 'reject') => {
    if (entry === null || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/accounting/entries/${entry.id}/${action}`,
          schema: erpAccountingEntrySchema,
          body: action === 'reject' ? { reason: rejectionReason.trim() } : {},
        },
        { idempotency: 'required' },
      );
      setEntry(await intent.execute());
      setValidateDialogOpen(false);
      setRejectOpen(false);
      setRejectionReason('');
      if (returnTo !== null) {
        void navigate(returnTo, { replace: true });
      }
    } catch {
      setActionError(
        action === 'validate'
          ? "Impossible de valider l'écriture."
          : "Impossible de rejeter l'écriture.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadState === 'loading') {
    return (
      <ErpPageShell
        title="Écriture comptable"
        state="loading"
        loadingLabel="Chargement de l'écriture"
      />
    );
  }
  if (loadState === 'error' || entry === null) {
    return (
      <ErpPageShell
        title="Écriture comptable"
        state="error"
        errorLabel="Impossible de charger l'écriture"
      />
    );
  }

  return (
    <ErpPageShell
      title={entry.label}
      description={`Exercice ${entry.exerciceYear} · Journal ${entry.journalCode}`}
      actions={
        returnTo !== null || canReview ? (
          <>
            {returnTo === null ? null : (
              <Button
                title="Retour au relevé"
                ariaLabel="Retourner au rapprochement bancaire"
                Icon={IconArrowLeft}
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => void navigate(returnTo, { replace: true })}
              />
            )}
            {canReview ? (
              <>
                <Button
                  title="Rejeter"
                  ariaLabel="Rejeter l'écriture"
                  Icon={IconX}
                  accent="danger"
                  disabled={isSubmitting}
                  onClick={() => {
                    setActionError(null);
                    setRejectOpen(true);
                  }}
                />
                <Button
                  title="Valider"
                  ariaLabel="Valider l'écriture"
                  Icon={IconCheck}
                  accent="blue"
                  disabled={isSubmitting}
                  onClick={() => {
                    setActionError(null);
                    setValidateDialogOpen(true);
                  }}
                />
              </>
            ) : null}
          </>
        ) : undefined
      }
    >
      <StyledContent>
        {actionError === null ? null : (
          <StyledAlert role="alert">{actionError}</StyledAlert>
        )}
        <StyledSummary>
          <div>
            <dt>Statut</dt>
            <dd>
              <ErpStatusBadge
                label={STATUS[entry.status].label}
                tone={STATUS[entry.status].tone}
              />
            </dd>
          </div>
          <div>
            <dt>Date comptable</dt>
            <dd>{entry.entryDate.split('-').reverse().join('/')}</dd>
          </div>
          <div>
            <dt>Pièce source</dt>
            <dd>
              {sourcePath(entry) === null ? (
                SOURCE[entry.sourceType]
              ) : (
                <Link to={sourcePath(entry) ?? ''}>
                  {SOURCE[entry.sourceType]}
                </Link>
              )}
            </dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{formatMadCents(entry.totalDebitCents)}</dd>
          </div>
          {entry.validatedAt === null ? null : (
            <div>
              <dt>Validée le</dt>
              <dd>{new Date(entry.validatedAt).toLocaleString('fr-MA')}</dd>
            </div>
          )}
          {entry.rejectionReason === null ? null : (
            <div>
              <dt>Motif du rejet</dt>
              <dd>{entry.rejectionReason}</dd>
            </div>
          )}
        </StyledSummary>
        <StyledLines aria-label="Lignes comptables">
          <StyledSectionTitle>Lignes comptables</StyledSectionTitle>
          <ErpOperationalTable
            ariaLabel="Lignes comptables"
            columns={lineColumns}
            rows={entry.lines ?? []}
            getRowKey={(line) => line.id}
            emptyLabel="Aucune ligne comptable"
          />
        </StyledLines>
        {rejectOpen && canReview ? (
          <StyledDecision aria-label="Motif de rejet">
            <label htmlFor="accounting-rejection-reason">Motif du rejet</label>
            <StyledTextarea
              id="accounting-rejection-reason"
              value={rejectionReason}
              minLength={10}
              maxLength={1000}
              disabled={isSubmitting}
              onChange={(event) => setRejectionReason(event.target.value)}
            />
            <StyledActions>
              <Button
                title="Annuler"
                ariaLabel="Annuler le rejet"
                Icon={IconX}
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => {
                  setRejectOpen(false);
                  setRejectionReason('');
                }}
              />
              <Button
                title="Confirmer le rejet"
                ariaLabel="Confirmer le rejet"
                Icon={IconX}
                accent="danger"
                disabled={rejectionReason.trim().length < 10 || isSubmitting}
                isLoading={isSubmitting}
                onClick={() => void execute('reject')}
              />
            </StyledActions>
          </StyledDecision>
        ) : null}
      </StyledContent>
      <ErpConfirmDialog
        isOpen={validateDialogOpen}
        title="Valider l'écriture"
        message="Cette décision est définitive et rend l'écriture immuable."
        confirmLabel="Valider l'écriture"
        cancelLabel="Annuler"
        isConfirming={isSubmitting}
        onCancel={() => setValidateDialogOpen(false)}
        onConfirm={() => void execute('validate')}
      />
    </ErpPageShell>
  );
};
