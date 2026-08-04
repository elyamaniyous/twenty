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
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  erpAnnualTvaProrataSchema,
  erpExerciseListSchema,
  erpFileExportSchema,
  erpFiscalDeadlineListSchema,
  erpFiscalDeadlineSchema,
  erpTaxDeclarationListSchema,
  erpTaxDeclarationSchema,
  erpTaxPaymentCandidateListSchema,
  erpTaxPaymentListSchema,
  erpTaxPaymentSchema,
  erpTvaProrataPeriodListSchema,
  erpTvaProrataPeriodSchema,
  erpTvaProrataPostingSchema,
  type ErpAnnualTvaProrata,
  type ErpExercise,
  type ErpFiscalDeadline,
  type ErpTaxDeclaration,
  type ErpTaxPayment,
  type ErpTaxPaymentCandidate,
  type ErpTvaProrataPeriod,
} from 'twenty-shared/erp-maroc';
import {
  IconCalendarEvent,
  IconCheck,
  IconDownload,
  IconFileText,
  IconLink,
  IconPlus,
  IconRefresh,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type View = 'declarations' | 'prorata' | 'deadlines';
type Calculation = 'TVA' | 'IS';
type FileExport = {
  filename: string;
  contentType: string;
  content: string;
};

const declarationAppearance: Record<
  ErpTaxDeclaration['status'],
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  REVIEWED: { label: 'Validée', tone: 'info' },
  FILED: { label: 'Déposée', tone: 'warning' },
  PAID: { label: 'Payée', tone: 'success' },
  CANCELLED: { label: 'Annulée', tone: 'danger' },
};

const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  min-height: 44px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledToolbarGroup = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
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
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${({ active }) =>
    active
      ? themeCssVariables.font.weight.semiBold
      : themeCssVariables.font.weight.regular};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledMetrics = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(4, minmax(140px, 1fr));
  overflow-x: auto;
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 140px;
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

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const StyledSplit = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const StyledForm = styled.form`
  align-content: start;
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: ${themeCssVariables.spacing[3]};

  & + & {
    border-left: 1px solid ${themeCssVariables.border.color.light};
  }

  @media (max-width: 900px) {
    & + & {
      border-left: 0;
      border-top: 1px solid ${themeCssVariables.border.color.light};
    }
  }
`;

const StyledFormTitle = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  grid-column: 1 / -1;
  letter-spacing: 0;
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

const StyledFormActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  grid-column: 1 / -1;
  justify-content: flex-end;
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
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledDetail = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
`;

const StyledDetailHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  min-height: 42px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledDetailBody = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  max-height: 260px;
  min-height: 150px;

  & > * + * {
    border-left: 1px solid ${themeCssVariables.border.color.light};
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    max-height: 420px;

    & > * + * {
      border-left: 0;
      border-top: 1px solid ${themeCssVariables.border.color.light};
    }
  }
`;

const toCents = (value: string) => {
  const amount = Number(value.replace(',', '.'));
  return Number.isFinite(amount) && amount >= 0
    ? Math.round(amount * 100)
    : null;
};

const formatRate = (basisPoints: number) =>
  `${(basisPoints / 100).toLocaleString('fr-FR', {
    maximumFractionDigits: 2,
  })} %`;

