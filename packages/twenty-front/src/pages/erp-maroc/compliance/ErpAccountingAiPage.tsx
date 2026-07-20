import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import {
  ErpWorkspaceSummaryItem,
  StyledErpWorkspaceContent,
  StyledErpWorkspaceField,
  StyledErpWorkspaceFormGrid,
  StyledErpWorkspaceInlineActions,
  StyledErpWorkspacePanel,
  StyledErpWorkspacePanelTitle,
  StyledErpWorkspaceSelect,
  StyledErpWorkspaceSummary,
  StyledErpWorkspaceTextarea,
  StyledErpWorkspaceToolbar,
} from '@/erp-maroc/components/ErpComplianceUi';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { styled } from '@linaria/react';
import { useEffect, useState } from 'react';
import {
  erpRegulatoryListSchema,
  erpRegulatoryObjectSchema,
} from 'twenty-shared/erp-maroc';
import { IconCheck, IconRefresh, IconX } from 'twenty-ui/display';
import { Button, TabButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type AiStatus = {
  providerConfigured: boolean;
  provider: string;
  model: string;
  safeQueries: string[];
};

type AiSuggestion = {
  id: string;
  type: 'CATEGORIZATION' | 'RECONCILIATION' | 'ANOMALY';
  sourceType: string;
  sourceId: string;
  proposal: unknown;
  confidenceBasisPoints: number;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED';
  provider: string;
};

type AssistantAnswer = {
  conversationId: string;
  content: string;
  evidence: { queryId: string | null; rows: unknown[] };
  provider: string;
  model: string;
};

type SafeQueryResult = {
  queryId: string;
  generatedSql: string;
  rows: unknown[];
  readOnly: true;
};

const StyledEvidence = styled.pre`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0 ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[3]};
  max-height: 320px;
  overflow: auto;
  padding: ${themeCssVariables.spacing[3]};
  white-space: pre-wrap;
`;

const safeQueryLabels: Record<string, string> = {
  overdue_invoices: 'Factures clients en retard',
  trial_balance: 'Balance comptable',
  unreconciled_bank_lines: 'Lignes bancaires non rapprochées',
  tax_declarations: 'Déclarations fiscales',
  payroll_cost: 'Coût de la paie',
};

const proposalLabel = (proposal: unknown) => {
  if (!proposal || typeof proposal !== 'object') return String(proposal ?? '');
  const value = proposal as Record<string, unknown>;
  return (
    [value.accountCode, value.accountLabel, value.label]
      .filter((item) => typeof item === 'string')
      .join(' · ') || JSON.stringify(proposal)
  );
};

export const ErpAccountingAiPage = () => {
  const { client } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [view, setView] = useState<'assistant' | 'suggestions' | 'queries'>(
    'assistant',
  );
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [question, setQuestion] = useState(
    'Quelles factures clients sont en retard ?',
  );
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [queryId, setQueryId] = useState('overdue_invoices');
  const [queryResult, setQueryResult] = useState<SafeQueryResult | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = () => setGeneration((value) => value + 1);

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    Promise.all([
      client.request({
        method: 'GET',
        path: '/ai-accounting/status',
        schema: erpRegulatoryObjectSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/ai-accounting/suggestions',
        schema: erpRegulatoryListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(([loadedStatus, loadedSuggestions]) => {
        if (abortController.signal.aborted) return;
        const parsedStatus = loadedStatus as unknown as AiStatus;
        setStatus(parsedStatus);
        setSuggestions(loadedSuggestions as unknown as AiSuggestion[]);
        setQueryId((current) =>
          parsedStatus.safeQueries.includes(current)
            ? current
            : (parsedStatus.safeQueries[0] ?? 'overdue_invoices'),
        );
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client, generation]);

  const scan = async (kind: 'categorize' | 'reconcile') => {
    setBusyId(kind);
    try {
      const result = await client
        .createMutationIntent(
          {
            method: 'POST',
            path: `/ai-accounting/${kind}`,
            schema: erpRegulatoryObjectSchema,
            body: {},
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      const processed =
        typeof result.processed === 'number' ? result.processed : 0;
      enqueueSuccessSnackBar({ message: `${processed} ligne(s) analysée(s)` });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Analyse comptable impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const review = async (
    suggestion: AiSuggestion,
    reviewStatus: 'ACCEPTED' | 'REJECTED',
  ) => {
    setBusyId(suggestion.id);
    try {
      await client
        .createMutationIntent(
          {
            method: 'PATCH',
            path: `/ai-accounting/suggestions/${suggestion.id}`,
            schema: erpRegulatoryObjectSchema,
            body: { status: reviewStatus, notes: reviewNotes.trim() || null },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Revue impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const ask = async () => {
    if (question.trim() === '') return;
    setBusyId('ask');
    try {
      const result = (await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/ai-accounting/ask',
            schema: erpRegulatoryObjectSchema,
            body: { question: question.trim(), conversationId },
          },
          { idempotency: 'forbidden' },
        )
        .execute()) as unknown as AssistantAnswer;
      setAnswer(result);
      setConversationId(result.conversationId);
    } catch {
      enqueueErrorSnackBar({ message: 'Assistant comptable indisponible' });
    } finally {
      setBusyId(null);
    }
  };

  const runQuery = async () => {
    setBusyId('query');
    try {
      const result = (await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/ai-accounting/safe-query',
            schema: erpRegulatoryObjectSchema,
            body: { queryId },
          },
          { idempotency: 'forbidden' },
        )
        .execute()) as unknown as SafeQueryResult;
      setQueryResult(result);
    } catch {
      enqueueErrorSnackBar({ message: 'Requête contrôlée impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const columns: ErpOperationalTableColumn<AiSuggestion>[] = [
    { key: 'type', header: 'Type', width: '160px', render: (row) => row.type },
    {
      key: 'source',
      header: 'Source',
      width: '250px',
      render: (row) => `${row.sourceType} · ${row.sourceId}`,
    },
    {
      key: 'proposal',
      header: 'Proposition',
      width: '360px',
      render: (row) => proposalLabel(row.proposal),
    },
    {
      key: 'confidence',
      header: 'Confiance',
      width: '110px',
      align: 'right',
      render: (row) => `${Math.round(row.confidenceBasisPoints / 100)} %`,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '110px',
      render: (row) => row.status,
    },
    {
      key: 'actions',
      header: '',
      width: '210px',
      render: (row) =>
        row.status === 'PROPOSED' ? (
          <StyledErpWorkspaceInlineActions>
            <Button
              title="Accepter"
              ariaLabel={`Accepter ${row.id}`}
              Icon={IconCheck}
              variant="secondary"
              disabled={busyId !== null}
              onClick={() => void review(row, 'ACCEPTED')}
            />
            <Button
              title="Rejeter"
              ariaLabel={`Rejeter ${row.id}`}
              Icon={IconX}
              variant="secondary"
              disabled={busyId !== null}
              onClick={() => void review(row, 'REJECTED')}
            />
          </StyledErpWorkspaceInlineActions>
        ) : null,
    },
  ];

  return (
    <ErpPageShell
      title="Assistant comptable"
      description="Catégorisation PCGM, rapprochement suggéré et analyses en lecture seule"
      state={state}
      onRetry={refresh}
      actions={
        <Button
          title="Actualiser"
          ariaLabel="Actualiser l'assistant comptable"
          Icon={IconRefresh}
          variant="secondary"
          onClick={refresh}
        />
      }
    >
      <StyledErpWorkspaceToolbar>
        <TabButton
          id="accounting-ai-assistant"
          title="Assistant"
          active={view === 'assistant'}
          onClick={() => setView('assistant')}
        />
        <TabButton
          id="accounting-ai-suggestions"
          title="Suggestions"
          active={view === 'suggestions'}
          onClick={() => setView('suggestions')}
        />
        <TabButton
          id="accounting-ai-queries"
          title="Analyses"
          active={view === 'queries'}
          onClick={() => setView('queries')}
        />
        <Button
          title="Catégoriser la banque"
          ariaLabel="Catégoriser les lignes bancaires"
          variant="secondary"
          disabled={busyId !== null}
          onClick={() => void scan('categorize')}
        />
        <Button
          title="Suggérer rapprochements"
          ariaLabel="Suggérer les rapprochements bancaires"
          variant="secondary"
          disabled={busyId !== null}
          onClick={() => void scan('reconcile')}
        />
      </StyledErpWorkspaceToolbar>
      <StyledErpWorkspaceSummary>
        <ErpWorkspaceSummaryItem
          label="Moteur"
          value={status?.provider ?? '—'}
        />
        <ErpWorkspaceSummaryItem label="Modèle" value={status?.model ?? '—'} />
        <ErpWorkspaceSummaryItem
          label="À contrôler"
          value={
            suggestions.filter((item) => item.status === 'PROPOSED').length
          }
        />
        <ErpWorkspaceSummaryItem label="Mode" value="Suggestion humaine" />
      </StyledErpWorkspaceSummary>
      <StyledErpWorkspaceContent>
        {view === 'assistant' ? (
          <StyledErpWorkspacePanel>
            <StyledErpWorkspacePanelTitle>
              Question comptable
            </StyledErpWorkspacePanelTitle>
            <StyledErpWorkspaceFormGrid>
              <StyledErpWorkspaceField>
                Question
                <StyledErpWorkspaceTextarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                />
              </StyledErpWorkspaceField>
              <Button
                title="Analyser"
                ariaLabel="Analyser la question"
                variant="primary"
                disabled={busyId !== null || question.trim() === ''}
                onClick={() => void ask()}
              />
            </StyledErpWorkspaceFormGrid>
            {answer ? (
              <>
                <StyledErpWorkspacePanelTitle>
                  Réponse · {answer.provider}
                </StyledErpWorkspacePanelTitle>
                <StyledEvidence>
                  {answer.content}
                  {'\n\n'}Preuves : {JSON.stringify(answer.evidence, null, 2)}
                </StyledEvidence>
              </>
            ) : null}
          </StyledErpWorkspacePanel>
        ) : null}
        {view === 'suggestions' ? (
          <StyledErpWorkspacePanel>
            <StyledErpWorkspaceFormGrid>
              <StyledErpWorkspaceField>
                Note de revue
                <StyledErpWorkspaceTextarea
                  value={reviewNotes}
                  onChange={(event) => setReviewNotes(event.target.value)}
                />
              </StyledErpWorkspaceField>
            </StyledErpWorkspaceFormGrid>
            <ErpOperationalTable
              ariaLabel="Suggestions comptables"
              columns={columns}
              rows={suggestions}
              getRowKey={(row) => row.id}
              emptyLabel="Aucune suggestion"
            />
          </StyledErpWorkspacePanel>
        ) : null}
        {view === 'queries' ? (
          <StyledErpWorkspacePanel>
            <StyledErpWorkspacePanelTitle>
              Analyse contrôlée
            </StyledErpWorkspacePanelTitle>
            <StyledErpWorkspaceFormGrid>
              <StyledErpWorkspaceField>
                Jeu de données
                <StyledErpWorkspaceSelect
                  value={queryId}
                  onChange={(event) => setQueryId(event.target.value)}
                >
                  {(status?.safeQueries ?? []).map((id) => (
                    <option key={id} value={id}>
                      {safeQueryLabels[id] ?? id}
                    </option>
                  ))}
                </StyledErpWorkspaceSelect>
              </StyledErpWorkspaceField>
              <Button
                title="Exécuter"
                ariaLabel="Exécuter la requête en lecture seule"
                variant="primary"
                disabled={busyId !== null}
                onClick={() => void runQuery()}
              />
            </StyledErpWorkspaceFormGrid>
            {queryResult ? (
              <StyledEvidence>
                {queryResult.generatedSql}
                {'\n\n'}
                {JSON.stringify(queryResult.rows, null, 2)}
              </StyledEvidence>
            ) : null}
          </StyledErpWorkspacePanel>
        ) : null}
      </StyledErpWorkspaceContent>
    </ErpPageShell>
  );
};
