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
import { styled } from '@linaria/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  payrollComponentListSchema,
  payrollControlDefinitionListSchema,
  payrollLegalSourceListSchema,
  payrollRegulatorySeedResultSchema,
  payrollRegulatorySummarySchema,
  payrollRuleListSchema,
  type PayrollComponent,
  type PayrollControlDefinition,
  type PayrollLegalSource,
  type PayrollRegulatoryStatus,
  type PayrollRegulatorySummary,
  type PayrollRule,
} from 'twenty-shared/erp-maroc';
import { IconRefresh, IconSearch, IconUpload } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { PayrollDeclarationsPanel } from './PayrollDeclarationsPanel';

type View =
  | 'parameters'
  | 'components'
  | 'controls'
  | 'sources'
  | 'declarations';
type LoadState = 'loading' | 'ready' | 'error';

const EMPTY_SUMMARY: PayrollRegulatorySummary = {
  parameters: 0,
  components: 0,
  controls: 0,
  sources: 0,
  testPacks: 0,
};

const statusAppearance: Record<
  PayrollRegulatoryStatus,
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  REVIEWED: { label: 'Revu', tone: 'info' },
  APPROVED: { label: 'Approuvé', tone: 'success' },
  ACTIVE: { label: 'Actif', tone: 'success' },
  REJECTED: { label: 'Rejeté', tone: 'danger' },
  RETIRED: { label: 'Retiré', tone: 'warning' },
};

const StyledMetrics = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(5, minmax(120px, 1fr));
  overflow-x: auto;
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 120px;
  padding: ${themeCssVariables.spacing[3]};

  &:last-child {
    border-right: 0;
  }
`;

const StyledMetricLabel = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledMetricValue = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  letter-spacing: 0;
`;

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  min-height: 44px;
  overflow-x: auto;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledTabs = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledTab = styled.button<{ active: boolean }>`
  background: ${({ active }) =>
    active
      ? themeCssVariables.background.quaternary
      : themeCssVariables.background.transparent.light};
  border: 0;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ active }) =>
    active
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${({ active }) =>
    active
      ? themeCssVariables.font.weight.semiBold
      : themeCssVariables.font.weight.regular};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};
  white-space: nowrap;
`;

const StyledSearch = styled.label`
  align-items: center;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex: 0 0 240px;
  gap: ${themeCssVariables.spacing[1]};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledSearchInput = styled.input`
  background: transparent;
  border: 0;
  color: ${themeCssVariables.font.color.primary};
  flex: 1 1 auto;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  min-width: 0;
  outline: none;
`;

const StyledNotice = styled.div<{ danger: boolean }>`
  background: ${({ danger }) =>
    danger
      ? themeCssVariables.tag.background.red
      : themeCssVariables.tag.background.green};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${({ danger }) =>
    danger ? themeCssVariables.tag.text.red : themeCssVariables.tag.text.green};
  flex: 0 0 auto;
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 20px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledCode = styled.code`
  color: ${themeCssVariables.font.color.secondary};
  font-family: monospace;
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledLink = styled.a`
  color: ${themeCssVariables.color.blue};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const latestVersion = <T extends { version: number }>(versions: T[]) =>
  versions.reduce<T | undefined>(
    (latest, version) =>
      latest === undefined || version.version > latest.version
        ? version
        : latest,
    undefined,
  );

const formatParameterValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'À définir';
  if (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'rawValue' in value
  ) {
    const rawValue = (value as { rawValue?: unknown }).rawValue;
    return rawValue === null || rawValue === undefined || rawValue === ''
      ? 'À définir'
      : String(rawValue);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  return JSON.stringify(value);
};

const statusBadge = (status: PayrollRegulatoryStatus | undefined) => {
  const appearance = statusAppearance[status ?? 'DRAFT'];
  return <ErpStatusBadge label={appearance.label} tone={appearance.tone} />;
};

