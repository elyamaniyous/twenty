import { ErpConfirmDialog } from '@/erp-maroc/components/ErpConfirmDialog';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import {
  ErpWorkspaceSummaryItem,
  StyledErpWorkspaceContent,
  StyledErpWorkspaceField,
  StyledErpWorkspaceFormGrid,
  StyledErpWorkspaceInput,
  StyledErpWorkspaceInlineActions,
  StyledErpWorkspacePanel,
  StyledErpWorkspacePanelTitle,
  StyledErpWorkspaceSelect,
  StyledErpWorkspaceSummary,
  downloadTextContent,
} from '@/erp-maroc/components/ErpComplianceUi';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import {
  parseOnboardingCsv,
  type OnboardingCsvRow,
} from '@/erp-maroc/onboarding/parseOnboardingCsv';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import {
  IconArrowRight,
  IconDownload,
  IconFileImport,
  IconLink,
  IconRefresh,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const importKindSchema = z.enum([
  'TIERS',
  'PRODUCTS',
  'OPENING_BALANCE',
  'STOCK_INITIAL',
  'OPEN_ITEMS',
]);
type ImportKind = z.infer<typeof importKindSchema>;

const readinessSchema = z.object({
  readyForOperations: z.boolean(),
  progressPercent: z.number(),
  completedCount: z.number(),
  blockingCount: z.number(),
  importCount: z.number(),
  openExercise: z
    .object({
      id: z.string(),
      year: z.number(),
      startDate: z.string(),
      endDate: z.string(),
    })
    .nullable(),
  checks: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      required: z.boolean(),
      complete: z.boolean(),
      detail: z.string(),
      actionPath: z.string(),
    }),
  ),
});

const importPreviewSchema = z.object({
  kind: importKindSchema,
  rows: z.array(
    z.object({
      rowNumber: z.number(),
      status: z.enum(['READY', 'SKIP_EXISTING', 'ERROR']),
      reference: z.string(),
      errors: z.array(z.string()),
      normalized: z.record(z.string(), z.unknown()).nullable(),
    }),
  ),
  readyCount: z.number(),
  skippedCount: z.number(),
  errorCount: z.number(),
  totalDebitCents: z.number().optional(),
  totalCreditCents: z.number().optional(),
  totalReceivableCents: z.number().optional(),
  totalPayableCents: z.number().optional(),
  targetReceivableCents: z.number().optional(),
  targetPayableCents: z.number().optional(),
  target: z
    .object({
      kind: z.enum(['OPENING_BALANCE', 'STOCK_INITIAL']),
      entryDate: z.string(),
      exerciceId: z.string().optional(),
      exerciceYear: z.number().optional(),
      journalId: z.string().optional(),
      journalCode: z.string().optional(),
    })
    .optional(),
  previewDigest: z.string(),
});

const importResultSchema = z.object({
  kind: importKindSchema,
  digest: z.string(),
  createdCount: z.number(),
  skippedCount: z.number(),
});

const openItemsSchema = z.object({
  asOfDate: z.string(),
  count: z.number(),
  receivableCents: z.number(),
  payableCents: z.number(),
  overdueCents: z.number(),
  items: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(['RECEIVABLE', 'PAYABLE']),
      reference: z.string(),
      documentDate: z.string(),
      dueDate: z.string(),
      originalAmountCents: z.number(),
      outstandingAmountCents: z.number(),
      notes: z.string().nullable(),
      agingBucket: z.enum(['NOT_DUE', '1_30', '31_60', '61_90', '90_PLUS']),
      tier: z.object({
        id: z.string(),
        name: z.string(),
        ice: z.string().nullable(),
      }),
    }),
  ),
});

const settlementCandidatesSchema = z.object({
  openItemId: z.string(),
  candidates: z.array(
    z.object({
      id: z.string(),
      transactionDate: z.string(),
      description: z.string(),
      reference: z.string().nullable(),
      debitCents: z.number(),
      creditCents: z.number(),
      amountCents: z.number(),
      score: z.number(),
      bankAccount: z.object({
        id: z.string(),
        name: z.string(),
        bankName: z.string(),
        accountingAccountCode: z.string(),
      }),
    }),
  ),
});