const saveExport = (file: FileExport) => {
  const url = URL.createObjectURL(
    new Blob([file.content], { type: file.contentType }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const ErpFiscalPage = () => {
  const { client, context } = useErpMarocContext();
  const [view, setView] = useState<View>('declarations');
  const [calculation, setCalculation] = useState<Calculation>('TVA');
  const [declarations, setDeclarations] = useState<ErpTaxDeclaration[]>([]);
  const [exercises, setExercises] = useState<ErpExercise[]>([]);
  const [deadlines, setDeadlines] = useState<ErpFiscalDeadline[]>([]);
  const [pageState, setPageState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [generation, setGeneration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    danger: boolean;
  } | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [selectedDeclarationId, setSelectedDeclarationId] = useState('');
  const [filingReference, setFilingReference] = useState('');
  const [paymentKind, setPaymentKind] = useState<ErpTaxPayment['kind']>('TVA');
  const [payments, setPayments] = useState<ErpTaxPayment[]>([]);
  const [paymentCandidates, setPaymentCandidates] = useState<
    ErpTaxPaymentCandidate[]
  >([]);
  const [paymentState, setPaymentState] = useState<
    'idle' | 'loading' | 'ready'
  >('idle');
  const [prorataPeriods, setProrataPeriods] = useState<ErpTvaProrataPeriod[]>(
    [],
  );
  const [annualProrata, setAnnualProrata] =
    useState<ErpAnnualTvaProrata | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const firstDay = `${currentYear}-${currentMonth}-01`;
  const lastDay = new Date(Date.UTC(currentYear, now.getMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);

  const [tvaPeriodKey, setTvaPeriodKey] = useState(
    `${currentYear}-${currentMonth}`,
  );
  const [tvaStart, setTvaStart] = useState(firstDay);
  const [tvaEnd, setTvaEnd] = useState(lastDay);
  const [tvaProrata, setTvaProrata] = useState('100');
  const [tvaCredit, setTvaCredit] = useState('');
  const [isReintegrations, setIsReintegrations] = useState('0');
  const [isDeductions, setIsDeductions] = useState('0');
  const [isInstallments, setIsInstallments] = useState('0');
  const [isPreviousTax, setIsPreviousTax] = useState('0');
  const [prorataPeriodKey, setProrataPeriodKey] = useState(
    `${currentYear}-${currentMonth}`,
  );
  const [taxableRevenue, setTaxableRevenue] = useState('0');
  const [totalRevenue, setTotalRevenue] = useState('0');
  const [inputVat, setInputVat] = useState('0');
  const [deadlineYear, setDeadlineYear] = useState(String(currentYear));

  const canAccount =
    context?.role === 'OWNER' ||
    context?.role === 'ADMIN' ||
    context?.role === 'COMPTABLE';

  const notify = useCallback((text: string, danger = false) => {
    setMessage({ text, danger });
  }, []);

  const load = useCallback(() => {
    let active = true;
    setPageState('loading');
    void Promise.all([
      client.request({
        method: 'GET',
        path: '/fiscal/declarations',
        schema: erpTaxDeclarationListSchema,
      }),
      client.request({
        method: 'GET',
        path: '/accounting-compliance/exercises',
        schema: erpExerciseListSchema,
      }),
      client.request({
        method: 'GET',
        path: '/fiscal/deadlines',
        schema: erpFiscalDeadlineListSchema,
      }),
    ])
      .then(([nextDeclarations, nextExercises, nextDeadlines]) => {
        if (!active) return;
        setDeclarations(nextDeclarations);
        setExercises(nextExercises);
        setDeadlines(nextDeadlines);
        setSelectedExerciseId(
          (current) => current || nextExercises[0]?.id || '',
        );
        setSelectedDeclarationId((current) =>
          nextDeclarations.some(({ id }) => id === current)
            ? current
            : nextDeclarations[0]?.id || '',
        );
        setPageState('ready');
      })
      .catch(() => {
        if (active) setPageState('error');
      });
    return () => {
      active = false;
    };
  }, [client]);

  useEffect(() => load(), [generation, load]);

  useEffect(() => {
    if (!selectedDeclarationId) {
      setPayments([]);
      setPaymentCandidates([]);
      setPaymentState('idle');
      return;
    }
    let active = true;
    setPaymentState('loading');
    void Promise.all([
      client.request({
        method: 'GET',
        path: `/fiscal/declarations/${selectedDeclarationId}/payments`,
        schema: erpTaxPaymentListSchema,
      }),
      client.request({
        method: 'GET',
        path: `/fiscal/declarations/${selectedDeclarationId}/payment-candidates`,
        schema: erpTaxPaymentCandidateListSchema,
      }),
    ])
      .then(([nextPayments, nextCandidates]) => {
        if (!active) return;
        setPayments(nextPayments);
        setPaymentCandidates(nextCandidates);
        setPaymentState('ready');
      })
      .catch(() => {
        if (active) setPaymentState('ready');
      });
    return () => {
      active = false;
    };
  }, [client, generation, selectedDeclarationId]);

  useEffect(() => {
    if (!selectedExerciseId) {
      setProrataPeriods([]);
      setAnnualProrata(null);
      return;
    }
    let active = true;
    void client
      .request({
        method: 'GET',
        path: '/fiscal/tva/prorata',
        query: { exerciceId: selectedExerciseId },
        schema: erpTvaProrataPeriodListSchema,
      })
      .then(async (periods) => {
        if (!active) return;
        setProrataPeriods(periods);
        if (periods.length === 0) {
          setAnnualProrata(null);
          return;
        }
        const annual = await client.request({
          method: 'GET',
          path: '/fiscal/tva/prorata/annual',
          query: { exerciceId: selectedExerciseId },
          schema: erpAnnualTvaProrataSchema,
        });
        if (active) setAnnualProrata(annual);
      })
      .catch(() => {
        if (active) {
          setProrataPeriods([]);
          setAnnualProrata(null);
        }
      });
    return () => {
      active = false;
    };
  }, [client, generation, selectedExerciseId]);

  const selectedDeclaration =
    declarations.find(({ id }) => id === selectedDeclarationId) ?? null;

  useEffect(() => {
    setPaymentKind(selectedDeclaration?.type === 'IS' ? 'IS_BALANCE' : 'TVA');
    setFilingReference(selectedDeclaration?.filingReference ?? '');
  }, [selectedDeclaration]);

  const calculateTva = async (event: FormEvent) => {
    event.preventDefault();
    const prorataBasisPoints = Math.round(
      Number(tvaProrata.replace(',', '.')) * 100,
    );
    const previousCreditCents =
      tvaCredit.trim() === '' ? undefined : toCents(tvaCredit);
    if (
      !tvaPeriodKey.trim() ||
      !tvaStart ||
      !tvaEnd ||
      tvaStart > tvaEnd ||
      !Number.isInteger(prorataBasisPoints) ||
      prorataBasisPoints < 0 ||
      prorataBasisPoints > 10_000 ||
      previousCreditCents === null
    ) {
      notify('Période TVA ou montants invalides.', true);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/fiscal/tva/calculate',
          body: {
            periodKey: tvaPeriodKey.trim(),
            periodStart: tvaStart,
            periodEnd: tvaEnd,
            prorataBasisPoints,
            ...(previousCreditCents === undefined
              ? {}
              : { previousCreditCents }),
          },
          schema: erpTaxDeclarationSchema,
        },
        { idempotency: 'required' },
      );
      const result = await intent.execute();
      setSelectedDeclarationId(result.id);
      setGeneration((value) => value + 1);
      notify('Déclaration TVA recalculée.');
    } catch {
      notify('Le calcul de TVA a échoué.', true);
    } finally {
      setBusy(false);
    }
  };

  const calculateIs = async (event: FormEvent) => {
    event.preventDefault();
    const values = [
      isReintegrations,
      isDeductions,
      isInstallments,
      isPreviousTax,
    ].map(toCents);
    if (!selectedExerciseId || values.some((value) => value === null)) {
      notify("Exercice ou montants d'IS invalides.", true);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/fiscal/is/calculate',
          body: {
            exerciceId: selectedExerciseId,
            reintegrationsCents: values[0],
            deductionsCents: values[1],
            installmentsPaidCents: values[2],
            previousAnnualTaxCents: values[3],
          },
          schema: erpTaxDeclarationSchema,
        },
        { idempotency: 'required' },
      );
      const result = await intent.execute();
      setSelectedDeclarationId(result.id);
      setGeneration((value) => value + 1);
      notify("Déclaration d'IS recalculée.");
    } catch {
      notify("Le calcul de l'IS a échoué.", true);
    } finally {
      setBusy(false);
    }
  };

  const transitionDeclaration = async (
    declaration: ErpTaxDeclaration,
    status: 'REVIEWED' | 'FILED',
  ) => {
    if (status === 'FILED' && !filingReference.trim()) {
      notify('La référence de dépôt est obligatoire.', true);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'PATCH',
          path: `/fiscal/declarations/${declaration.id}/status`,
          body: {
            status,
            ...(status === 'FILED'
              ? { filingReference: filingReference.trim() }
              : {}),
          },
          schema: erpTaxDeclarationSchema,
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setGeneration((value) => value + 1);
      notify(
        status === 'FILED'
          ? 'Dépôt fiscal enregistré.'
          : 'Déclaration validée.',
      );
    } catch {
      notify('Le changement de statut a échoué.', true);
    } finally {
      setBusy(false);
    }
  };

  const exportDeclaration = async (
    declaration: ErpTaxDeclaration,
    kind: 'simpl' | 'adc080f' | 'is-xml',
  ) => {
    setBusy(true);
    setMessage(null);
    try {
      const file = await client.request({
        method: 'GET',
        path: `/fiscal/declarations/${declaration.id}/${kind}`,
        ...(kind === 'adc080f' ? { query: { regime: 'DEBIT' } } : {}),
        schema: erpFileExportSchema,
      });
      saveExport(file);
      notify(`${file.filename} généré.`);
    } catch {
      notify("L'export réglementaire a échoué.", true);
    } finally {
      setBusy(false);
    }
  };

  const reconcilePayment = async (candidate: ErpTaxPaymentCandidate) => {
    if (!selectedDeclaration) return;
    setBusy(true);
    setMessage(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/fiscal/declarations/${selectedDeclaration.id}/payments`,
          body: {
            bankStatementLineId: candidate.id,
            kind: paymentKind,
            amountCents: candidate.debitCents,
            reference: candidate.reference,
          },
          schema: erpTaxPaymentSchema,
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setGeneration((value) => value + 1);
      notify('Paiement fiscal rapproché avec le relevé bancaire.');
    } catch {
      notify('Le rapprochement fiscal a échoué.', true);
    } finally {
      setBusy(false);
    }
  };

  const calculateProrata = async (event: FormEvent) => {
    event.preventDefault();
    const taxableRevenueCents = toCents(taxableRevenue);
    const totalRevenueCents = toCents(totalRevenue);
    const inputVatBeforeProrataCents = toCents(inputVat);
    if (
      !selectedExerciseId ||
      !prorataPeriodKey.trim() ||
      taxableRevenueCents === null ||
      totalRevenueCents === null ||
      totalRevenueCents === 0 ||
      inputVatBeforeProrataCents === null ||
      taxableRevenueCents > totalRevenueCents
    ) {
      notify('Base de prorata invalide.', true);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/fiscal/tva/prorata/calculate',
          body: {
            exerciceId: selectedExerciseId,
            periodKey: prorataPeriodKey.trim(),
            taxableRevenueCents,
            totalRevenueCents,
            inputVatBeforeProrataCents,
          },
          schema: erpTvaProrataPeriodSchema,
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setGeneration((value) => value + 1);
      notify('Prorata TVA calculé.');
    } catch {
      notify('Le calcul du prorata a échoué.', true);
    } finally {
      setBusy(false);
    }
  };

  const postAnnualProrata = async () => {
    if (!selectedExerciseId) return;
    setBusy(true);
    setMessage(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/fiscal/tva/prorata/annual/post',
          body: { exerciceId: selectedExerciseId },
          schema: erpTvaProrataPostingSchema,
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      notify('Écriture de régularisation annuelle créée.');
    } catch {
      notify("L'écriture de régularisation n'a pas pu être créée.", true);
    } finally {
      setBusy(false);
    }
  };

  const seedDeadlines = async () => {
    if (!/^(?:20\d{2}|21\d{2}|2200)$/.test(deadlineYear)) {
      notify('Année fiscale invalide.', true);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/fiscal/deadlines/seed',
          query: { year: deadlineYear },
          schema: erpFiscalDeadlineListSchema,
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setGeneration((value) => value + 1);
      notify('Calendrier fiscal généré.');
    } catch {
      notify('La génération du calendrier a échoué.', true);
    } finally {
      setBusy(false);
    }
  };

  const completeDeadline = async (deadline: ErpFiscalDeadline) => {
    setBusy(true);
    setMessage(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'PATCH',
          path: `/fiscal/deadlines/${deadline.id}/complete`,
          body: {},
          schema: erpFiscalDeadlineSchema,
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setGeneration((value) => value + 1);
      notify('Échéance marquée comme réalisée.');
    } catch {
      notify("La mise à jour de l'échéance a échoué.", true);
    } finally {
      setBusy(false);
    }
  };

  const declarationColumns = useMemo<
    ErpOperationalTableColumn<ErpTaxDeclaration>[]
  >(
    () => [
      {
        key: 'type',
        header: 'Impôt',
        width: '80px',
        render: (declaration) => declaration.type,
      },
      {
        key: 'period',
        header: 'Période',
        width: '140px',
        render: (declaration) => declaration.periodKey,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '130px',
        render: (declaration) => (
          <ErpStatusBadge
            label={declarationAppearance[declaration.status].label}
            tone={declarationAppearance[declaration.status].tone}
          />
        ),
      },
      {
        key: 'base',
        header: 'Base fiscale',
        width: '150px',
        align: 'right',
        render: (declaration) => formatMadCents(declaration.taxableBaseCents),
      },
      {
        key: 'collected',
        header: 'TVA collectée',
        width: '150px',
        align: 'right',
        render: (declaration) =>
          declaration.type === 'TVA'
            ? formatMadCents(declaration.collectedTaxCents)
            : '—',
      },
      {
        key: 'deductible',
        header: 'TVA déductible',
        width: '150px',
        align: 'right',
        render: (declaration) =>
          declaration.type === 'TVA'
            ? formatMadCents(declaration.deductibleTaxCents)
            : '—',
      },
      {
        key: 'due',
        header: 'Net à payer',
        width: '150px',
        align: 'right',
        render: (declaration) => formatMadCents(declaration.taxDueCents),
      },
      {
        key: 'dueDate',
        header: 'Échéance',
        width: '120px',
        render: (declaration) => declaration.dueDate,
      },
      {
        key: 'action',
        header: '',
        width: '70px',
        render: (declaration) => (
          <Button
            title="Ouvrir"
            ariaLabel={`Ouvrir la déclaration ${declaration.periodKey}`}
            Icon={IconFileText}
            variant="secondary"
            onClick={() => setSelectedDeclarationId(declaration.id)}
          />
        ),
      },
    ],
    [],
  );

  const paymentColumns = useMemo<ErpOperationalTableColumn<ErpTaxPayment>[]>(
    () => [
      {
        key: 'date',
        header: 'Date',
        width: '110px',
        render: (payment) => payment.paymentDate,
      },
      {
        key: 'kind',
        header: 'Nature',
        width: '130px',
        render: (payment) => payment.kind,
      },
      {
        key: 'reference',
        header: 'Référence',
        width: '180px',
        render: (payment) => payment.reference ?? '—',
      },
      {
        key: 'amount',
        header: 'Montant',
        width: '130px',
        align: 'right',
        render: (payment) => formatMadCents(payment.amountCents),
      },
    ],
    [],
  );

  const candidateColumns = useMemo<
    ErpOperationalTableColumn<ErpTaxPaymentCandidate>[]
  >(
    () => [
      {
        key: 'date',
        header: 'Date',
        width: '110px',
        render: (candidate) => candidate.transactionDate,
      },
      {
        key: 'description',
        header: 'Libellé bancaire',
        width: '260px',
        render: (candidate) => candidate.description,
      },
      {
        key: 'amount',
        header: 'Débit',
        width: '130px',
        align: 'right',
        render: (candidate) => formatMadCents(candidate.debitCents),
      },
      {
        key: 'score',
        header: 'Confiance',
        width: '100px',
        render: (candidate) => formatRate(candidate.confidenceBasisPoints),
      },
      {
        key: 'action',
        header: '',
        width: '70px',
        render: (candidate) => (
          <Button
            title="Rapprocher"
            ariaLabel={`Rapprocher ${candidate.description}`}
            Icon={IconLink}
            variant="secondary"
            disabled={!canAccount || busy}
            onClick={() => void reconcilePayment(candidate)}
          />
        ),
      },
    ],
    [busy, canAccount, paymentKind, selectedDeclarationId],
  );

  const prorataColumns = useMemo<
    ErpOperationalTableColumn<ErpTvaProrataPeriod>[]
  >(
    () => [
      {
        key: 'period',
        header: 'Période',
        width: '130px',
        render: (period) => period.periodKey,
      },
      {
        key: 'taxable',
        header: 'CA taxable',
        width: '160px',
        align: 'right',
        render: (period) => formatMadCents(period.taxableRevenueCents),
      },
      {
        key: 'total',
        header: 'CA total',
        width: '160px',
        align: 'right',
        render: (period) => formatMadCents(period.totalRevenueCents),
      },
      {
        key: 'rate',
        header: 'Prorata',
        width: '110px',
        render: (period) => formatRate(period.rateBasisPoints),
      },
      {
        key: 'inputVat',
        header: 'TVA avant prorata',
        width: '170px',
        align: 'right',
        render: (period) => formatMadCents(period.inputVatBeforeProrataCents),
      },
      {
        key: 'deductible',
        header: 'TVA déductible',
        width: '170px',
        align: 'right',
        render: (period) => formatMadCents(period.deductibleVatCents),
      },
    ],
    [],
  );

  const deadlineColumns = useMemo<
    ErpOperationalTableColumn<ErpFiscalDeadline>[]
  >(
    () => [
      {
        key: 'category',
        header: 'Catégorie',
        width: '130px',
        render: (deadline) => deadline.category,
      },
      {
        key: 'label',
        header: 'Échéance fiscale',
        width: '360px',
        render: (deadline) => deadline.label,
      },
      {
        key: 'period',
        header: 'Période',
        width: '120px',
        render: (deadline) => deadline.periodKey,
      },
      {
        key: 'date',
        header: 'Date limite',
        width: '120px',
        render: (deadline) => deadline.dueDate,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '130px',
        render: (deadline) => (
          <ErpStatusBadge
            label={deadline.completedAt ? 'Réalisée' : 'À traiter'}
            tone={deadline.completedAt ? 'success' : 'warning'}
          />
        ),
      },
      {
        key: 'action',
        header: '',
        width: '70px',
        render: (deadline) =>
          deadline.completedAt ? null : (
            <Button
              title="Terminer"
              ariaLabel={`Terminer ${deadline.label}`}
              Icon={IconCheck}
              variant="secondary"
              disabled={!canAccount || busy}
              onClick={() => void completeDeadline(deadline)}
            />
          ),
      },
    ],
    [busy, canAccount],
  );

  const openDeadlines = deadlines.filter(
    ({ completedAt }) => !completedAt,
  ).length;
  const taxDue = declarations
    .filter(({ status }) => status !== 'CANCELLED')
    .reduce((sum, declaration) => sum + declaration.taxDueCents, 0);
  const taxCredit = declarations
    .filter(({ status }) => status !== 'CANCELLED')
    .reduce((sum, declaration) => sum + declaration.taxCreditCents, 0);

  return (
    <ErpPageShell
      title="Fiscalité marocaine"
      state={pageState}
      loadingLabel="Chargement des données fiscales"
      errorLabel="Impossible de charger la fiscalité"
      onRetry={() => setGeneration((value) => value + 1)}
      actions={
        <Button
          title="Actualiser"
          ariaLabel="Actualiser la fiscalité"
          Icon={IconRefresh}
          variant="secondary"
          disabled={busy}
          onClick={() => setGeneration((value) => value + 1)}
        />
      }
    >
      {message === null ? null : (
        <StyledNotice danger={message.danger}>{message.text}</StyledNotice>
      )}
      <StyledToolbar>
        <StyledToolbarGroup>
          <StyledSelect
            aria-label="Exercice comptable"
            value={selectedExerciseId}
            onChange={(event) => setSelectedExerciseId(event.target.value)}
          >
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.annee} · {exercise.status}
              </option>
            ))}
          </StyledSelect>
        </StyledToolbarGroup>
        <StyledTabs role="tablist" aria-label="Vues fiscales">
          {(
            [
              ['declarations', 'Déclarations'],
              ['prorata', 'Prorata TVA'],
              ['deadlines', 'Échéances'],
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
      </StyledToolbar>
      <StyledMetrics>
        <StyledMetric>
          <StyledMetricLabel>Déclarations actives</StyledMetricLabel>
          <StyledMetricValue>
            {declarations.filter(({ status }) => status !== 'CANCELLED').length}
          </StyledMetricValue>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricLabel>Impôts à payer</StyledMetricLabel>
          <StyledMetricValue>{formatMadCents(taxDue)}</StyledMetricValue>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricLabel>Crédits fiscaux</StyledMetricLabel>
          <StyledMetricValue>{formatMadCents(taxCredit)}</StyledMetricValue>
        </StyledMetric>
        <StyledMetric>
          <StyledMetricLabel>Échéances ouvertes</StyledMetricLabel>
          <StyledMetricValue>{openDeadlines}</StyledMetricValue>
        </StyledMetric>
      </StyledMetrics>
      <StyledContent>
        {view === 'declarations' ? (
          <>
            <StyledToolbar>
              <StyledTabs role="tablist" aria-label="Calcul fiscal">
                {(['TVA', 'IS'] as const).map((kind) => (
                  <StyledTab
                    key={kind}
                    type="button"
                    role="tab"
                    active={calculation === kind}
                    aria-selected={calculation === kind}
                    onClick={() => setCalculation(kind)}
                  >
                    {kind}
                  </StyledTab>
                ))}
              </StyledTabs>
            </StyledToolbar>
            {calculation === 'TVA' ? (
              <StyledForm onSubmit={calculateTva}>
                <StyledFormTitle>Calcul TVA</StyledFormTitle>
                <StyledInput
                  aria-label="Clé de période TVA"
                  placeholder="2026-07"
                  value={tvaPeriodKey}
                  onChange={(event) => setTvaPeriodKey(event.target.value)}
                />
                <StyledInput
                  aria-label="Prorata TVA en pourcentage"
                  inputMode="decimal"
                  placeholder="Prorata %"
                  value={tvaProrata}
                  onChange={(event) => setTvaProrata(event.target.value)}
                />
                <StyledInput
                  aria-label="Début de période TVA"
                  type="date"
                  value={tvaStart}
                  onChange={(event) => setTvaStart(event.target.value)}
                />
                <StyledInput
                  aria-label="Fin de période TVA"
                  type="date"
                  value={tvaEnd}
                  onChange={(event) => setTvaEnd(event.target.value)}
                />
                <StyledInput
                  aria-label="Crédit TVA antérieur"
                  inputMode="decimal"
                  placeholder="Crédit antérieur MAD (automatique si vide)"
                  value={tvaCredit}
                  onChange={(event) => setTvaCredit(event.target.value)}
                />
                <StyledFormActions>
                  <Button
                    type="submit"
                    title="Calculer"
                    ariaLabel="Calculer la déclaration TVA"
                    Icon={IconPlus}
                    accent="blue"
                    disabled={!canAccount || busy}
                  />
                </StyledFormActions>
              </StyledForm>
            ) : (
              <StyledForm onSubmit={calculateIs}>
                <StyledFormTitle>Calcul IS</StyledFormTitle>
                <StyledInput
                  aria-label="Réintégrations fiscales"
                  inputMode="decimal"
                  placeholder="Réintégrations MAD"
                  value={isReintegrations}
                  onChange={(event) => setIsReintegrations(event.target.value)}
                />
                <StyledInput
                  aria-label="Déductions fiscales"
                  inputMode="decimal"
                  placeholder="Déductions MAD"
                  value={isDeductions}
                  onChange={(event) => setIsDeductions(event.target.value)}
                />
                <StyledInput
                  aria-label="Acomptes IS payés"
                  inputMode="decimal"
                  placeholder="Acomptes payés MAD"
                  value={isInstallments}
                  onChange={(event) => setIsInstallments(event.target.value)}
                />
                <StyledInput
                  aria-label="IS annuel précédent"
                  inputMode="decimal"
                  placeholder="IS N-1 MAD"
                  value={isPreviousTax}
                  onChange={(event) => setIsPreviousTax(event.target.value)}
                />
                <StyledFormActions>
                  <Button
                    type="submit"
                    title="Calculer"
                    ariaLabel="Calculer la déclaration IS"
                    Icon={IconPlus}
                    accent="blue"
                    disabled={!canAccount || busy || !selectedExerciseId}
                  />
                </StyledFormActions>
              </StyledForm>
            )}
            {selectedDeclaration === null ? null : (
              <StyledDetail>
                <StyledDetailHeader>
                  <StyledToolbarGroup>
                    <strong>
                      {selectedDeclaration.type} ·{' '}
                      {selectedDeclaration.periodKey}
                    </strong>
                    <ErpStatusBadge
                      label={
                        declarationAppearance[selectedDeclaration.status].label
                      }
                      tone={
                        declarationAppearance[selectedDeclaration.status].tone
                      }
                    />
                    {selectedDeclaration.status === 'REVIEWED' ? (
                      <StyledInput
                        aria-label="Référence de dépôt"
                        placeholder="Référence de dépôt DGI"
                        value={filingReference}
                        onChange={(event) =>
                          setFilingReference(event.target.value)
                        }
                      />
                    ) : null}
                    {selectedDeclaration.type === 'IS' ? (
                      <StyledSelect
                        aria-label="Nature du paiement fiscal"
                        value={paymentKind}
                        onChange={(event) =>
                          setPaymentKind(
                            event.target.value as ErpTaxPayment['kind'],
                          )
                        }
                      >
                        <option value="IS_INSTALLMENT">Acompte IS</option>
                        <option value="IS_BALANCE">Solde IS</option>
                        <option value="OTHER">Autre</option>
                      </StyledSelect>
                    ) : null}
                  </StyledToolbarGroup>
                  <StyledToolbarGroup>
                    {selectedDeclaration.status === 'DRAFT' ? (
                      <Button
                        title="Valider"
                        ariaLabel="Valider la déclaration"
                        Icon={IconCheck}
                        accent="blue"
                        disabled={!canAccount || busy}
                        onClick={() =>
                          void transitionDeclaration(
                            selectedDeclaration,
                            'REVIEWED',
                          )
                        }
                      />
                    ) : null}
                    {selectedDeclaration.status === 'REVIEWED' ? (
                      <Button
                        title="Déposer"
                        ariaLabel="Enregistrer le dépôt DGI"
                        Icon={IconCheck}
                        accent="blue"
                        disabled={
                          !canAccount || busy || !filingReference.trim()
                        }
                        onClick={() =>
                          void transitionDeclaration(
                            selectedDeclaration,
                            'FILED',
                          )
                        }
                      />
                    ) : null}
                    {selectedDeclaration.type === 'TVA' ? (
                      <>
                        <Button
                          title="SIMPL TVA"
                          ariaLabel="Télécharger le XML SIMPL TVA"
                          Icon={IconDownload}
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            void exportDeclaration(selectedDeclaration, 'simpl')
                          }
                        />
                        <Button
                          title="ADC080F"
                          ariaLabel="Télécharger le relevé ADC080F"
                          Icon={IconFileText}
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            void exportDeclaration(
                              selectedDeclaration,
                              'adc080f',
                            )
                          }
                        />
                      </>
                    ) : (
                      <Button
                        title="XML IS"
                        ariaLabel="Télécharger le XML IS"
                        Icon={IconDownload}
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          void exportDeclaration(selectedDeclaration, 'is-xml')
                        }
                      />
                    )}
                    <Button
                      title="Fermer"
                      ariaLabel="Fermer le détail fiscal"
                      Icon={IconX}
                      variant="secondary"
                      onClick={() => setSelectedDeclarationId('')}
                    />
                  </StyledToolbarGroup>
                </StyledDetailHeader>
                <StyledDetailBody>
                  <ErpOperationalTable
                    ariaLabel="Paiements fiscaux"
                    columns={paymentColumns}
                    rows={payments}
                    getRowKey={(payment) => payment.id}
                    state={paymentState === 'loading' ? 'loading' : 'ready'}
                    emptyLabel="Aucun paiement rapproché"
                  />
                  <ErpOperationalTable
                    ariaLabel="Candidats de rapprochement fiscal"
                    columns={candidateColumns}
                    rows={paymentCandidates}
                    getRowKey={(candidate) => candidate.id}
                    state={paymentState === 'loading' ? 'loading' : 'ready'}
                    emptyLabel="Aucune ligne bancaire candidate"
                  />
                </StyledDetailBody>
              </StyledDetail>
            )}
            <ErpOperationalTable
              ariaLabel="Déclarations fiscales"
              columns={declarationColumns}
              rows={declarations}
              getRowKey={(declaration) => declaration.id}
              emptyLabel="Aucune déclaration fiscale"
            />
          </>
        ) : view === 'prorata' ? (
          <>
            <StyledSplit>
              <StyledForm onSubmit={calculateProrata}>
                <StyledFormTitle>Prorata périodique</StyledFormTitle>
                <StyledInput
                  aria-label="Période du prorata"
                  placeholder="2026-07"
                  value={prorataPeriodKey}
                  onChange={(event) => setProrataPeriodKey(event.target.value)}
                />
                <span />
                <StyledInput
                  aria-label="Chiffre d'affaires taxable"
                  inputMode="decimal"
                  placeholder="CA taxable MAD"
                  value={taxableRevenue}
                  onChange={(event) => setTaxableRevenue(event.target.value)}
                />
                <StyledInput
                  aria-label="Chiffre d'affaires total"
                  inputMode="decimal"
                  placeholder="CA total MAD"
                  value={totalRevenue}
                  onChange={(event) => setTotalRevenue(event.target.value)}
                />
                <StyledInput
                  aria-label="TVA déductible avant prorata"
                  inputMode="decimal"
                  placeholder="TVA avant prorata MAD"
                  value={inputVat}
                  onChange={(event) => setInputVat(event.target.value)}
                />
                <StyledFormActions>
                  <Button
                    type="submit"
                    title="Calculer"
                    ariaLabel="Calculer le prorata TVA"
                    Icon={IconPlus}
                    accent="blue"
                    disabled={!canAccount || busy || !selectedExerciseId}
                  />
                </StyledFormActions>
              </StyledForm>
              <StyledForm onSubmit={(event) => event.preventDefault()}>
                <StyledFormTitle>Régularisation annuelle</StyledFormTitle>
                <StyledMetricLabel>Taux annuel</StyledMetricLabel>
                <strong>
                  {annualProrata
                    ? formatRate(annualProrata.rateBasisPoints)
                    : '—'}
                </strong>
                <StyledMetricLabel>TVA déductible annuelle</StyledMetricLabel>
                <strong>
                  {annualProrata
                    ? formatMadCents(annualProrata.annualDeductibleVatCents)
                    : '—'}
                </strong>
                <StyledMetricLabel>Régularisation</StyledMetricLabel>
                <strong>
                  {annualProrata
                    ? formatMadCents(annualProrata.regularizationCents)
                    : '—'}
                </strong>
                <StyledFormActions>
                  <Button
                    type="button"
                    title="Comptabiliser"
                    ariaLabel="Comptabiliser la régularisation annuelle"
                    Icon={IconCheck}
                    accent="blue"
                    disabled={
                      !canAccount ||
                      busy ||
                      annualProrata === null ||
                      annualProrata.regularizationCents === 0
                    }
                    onClick={() => void postAnnualProrata()}
                  />
                </StyledFormActions>
              </StyledForm>
            </StyledSplit>
            <ErpOperationalTable
              ariaLabel="Prorata TVA"
              columns={prorataColumns}
              rows={prorataPeriods}
              getRowKey={(period) => period.id}
              emptyLabel="Aucun prorata calculé"
            />
          </>
        ) : (
          <>
            <StyledToolbar>
              <StyledToolbarGroup>
                <StyledInput
                  aria-label="Année du calendrier fiscal"
                  inputMode="numeric"
                  value={deadlineYear}
                  onChange={(event) => setDeadlineYear(event.target.value)}
                />
                <Button
                  title="Générer"
                  ariaLabel="Générer le calendrier fiscal"
                  Icon={IconCalendarEvent}
                  accent="blue"
                  disabled={!canAccount || busy}
                  onClick={() => void seedDeadlines()}
                />
              </StyledToolbarGroup>
            </StyledToolbar>
            <ErpOperationalTable
              ariaLabel="Calendrier fiscal"
              columns={deadlineColumns}
              rows={deadlines}
              getRowKey={(deadline) => deadline.id}
              emptyLabel="Aucune échéance fiscale"
            />
          </>
        )}
      </StyledContent>
    </ErpPageShell>
  );
};
