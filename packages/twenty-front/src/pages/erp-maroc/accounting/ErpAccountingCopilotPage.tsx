import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import {
  ErpStatusBadge,
  type ErpStatusTone,
} from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { styled } from '@linaria/react';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  erpAccountingReferencesSchema,
  erpAiAccountingAnswerSchema,
  erpAiAccountingConversationListSchema,
  erpAiAccountingQueryIdSchema,
  erpAiAccountingSafeQueryResultSchema,
  erpAiAccountingStatusSchema,
  erpAiAccountingSuggestionBatchSchema,
  erpAiAccountingSuggestionListSchema,
  erpAiAccountingSuggestionSchema,
  erpAiCategorizationRuleListSchema,
  erpAiCategorizationRuleSchema,
  type ErpAccountingAccount,
  type ErpAiAccountingConversation,
  type ErpAiAccountingQueryId,
  type ErpAiAccountingSafeQueryResult,
  type ErpAiAccountingStatus,
  type ErpAiAccountingSuggestion,
  type ErpAiCategorizationRule,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconSend,
  IconSparkles,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type View = 'suggestions' | 'rules' | 'queries' | 'assistant';
type LoadState = 'loading' | 'ready' | 'error';
type ReviewMode = 'ACCEPTED' | 'REJECTED';

const views: Array<{ key: View; label: string }> = [
  { key: 'suggestions', label: 'Suggestions' },
  { key: 'rules', label: 'Règles' },
  { key: 'queries', label: 'Requêtes contrôlées' },
  { key: 'assistant', label: 'Assistant' },
];

const queryLabels: Record<ErpAiAccountingQueryId, string> = {
  overdue_invoices: 'Factures clients en retard',
  trial_balance: 'Balance générale',
  unreconciled_bank_lines: 'Opérations bancaires non rapprochées',
  tax_declarations: 'Déclarations fiscales',
  payroll_cost: 'Coût de la paie',
};

const isView = (value: string | null): value is View =>
  views.some((view) => view.key === value);

const controlCss = `
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledWorkspace = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const StyledTabs = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[1]};
  min-height: 42px;
  overflow-x: auto;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledTab = styled.button<{ active: boolean }>`
  background: transparent;
  border: 0;
  border-bottom: 2px solid
    ${({ active }) => (active ? themeCssVariables.color.blue : 'transparent')};
  color: ${({ active }) =>
    active
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  height: 42px;
  letter-spacing: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
  white-space: nowrap;
`;

const StyledProviderBar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 42px;
  padding: 0 ${themeCssVariables.spacing[4]};
`;

const StyledProviderText = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledNotice = styled.div<{ danger: boolean }>`
  background: ${({ danger }) =>
    danger
      ? themeCssVariables.tag.background.red
      : themeCssVariables.tag.background.green};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${({ danger }) =>
    danger ? themeCssVariables.tag.text.red : themeCssVariables.tag.text.green};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const StyledTableArea = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 220px;
  overflow: hidden;
`;

const StyledInlineActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledProposal = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const StyledProposalMain = styled.span`
  color: ${themeCssVariables.font.color.primary};
  overflow-wrap: anywhere;
`;

const StyledProposalDetail = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  overflow-wrap: anywhere;
`;

const StyledForm = styled.form`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledFormGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(4, minmax(140px, 1fr));

  @media (max-width: 920px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledInput = styled.input`
  ${controlCss}
  height: 32px;
`;

const StyledSelect = styled.select`
  ${controlCss}
  height: 32px;
`;

const StyledTextarea = styled.textarea`
  ${controlCss}
  min-height: 92px;
  padding-bottom: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[2]};
  resize: vertical;
`;

const StyledFormActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

const StyledQueryWorkspace = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
`;

const StyledQueryToolbar = styled.form`
  align-items: end;
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(240px, 420px) auto;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const StyledEvidence = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const StyledEvidenceHeader = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.tertiary};
  font-family: monospace;
  font-size: ${themeCssVariables.font.size.xs};
  overflow-wrap: anywhere;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const StyledEvidenceTable = styled.table`
  border-collapse: collapse;
  font-size: ${themeCssVariables.font.size.sm};
  min-width: 100%;

  th,
  td {
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
    color: ${themeCssVariables.font.color.primary};
    max-width: 320px;
    overflow-wrap: anywhere;
    padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
    text-align: left;
    vertical-align: top;
  }

  th {
    background: ${themeCssVariables.background.secondary};
    color: ${themeCssVariables.font.color.secondary};
    font-weight: ${themeCssVariables.font.weight.medium};
    position: sticky;
    top: 0;
  }
`;

const StyledEmpty = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex: 1 1 auto;
  justify-content: center;
  min-height: 160px;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledChat = styled.div`
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: 280px minmax(0, 1fr);
  min-height: 0;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    grid-template-rows: 150px minmax(0, 1fr);
  }
`;

const StyledConversationList = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.medium};
  min-height: 0;
  overflow-y: auto;

  @media (max-width: 720px) {
    border-bottom: 1px solid ${themeCssVariables.border.color.medium};
    border-right: 0;
  }
