import {
  ErpSpaceDashboard,
  type ErpDashboardActionGroup,
  type ErpDashboardMetric,
} from '@/erp-maroc/components/ErpSpaceDashboard';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { useEffect, useMemo, useState } from 'react';
import {
  erpHrAnalyticsSchema,
  type ErpHrAnalytics,
} from 'twenty-shared/erp-maroc';
import {
  IconChartBar,
  IconClock,
  IconCreditCard,
  IconSettings,
  IconUsers,
} from 'twenty-ui/display';

const formatPercent = (basisPoints: number) =>
  `${(basisPoints / 100).toFixed(1)} %`;

export const ErpHrDashboardPage = () => {
  const { client } = useErpMarocContext();
  const [generation, setGeneration] = useState(0);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [analytics, setAnalytics] = useState<ErpHrAnalytics | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    setLoadState('loading');

    void client
      .request({
        method: 'GET',
        path: '/hr-operations/analytics',
        schema: erpHrAnalyticsSchema,
        signal: abortController.signal,
      })
      .then((value) => {
        if (abortController.signal.aborted) return;
        setAnalytics(value);
        setLoadState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setLoadState('error');
      });

    return () => abortController.abort();
  }, [client, generation]);

  const metrics = useMemo<ErpDashboardMetric[]>(
    () => [
      {
        id: 'headcount',
        label: 'Effectif moyen',
        value: String(analytics?.workforce.averageHeadcountApproximation ?? 0),
        to: erpMarocPaths.hrCore,
      },
      {
        id: 'hires',
        label: 'Embauches',
        value: String(analytics?.workforce.hires ?? 0),
        to: erpMarocPaths.talent,
      },
      {
        id: 'turnover',
        label: 'Turnover',
        value: formatPercent(analytics?.workforce.turnoverBasisPoints ?? 0),
        to: `${erpMarocPaths.hrOperations}?view=dashboard`,
      },
      {
        id: 'absence',
        label: 'Absentéisme',
        value: formatPercent(analytics?.attendance.absenteeismBasisPoints ?? 0),
        to: erpMarocPaths.timeAttendance,
      },
      {
        id: 'recruitment',
        label: 'Candidatures',
        value: String(analytics?.recruitment.applications ?? 0),
        to: erpMarocPaths.talent,
      },
      {
        id: 'training',
        label: 'Formations terminées',
        value: formatPercent(analytics?.training.completionBasisPoints ?? 0),
        to: erpMarocPaths.talent,
      },
      {
        id: 'payroll',
        label: 'Coût employeur',
        value: formatMadCents(analytics?.payroll.employerCostCents ?? 0),
        to: erpMarocPaths.payrollRegulatory,
      },
    ],
    [analytics],
  );

  const actionGroups: ErpDashboardActionGroup[] = [
    {
      id: 'employees',
      label: 'Collaborateurs',
      actions: [
        {
          label: 'Dossiers salariés',
          to: erpMarocPaths.hrCore,
          Icon: IconUsers,
        },
        {
          label: 'Temps, présence et congés',
          to: erpMarocPaths.timeAttendance,
          Icon: IconClock,
        },
        {
          label: 'Portail salarié',
          to: erpMarocPaths.employeePortal,
          Icon: IconUsers,
        },
      ],
    },
    {
      id: 'payroll',
      label: 'Paie et conformité',
      actions: [
        {
          label: 'Paie et réglementation',
          to: erpMarocPaths.payrollRegulatory,
          Icon: IconCreditCard,
        },
        {
          label: 'Opérations et campagnes RH',
          to: erpMarocPaths.hrOperations,
          Icon: IconSettings,
        },
      ],
    },
    {
      id: 'talent',
      label: 'Talents',
      actions: [
        {
          label: 'Recrutement, formation et évaluations',
          to: erpMarocPaths.talent,
          Icon: IconUsers,
        },
        {
          label: 'Indicateurs RH détaillés',
          to: `${erpMarocPaths.hrOperations}?view=dashboard`,
          Icon: IconChartBar,
        },
      ],
    },
  ];

  return (
    <ErpSpaceDashboard
      title="Ressources humaines"
      description="Effectifs, paie, temps et développement des talents"
      state={loadState}
      metrics={metrics}
      actionGroups={actionGroups}
      onRetry={() => setGeneration((value) => value + 1)}
    />
  );
};