const settlementResultSchema = z.object({
  id: z.string(),
  amountCents: z.number(),
  settlementDate: z.string(),
  accountingEntry: z.object({
    id: z.string(),
    sourceType: z.enum(['PAYMENT', 'SUPPLIER_PAYMENT']),
    entryDate: z.string(),
    label: z.string(),
    status: z.enum(['DRAFT', 'VALIDATED', 'LOCKED', 'REJECTED']),
  }),
  openItem: z.object({
    id: z.string(),
    outstandingAmountCents: z.number(),
    status: z.enum(['OPEN', 'SETTLED', 'CANCELLED']),
  }),
  bankStatementLine: z.object({ id: z.string() }),
});

type Readiness = z.infer<typeof readinessSchema>;
type Preview = z.infer<typeof importPreviewSchema>;
type PreviewRow = Preview['rows'][number];
type OpeningItems = z.infer<typeof openItemsSchema>;
type OpeningItem = OpeningItems['items'][number];
type SettlementCandidates = z.infer<typeof settlementCandidatesSchema>;

const templates: Record<ImportKind, { filename: string; content: string }> = {
  TIERS: {
    filename: 'zowka-modele-tiers.csv',
    content:
      '\ufefftype;nom;email;telephone;ice;identifiant_fiscal;adresse;ville;delai_paiement;limite_credit;compte_collectif\nCLIENT;Exemple SARL;contact@exemple.ma;+212600000000;001234567890123;12345678;Casablanca;Casablanca;30;10000;3421\n',
  },
  PRODUCTS: {
    filename: 'zowka-modele-produits.csv',
    content:
      '\ufeffcode;nom;description;type;unite;prix_ht;tva;compte_produit;compte_charge\nSRV-001;Prestation exemple;;SERVICE;U;1000;20;7111;6111\n',
  },
  OPENING_BALANCE: {
    filename: 'zowka-modele-balance-ouverture.csv',
    content:
      '\ufeffcompte;libelle;debit;credit\n3421;Clients;12500,50;\n1111;Capital social;;12500,50\n',
  },
  STOCK_INITIAL: {
    filename: 'zowka-modele-stock-initial.csv',
    content:
      '\ufeffdepot;produit;quantite;cout_unitaire;reference\nPRINCIPAL;ART-001;25;120,50;REPRISE-2026\n',
  },
  OPEN_ITEMS: {
    filename: 'zowka-modele-encours-reprise.csv',
    content:
      '\ufefftype;tiers_ice;tiers_nom;reference;date_document;date_echeance;montant_initial;solde_ouvert;notes\nCLIENT;001234567890123;Client exemple;FAC-2025-0042;2025-12-15;2026-01-15;12000,00;7500,00;Partiellement réglée\nFOURNISSEUR;;Fournisseur exemple;FF-2025-0099;2025-12-20;2026-02-01;3250,50;3250,50;\n',
  },
};

const StyledChecklist = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
`;

const StyledCheck = styled.div`
  align-items: center;
  border-right: 1px solid ${themeCssVariables.border.color.light};
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(0, 1fr) auto;
  min-height: 56px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledCheckText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[0.5]};
  min-width: 0;

  strong {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.md};
    font-weight: ${themeCssVariables.font.weight.medium};
    letter-spacing: 0;
  }

  span {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
  }
`;

const StyledCheckActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledCheckLink = styled(Link)`
  align-items: center;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: inline-flex;
  height: 28px;
  justify-content: center;
  width: 28px;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledImportActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  padding: 0 ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[3]};