`;

const StyledConversationButton = styled.button<{ active: boolean }>`
  background: ${({ active }) =>
    active
      ? themeCssVariables.background.transparent.light
      : themeCssVariables.background.primary};
  border: 0;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  gap: 2px;
  letter-spacing: 0;
  padding: ${themeCssVariables.spacing[3]};
  text-align: left;
  width: 100%;
`;

const StyledConversationDate = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledThread = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const StyledMessages = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
`;

const StyledMessage = styled.article<{ assistant: boolean }>`
  background: ${({ assistant }) =>
    assistant
      ? themeCssVariables.background.secondary
      : themeCssVariables.background.primary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledMessageMeta = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledMessageContent = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 20px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

const StyledComposer = styled.form`
  align-items: end;
  border-top: 1px solid ${themeCssVariables.border.color.medium};
  display: grid;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(0, 1fr) auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledDrawerContent = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[3]};
`;

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const textValue = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

const displayValue = (value: unknown) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return JSON.stringify(value);
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('fr-MA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const suggestionTone = (status: string): ErpStatusTone => {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'REJECTED' || status === 'EXPIRED') return 'danger';
  return 'warning';
};

const ruleTone = (active: boolean): ErpStatusTone =>
  active ? 'success' : 'neutral';

const suggestionSummary = (suggestion: ErpAiAccountingSuggestion) => {
  const proposal = asRecord(suggestion.proposal);
  if (suggestion.type === 'CATEGORIZATION') {
    return {
      main: `${textValue(proposal.accountCode) || 'Compte à vérifier'} · ${textValue(proposal.category) || 'Catégorie à vérifier'}`,
      detail: textValue(proposal.reason),
    };
  }
  const candidates = Array.isArray(proposal.candidates)
    ? proposal.candidates
    : [];
  const first = asRecord(candidates[0]);
  return {
    main: textValue(first.label) || 'Rapprochement à vérifier',
    detail: candidates.length > 0 ? `${candidates.length} candidat(s)` : '',
  };
};

export const ErpAccountingCopilotPage = () => {
  const { client, context } = useErpMarocContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const view: View = isView(viewParam) ? viewParam : 'suggestions';
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{
    message: string;
    danger: boolean;
  } | null>(null);
  const [status, setStatus] = useState<ErpAiAccountingStatus | null>(null);
  const [suggestions, setSuggestions] = useState<ErpAiAccountingSuggestion[]>(
    [],
  );
  const [rules, setRules] = useState<ErpAiCategorizationRule[]>([]);
  const [accounts, setAccounts] = useState<ErpAccountingAccount[]>([]);
  const [conversations, setConversations] = useState<
    ErpAiAccountingConversation[]
  >([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [reviewSuggestion, setReviewSuggestion] =
    useState<ErpAiAccountingSuggestion | null>(null);
  const [reviewMode, setReviewMode] = useState<ReviewMode>('ACCEPTED');
  const [reviewAccountCode, setReviewAccountCode] = useState('');
  const [reviewCategory, setReviewCategory] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [rulePattern, setRulePattern] = useState('');
  const [ruleMatchMode, setRuleMatchMode] = useState<'CONTAINS' | 'REGEX'>(
    'CONTAINS',
  );
  const [ruleDirection, setRuleDirection] = useState<
    'BOTH' | 'DEBIT' | 'CREDIT'
  >('BOTH');
  const [ruleAccountCode, setRuleAccountCode] = useState('');
  const [ruleCategory, setRuleCategory] = useState('');
  const [ruleConfidence, setRuleConfidence] = useState('90');
  const [rulePriority, setRulePriority] = useState('100');
  const [queryId, setQueryId] =
    useState<ErpAiAccountingQueryId>('overdue_invoices');
  const [queryResult, setQueryResult] =
    useState<ErpAiAccountingSafeQueryResult | null>(null);
  const [question, setQuestion] = useState('');
  const canReview =
    context !== null && ['OWNER', 'ADMIN', 'COMPTABLE'].includes(context.role);

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const [nextStatus, nextSuggestions, nextRules, nextConversations, refs] =
        await Promise.all([
          client.request({
            method: 'GET',
            path: '/ai-accounting/status',
            schema: erpAiAccountingStatusSchema,
          }),
          client.request({
            method: 'GET',
            path: '/ai-accounting/suggestions',
            schema: erpAiAccountingSuggestionListSchema,
          }),
          client.request({
            method: 'GET',
            path: '/ai-accounting/rules',
            schema: erpAiCategorizationRuleListSchema,
          }),
          client.request({
            method: 'GET',
            path: '/ai-accounting/conversations',
            schema: erpAiAccountingConversationListSchema,
          }),
          client.request({
            method: 'GET',
            path: '/accounting/references',
            schema: erpAccountingReferencesSchema,
          }),
        ]);
      setStatus(nextStatus);
      setSuggestions(nextSuggestions);
      setRules(nextRules);
      setConversations(nextConversations);
      setAccounts(refs.accounts.filter((account) => account.isActive));
      setSelectedConversationId((current) =>
        current !== null &&
        nextConversations.some((conversation) => conversation.id === current)
          ? current
          : (nextConversations[0]?.id ?? null),
      );
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectView = (nextView: View) => {
    setSearchParams(nextView === 'suggestions' ? {} : { view: nextView });
    setNotice(null);
  };

  const runSuggestionBatch = async (
    path: '/ai-accounting/categorize' | '/ai-accounting/reconcile',
    label: string,
  ) => {
    setPending(true);
    setNotice(null);
    try {
      const result = await client
        .createMutationIntent({
          method: 'POST',
          path,
          body: {},
          schema: erpAiAccountingSuggestionBatchSchema,
        })
        .execute();
      setNotice({
        message: `${label} : ${result.processed} opération(s) analysée(s), ${result.suggestions.length} suggestion(s).`,
        danger: false,
      });
      await load();
    } catch {
      setNotice({ message: `${label} impossible.`, danger: true });
    } finally {
      setPending(false);
    }
  };

  const openReview = (
    suggestion: ErpAiAccountingSuggestion,
    mode: ReviewMode,
  ) => {
    const proposal = asRecord(suggestion.proposal);
    setReviewSuggestion(suggestion);
    setReviewMode(mode);
    setReviewAccountCode(textValue(proposal.accountCode));
    setReviewCategory(textValue(proposal.category));
    setReviewNotes('');
  };

  const submitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (reviewSuggestion === null) return;
    setPending(true);
    setNotice(null);
    try {
      const isCorrection =
        reviewMode === 'ACCEPTED' && reviewSuggestion.type === 'CATEGORIZATION';
      const nextSuggestion = await client
        .createMutationIntent({
          method: 'PATCH',
          path: `/ai-accounting/suggestions/${reviewSuggestion.id}`,
          body: {
            status: reviewMode,
            notes: reviewNotes || undefined,
            correctedAccountCode: isCorrection ? reviewAccountCode : undefined,
            correctedCategory: isCorrection ? reviewCategory : undefined,
          },
          schema: erpAiAccountingSuggestionSchema,
        })
        .execute();
      setSuggestions((items) =>
        items.map((item) =>
          item.id === nextSuggestion.id ? nextSuggestion : item,
        ),
      );
      setReviewSuggestion(null);
      setNotice({
        message:
          reviewMode === 'ACCEPTED'
            ? 'Suggestion validée par un humain.'
            : 'Suggestion rejetée.',
        danger: false,
      });
    } catch {
      setNotice({
        message: 'La décision n’a pas été enregistrée.',
        danger: true,
      });
    } finally {
      setPending(false);
    }
  };

  const createRule = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setNotice(null);
    try {
      const nextRule = await client
        .createMutationIntent({
          method: 'POST',
          path: '/ai-accounting/rules',
          body: {
            name: ruleName,
            pattern: rulePattern,
            matchMode: ruleMatchMode,
            direction: ruleDirection,
            accountCode: ruleAccountCode,
            category: ruleCategory,
            confidenceBasisPoints: Math.round(Number(ruleConfidence) * 100),
            priority: Number(rulePriority),
          },
          schema: erpAiCategorizationRuleSchema,
        })
        .execute();
      setRules((items) =>
        [...items, nextRule].sort(
          (left, right) =>
            left.priority - right.priority ||
            left.name.localeCompare(right.name),
        ),
      );
      setRuleName('');
      setRulePattern('');
      setRuleCategory('');
      setShowRuleForm(false);
      setNotice({ message: 'Règle de catégorisation créée.', danger: false });
    } catch {
      setNotice({ message: 'La règle n’a pas été créée.', danger: true });
    } finally {
      setPending(false);
    }
  };

  const toggleRule = async (rule: ErpAiCategorizationRule) => {
    setPending(true);
    setNotice(null);
    try {
      const nextRule = rule.isActive
        ? await client
            .createMutationIntent({
              method: 'POST',
              path: `/ai-accounting/rules/${rule.id}/deactivate`,
              body: {},
              schema: erpAiCategorizationRuleSchema,
            })
            .execute()
        : await client
            .createMutationIntent({
              method: 'PATCH',
              path: `/ai-accounting/rules/${rule.id}`,
              body: { isActive: true },
              schema: erpAiCategorizationRuleSchema,
            })
            .execute();
      setRules((items) =>
        items.map((item) => (item.id === nextRule.id ? nextRule : item)),
      );
      setNotice({
        message: nextRule.isActive ? 'Règle activée.' : 'Règle suspendue.',
        danger: false,
      });
    } catch {
      setNotice({
        message: 'Le statut de la règle n’a pas changé.',
        danger: true,
      });
    } finally {
      setPending(false);
    }
  };

  const runQuery = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setNotice(null);
    try {
      const result = await client
        .createMutationIntent({
          method: 'POST',
          path: '/ai-accounting/safe-query',
          body: { queryId },
          schema: erpAiAccountingSafeQueryResultSchema,
        })
        .execute();
      setQueryResult(result);
    } catch {
      setNotice({ message: 'La requête contrôlée a échoué.', danger: true });
    } finally {
      setPending(false);
    }
  };

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedQuestion = question.trim();
    if (normalizedQuestion === '') return;
    setPending(true);
    setNotice(null);
    try {
      const answer = await client
        .createMutationIntent({
          method: 'POST',
          path: '/ai-accounting/ask',
          body: {
            question: normalizedQuestion,
            conversationId: selectedConversationId ?? undefined,
          },
          schema: erpAiAccountingAnswerSchema,
        })
        .execute();
      setQuestion('');
      setSelectedConversationId(answer.conversationId);
      await load();
      setSelectedConversationId(answer.conversationId);
    } catch {
      setNotice({ message: 'Le copilote n’a pas pu répondre.', danger: true });
    } finally {
      setPending(false);
    }
  };

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );

  const suggestionColumns = useMemo<
    ErpOperationalTableColumn<ErpAiAccountingSuggestion>[]
  >(
    () => [
      {
        key: 'type',
        header: 'Type',
        width: '150px',
        render: (row) =>
          row.type === 'CATEGORIZATION' ? 'Catégorisation' : 'Rapprochement',
      },
      {
        key: 'proposal',
        header: 'Proposition',
        width: '420px',
        render: (row) => {
          const summary = suggestionSummary(row);
          return (
            <StyledProposal>
              <StyledProposalMain>{summary.main}</StyledProposalMain>
              {summary.detail === '' ? null : (
                <StyledProposalDetail>{summary.detail}</StyledProposalDetail>
              )}
            </StyledProposal>
          );
        },
      },
      {
        key: 'confidence',
        header: 'Confiance',
        width: '100px',
        render: (row) => `${(row.confidenceBasisPoints / 100).toFixed(0)} %`,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '120px',
        render: (row) => (
          <ErpStatusBadge
            label={row.status}
            tone={suggestionTone(row.status)}
          />
        ),
      },
      {
        key: 'createdAt',
        header: 'Créée le',
        width: '170px',
        render: (row) => formatDate(row.createdAt),
      },
      {
        key: 'actions',
        header: '',
        width: '104px',
        render: (row) =>
          row.status === 'PROPOSED' && canReview ? (
            <StyledInlineActions>
              <Button
                title="Valider ou corriger"
                ariaLabel="Valider ou corriger la suggestion"
                Icon={row.type === 'CATEGORIZATION' ? IconPencil : IconCheck}
                variant="tertiary"
                onClick={() => openReview(row, 'ACCEPTED')}
              />
              <Button
                title="Rejeter"
                ariaLabel="Rejeter la suggestion"
                Icon={IconX}
                variant="tertiary"
                onClick={() => openReview(row, 'REJECTED')}
              />
            </StyledInlineActions>
          ) : null,
      },
    ],
    [canReview],
  );

  const ruleColumns = useMemo<
    ErpOperationalTableColumn<ErpAiCategorizationRule>[]
  >(
    () => [
      {
        key: 'priority',
        header: 'Priorité',
        width: '90px',
        render: (row) => row.priority,
      },
      {
        key: 'name',
        header: 'Règle',
        width: '220px',
        render: (row) => row.name,
      },
      {
        key: 'pattern',
        header: 'Détection',
        width: '280px',
        render: (row) => `${row.matchMode} · ${row.pattern}`,
      },
      {
        key: 'direction',
        header: 'Sens',
        width: '100px',
        render: (row) => row.direction,
      },
      {
        key: 'account',
        header: 'Compte PCGM',
        width: '240px',
        render: (row) => `${row.accountCode} · ${row.category}`,
      },
      {
        key: 'confidence',
        header: 'Confiance',
        width: '100px',
        render: (row) => `${(row.confidenceBasisPoints / 100).toFixed(0)} %`,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '110px',
        render: (row) => (
          <ErpStatusBadge
            label={row.isActive ? 'ACTIVE' : 'PAUSED'}
            tone={ruleTone(row.isActive)}
          />
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '56px',
        render: (row) =>
          canReview ? (
            <Button
              title={row.isActive ? 'Suspendre' : 'Activer'}
              ariaLabel={
                row.isActive ? 'Suspendre la règle' : 'Activer la règle'
              }
              Icon={row.isActive ? IconPlayerPause : IconPlayerPlay}
              variant="tertiary"
              disabled={pending}
              onClick={() => void toggleRule(row)}
            />
          ) : null,
      },
    ],
    [canReview, pending],
  );

  const evidenceRows = queryResult?.rows ?? [];
  const evidenceHeaders = Array.from(
    evidenceRows.reduce((keys, row) => {
      Object.keys(asRecord(row)).forEach((key) => keys.add(key));
      return keys;
    }, new Set<string>()),
  ).slice(0, 12);

  const pageActions = (
    <>
      {view === 'suggestions' && canReview ? (
        <>
          <Button
            title="Catégoriser"
            ariaLabel="Analyser les opérations à catégoriser"
            Icon={IconSparkles}
            variant="secondary"
            disabled={pending}
            onClick={() =>
              void runSuggestionBatch(
                '/ai-accounting/categorize',
                'Catégorisation terminée',
              )
            }
          />
          <Button
            title="Rapprocher"
            ariaLabel="Rechercher des rapprochements bancaires"
            Icon={IconRefresh}
            variant="primary"
            disabled={pending}
            onClick={() =>
              void runSuggestionBatch(
                '/ai-accounting/reconcile',
                'Recherche de rapprochements terminée',
              )
            }
          />
        </>
      ) : null}
      {view === 'rules' && canReview ? (
        <Button
          title={showRuleForm ? 'Fermer' : 'Nouvelle règle'}
          ariaLabel={showRuleForm ? 'Fermer le formulaire' : 'Créer une règle'}
          Icon={showRuleForm ? IconX : IconPlus}
          variant="primary"
          onClick={() => setShowRuleForm((current) => !current)}
        />
      ) : null}
      {view === 'assistant' ? (
        <Button
          title="Nouvelle conversation"
          ariaLabel="Démarrer une nouvelle conversation"
          Icon={IconPlus}
          variant="secondary"
          onClick={() => setSelectedConversationId(null)}
        />
      ) : null}
    </>
  );

  return (
    <ErpPageShell
      title="Copilote comptable"
      description="Catégorisation PCGM, rapprochement, contrôles et analyses fondées sur les données"
      actions={pageActions}
      state={loadState}
      loadingLabel="Chargement du copilote comptable…"
      errorLabel="Impossible de charger le copilote comptable."
      onRetry={() => void load()}
    >
      <StyledWorkspace>
        <StyledTabs role="tablist" aria-label="Vues du copilote comptable">
          {views.map((item) => (
            <StyledTab
              key={item.key}
              type="button"
              role="tab"
              active={view === item.key}
              aria-selected={view === item.key}
              onClick={() => selectView(item.key)}
            >
              {item.label}
            </StyledTab>
          ))}
        </StyledTabs>
        {status === null ? null : (
          <StyledProviderBar>
            <ErpStatusBadge
              label={
                status.providerConfigured ? 'IA CONNECTÉE' : 'MOTEUR LOCAL'
              }
              tone={status.providerConfigured ? 'success' : 'neutral'}
            />
            <StyledProviderText>{status.provider}</StyledProviderText>
            <StyledProviderText>{status.model}</StyledProviderText>
            <StyledProviderText>
              Validation humaine obligatoire
            </StyledProviderText>
          </StyledProviderBar>
        )}
        {notice ? (
          <StyledNotice
            danger={notice.danger}
            role={notice.danger ? 'alert' : 'status'}
          >
            {notice.message}
          </StyledNotice>
        ) : null}

        {view === 'suggestions' ? (
          <StyledTableArea>
            <ErpOperationalTable
              ariaLabel="Suggestions comptables"
              columns={suggestionColumns}
              rows={suggestions}
              getRowKey={(row) => row.id}
              emptyLabel="Aucune suggestion à contrôler"
            />
          </StyledTableArea>
        ) : null}

        {view === 'rules' ? (
          <>
            {showRuleForm ? (
              <StyledForm onSubmit={createRule}>
                <StyledFormGrid>
                  <StyledField>
                    Nom
                    <StyledInput
                      required
                      maxLength={120}
                      value={ruleName}
                      onChange={(event) => setRuleName(event.target.value)}
                    />
                  </StyledField>
                  <StyledField>
                    Motif
                    <StyledInput
                      required
                      maxLength={120}
                      value={rulePattern}
                      onChange={(event) => setRulePattern(event.target.value)}
                    />
                  </StyledField>
                  <StyledField>
                    Correspondance
                    <StyledSelect
                      value={ruleMatchMode}
                      onChange={(event) =>
                        setRuleMatchMode(
                          event.target.value as 'CONTAINS' | 'REGEX',
                        )
                      }
                    >
                      <option value="CONTAINS">Contient</option>
                      <option value="REGEX">Expression régulière</option>
                    </StyledSelect>
                  </StyledField>
                  <StyledField>
                    Sens
                    <StyledSelect
                      value={ruleDirection}
                      onChange={(event) =>
                        setRuleDirection(
                          event.target.value as 'BOTH' | 'DEBIT' | 'CREDIT',
                        )
                      }
                    >
                      <option value="BOTH">Débit et crédit</option>
                      <option value="DEBIT">Débit</option>
                      <option value="CREDIT">Crédit</option>
                    </StyledSelect>
                  </StyledField>
                  <StyledField>
                    Compte PCGM
                    <StyledSelect
                      required
                      value={ruleAccountCode}
                      onChange={(event) =>
                        setRuleAccountCode(event.target.value)
                      }
                    >
                      <option value="">Sélectionner</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.code}>
                          {account.code} · {account.libelle}
                        </option>
                      ))}
                    </StyledSelect>
                  </StyledField>
                  <StyledField>
                    Catégorie
                    <StyledInput
                      required
                      maxLength={160}
                      value={ruleCategory}
                      onChange={(event) => setRuleCategory(event.target.value)}
                    />
                  </StyledField>
                  <StyledField>
                    Confiance %
                    <StyledInput
                      required
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={ruleConfidence}
                      onChange={(event) =>
                        setRuleConfidence(event.target.value)
                      }
                    />
                  </StyledField>
                  <StyledField>
                    Priorité
                    <StyledInput
                      required
                      type="number"
                      min="0"
                      max="10000"
                      value={rulePriority}
                      onChange={(event) => setRulePriority(event.target.value)}
                    />
                  </StyledField>
                </StyledFormGrid>
                <StyledFormActions>
                  <Button
                    type="submit"
                    title="Créer la règle"
                    ariaLabel="Créer la règle"
                    Icon={IconCheck}
                    variant="primary"
                    disabled={pending}
                  />
                </StyledFormActions>
              </StyledForm>
            ) : null}
            <StyledTableArea>
              <ErpOperationalTable
                ariaLabel="Règles de catégorisation"
                columns={ruleColumns}
                rows={rules}
                getRowKey={(row) => row.id}
                emptyLabel="Aucune règle personnalisée"
              />
            </StyledTableArea>
          </>
        ) : null}

        {view === 'queries' ? (
          <StyledQueryWorkspace>
            <StyledQueryToolbar onSubmit={runQuery}>
              <StyledField>
                Vue sécurisée
                <StyledSelect
                  value={queryId}
                  onChange={(event) =>
                    setQueryId(
                      erpAiAccountingQueryIdSchema.parse(event.target.value),
                    )
                  }
                >
                  {(status?.safeQueries ?? []).map((safeQuery) => (
                    <option key={safeQuery} value={safeQuery}>
                      {queryLabels[safeQuery]}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
              <Button
                type="submit"
                title="Exécuter"
                ariaLabel="Exécuter la requête contrôlée"
                Icon={IconPlayerPlay}
                variant="primary"
                disabled={pending}
              />
            </StyledQueryToolbar>
            {queryResult === null ? (
              <StyledEmpty>Aucun résultat chargé</StyledEmpty>
            ) : (
              <StyledEvidence>
                <StyledEvidenceHeader>
                  {queryResult.generatedSql}
                </StyledEvidenceHeader>
                {evidenceRows.length === 0 ? (
                  <StyledEmpty>Aucune donnée</StyledEmpty>
                ) : (
                  <StyledEvidenceTable>
                    <thead>
                      <tr>
                        {evidenceHeaders.map((header) => (
                          <th key={header}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {evidenceRows.map((row, index) => {
                        const record = asRecord(row);
                        return (
                          <tr key={`${queryResult.queryId}-${index}`}>
                            {evidenceHeaders.map((header) => (
                              <td key={header}>
                                {displayValue(record[header])}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </StyledEvidenceTable>
                )}
              </StyledEvidence>
            )}
          </StyledQueryWorkspace>
        ) : null}

        {view === 'assistant' ? (
          <StyledChat>
            <StyledConversationList aria-label="Conversations comptables">
              {conversations.length === 0 ? (
                <StyledEmpty>Aucune conversation</StyledEmpty>
              ) : (
                conversations.map((conversation) => (
                  <StyledConversationButton
                    key={conversation.id}
                    type="button"
                    active={conversation.id === selectedConversationId}
                    onClick={() => setSelectedConversationId(conversation.id)}
                  >
                    <span>{conversation.title}</span>
                    <StyledConversationDate>
                      {formatDate(conversation.updatedAt)}
                    </StyledConversationDate>
                  </StyledConversationButton>
                ))
              )}
            </StyledConversationList>
            <StyledThread>
              <StyledMessages aria-live="polite">
                {selectedConversation?.messages.length ? (
                  selectedConversation.messages.map((message) => {
                    const evidence = asRecord(message.evidence);
                    const rows = Array.isArray(evidence.rows)
                      ? evidence.rows.length
                      : 0;
                    return (
                      <StyledMessage
                        key={message.id}
                        assistant={message.role === 'assistant'}
                      >
                        <StyledMessageMeta>
                          <span>
                            {message.role === 'assistant' ? 'Zowka' : 'Vous'}
                          </span>
                          <span>{formatDate(message.createdAt)}</span>
                          {message.provider ? (
                            <span>{message.provider}</span>
                          ) : null}
                          {rows > 0 ? <span>{rows} preuve(s)</span> : null}
                        </StyledMessageMeta>
                        <StyledMessageContent>
                          {message.content}
                        </StyledMessageContent>
                      </StyledMessage>
                    );
                  })
                ) : (
                  <StyledEmpty>Posez une question comptable</StyledEmpty>
                )}
              </StyledMessages>
              <StyledComposer onSubmit={ask}>
                <StyledField>
                  Question
                  <StyledTextarea
                    required
                    maxLength={4000}
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                  />
                </StyledField>
                <Button
                  type="submit"
                  title="Envoyer"
                  ariaLabel="Envoyer la question au copilote"
                  Icon={IconSend}
                  variant="primary"
                  disabled={pending || question.trim() === ''}
                />
              </StyledComposer>
            </StyledThread>
          </StyledChat>
        ) : null}
      </StyledWorkspace>

      <ErpFormDrawer
        isOpen={reviewSuggestion !== null}
        title={
          reviewMode === 'ACCEPTED'
            ? 'Valider la suggestion'
            : 'Rejeter la suggestion'
        }
        description="La décision, les corrections et les notes sont conservées dans l’historique."
        isBusy={pending}
        onClose={() => setReviewSuggestion(null)}
        footer={
          <>
            <Button
              title="Annuler"
              ariaLabel="Annuler la décision"
              Icon={IconX}
              variant="secondary"
              onClick={() => setReviewSuggestion(null)}
            />
            <Button
              title={reviewMode === 'ACCEPTED' ? 'Valider' : 'Rejeter'}
              ariaLabel={reviewMode === 'ACCEPTED' ? 'Valider' : 'Rejeter'}
              Icon={reviewMode === 'ACCEPTED' ? IconCheck : IconX}
              variant="primary"
              disabled={pending}
              onClick={() => {
                const form = document.getElementById('erp-ai-review-form');
                if (form instanceof HTMLFormElement) form.requestSubmit();
              }}
            />
          </>
        }
      >
        <StyledDrawerContent id="erp-ai-review-form" onSubmit={submitReview}>
          {reviewMode === 'ACCEPTED' &&
          reviewSuggestion?.type === 'CATEGORIZATION' ? (
            <>
              <StyledField>
                Compte PCGM validé
                <StyledSelect
                  required
                  value={reviewAccountCode}
                  onChange={(event) => setReviewAccountCode(event.target.value)}
                >
                  <option value="">Sélectionner</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.code}>
                      {account.code} · {account.libelle}
                    </option>
                  ))}
                </StyledSelect>
              </StyledField>
              <StyledField>
                Catégorie validée
                <StyledInput
                  required
                  maxLength={160}
                  value={reviewCategory}
                  onChange={(event) => setReviewCategory(event.target.value)}
                />
              </StyledField>
            </>
          ) : null}
          <StyledField>
            Note de contrôle
            <StyledTextarea
              maxLength={2000}
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
            />
          </StyledField>
        </StyledDrawerContent>
      </ErpFormDrawer>
    </ErpPageShell>
  );
};
