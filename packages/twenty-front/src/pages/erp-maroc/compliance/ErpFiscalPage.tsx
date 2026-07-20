import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import {
  downloadTextContent,
  StyledErpWorkspaceContent,
  StyledErpWorkspaceField,
  StyledErpWorkspaceInlineActions,
  StyledErpWorkspaceInput,
  StyledErpWorkspacePanel,
  StyledErpWorkspacePanelTitle,
  StyledErpWorkspaceSelect,
  StyledErpWorkspaceSummary,
  ErpWorkspaceSummaryItem,
  StyledErpWorkspaceTabs,
  StyledErpWorkspaceToolbar,
} from '@/erp-maroc/components/ErpComplianceUi';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useEffect, useState } from 'react';
import {
  erpExerciseListSchema,
  erpFileExportSchema,
  erpFiscalDeadlineListSchema,
  erpFiscalDeadlineSchema,
  erpRegulatoryFileSchema,
  erpRegulatoryListSchema,
  erpRegulatoryObjectSchema,
  erpTaxDeclarationListSchema,
  erpTaxDeclarationSchema,
  type ErpExercise,
  type ErpFiscalDeadline,
  type ErpTaxDeclaration,
} from 'twenty-shared/erp-maroc';
import { IconCheck, IconDownload, IconRefresh } from 'twenty-ui/display';
import { Button, TabButton } from 'twenty-ui/input';

type View = 'declarations' | 'payments' | 'prorata' | 'calendar';

type TvaProrataPeriod = {
  id: string;
  periodKey: string;
  taxableRevenueCents: number;
  totalRevenueCents: number;
  inputVatBeforeProrataCents: number;
  rateBasisPoints: number;
  deductibleVatCents: number;
};

type AnnualTvaProrata = {
  periods: number;
  rateBasisPoints: number;
  deductedVatCents: number;
  annualDeductibleVatCents: number;
  regularizationCents: number;
  direction: 'ADDITIONAL_DEDUCTION' | 'REVERSAL' | 'NONE';
};

type TaxPaymentCandidate = {
  id: string;
  transactionDate: string;
  description: string;
  reference: string | null;
  debitCents: number;
  confidenceBasisPoints: number;
  exactAmount: boolean;
  dayDifference: number;
  statementImport: { originalFilename: string };
};

type TaxPayment = {
  id: string;
  kind: 'TVA' | 'IS_INSTALLMENT' | 'IS_BALANCE' | 'OTHER';
  amountCents: number;
  paymentDate: string;
  reference: string | null;
  bankStatementLine: {
    id: string;
    description: string;
    reference: string | null;
  } | null;
};

const currentMonth = () =>
  new Date().toLocaleDateString('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
  });

const monthBounds = (periodKey: string) => {
  const [year, month] = periodKey.split('-').map(Number);
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start: `${periodKey}-01`, end };
};

const nextDeclarationStatus = (
  status: ErpTaxDeclaration['status'],
): 'REVIEWED' | 'FILED' | 'PAID' | null => {
  if (status === 'DRAFT') return 'REVIEWED';
  if (status === 'REVIEWED') return 'FILED';
  if (status === 'FILED') return 'PAID';
  return null;
};

const nextStatusLabel = (status: ReturnType<typeof nextDeclarationStatus>) => {
  if (status === 'REVIEWED') return 'Valider le contrôle';
  if (status === 'FILED') return 'Marquer déposée';
  if (status === 'PAID') return 'Marquer payée';
  return '';
};