`;

const StyledFileInput = styled.input`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  max-width: 100%;
`;

const normalizedLabel = (row: PreviewRow) => {
  const normalized = row.normalized;
  if (!normalized) return '—';
  const code = typeof normalized.code === 'string' ? normalized.code : null;
  const name = typeof normalized.name === 'string' ? normalized.name : null;
  const accountCode =
    typeof normalized.accountCode === 'string' ? normalized.accountCode : null;
  const accountLabel =
    typeof normalized.accountLabel === 'string'
      ? normalized.accountLabel
      : null;
  const warehouseCode =
    typeof normalized.warehouseCode === 'string'
      ? normalized.warehouseCode
      : null;
  const productCode =
    typeof normalized.productCode === 'string' ? normalized.productCode : null;
  const tierName =
    typeof normalized.tierName === 'string' ? normalized.tierName : null;
  const reference =
    typeof normalized.reference === 'string' ? normalized.reference : null;
  return (
    [
      code ?? accountCode ?? warehouseCode ?? tierName,
      name ?? accountLabel ?? productCode ?? reference,
    ]
      .filter(Boolean)
      .join(' · ') || row.reference
  );
};

const previewColumns: ErpOperationalTableColumn<PreviewRow>[] = [
  {
    key: 'line',
    header: 'Ligne',
    width: '72px',
    align: 'right',
    render: (row) => row.rowNumber,
  },
  {
    key: 'status',
    header: 'Contrôle',
    width: '150px',
    render: (row) => (
      <ErpStatusBadge
        label={
          row.status === 'READY'
            ? 'Prêt'
            : row.status === 'SKIP_EXISTING'
              ? 'Déjà présent'
              : 'À corriger'
        }
        tone={
          row.status === 'READY'
            ? 'success'
            : row.status === 'SKIP_EXISTING'
              ? 'neutral'
              : 'danger'
        }
      />
    ),
  },
  {
    key: 'record',
    header: 'Donnée normalisée',
    width: '280px',
    render: normalizedLabel,
  },
  {
    key: 'message',
    header: 'Résultat',
    width: '420px',
    render: (row) =>
      row.errors.length > 0
        ? row.errors.join(' · ')
        : row.status === 'SKIP_EXISTING'
          ? 'Aucune modification ne sera appliquée'
          : 'Création autorisée',
  },
];

const agingLabels: Record<OpeningItem['agingBucket'], string> = {
  NOT_DUE: 'Non échu',
  '1_30': '1–30 jours',
  '31_60': '31–60 jours',
  '61_90': '61–90 jours',
  '90_PLUS': 'Plus de 90 jours',
};

const openingItemColumns: ErpOperationalTableColumn<OpeningItem>[] = [
  {
    key: 'kind',
    header: 'Nature',
    width: '130px',
    render: (row) => (
      <ErpStatusBadge
        label={row.kind === 'RECEIVABLE' ? 'Créance' : 'Dette'}
        tone={row.kind === 'RECEIVABLE' ? 'info' : 'warning'}
      />
    ),
  },
  {
    key: 'tier',
    header: 'Tiers',
    width: '240px',
    render: (row) => row.tier.name,
  },
  {
    key: 'reference',
    header: 'Référence',
    width: '180px',
    render: (row) => row.reference,
  },
  {
    key: 'dueDate',
    header: 'Échéance',
    width: '130px',
    render: (row) => row.dueDate,
  },
  {
    key: 'aging',
    header: 'Ancienneté',
    width: '150px',
    render: (row) => agingLabels[row.agingBucket],
  },
  {
    key: 'outstanding',
    header: 'Solde ouvert',
    width: '160px',
    align: 'right',
    render: (row) => formatMadCents(row.outstandingAmountCents),
  },
];

export const ErpOnboardingPage = () => {
  const { client, context } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [openingItems, setOpeningItems] = useState<OpeningItems | null>(null);
  const [selectedOpenItemId, setSelectedOpenItemId] = useState('');
  const [settlementCandidates, setSettlementCandidates] =
    useState<SettlementCandidates | null>(null);
  const [selectedBankLineId, setSelectedBankLineId] = useState('');
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isSettlementConfirmOpen, setIsSettlementConfirmOpen] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [kind, setKind] = useState<ImportKind>('TIERS');
  const [entryDate, setEntryDate] = useState('');
  const [rows, setRows] = useState<OnboardingCsvRow[]>([]);
  const [filename, setFilename] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const canImport = context !== null && context.role !== 'COMMERCIAL';

  const refresh = useCallback(() => {
    setGeneration((current) => current + 1);
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    Promise.all([
      client.request({
        method: 'GET',
        path: '/onboarding/readiness',
        schema: readinessSchema,
        signal: abortController.signal,
      }),
      canImport
        ? client.request({
            method: 'GET',
            path: '/onboarding/open-items',
            schema: openItemsSchema,
            signal: abortController.signal,
          })
        : Promise.resolve(null),
    ])
      .then(([loaded, loadedOpeningItems]) => {
        if (abortController.signal.aborted) return;
        setReadiness(loaded);
        setOpeningItems(loadedOpeningItems);
        setEntryDate((current) => {
          const exercise = loaded.openExercise;
          if (!exercise) return '';
          return current >= exercise.startDate && current <= exercise.endDate
            ? current
            : exercise.startDate;
        });
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [canImport, client, generation]);

  const resetPreview = () => {
    setRows([]);
    setFilename('');
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const previewFile = async (file: File) => {
    if (!canImport) return;
    setIsPreviewing(true);
    setPreview(null);
    try {
      const parsedRows = parseOnboardingCsv(await file.text());
      const result = await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/onboarding/imports/preview',
            schema: importPreviewSchema,
            body: {
              kind,
              rows: parsedRows,
              ...(kind === 'OPENING_BALANCE' || kind === 'STOCK_INITIAL'
                ? { entryDate }
                : {}),
            },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      setRows(parsedRows);
      setFilename(file.name);
      setPreview(result);
    } catch (error) {
      resetPreview();
      enqueueErrorSnackBar({
        message:
          error instanceof Error
            ? error.message
            : 'Prévisualisation impossible',
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const applyImport = async () => {
    if (!preview || preview.errorCount > 0 || !canImport || isImporting) return;
    setIsImporting(true);
    try {
      const result = await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/onboarding/imports/apply',
            schema: importResultSchema,
            body: {
              kind,
              rows,
              ...(kind === 'OPENING_BALANCE' || kind === 'STOCK_INITIAL'
                ? { entryDate }
                : {}),
              previewDigest: preview.previewDigest,
              confirm: true,
            },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({
        message:
          kind === 'OPENING_BALANCE'
            ? "Écriture d'ouverture créée en brouillon"
            : kind === 'STOCK_INITIAL'
              ? `${result.createdCount} position(s) de stock initial importée(s)`
              : kind === 'OPEN_ITEMS'
                ? `${result.createdCount} créance(s) ou dette(s) de reprise importée(s)`
                : `${result.createdCount} ligne(s) importée(s) dans Zowka`,
      });
      setIsConfirmOpen(false);
      resetPreview();
      refresh();
    } catch {
      setIsConfirmOpen(false);
      enqueueErrorSnackBar({
        message: 'Import refusé. Relancez la prévisualisation.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const loadSettlementCandidates = async (openItemId: string) => {
    setSelectedOpenItemId(openItemId);
    setSelectedBankLineId('');
    setSettlementCandidates(null);
    if (!openItemId) return;
    setIsLoadingCandidates(true);
    try {
      const loaded = await client.request({
        method: 'GET',
        path: `/onboarding/open-items/${openItemId}/settlement-candidates`,
        schema: settlementCandidatesSchema,
      });
      setSettlementCandidates(loaded);
      setSelectedBankLineId(loaded.candidates[0]?.id ?? '');
    } catch {
      enqueueErrorSnackBar({
        message: 'Les lignes bancaires compatibles sont indisponibles',
      });
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  const settleOpenItem = async () => {
    if (!selectedOpenItemId || !selectedBankLineId || isSettling) return;
    setIsSettling(true);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/onboarding/open-items/${selectedOpenItemId}/settle`,
          schema: settlementResultSchema,
          body: { bankStatementLineId: selectedBankLineId, confirm: true },
        },
        { idempotency: 'required' },
      );
      const result = await intent.execute();
      enqueueSuccessSnackBar({
        message:
          result.openItem.status === 'SETTLED'
            ? 'Encours soldé, écriture comptable créée en brouillon'
            : `Règlement partiel appliqué, solde ${formatMadCents(result.openItem.outstandingAmountCents)}; écriture créée en brouillon`,
      });
      setIsSettlementConfirmOpen(false);
      setSelectedOpenItemId('');
      setSelectedBankLineId('');
      setSettlementCandidates(null);
      refresh();
    } catch {
      setIsSettlementConfirmOpen(false);
      enqueueErrorSnackBar({
        message: "Le rapprochement n'a pas pu être appliqué",
      });
    } finally {
      setIsSettling(false);
    }
  };

  const template = templates[kind];

  return (
    <>
      <ErpPageShell
        title="Mise en service"
        description="Préparation opérationnelle et reprise contrôlée des données"
        state={state}
        loadingLabel="Diagnostic de la société"
        errorLabel="Diagnostic indisponible"
        onRetry={refresh}
        actions={
          <Button
            title="Actualiser"
            ariaLabel="Actualiser le diagnostic"
            Icon={IconRefresh}
            variant="secondary"
            onClick={refresh}
          />
        }
      >
        <StyledErpWorkspaceContent>
          <StyledErpWorkspaceSummary>
            <ErpWorkspaceSummaryItem
              label="Préparation"
              value={`${readiness?.progressPercent ?? 0} %`}
            />
            <ErpWorkspaceSummaryItem
              label="Contrôles validés"
              value={`${readiness?.completedCount ?? 0}/${readiness?.checks.length ?? 0}`}
            />
            <ErpWorkspaceSummaryItem
              label="Blocages"
              value={readiness?.blockingCount ?? 0}
            />
            <ErpWorkspaceSummaryItem
              label="Imports appliqués"
              value={readiness?.importCount ?? 0}
            />
          </StyledErpWorkspaceSummary>

          <StyledErpWorkspacePanel>
            <StyledErpWorkspacePanelTitle>
              Contrôles de démarrage
            </StyledErpWorkspacePanelTitle>
            <StyledChecklist>
              {readiness?.checks.map((check) => (
                <StyledCheck key={check.key}>
                  <StyledCheckText>
                    <strong>{check.label}</strong>
                    <span>{check.detail}</span>
                  </StyledCheckText>
                  {check.complete ? (
                    <ErpStatusBadge label="Validé" tone="success" />
                  ) : (
                    <StyledCheckActions>
                      <ErpStatusBadge
                        label={check.required ? 'Requis' : 'À configurer'}
                        tone={check.required ? 'danger' : 'warning'}
                      />
                      <StyledCheckLink
                        to={check.actionPath}
                        aria-label={`Configurer ${check.label}`}
                      >
                        <IconArrowRight size={16} />
                      </StyledCheckLink>
                    </StyledCheckActions>
                  )}
                </StyledCheck>
              ))}
            </StyledChecklist>
          </StyledErpWorkspacePanel>

          <StyledErpWorkspacePanel id="import">
            <StyledErpWorkspacePanelTitle>
              Import de données
            </StyledErpWorkspacePanelTitle>
            <StyledErpWorkspaceFormGrid>
              <StyledErpWorkspaceField>
                Données
                <StyledErpWorkspaceSelect
                  value={kind}
                  disabled={!canImport || isPreviewing || isImporting}
                  onChange={(event) => {
                    setKind(importKindSchema.parse(event.target.value));
                    resetPreview();
                  }}
                >
                  <option value="TIERS">Clients et fournisseurs</option>
                  <option value="PRODUCTS">Produits et services</option>
                  <option value="OPENING_BALANCE">Balance d'ouverture</option>
                  <option value="STOCK_INITIAL">Stock initial</option>
                  <option value="OPEN_ITEMS">
                    Créances et dettes ouvertes
                  </option>
                </StyledErpWorkspaceSelect>
              </StyledErpWorkspaceField>
              {kind === 'OPENING_BALANCE' || kind === 'STOCK_INITIAL' ? (
                <StyledErpWorkspaceField>
                  Date de reprise
                  <StyledErpWorkspaceInput
                    type="date"
                    value={entryDate}
                    min={readiness?.openExercise?.startDate}
                    max={readiness?.openExercise?.endDate}
                    disabled={!canImport || isPreviewing || isImporting}
                    onChange={(event) => {
                      setEntryDate(event.target.value);
                      resetPreview();
                    }}
                  />
                </StyledErpWorkspaceField>
              ) : null}
              <StyledErpWorkspaceField>
                Fichier CSV
                <StyledFileInput
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  disabled={
                    !canImport ||
                    isPreviewing ||
                    isImporting ||
                    ((kind === 'OPENING_BALANCE' || kind === 'STOCK_INITIAL') &&
                      entryDate === '')
                  }
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void previewFile(file);
                  }}
                />
              </StyledErpWorkspaceField>
            </StyledErpWorkspaceFormGrid>
            <StyledImportActions>
              <Button
                title="Télécharger le modèle CSV"
                ariaLabel={`Télécharger le modèle ${kind}`}
                Icon={IconDownload}
                variant="secondary"
                onClick={() =>
                  downloadTextContent(
                    template.filename,
                    template.content,
                    'text/csv;charset=utf-8',
                  )
                }
              />
              {preview ? (
                <StyledErpWorkspaceInlineActions>
                  <ErpStatusBadge
                    label={`${preview.readyCount} prête(s)`}
                    tone="success"
                  />
                  <ErpStatusBadge
                    label={`${preview.skippedCount} existante(s)`}
                  />
                  <ErpStatusBadge
                    label={`${preview.errorCount} erreur(s)`}
                    tone={preview.errorCount > 0 ? 'danger' : 'success'}
                  />
                  {kind === 'OPENING_BALANCE' ? (
                    <>
                      <ErpStatusBadge
                        label={`Débit ${formatMadCents(preview.totalDebitCents ?? 0)}`}
                        tone="info"
                      />
                      <ErpStatusBadge
                        label={`Crédit ${formatMadCents(preview.totalCreditCents ?? 0)}`}
                        tone="info"
                      />
                    </>
                  ) : null}
                  {kind === 'OPEN_ITEMS' ? (
                    <>
                      <ErpStatusBadge
                        label={`Créances ${formatMadCents(preview.totalReceivableCents ?? 0)} / 3421 ${formatMadCents(preview.targetReceivableCents ?? 0)}`}
                        tone="info"
                      />
                      <ErpStatusBadge
                        label={`Dettes ${formatMadCents(preview.totalPayableCents ?? 0)} / 4411 ${formatMadCents(preview.targetPayableCents ?? 0)}`}
                        tone="info"
                      />
                    </>
                  ) : null}
                  <Button
                    title={
                      kind === 'OPENING_BALANCE'
                        ? 'Créer le brouillon'
                        : kind === 'OPEN_ITEMS'
                          ? 'Importer les encours'
                          : 'Importer'
                    }
                    ariaLabel={`Importer ${filename}`}
                    Icon={IconFileImport}
                    accent="blue"
                    disabled={
                      preview.errorCount > 0 || preview.readyCount === 0
                    }
                    onClick={() => setIsConfirmOpen(true)}
                  />
                </StyledErpWorkspaceInlineActions>
              ) : null}
            </StyledImportActions>
            {preview ? (
              <ErpOperationalTable
                ariaLabel={`Prévisualisation de ${filename}`}
                columns={previewColumns}
                rows={preview.rows}
                getRowKey={(row) => `${row.rowNumber}-${row.reference}`}
                emptyLabel="Aucune ligne à importer"
              />
            ) : null}
          </StyledErpWorkspacePanel>

          {openingItems && openingItems.count > 0 ? (
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Encours de reprise au {openingItems.asOfDate}
              </StyledErpWorkspacePanelTitle>
              <StyledErpWorkspaceSummary>
                <ErpWorkspaceSummaryItem
                  label="Créances"
                  value={formatMadCents(openingItems.receivableCents)}
                />
                <ErpWorkspaceSummaryItem
                  label="Dettes"
                  value={formatMadCents(openingItems.payableCents)}
                />
                <ErpWorkspaceSummaryItem
                  label="Échu"
                  value={formatMadCents(openingItems.overdueCents)}
                />
                <ErpWorkspaceSummaryItem
                  label="Documents"
                  value={openingItems.count}
                />
              </StyledErpWorkspaceSummary>
              <StyledErpWorkspaceFormGrid>
                <StyledErpWorkspaceField>
                  Encours
                  <StyledErpWorkspaceSelect
                    value={selectedOpenItemId}
                    disabled={isSettling}
                    onChange={(event) =>
                      void loadSettlementCandidates(event.target.value)
                    }
                  >
                    <option value="">Sélectionner</option>
                    {openingItems.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.kind === 'RECEIVABLE' ? 'Créance' : 'Dette'} ·{' '}
                        {item.tier.name} · {item.reference} ·{' '}
                        {formatMadCents(item.outstandingAmountCents)}
                      </option>
                    ))}
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Ligne bancaire
                  <StyledErpWorkspaceSelect
                    value={selectedBankLineId}
                    disabled={
                      !selectedOpenItemId || isLoadingCandidates || isSettling
                    }
                    onChange={(event) =>
                      setSelectedBankLineId(event.target.value)
                    }
                  >
                    <option value="">
                      {isLoadingCandidates
                        ? 'Chargement'
                        : settlementCandidates?.candidates.length === 0
                          ? 'Aucune ligne compatible'
                          : 'Sélectionner'}
                    </option>
                    {settlementCandidates?.candidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.transactionDate} ·{' '}
                        {candidate.bankAccount.bankName} /{' '}
                        {candidate.bankAccount.name} · {candidate.description} ·{' '}
                        {formatMadCents(candidate.amountCents)}
                      </option>
                    ))}
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
              </StyledErpWorkspaceFormGrid>
              <StyledImportActions>
                <Button
                  title="Rapprocher"
                  ariaLabel="Rapprocher la ligne bancaire avec l'encours"
                  Icon={IconLink}
                  accent="blue"
                  disabled={!selectedOpenItemId || !selectedBankLineId}
                  onClick={() => setIsSettlementConfirmOpen(true)}
                />
              </StyledImportActions>
              <ErpOperationalTable
                ariaLabel="Encours clients et fournisseurs de reprise"
                columns={openingItemColumns}
                rows={openingItems.items}
                getRowKey={(row) => row.id}
                emptyLabel="Aucun encours de reprise"
              />
            </StyledErpWorkspacePanel>
          ) : null}
        </StyledErpWorkspaceContent>
      </ErpPageShell>

      <ErpConfirmDialog
        isOpen={isConfirmOpen}
        title="Confirmer l'import"
        message={
          kind === 'OPENING_BALANCE'
            ? `Une écriture d'ouverture en brouillon de ${preview?.readyCount ?? 0} ligne(s) sera créée dans l'exercice ${preview?.target?.exerciceYear ?? ''}.`
            : kind === 'STOCK_INITIAL'
              ? `${preview?.readyCount ?? 0} position(s) seront ajoutée(s) au stock à la date du ${entryDate}.`
              : kind === 'OPEN_ITEMS'
                ? `${preview?.readyCount ?? 0} créance(s) ou dette(s) seront reprises sans générer de nouvelle TVA ni écriture comptable.`
                : `${preview?.readyCount ?? 0} ligne(s) seront créées. Les données existantes resteront inchangées.`
        }
        confirmLabel="Confirmer l'import"
        isConfirming={isImporting}
        confirmDisabled={!preview || preview.errorCount > 0}
        initialFocus="cancel"
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => void applyImport()}
      />
      <ErpConfirmDialog
        isOpen={isSettlementConfirmOpen}
        title="Confirmer le rapprochement"
        message={`La ligne bancaire de ${formatMadCents(
          settlementCandidates?.candidates.find(
            ({ id }) => id === selectedBankLineId,
          )?.amountCents ?? 0,
        )} sera affectée à l'encours sélectionné et générera une écriture bancaire en brouillon, sans TVA.`}
        confirmLabel="Rapprocher"
        isConfirming={isSettling}
        confirmDisabled={!selectedOpenItemId || !selectedBankLineId}
        initialFocus="cancel"
        onCancel={() => setIsSettlementConfirmOpen(false)}
        onConfirm={() => void settleOpenItem()}
      />
    </>
  );
};