export const ErpPayrollRegulatoryPage = () => {
  const { client, context } = useErpMarocContext();
  const [view, setView] = useState<View>('parameters');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageDanger, setMessageDanger] = useState(false);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [rules, setRules] = useState<PayrollRule[]>([]);
  const [components, setComponents] = useState<PayrollComponent[]>([]);
  const [controls, setControls] = useState<PayrollControlDefinition[]>([]);
  const [sources, setSources] = useState<PayrollLegalSource[]>([]);

  const canSeed = context?.role === 'OWNER' || context?.role === 'ADMIN';

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const [
        nextSummary,
        nextRules,
        nextComponents,
        nextControls,
        nextSources,
      ] = await Promise.all([
        client.request({
          method: 'GET',
          path: '/payroll/regulatory/summary',
          schema: payrollRegulatorySummarySchema,
        }),
        client.request({
          method: 'GET',
          path: '/payroll/regulatory/rules',
          schema: payrollRuleListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/payroll/regulatory/components',
          schema: payrollComponentListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/payroll/regulatory/controls',
          schema: payrollControlDefinitionListSchema,
        }),
        client.request({
          method: 'GET',
          path: '/payroll/regulatory/sources',
          schema: payrollLegalSourceListSchema,
        }),
      ]);
      setSummary(nextSummary);
      setRules(nextRules);
      setComponents(nextComponents);
      setControls(nextControls);
      setSources(nextSources);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const synchronize = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/payroll/regulatory/seed/morocco-2026',
          schema: payrollRegulatorySeedResultSchema,
        },
        { idempotency: 'required' },
      );
      const result = await intent.execute();
      setMessageDanger(false);
      setMessage(
        `${result.studyParameterCount} paramètres, ${result.componentCount} rubriques et ${result.controlCount} contrôles synchronisés en brouillon.`,
      );
      await load();
    } catch {
      setMessageDanger(true);
      setMessage("La synchronisation du référentiel n'a pas abouti.");
    } finally {
      setBusy(false);
    }
  };

  const normalizedQuery = query.trim().toLocaleLowerCase('fr');
  const matches = useCallback(
    (...values: Array<string | null | undefined>) =>
      normalizedQuery === '' ||
      values.some((value) =>
        value?.toLocaleLowerCase('fr').includes(normalizedQuery),
      ),
    [normalizedQuery],
  );

  const filteredRules = useMemo(
    () =>
      rules.filter((rule) =>
        matches(rule.code, rule.label, rule.category, rule.description),
      ),
    [matches, rules],
  );
  const filteredComponents = useMemo(
    () =>
      components.filter((component) =>
        matches(component.code, component.label, component.family),
      ),
    [components, matches],
  );
  const filteredControls = useMemo(
    () =>
      controls.filter((control) =>
        matches(
          control.code,
          control.stage,
          control.domain,
          control.label,
          control.owner,
        ),
      ),
    [controls, matches],
  );
  const filteredSources = useMemo(
    () =>
      sources.filter((source) =>
        matches(source.code, source.title, source.authority, source.reference),
      ),
    [matches, sources],
  );

  const parameterColumns: ErpOperationalTableColumn<PayrollRule>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '220px',
      render: (rule) => <StyledCode>{rule.code}</StyledCode>,
    },
    {
      key: 'label',
      header: 'Paramètre',
      width: '300px',
      render: (rule) => rule.label,
    },
    {
      key: 'category',
      header: 'Domaine',
      width: '160px',
      render: (rule) => rule.category,
    },
    {
      key: 'value',
      header: 'Valeur 2026',
      width: '180px',
      render: (rule) =>
        formatParameterValue(latestVersion(rule.versions)?.value),
    },
    {
      key: 'unit',
      header: 'Unité',
      width: '130px',
      render: (rule) => rule.unit || '—',
    },
    {
      key: 'criticality',
      header: 'Criticité',
      width: '120px',
      render: (rule) => (
        <ErpStatusBadge
          label={rule.critical ? 'Critique' : 'Standard'}
          tone={rule.critical ? 'danger' : 'neutral'}
        />
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '130px',
      render: (rule) => statusBadge(latestVersion(rule.versions)?.status),
    },
    {
      key: 'sources',
      header: 'Sources',
      width: '90px',
      align: 'right',
      render: (rule) => latestVersion(rule.versions)?.sourceLinks.length ?? 0,
    },
  ];

  const componentColumns: ErpOperationalTableColumn<PayrollComponent>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '110px',
      render: (component) => <StyledCode>{component.code}</StyledCode>,
    },
    {
      key: 'label',
      header: 'Rubrique',
      width: '240px',
      render: (component) => component.label,
    },
    {
      key: 'family',
      header: 'Famille',
      width: '130px',
      render: (component) => component.family,
    },
    {
      key: 'formula',
      header: 'Valorisation',
      width: '300px',
      render: (component) => latestVersion(component.versions)?.formula ?? '—',
    },
    {
      key: 'unit',
      header: 'Unité',
      width: '140px',
      render: (component) => latestVersion(component.versions)?.unit ?? '—',
    },
    {
      key: 'accounts',
      header: 'Débit / Crédit',
      width: '150px',
      render: (component) => {
        const version = latestVersion(component.versions);
        return (
          [version?.debitAccountCode, version?.creditAccountCode]
            .filter(Boolean)
            .join(' / ') || '—'
        );
      },
    },
    {
      key: 'criticality',
      header: 'Criticité',
      width: '120px',
      render: (component) => {
        const criticality =
          latestVersion(component.versions)?.criticality ?? 'Standard';
        return (
          <ErpStatusBadge
            label={criticality}
            tone={criticality === 'Critique' ? 'danger' : 'warning'}
          />
        );
      },
    },
    {
      key: 'status',
      header: 'Statut',
      width: '130px',
      render: (component) =>
        statusBadge(latestVersion(component.versions)?.status),
    },
  ];

  const controlColumns: ErpOperationalTableColumn<PayrollControlDefinition>[] =
    [
      {
        key: 'code',
        header: 'Code',
        width: '100px',
        render: (control) => <StyledCode>{control.code}</StyledCode>,
      },
      {
        key: 'stage',
        header: 'Étape',
        width: '140px',
        render: (control) => control.stage,
      },
      {
        key: 'domain',
        header: 'Domaine',
        width: '150px',
        render: (control) => control.domain,
      },
      {
        key: 'control',
        header: 'Contrôle / risque',
        width: '340px',
        render: (control) => control.label,
      },
      {
        key: 'severity',
        header: 'Sévérité',
        width: '140px',
        render: (control) => (
          <ErpStatusBadge
            label={control.severity}
            tone={control.isBlocking ? 'danger' : 'warning'}
          />
        ),
      },
      {
        key: 'owner',
        header: 'Responsable',
        width: '150px',
        render: (control) => control.owner,
      },
      {
        key: 'frequency',
        header: 'Fréquence',
        width: '140px',
        render: (control) => control.frequency,
      },
      {
        key: 'action',
        header: 'Action attendue',
        width: '260px',
        render: (control) => control.expectedAction,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '130px',
        render: (control) => statusBadge(control.status),
      },
    ];

  const sourceColumns: ErpOperationalTableColumn<PayrollLegalSource>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '110px',
      render: (source) => <StyledCode>{source.code}</StyledCode>,
    },
    {
      key: 'title',
      header: 'Source',
      width: '340px',
      render: (source) =>
        source.url ? (
          <StyledLink href={source.url} target="_blank" rel="noreferrer">
            {source.title}
          </StyledLink>
        ) : (
          source.title
        ),
    },
    {
      key: 'authority',
      header: 'Autorité',
      width: '230px',
      render: (source) => source.authority,
    },
    {
      key: 'scope',
      header: 'Périmètre',
      width: '360px',
      render: (source) => source.reference ?? '—',
    },
    {
      key: 'retrieved',
      header: 'Consultée le',
      width: '130px',
      render: (source) => source.retrievedAt,
    },
  ];

  return (
    <ErpPageShell
      title="Référentiel de paie"
      description="Paramètres réglementaires, rubriques et contrôles Maroc"
      state={loadState}
      errorLabel="Impossible de charger le référentiel de paie"
      onRetry={() => void load()}
      actions={
        <>
          {canSeed ? (
            <Button
              title="Synchroniser le référentiel 2026"
              ariaLabel="Synchroniser le référentiel de paie 2026"
              Icon={IconUpload}
              accent="blue"
              disabled={busy}
              onClick={() => void synchronize()}
            />
          ) : null}
          <Button
            title="Actualiser"
            ariaLabel="Actualiser le référentiel de paie"
            Icon={IconRefresh}
            variant="secondary"
            disabled={busy}
            onClick={() => void load()}
          />
        </>
      }
    >
      <StyledMetrics aria-label="Indicateurs du référentiel de paie">
        {[
          ['Paramètres', summary.parameters],
          ['Rubriques', summary.components],
          ['Contrôles', summary.controls],
          ['Sources', summary.sources],
          ['Jeux de test', summary.testPacks],
        ].map(([label, value]) => (
          <StyledMetric key={label}>
            <StyledMetricLabel>{label}</StyledMetricLabel>
            <StyledMetricValue>{value}</StyledMetricValue>
          </StyledMetric>
        ))}
      </StyledMetrics>
      <StyledToolbar>
        <StyledTabs role="tablist" aria-label="Vues du référentiel de paie">
          {(
            [
              ['parameters', 'Paramètres'],
              ['components', 'Rubriques'],
              ['controls', 'Contrôles'],
              ['sources', 'Sources'],
              ['declarations', 'Déclarations'],
            ] as const
          ).map(([key, label]) => (
            <StyledTab
              key={key}
              type="button"
              role="tab"
              active={view === key}
              aria-selected={view === key}
              onClick={() => setView(key)}
            >
              {label}
            </StyledTab>
          ))}
        </StyledTabs>
        <StyledSearch>
          <IconSearch size={16} aria-hidden="true" />
          <StyledSearchInput
            value={query}
            placeholder="Rechercher"
            aria-label="Rechercher dans le référentiel"
            onChange={(event) => setQuery(event.target.value)}
          />
        </StyledSearch>
      </StyledToolbar>
      {message ? (
        <StyledNotice danger={messageDanger}>{message}</StyledNotice>
      ) : null}
      {view === 'parameters' ? (
        <ErpOperationalTable
          ariaLabel="Paramètres réglementaires de paie"
          columns={parameterColumns}
          rows={filteredRules}
          getRowKey={(rule) => rule.id}
          emptyLabel="Aucun paramètre"
        />
      ) : view === 'components' ? (
        <ErpOperationalTable
          ariaLabel="Rubriques de paie"
          columns={componentColumns}
          rows={filteredComponents}
          getRowKey={(component) => component.id}
          emptyLabel="Aucune rubrique de paie"
        />
      ) : view === 'controls' ? (
        <ErpOperationalTable
          ariaLabel="Contrôles de paie"
          columns={controlColumns}
          rows={filteredControls}
          getRowKey={(control) => control.id}
          emptyLabel="Aucun contrôle de paie"
        />
      ) : view === 'sources' ? (
        <ErpOperationalTable
          ariaLabel="Sources réglementaires de paie"
          columns={sourceColumns}
          rows={filteredSources}
          getRowKey={(source) => source.id}
          emptyLabel="Aucune source réglementaire"
        />
      ) : (
        <PayrollDeclarationsPanel query={query} />
      )}
    </ErpPageShell>
  );
};
