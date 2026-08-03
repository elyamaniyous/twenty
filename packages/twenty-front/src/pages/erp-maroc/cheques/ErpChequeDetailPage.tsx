import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import {
  formatCivilDate,
  formatInstantInTimeZone,
} from '@/erp-maroc/utils/civilDate';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  erpChequeReconciliationCandidatesSchema,
  erpChequeSchema,
  type ErpCheque,
  type ErpChequeBankStatementLine,
  type ErpChequeStatus,
} from 'twenty-shared/erp-maroc';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const statusLabels: Record<ErpChequeStatus, string> = {
  DRAFT: 'Brouillon',
  PRINTED: 'Imprimé',
  SIGNED: 'Signé',
  DELIVERED: 'Remis',
  IN_PORTFOLIO: 'En portefeuille',
  DEPOSITED: 'Déposé en banque',
  CLEARED: 'Dénoué',
  REJECTED: 'Rejeté',
  STOPPED: 'Opposition',
  CANCELLED: 'Annulé',
};

const reconciliationReasonLabels: Record<string, string> = {
  AMOUNT_EXACT: 'Montant exact',
  DIRECTION_MATCH: 'Sens bancaire cohérent',
  BANK_ACCOUNT_MATCH: 'Même compte bancaire',
  DATE_EXACT: 'Date exacte',
  DATE_NEAR: 'Date proche',
  CHEQUE_NUMBER_MATCH: 'Numéro retrouvé',
  COUNTERPARTY_MATCH: 'Tiers retrouvé',
};

const transitions: Record<
  'RECEIVED' | 'ISSUED',
  Record<ErpChequeStatus, ErpChequeStatus[]>
> = {
  RECEIVED: {
    DRAFT: ['IN_PORTFOLIO', 'CANCELLED'],
    IN_PORTFOLIO: ['CANCELLED'],
    DEPOSITED: ['REJECTED'],
    REJECTED: ['CANCELLED'],
    PRINTED: [],
    SIGNED: [],
    DELIVERED: [],
    CLEARED: [],
    STOPPED: [],
    CANCELLED: [],
  },
  ISSUED: {
    DRAFT: ['PRINTED', 'SIGNED', 'CANCELLED'],
    PRINTED: ['SIGNED', 'CANCELLED'],
    SIGNED: ['DELIVERED', 'CANCELLED'],
    DELIVERED: ['REJECTED', 'STOPPED'],
    REJECTED: ['DELIVERED', 'STOPPED', 'CANCELLED'],
    IN_PORTFOLIO: [],
    DEPOSITED: [],
    CLEARED: [],
    STOPPED: [],
    CANCELLED: [],
  },
};

const StyledDetail = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const StyledSummary = styled.dl`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  div {
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
    border-right: 1px solid ${themeCssVariables.border.color.light};
    min-width: 0;
    padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
  }

  dt {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
    margin-bottom: ${themeCssVariables.spacing[1]};
  }

  dd {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.md};
    margin: 0;
    overflow-wrap: anywhere;
  }
`;

const StyledSection = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  padding: ${themeCssVariables.spacing[4]};

  h2 {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.md};
    letter-spacing: 0;
    margin: 0 0 ${themeCssVariables.spacing[3]};
  }
`;

const StyledTransition = styled.div`
  align-items: flex-end;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};

  label {
    color: ${themeCssVariables.font.color.secondary};
    display: flex;
    flex-direction: column;
    font-size: ${themeCssVariables.font.size.sm};
    gap: ${themeCssVariables.spacing[1]};
  }

  input,
  select {
    background: ${themeCssVariables.background.primary};
    border: 1px solid ${themeCssVariables.border.color.medium};
    border-radius: ${themeCssVariables.border.radius.sm};
    color: ${themeCssVariables.font.color.primary};
    min-height: 36px;
    min-width: 220px;
    padding: 0 ${themeCssVariables.spacing[2]};
  }
`;

const StyledMessage = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: ${themeCssVariables.spacing[2]} 0 0;
`;

const candidateColumns: ErpOperationalTableColumn<ErpChequeBankStatementLine>[] =
  [
    {
      key: 'date',
      header: 'Date',
      width: '120px',
      render: (row) => formatCivilDate(row.transactionDate),
    },
    {
      key: 'description',
      header: 'Libellé bancaire',
      render: (row) => row.description,
    },
    {
      key: 'reference',
      header: 'Référence',
      width: '180px',
      render: (row) => row.reference ?? '—',
    },
    {
      key: 'score',
      header: 'Score',
      width: '90px',
      align: 'right',
      render: (row) => (row.score === undefined ? '—' : `${row.score}/100`),
    },
    {
      key: 'evidence',
      header: 'Preuves',
      width: '260px',
      render: (row) =>
        row.reasons
          ?.map((item) => reconciliationReasonLabels[item] ?? item)
          .join(', ') ?? '—',
    },
    {
      key: 'amount',
      header: 'Montant',
      width: '150px',
      align: 'right',
      render: (row) => formatMadCents(row.creditCents || row.debitCents),
    },
  ];