export const ErpFiscalPage = () => {
  const { client, context } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [view, setView] = useState<View>('declarations');
  const [declarations, setDeclarations] = useState<ErpTaxDeclaration[]>([]);
  const [deadlines, setDeadlines] = useState<ErpFiscalDeadline[]>([]);
  const [prorataPeriods, setProrataPeriods] = useState<TvaProrataPeriod[]>([]);
  const [annualProrata, setAnnualProrata] = useState<AnnualTvaProrata | null>(
    null,
  );
  const [taxPaymentCandidates, setTaxPaymentCandidates] = useState<
    TaxPaymentCandidate[]
  >([]);
  const [taxPayments, setTaxPayments] = useState<TaxPayment[]>([]);
  const [exercises, setExercises] = useState<ErpExercise[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [periodKey, setPeriodKey] = useState(currentMonth);
  const [prorataPercent, setProrataPercent] = useState('100');
  const [exerciseId, setExerciseId] = useState('');
  const [filingReference, setFilingReference] = useState('');
  const [taxableRevenueMad, setTaxableRevenueMad] = useState('0');
  const [totalRevenueMad, setTotalRevenueMad] = useState('0');
  const [inputVatMad, setInputVatMad] = useState('0');
  const [reintegrationsMad, setReintegrationsMad] = useState('0');
  const [deductionsMad, setDeductionsMad] = useState('0');
  const [installmentsPaidMad, setInstallmentsPaidMad] = useState('0');
  const [selectedDeclarationId, setSelectedDeclarationId] = useState('');
  const [taxPaymentKind, setTaxPaymentKind] =
    useState<TaxPayment['kind']>('TVA');
  const canManage = context?.role !== 'COMMERCIAL';

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    Promise.all([
      client.request({
        method: 'GET',
        path: '/fiscal/declarations',
        schema: erpTaxDeclarationListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/fiscal/deadlines',
        schema: erpFiscalDeadlineListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/accounting-compliance/exercises',
        schema: erpExerciseListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(([loadedDeclarations, loadedDeadlines, loadedExercises]) => {
        if (abortController.signal.aborted) return;
        setDeclarations(loadedDeclarations);
        setSelectedDeclarationId(
          (current) => current || loadedDeclarations[0]?.id || '',
        );
        setDeadlines(loadedDeadlines);
        setExercises(loadedExercises);
        setExerciseId(
          (current) =>
            current ||
            loadedExercises.find((item) => item.status === 'OPEN')?.id ||
            loadedExercises[0]?.id ||
            '',
        );
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client, generation]);

  useEffect(() => {
    if (!exerciseId) return;
    const abortController = new AbortController();
    client
      .request({
        method: 'GET',
        path: '/fiscal/tva/prorata',
        query: { exerciceId: exerciseId },
        schema: erpRegulatoryListSchema,
        signal: abortController.signal,
      })
      .then(async (loaded) => {
        if (abortController.signal.aborted) return;
        const periods = loaded as unknown as TvaProrataPeriod[];
        setProrataPeriods(periods);
        if (periods.length === 0) {
          setAnnualProrata(null);
          return;
        }
        const annual = await client.request({
          method: 'GET',
          path: '/fiscal/tva/prorata/annual',
          query: { exerciceId: exerciseId },
          schema: erpRegulatoryObjectSchema,
          signal: abortController.signal,
        });
        if (!abortController.signal.aborted) {
          setAnnualProrata(annual as unknown as AnnualTvaProrata);
        }
      })
      .catch(() => {
        if (!abortController.signal.aborted) {
          setProrataPeriods([]);
          setAnnualProrata(null);
        }
      });
    return () => abortController.abort();
  }, [client, exerciseId, generation]);

  useEffect(() => {
    if (!selectedDeclarationId) {
      setTaxPaymentCandidates([]);
      setTaxPayments([]);
      return;
    }
    const declaration = declarations.find(
      (item) => item.id === selectedDeclarationId,
    );
    if (declaration) {
      setTaxPaymentKind(declaration.type === 'TVA' ? 'TVA' : 'IS_BALANCE');
    }
    const abortController = new AbortController();
    Promise.all([
      client.request({
        method: 'GET',
        path: `/fiscal/declarations/${selectedDeclarationId}/payment-candidates`,
        schema: erpRegulatoryListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: `/fiscal/declarations/${selectedDeclarationId}/payments`,
        schema: erpRegulatoryListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(([candidates, payments]) => {
        if (abortController.signal.aborted) return;
        setTaxPaymentCandidates(candidates as unknown as TaxPaymentCandidate[]);
        setTaxPayments(payments as unknown as TaxPayment[]);
      })
      .catch(() => {
        if (abortController.signal.aborted) return;
        setTaxPaymentCandidates([]);
        setTaxPayments([]);
      });
    return () => abortController.abort();
  }, [client, declarations, generation, selectedDeclarationId]);

  const refresh = () => setGeneration((value) => value + 1);

  const calculateTva = async () => {
    const prorata = Number(prorataPercent);
    if (
      !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(periodKey) ||
      prorata < 0 ||
      prorata > 100
    ) {
      enqueueErrorSnackBar({ message: 'Période ou prorata invalide' });
      return;
    }
    const bounds = monthBounds(periodKey);
    setBusyId('tva');
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/fiscal/tva/calculate',
            schema: erpTaxDeclarationSchema,
            body: {
              periodKey,
              periodStart: bounds.start,
              periodEnd: bounds.end,
              prorataBasisPoints: Math.round(prorata * 100),
            },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'Déclaration TVA recalculée' });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Calcul TVA impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const calculateIs = async () => {
    if (exerciseId === '') return;
    setBusyId('is');
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/fiscal/is/calculate',
            schema: erpTaxDeclarationSchema,
            body: {
              exerciceId: exerciseId,
              reintegrationsCents: Math.round(Number(reintegrationsMad) * 100),
              deductionsCents: Math.round(Number(deductionsMad) * 100),
              installmentsPaidCents: Math.round(
                Number(installmentsPaidMad) * 100,
              ),
            },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'IS et acomptes recalculés' });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Calcul IS impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const calculateProrata = async () => {
    const taxableRevenueCents = Math.round(Number(taxableRevenueMad) * 100);
    const totalRevenueCents = Math.round(Number(totalRevenueMad) * 100);
    const inputVatBeforeProrataCents = Math.round(Number(inputVatMad) * 100);
    if (
      !exerciseId ||
      taxableRevenueCents < 0 ||
      totalRevenueCents <= 0 ||
      taxableRevenueCents > totalRevenueCents ||
      inputVatBeforeProrataCents < 0
    ) {
      enqueueErrorSnackBar({ message: 'Données du prorata invalides' });
      return;
    }
    setBusyId('prorata');
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/fiscal/tva/prorata/calculate',
            schema: erpRegulatoryObjectSchema,
            body: {
              exerciceId: exerciseId,
              periodKey,
              taxableRevenueCents,
              totalRevenueCents,
              inputVatBeforeProrataCents,
            },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'Prorata TVA enregistré' });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Calcul du prorata impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const postProrataRegularization = async () => {
    if (!exerciseId) return;
    setBusyId('prorata-post');
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/fiscal/tva/prorata/annual/post',
            schema: erpRegulatoryObjectSchema,
            body: { exerciceId: exerciseId },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({
        message: 'Écriture de régularisation créée en brouillon',
      });
    } catch {
      enqueueErrorSnackBar({ message: 'Régularisation impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const transition = async (declaration: ErpTaxDeclaration) => {
    const status = nextDeclarationStatus(declaration.status);
    if (status === null) return;
    if (status === 'FILED' && filingReference.trim() === '') {
      enqueueErrorSnackBar({
        message: 'La référence de dépôt est obligatoire',
      });
      return;
    }
    setBusyId(declaration.id);
    try {
      await client
        .createMutationIntent(
          {
            method: 'PATCH',
            path: `/fiscal/declarations/${declaration.id}/status`,
            schema: erpTaxDeclarationSchema,
            body: {
              status,
              ...(status === 'FILED'
                ? { filingReference: filingReference.trim() }
                : {}),
            },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'Statut fiscal mis à jour' });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Mise à jour fiscale impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const reconcileTaxPayment = async (candidate: TaxPaymentCandidate) => {
    if (!selectedDeclarationId) return;
    setBusyId(candidate.id);
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: `/fiscal/declarations/${selectedDeclarationId}/payments`,
            schema: erpRegulatoryObjectSchema,
            body: {
              bankStatementLineId: candidate.id,
              kind: taxPaymentKind,
            },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'Paiement fiscal rapproché' });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Rapprochement fiscal impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const exportSimpl = async (declaration: ErpTaxDeclaration) => {
    setBusyId(declaration.id);
    try {
      const file = await client.request({
        method: 'GET',
        path: `/fiscal/declarations/${declaration.id}/simpl`,
        schema: erpFileExportSchema,
      });
      downloadTextContent(file.filename, file.content, file.contentType);
    } catch {
      enqueueErrorSnackBar({
        message:
          'Export SIMPL indisponible. Vérifiez ICE et identifiant fiscal.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const exportAdc080f = async (declaration: ErpTaxDeclaration) => {
    setBusyId(declaration.id);
    try {
      const file = await client.request({
        method: 'GET',
        path: `/fiscal/declarations/${declaration.id}/adc080f`,
        query: { regime: 'ENCAISSEMENT' },
        schema: erpRegulatoryFileSchema,
      });
      if (!file.content) throw new Error('Missing export content');
      downloadTextContent(file.filename, file.content, file.contentType);
      enqueueSuccessSnackBar({
        message: 'ADC080F généré, à valider sur la plateforme DGI',
      });
    } catch {
      enqueueErrorSnackBar({ message: 'Export ADC080F impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const exportIsXml = async (declaration: ErpTaxDeclaration) => {
    setBusyId(declaration.id);
    try {
      const file = await client.request({
        method: 'GET',
        path: `/fiscal/declarations/${declaration.id}/is-xml`,
        schema: erpRegulatoryFileSchema,
      });
      if (!file.content) throw new Error('Missing export content');
      downloadTextContent(file.filename, file.content, file.contentType);
      enqueueSuccessSnackBar({
        message: 'XML IS généré, à valider sur la plateforme DGI',
      });
    } catch {
      enqueueErrorSnackBar({ message: 'Export XML IS impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const seedCalendar = async () => {
    const year = periodKey.slice(0, 4);
    setBusyId('calendar');
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/fiscal/deadlines/seed',
            query: { year },
            schema: erpFiscalDeadlineListSchema,
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'Calendrier fiscal généré' });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Calendrier fiscal indisponible' });
    } finally {
      setBusyId(null);
    }
  };

  const completeDeadline = async (deadline: ErpFiscalDeadline) => {
    setBusyId(deadline.id);
    try {
      await client
        .createMutationIntent(
          {
            method: 'PATCH',
            path: `/fiscal/deadlines/${deadline.id}/complete`,
            schema: erpFiscalDeadlineSchema,
            body: {},
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: "L'échéance n'a pas pu être clôturée" });
    } finally {
      setBusyId(null);
    }
  };

  const declarationColumns: ErpOperationalTableColumn<ErpTaxDeclaration>[] = [
    {
      key: 'type',
      header: 'Impôt',
      width: '80px',
      render: (row) => row.type,
    },
    {
      key: 'period',
      header: 'Période',
      width: '120px',
      render: (row) => row.periodKey,
    },
    {
      key: 'status',
      header: 'Statut',
      width: '120px',
      render: (row) => row.status,
    },
    {
      key: 'base',
      header: 'Base',
      width: '140px',
      align: 'right',
      render: (row) => formatMadCents(row.taxableBaseCents),
    },
    {
      key: 'collected',
      header: 'TVA collectée',
      width: '150px',
      align: 'right',
      render: (row) => formatMadCents(row.collectedTaxCents),
    },
    {
      key: 'deductible',
      header: 'TVA déductible',
      width: '150px',
      align: 'right',
      render: (row) => formatMadCents(row.deductibleTaxCents),
    },
    {
      key: 'due',
      header: 'À payer',
      width: '140px',
      align: 'right',
      render: (row) => formatMadCents(row.taxDueCents),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '300px',
      render: (row) => {
        const next = nextDeclarationStatus(row.status);
        return (
          <StyledErpWorkspaceInlineActions>
            {next === null || !canManage ? null : (
              <Button
                title={nextStatusLabel(next)}
                ariaLabel={nextStatusLabel(next)}
                Icon={IconCheck}
                variant="secondary"
                disabled={busyId !== null}
                onClick={() => void transition(row)}
              />
            )}
            {row.type === 'TVA' ? (
              <>
                <Button
                  title="XML SIMPL"
                  ariaLabel="Télécharger XML SIMPL"
                  Icon={IconDownload}
                  variant="secondary"
                  disabled={busyId !== null}
                  onClick={() => void exportSimpl(row)}
                />
                <Button
                  title="ADC080F"
                  ariaLabel="Télécharger le relevé de déductions ADC080F"
                  Icon={IconDownload}
                  variant="secondary"
                  disabled={busyId !== null}
                  onClick={() => void exportAdc080f(row)}
                />
              </>
            ) : (
              <Button
                title="XML IS"
                ariaLabel="Télécharger la déclaration XML IS"
                Icon={IconDownload}
                variant="secondary"
                disabled={busyId !== null}
                onClick={() => void exportIsXml(row)}
              />
            )}
          </StyledErpWorkspaceInlineActions>
        );
      },
    },
  ];

  const prorataColumns: ErpOperationalTableColumn<TvaProrataPeriod>[] = [
    {
      key: 'period',
      header: 'Période',
      width: '120px',
      render: (row) => row.periodKey,
    },
    {
      key: 'taxable',
      header: 'CA taxable',
      width: '150px',
      align: 'right',
      render: (row) => formatMadCents(row.taxableRevenueCents),
    },
    {
      key: 'total',
      header: 'CA total',
      width: '150px',
      align: 'right',
      render: (row) => formatMadCents(row.totalRevenueCents),
    },
    {
      key: 'rate',
      header: 'Prorata',
      width: '110px',
      align: 'right',
      render: (row) => `${(row.rateBasisPoints / 100).toFixed(0)} %`,
    },
    {
      key: 'input-vat',
      header: 'TVA avant prorata',
      width: '170px',
      align: 'right',
      render: (row) => formatMadCents(row.inputVatBeforeProrataCents),
    },
    {
      key: 'deductible',
      header: 'TVA déduite',
      width: '160px',
      align: 'right',
      render: (row) => formatMadCents(row.deductibleVatCents),
    },
  ];

  const taxPaymentCandidateColumns: ErpOperationalTableColumn<TaxPaymentCandidate>[] =
    [
      {
        key: 'date',
        header: 'Date',
        width: '120px',
        render: (row) => row.transactionDate,
      },
      {
        key: 'description',
        header: 'Libellé bancaire',
        width: '320px',
        render: (row) => row.description,
      },
      {
        key: 'amount',
        header: 'Débit',
        width: '140px',
        align: 'right',
        render: (row) => formatMadCents(row.debitCents),
      },
      {
        key: 'confidence',
        header: 'Correspondance',
        width: '140px',
        align: 'right',
        render: (row) => `${(row.confidenceBasisPoints / 100).toFixed(0)} %`,
      },
      {
        key: 'source',
        header: 'Relevé',
        width: '220px',
        render: (row) => row.statementImport.originalFilename,
      },
      {
        key: 'action',
        header: 'Action',
        width: '150px',
        render: (row) =>
          canManage ? (
            <Button
              title="Rapprocher"
              ariaLabel="Rapprocher ce débit avec la déclaration fiscale"
              Icon={IconCheck}
              variant="secondary"
              disabled={busyId !== null}
              onClick={() => void reconcileTaxPayment(row)}
            />
          ) : null,
      },
    ];

  const taxPaymentColumns: ErpOperationalTableColumn<TaxPayment>[] = [
    {
      key: 'date',
      header: 'Date',
      width: '120px',
      render: (row) => row.paymentDate,
    },
    {
      key: 'kind',
      header: 'Nature',
      width: '150px',
      render: (row) => row.kind,
    },
    {
      key: 'amount',
      header: 'Montant',
      width: '150px',
      align: 'right',
      render: (row) => formatMadCents(row.amountCents),
    },
    {
      key: 'reference',
      header: 'Référence',
      width: '180px',
      render: (row) => row.reference ?? '—',
    },
    {
      key: 'description',
      header: 'Ligne bancaire',
      width: '320px',
      render: (row) => row.bankStatementLine?.description ?? '—',
    },
  ];

  const deadlineColumns: ErpOperationalTableColumn<ErpFiscalDeadline>[] = [
    {
      key: 'due',
      header: 'Échéance',
      width: '120px',
      render: (row) => row.dueDate,
    },
    {
      key: 'category',
      header: 'Catégorie',
      width: '130px',
      render: (row) => row.category,
    },
    {
      key: 'label',
      header: 'Obligation',
      width: '320px',
      render: (row) => row.label,
    },
    {
      key: 'period',
      header: 'Période',
      width: '120px',
      render: (row) => row.periodKey,
    },
    {
      key: 'status',
      header: 'État',
      width: '120px',
      render: (row) => (row.completedAt ? 'Terminée' : 'À faire'),
    },
    {
      key: 'actions',
      header: 'Action',
      width: '180px',
      render: (row) =>
        row.completedAt || !canManage ? null : (
          <Button
            title="Terminer"
            ariaLabel="Marquer l'échéance terminée"
            Icon={IconCheck}
            variant="secondary"
            disabled={busyId !== null}
            onClick={() => void completeDeadline(row)}
          />
        ),
    },
  ];

  const openDeadlines = deadlines.filter(
    (deadline) => deadline.completedAt === null,
  ).length;
  const taxDue = declarations.reduce(
    (sum, declaration) => sum + declaration.taxDueCents,
    0,
  );

  return (
    <ErpPageShell
      title="Fiscalité marocaine"
      description="TVA, IS, échéances et télédéclaration SIMPL"
      actions={
        <Button
          title="Actualiser"
          ariaLabel="Actualiser la fiscalité"
          Icon={IconRefresh}
          variant="secondary"
          onClick={refresh}
        />
      }
      state={state}
      loadingLabel="Chargement des obligations fiscales"
      errorLabel="Impossible de charger la fiscalité"
      onRetry={refresh}
    >
      <StyledErpWorkspaceTabs>
        <TabButton
          id="fiscal-declarations"
          title="Déclarations"
          active={view === 'declarations'}
          onClick={() => setView('declarations')}
        />
        <TabButton
          id="fiscal-prorata"
          title="Prorata TVA"
          active={view === 'prorata'}
          onClick={() => setView('prorata')}
        />
        <TabButton
          id="fiscal-payments"
          title="Paiements"
          active={view === 'payments'}
          onClick={() => setView('payments')}
        />
        <TabButton
          id="fiscal-calendar"
          title="Calendrier"
          active={view === 'calendar'}
          onClick={() => setView('calendar')}
        />
      </StyledErpWorkspaceTabs>
      <StyledErpWorkspaceSummary>
        <ErpWorkspaceSummaryItem
          label="Déclarations"
          value={declarations.length}
        />
        <ErpWorkspaceSummaryItem
          label="Impôts à payer"
          value={formatMadCents(taxDue)}
        />
        <ErpWorkspaceSummaryItem
          label="Échéances ouvertes"
          value={openDeadlines}
        />
        {view === 'prorata' ? (
          <>
            <ErpWorkspaceSummaryItem
              label="Prorata annuel"
              value={
                annualProrata
                  ? `${(annualProrata.rateBasisPoints / 100).toFixed(0)} %`
                  : '—'
              }
            />
            <ErpWorkspaceSummaryItem
              label="Régularisation"
              value={
                annualProrata
                  ? formatMadCents(annualProrata.regularizationCents)
                  : '—'
              }
            />
          </>
        ) : null}
      </StyledErpWorkspaceSummary>
      <StyledErpWorkspaceToolbar>
        <StyledErpWorkspaceField>
          Période
          <StyledErpWorkspaceInput
            type="month"
            value={periodKey}
            onChange={(event) => setPeriodKey(event.target.value)}
          />
        </StyledErpWorkspaceField>
        {view === 'declarations' ? (
          <>
            <StyledErpWorkspaceField>
              Prorata TVA (%)
              <StyledErpWorkspaceInput
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={prorataPercent}
                onChange={(event) => setProrataPercent(event.target.value)}
              />
            </StyledErpWorkspaceField>
            <Button
              title="Calculer TVA"
              ariaLabel="Calculer la TVA"
              variant="primary"
              disabled={!canManage || busyId !== null}
              onClick={() => void calculateTva()}
            />
            <StyledErpWorkspaceField>
              Exercice IS
              <StyledErpWorkspaceSelect
                value={exerciseId}
                onChange={(event) => setExerciseId(event.target.value)}
              >
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.annee}
                  </option>
                ))}
              </StyledErpWorkspaceSelect>
            </StyledErpWorkspaceField>
            <Button
              title="Calculer IS"
              ariaLabel="Calculer l'IS"
              variant="secondary"
              disabled={!canManage || busyId !== null || exerciseId === ''}
              onClick={() => void calculateIs()}
            />
            <StyledErpWorkspaceField>
              Réintégrations IS
              <StyledErpWorkspaceInput
                type="number"
                min="0"
                value={reintegrationsMad}
                onChange={(event) => setReintegrationsMad(event.target.value)}
              />
            </StyledErpWorkspaceField>
            <StyledErpWorkspaceField>
              Déductions IS
              <StyledErpWorkspaceInput
                type="number"
                min="0"
                value={deductionsMad}
                onChange={(event) => setDeductionsMad(event.target.value)}
              />
            </StyledErpWorkspaceField>
            <StyledErpWorkspaceField>
              Acomptes versés
              <StyledErpWorkspaceInput
                type="number"
                min="0"
                value={installmentsPaidMad}
                onChange={(event) => setInstallmentsPaidMad(event.target.value)}
              />
            </StyledErpWorkspaceField>
            <StyledErpWorkspaceField>
              Référence de dépôt
              <StyledErpWorkspaceInput
                value={filingReference}
                onChange={(event) => setFilingReference(event.target.value)}
              />
            </StyledErpWorkspaceField>
          </>
        ) : view === 'payments' ? (
          <>
            <StyledErpWorkspaceField>
              Déclaration
              <StyledErpWorkspaceSelect
                value={selectedDeclarationId}
                onChange={(event) =>
                  setSelectedDeclarationId(event.target.value)
                }
              >
                {declarations
                  .filter((declaration) => declaration.status !== 'CANCELLED')
                  .map((declaration) => (
                    <option key={declaration.id} value={declaration.id}>
                      {declaration.type} · {declaration.periodKey} ·{' '}
                      {formatMadCents(declaration.taxDueCents)}
                    </option>
                  ))}
              </StyledErpWorkspaceSelect>
            </StyledErpWorkspaceField>
            <StyledErpWorkspaceField>
              Nature du paiement
              <StyledErpWorkspaceSelect
                value={taxPaymentKind}
                onChange={(event) =>
                  setTaxPaymentKind(event.target.value as TaxPayment['kind'])
                }
              >
                <option value="TVA">TVA</option>
                <option value="IS_INSTALLMENT">Acompte IS</option>
                <option value="IS_BALANCE">Solde IS</option>
                <option value="OTHER">Autre impôt</option>
              </StyledErpWorkspaceSelect>
            </StyledErpWorkspaceField>
          </>
        ) : view === 'prorata' ? (
          <>
            <StyledErpWorkspaceField>
              Exercice
              <StyledErpWorkspaceSelect
                value={exerciseId}
                onChange={(event) => setExerciseId(event.target.value)}
              >
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.annee}
                  </option>
                ))}
              </StyledErpWorkspaceSelect>
            </StyledErpWorkspaceField>
            <StyledErpWorkspaceField>
              CA taxable
              <StyledErpWorkspaceInput
                type="number"
                min="0"
                value={taxableRevenueMad}
                onChange={(event) => setTaxableRevenueMad(event.target.value)}
              />
            </StyledErpWorkspaceField>
            <StyledErpWorkspaceField>
              CA total
              <StyledErpWorkspaceInput
                type="number"
                min="0"
                value={totalRevenueMad}
                onChange={(event) => setTotalRevenueMad(event.target.value)}
              />
            </StyledErpWorkspaceField>
            <StyledErpWorkspaceField>
              TVA avant prorata
              <StyledErpWorkspaceInput
                type="number"
                min="0"
                value={inputVatMad}
                onChange={(event) => setInputVatMad(event.target.value)}
              />
            </StyledErpWorkspaceField>
            <Button
              title="Enregistrer"
              ariaLabel="Calculer et enregistrer le prorata"
              variant="primary"
              disabled={!canManage || busyId !== null}
              onClick={() => void calculateProrata()}
            />
            <Button
              title="Créer l'écriture"
              ariaLabel="Créer l'écriture annuelle de régularisation TVA"
              variant="secondary"
              disabled={
                !canManage ||
                busyId !== null ||
                !annualProrata ||
                annualProrata.regularizationCents === 0
              }
              onClick={() => void postProrataRegularization()}
            />
          </>
        ) : (
          <Button
            title="Générer l'année"
            ariaLabel="Générer le calendrier fiscal"
            variant="primary"
            disabled={!canManage || busyId !== null}
            onClick={() => void seedCalendar()}
          />
        )}
      </StyledErpWorkspaceToolbar>
      <StyledErpWorkspaceContent>
        {view === 'declarations' ? (
          <ErpOperationalTable
            ariaLabel="Déclarations fiscales"
            columns={declarationColumns}
            rows={declarations}
            getRowKey={(row) => row.id}
            emptyLabel="Aucune déclaration calculée"
          />
        ) : view === 'payments' ? (
          <>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Débits bancaires proposés
              </StyledErpWorkspacePanelTitle>
              <ErpOperationalTable
                ariaLabel="Débits bancaires candidats"
                columns={taxPaymentCandidateColumns}
                rows={taxPaymentCandidates}
                getRowKey={(row) => row.id}
                emptyLabel="Aucun débit bancaire disponible"
              />
            </StyledErpWorkspacePanel>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Paiements rapprochés
              </StyledErpWorkspacePanelTitle>
              <ErpOperationalTable
                ariaLabel="Paiements fiscaux rapprochés"
                columns={taxPaymentColumns}
                rows={taxPayments}
                getRowKey={(row) => row.id}
                emptyLabel="Aucun paiement rapproché"
              />
            </StyledErpWorkspacePanel>
          </>
        ) : view === 'prorata' ? (
          <ErpOperationalTable
            ariaLabel="Historique du prorata TVA"
            columns={prorataColumns}
            rows={prorataPeriods}
            getRowKey={(row) => row.id}
            emptyLabel="Aucune période de prorata calculée"
          />
        ) : (
          <ErpOperationalTable
            ariaLabel="Calendrier fiscal"
            columns={deadlineColumns}
            rows={deadlines}
            getRowKey={(row) => row.id}
            emptyLabel="Calendrier fiscal non généré"
          />
        )}
      </StyledErpWorkspaceContent>
    </ErpPageShell>
  );
};