export const ErpChequeDetailPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const { client, context } = useErpMarocContext();
  const [cheque, setCheque] = useState<ErpCheque | null>(null);
  const [candidates, setCandidates] = useState<ErpChequeBankStatementLine[]>(
    [],
  );
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [candidatesState, setCandidatesState] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [targetStatus, setTargetStatus] = useState<ErpChequeStatus | ''>('');
  const [reason, setReason] = useState('');
  const [unreconciliationReason, setUnreconciliationReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canManage = context?.capabilities.manageSupplierAccounting === true;

  const load = useCallback(async () => {
    setState('loading');
    try {
      const result = await client.request({
        method: 'GET',
        path: `/cheques/${id}`,
        schema: erpChequeSchema,
      });
      setCheque(result);
      setTargetStatus('');
      setState('ready');
    } catch {
      setState('error');
    }
  }, [client, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const allowedTransitions = useMemo(
    () => (cheque === null ? [] : transitions[cheque.direction][cheque.status]),
    [cheque],
  );
  const canReconcile =
    canManage &&
    cheque !== null &&
    ((cheque.direction === 'RECEIVED' && cheque.status === 'DEPOSITED') ||
      (cheque.direction === 'ISSUED' && cheque.status === 'DELIVERED'));

  const loadCandidates = useCallback(async () => {
    if (!canReconcile) return;
    setCandidatesState('loading');
    try {
      const result = await client.request({
        method: 'GET',
        path: `/cheques/${id}/reconciliation-candidates`,
        schema: erpChequeReconciliationCandidatesSchema,
      });
      setCandidates(result);
      setCandidatesState('ready');
    } catch {
      setCandidatesState('error');
    }
  }, [canReconcile, client, id]);

  useEffect(() => {
    if (canReconcile) void loadCandidates();
  }, [canReconcile, loadCandidates]);

  const submitTransition = async () => {
    if (!targetStatus || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setMessage(null);
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/cheques/${id}/transition`,
          schema: erpChequeSchema,
          body: { status: targetStatus, reason: reason || undefined },
        },
        { idempotency: 'required' },
      );
      const result = await intent.execute();
      setCheque(result);
      setTargetStatus('');
      setReason('');
      setMessage('Le statut du chèque a été mis à jour.');
    } catch {
      setMessage('La transition demandée n’a pas pu être appliquée.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reconcile = async (bankStatementLineId: string) => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      setMessage(null);
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/cheques/${id}/reconcile`,
          schema: erpChequeSchema,
          body: { bankStatementLineId },
        },
        { idempotency: 'required' },
      );
      const result = await intent.execute();
      setCheque(result);
      setCandidates([]);
      setCandidatesState('idle');
      setMessage('Le chèque est rapproché et dénoué.');
    } catch {
      setMessage('Le rapprochement bancaire a échoué.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const unreconcile = async () => {
    if (isSubmitting || unreconciliationReason.trim().length < 10) return;
    try {
      setIsSubmitting(true);
      setMessage(null);
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/cheques/${id}/unreconcile`,
          schema: erpChequeSchema,
          body: { reason: unreconciliationReason.trim() },
        },
        { idempotency: 'required' },
      );
      const result = await intent.execute();
      setCheque(result);
      setUnreconciliationReason('');
      setMessage(
        'Le lettrage bancaire a été annulé et le statut antérieur restauré.',
      );
    } catch {
      setMessage(
        'Le délettrage a échoué. Vérifiez que le relevé est encore ouvert.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (state !== 'ready' || cheque === null) {
    return (
      <ErpPageShell
        title="Détail du chèque"
        state={state}
        loadingLabel="Chargement du chèque"
        errorLabel="Impossible de charger ce chèque"
        retryLabel="Réessayer"
        onRetry={() => void load()}
      />
    );
  }

  return (
    <ErpPageShell
      title={`${cheque.instrumentType === 'LCN' ? 'LCN' : 'Chèque'} ${cheque.number}`}
      description={
        cheque.direction === 'RECEIVED' ? 'Instrument reçu' : 'Instrument émis'
      }
      actions={<Link to="/erp-maroc/cheques">Retour au registre</Link>}
    >
      <StyledDetail>
        <StyledSummary>
          <div>
            <dt>Statut</dt>
            <dd>
              <ErpStatusBadge label={statusLabels[cheque.status]} />
            </dd>
          </div>
          <div>
            <dt>Montant</dt>
            <dd>{formatMadCents(cheque.amountCents)}</dd>
          </div>
          <div>
            <dt>Tiers / bénéficiaire</dt>
            <dd>{cheque.tier?.name ?? cheque.counterpartyName}</dd>
          </div>
          <div>
            <dt>Banque</dt>
            <dd>
              {cheque.bankAccount.bankName} · {cheque.bankAccount.name}
            </dd>
          </div>
          <div>
            <dt>Date d’émission</dt>
            <dd>{formatCivilDate(cheque.issueDate)}</dd>
          </div>
          <div>
            <dt>Échéance</dt>
            <dd>
              {cheque.dueDate === null
                ? 'À vue'
                : formatCivilDate(cheque.dueDate)}
            </dd>
          </div>
          <div>
            <dt>Carnet</dt>
            <dd>{cheque.chequeBook?.name ?? 'Externe'}</dd>
          </div>
          <div>
            <dt>Rapprochement</dt>
            <dd>
              {cheque.bankStatementLine === null
                ? 'En attente'
                : (cheque.bankStatementLine.reference ?? 'Rapproché')}
            </dd>
          </div>
        </StyledSummary>

        {message === null ? null : (
          <StyledSection>
            <StyledMessage role="status">{message}</StyledMessage>
          </StyledSection>
        )}

        {!canManage || allowedTransitions.length === 0 ? null : (
          <StyledSection>
            <h2>Faire avancer le chèque</h2>
            <StyledTransition>
              <label>
                Nouveau statut
                <select
                  value={targetStatus}
                  onChange={(event) =>
                    setTargetStatus(event.target.value as ErpChequeStatus | '')
                  }
                >
                  <option value="">Sélectionner</option>
                  {allowedTransitions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Motif, obligatoire pour rejet/annulation/opposition
                <input
                  value={reason}
                  maxLength={500}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <Button
                title="Appliquer"
                ariaLabel="Appliquer la transition"
                accent="blue"
                disabled={isSubmitting || targetStatus === ''}
                onClick={() => void submitTransition()}
              />
            </StyledTransition>
          </StyledSection>
        )}

        {canReconcile ? (
          <StyledSection>
            <h2>Rapprochement bancaire</h2>
            <ErpOperationalTable
              ariaLabel="Lignes bancaires compatibles"
              columns={[
                ...candidateColumns,
                {
                  key: 'action',
                  header: '',
                  width: '130px',
                  align: 'right',
                  render: (row) => (
                    <Button
                      title="Rapprocher"
                      ariaLabel={`Rapprocher la ligne ${row.reference ?? row.id}`}
                      variant="secondary"
                      disabled={isSubmitting}
                      onClick={() => void reconcile(row.id)}
                    />
                  ),
                },
              ]}
              rows={candidates}
              getRowKey={(row) => row.id}
              state={candidatesState === 'idle' ? 'loading' : candidatesState}
              loadingLabel="Recherche des écritures bancaires"
              emptyLabel="Aucune ligne bancaire du même montant"
              errorLabel="Impossible de chercher les lignes bancaires"
              retryLabel="Réessayer"
              onRetry={() => void loadCandidates()}
            />
          </StyledSection>
        ) : null}

        {canManage &&
        cheque.status === 'CLEARED' &&
        cheque.bankStatementLine !== null ? (
          <StyledSection>
            <h2>Délettrage bancaire</h2>
            <StyledTransition>
              <label>
                Motif de correction
                <input
                  value={unreconciliationReason}
                  maxLength={500}
                  onChange={(event) =>
                    setUnreconciliationReason(event.target.value)
                  }
                />
              </label>
              <Button
                title="Annuler le rapprochement"
                ariaLabel="Annuler le rapprochement bancaire"
                variant="secondary"
                disabled={
                  isSubmitting || unreconciliationReason.trim().length < 10
                }
                onClick={() => void unreconcile()}
              />
            </StyledTransition>
            <StyledMessage>
              Le relevé doit être ouvert. L’action restaure l’état précédant le
              dénouement et reste inscrite dans l’historique.
            </StyledMessage>
          </StyledSection>
        ) : null}

        <StyledSection>
          <h2>Historique auditable</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Transition</th>
                <th>Motif</th>
                <th>Utilisateur</th>
              </tr>
            </thead>
            <tbody>
              {cheque.events.map((event) => (
                <tr key={event.id}>
                  <td>
                    {formatInstantInTimeZone(
                      event.occurredAt,
                      context?.timezone ?? 'Africa/Casablanca',
                    )}
                  </td>
                  <td>
                    {event.fromStatus === null
                      ? 'Création'
                      : `${statusLabels[event.fromStatus]} → ${statusLabels[event.toStatus]}`}
                  </td>
                  <td>{event.reason ?? '—'}</td>
                  <td>{event.actorTwentyUserId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </StyledSection>
      </StyledDetail>
    </ErpPageShell>
  );
};
