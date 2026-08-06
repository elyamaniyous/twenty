import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { erpMarocPaths } from '@/erp-maroc/navigation/erpMarocPaths';
import { styled } from '@linaria/react';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  erpBankAccountSchema,
  erpOnboardingConfigurationSchema,
  erpOnboardingImportApplyResultSchema,
  erpOnboardingImportPreviewSchema,
  erpOnboardingReadinessSchema,
  erpSocieteLegalSummarySchema,
  erpWarehouseSchema,
  type ErpOnboardingConfiguration,
  type ErpOnboardingImportApplyResult,
  type ErpOnboardingImportKind,
  type ErpOnboardingImportPreview,
  type ErpOnboardingNormalizedImportRow,
  type ErpOnboardingReadiness,
} from 'twenty-shared/erp-maroc';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import {
  IconCheck,
  IconDownload,
  IconLock,
  IconRefresh,
  IconUpload,
  IconUsers,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { read, utils, write } from 'xlsx-ugnis';

type LoadState = 'loading' | 'ready' | 'error';
type SpreadsheetRow = Record<string, unknown>;
type LegalForm = {
  raisonSociale: string;
  ice: string;
  identifiantFiscal: string;
  taxeProfessionnelleArticle: string;
  address: string;
  city: string;
  rc: string;
  cnss: string;
};

const emptyLegalForm: LegalForm = {
  raisonSociale: '',
  ice: '',
  identifiantFiscal: '',
  taxeProfessionnelleArticle: '',
  address: '',
  city: '',
  rc: '',
  cnss: '',
};

const importDefinitions: Array<{
  kind: ErpOnboardingImportKind;
  label: string;
  description: string;
  fileName: string;
  rows: SpreadsheetRow[];
}> = [
  {
    kind: 'TIERS',
    label: 'Tiers',
    description: 'Clients et fournisseurs',
    fileName: 'zowka-modele-tiers.xlsx',
    rows: [
      {
        type: 'CLIENT',
        nom: 'Atlas Distribution',
        email: 'compta@atlas.example',
        telephone: '0522000000',
        ice: '001234567890123',
        identifiant_fiscal: '12345678',
        adresse: '12 rue des Entreprises',
        ville: 'Casablanca',
        delai_paiement: 30,
        limite_credit: 50000,
        compte_collectif: '3421',
      },
    ],
  },
  {
    kind: 'PRODUCTS',
    label: 'Produits',
    description: 'Catalogue produits et services',
    fileName: 'zowka-modele-produits.xlsx',
    rows: [
      {
        code: 'SERV-001',
        nom: 'Prestation de conseil',
        description: 'Forfait mensuel',
        type: 'SERVICE',
        unite: 'U',
        prix_ht: 2500,
        taux_tva: 20,
        compte_produit: '7111',
        compte_charge: '',
      },
    ],
  },
  {
    kind: 'OPENING_BALANCE',
    label: "Balance d'ouverture",
    description: 'Soldes comptables initiaux',
    fileName: 'zowka-modele-balance-ouverture.xlsx',
    rows: [
      { compte: '5141', libelle: 'Banque', debit: 10000, credit: 0 },
      { compte: '1111', libelle: 'Capital social', debit: 0, credit: 10000 },
    ],
  },
  {
    kind: 'OPEN_ITEMS',
    label: 'Encours',
    description: 'Créances et dettes de reprise',
    fileName: 'zowka-modele-encours.xlsx',
    rows: [
      {
        type: 'CREANCE',
        tiers_ice: '001234567890123',
        tiers_nom: 'Atlas Distribution',
        reference: 'FAC-2026-001',
        date_document: '2026-01-15',
        date_echeance: '2026-02-14',
        montant_initial: 12000,
        solde_ouvert: 12000,
        notes: 'Reprise comptable',
      },
    ],
  },
  {
    kind: 'STOCK_INITIAL',
    label: 'Stock initial',
    description: 'Quantités et coûts de départ',
    fileName: 'zowka-modele-stock-initial.xlsx',
    rows: [
      {
        depot: 'PRINCIPAL',
        produit: 'PROD-001',
        quantite: 25,
        cout_unitaire: 150,
        reference: 'STOCK-OUVERTURE',
      },
    ],
  },
];

const dateRequiringKinds = new Set<ErpOnboardingImportKind>([
  'OPENING_BALANCE',
  'STOCK_INITIAL',
]);

const importCheckKeys = new Set([
  'OPENING_BALANCE',
  'TIERS',
  'PRODUCTS',
  'INITIAL_STOCK',
  'OPEN_ITEMS',
]);

const fiscalStartMonths = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const controlCss = `
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
`;

const StyledWorkspace = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
`;

const StyledReadiness = styled.section`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: minmax(220px, 1fr) minmax(280px, 2fr);
  padding: ${themeCssVariables.spacing[4]};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const StyledReadinessCopy = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledReadinessValue = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: 28px;
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  line-height: 32px;
`;

const StyledSecondary = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 18px;
`;

const StyledProgressTrack = styled.div`
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.sm};
  height: 8px;
  overflow: hidden;
`;

const StyledProgressFill = styled.div<{ value: number }>`
  background: ${({ value }) =>
    value === 100
      ? themeCssVariables.color.green
      : themeCssVariables.color.blue};
  height: 100%;
  width: ${({ value }) => `${value}%`};
`;

const StyledSection = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
`;

const StyledSectionHeader = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  min-height: 48px;
  padding: 0 ${themeCssVariables.spacing[4]};
`;

const StyledSectionTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  margin: 0;
`;

const StyledChecks = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const StyledCheck = styled.article`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: 20px minmax(0, 1fr) auto;
  min-height: 64px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const StyledCheckIcon = styled.span<{ complete: boolean }>`
  color: ${({ complete }) =>
    complete ? themeCssVariables.color.green : themeCssVariables.color.gray};
  display: flex;
`;

const StyledCheckCopy = styled.div`
  display: grid;
  gap: 2px;
  min-width: 0;
`;

const StyledCheckTitle = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  letter-spacing: 0;
`;

const StyledLaunchPanel = styled.div`
  align-items: center;
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: minmax(220px, 1fr) minmax(320px, auto);
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const StyledLaunchCopy = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledLaunchActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;

  @media (max-width: 760px) {
    justify-content: flex-start;
  }
`;

const StyledConfigurationGrid = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`;

const StyledConfigurationPanel = styled.form`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledConfigurationTitle = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  margin: 0;
`;

const StyledFormGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const StyledTextInput = styled.input`
  ${controlCss}
  height: 34px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledSelect = styled.select`
  ${controlCss}
  height: 34px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledFormActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  margin-top: auto;
`;

const StyledConfiguredList = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledConfiguredItem = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: 2px;
  padding-bottom: ${themeCssVariables.spacing[2]};
`;

const StyledImportWorkspace = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]}
    ${themeCssVariables.spacing[4]};
`;

const StyledSegments = styled.div`
  display: flex;
  gap: 1px;
  overflow-x: auto;
`;

const StyledSegment = styled.button<{ active: boolean }>`
  ${controlCss}
  background: ${({ active }) =>
    active
      ? themeCssVariables.background.transparent.light
      : themeCssVariables.background.primary};
  color: ${({ active }) =>
    active
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  flex: 1 0 auto;
  font-size: ${themeCssVariables.font.size.sm};
  height: 34px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledImportControls = styled.div`
  align-items: end;
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(240px, 1fr) minmax(150px, 220px) auto auto;

  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: grid;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledFileLabel = styled.label`
  ${controlCss}
  align-items: center;
  cursor: pointer;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  height: 34px;
  overflow: hidden;
  padding: 0 ${themeCssVariables.spacing[2]};

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const StyledFileInput = styled.input`
  display: none;
`;

const StyledDateInput = styled.input`
  ${controlCss}
  height: 34px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledNotice = styled.div<{ danger: boolean }>`
  background: ${({ danger }) =>
    danger
      ? themeCssVariables.tag.background.red
      : themeCssVariables.tag.background.green};
  color: ${({ danger }) =>
    danger ? themeCssVariables.tag.text.red : themeCssVariables.tag.text.green};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledMetrics = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: 2px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledMetricValue = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  letter-spacing: 0;
`;

const StyledTableWrap = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  max-height: 360px;
  overflow: auto;
`;

const StyledTable = styled.table`
  border-collapse: collapse;
  font-size: ${themeCssVariables.font.size.sm};
  table-layout: fixed;
  width: 100%;

  th,
  td {
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
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
    z-index: 1;
  }
`;

const StyledReference = styled.div`
  color: ${themeCssVariables.font.color.primary};
  overflow-wrap: anywhere;
`;

const StyledIssue = styled.div`
  color: ${themeCssVariables.color.red};
  line-height: 18px;
`;

const formatMad = (cents: number) =>
  new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
  }).format(cents / 100);

const localToday = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const isEmptyRow = (row: SpreadsheetRow) =>
  Object.values(row).every(
    (value) =>
      value === null || value === undefined || String(value).trim() === '',
  );

const parseSpreadsheet = async (file: File): Promise<SpreadsheetRow[]> => {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Le fichier doit peser au maximum 5 Mo.');
  }
  const workbook = read(await file.arrayBuffer(), {
    type: 'array',
    cellDates: false,
  });
  const firstSheetName = workbook.SheetNames[0];
  if (firstSheetName === undefined) {
    throw new Error('Le fichier ne contient aucune feuille.');
  }
  const rows = utils
    .sheet_to_json<SpreadsheetRow>(workbook.Sheets[firstSheetName], {
      defval: '',
      raw: false,
      dateNF: 'yyyy-mm-dd',
    })
    .filter((row) => !isEmptyRow(row));
  if (rows.length === 0) {
    throw new Error('Le fichier ne contient aucune ligne de données.');
  }
  if (rows.length > 5_000) {
    throw new Error("L'import est limité à 5 000 lignes.");
  }
  return rows;
};

const downloadTemplate = (definition: (typeof importDefinitions)[number]) => {
  const workbook = utils.book_new();
  const worksheet = utils.json_to_sheet(definition.rows);
  utils.book_append_sheet(workbook, worksheet, 'Import');
  const output = write(workbook, { bookType: 'xlsx', type: 'array' });
  const url = URL.createObjectURL(
    new Blob([output], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = definition.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const normalizedSummary = (row: ErpOnboardingNormalizedImportRow | null) => {
  if (row === null) return 'Ligne non interprétée';
  if ('accountCode' in row) {
    return `${row.accountCode} · D ${formatMad(row.debitCents)} · C ${formatMad(row.creditCents)}`;
  }
  if ('warehouseCode' in row) {
    return `${row.warehouseCode} · ${row.productCode} · ${row.quantity}`;
  }
  if ('tierName' in row) {
    return `${row.kind === 'RECEIVABLE' ? 'Créance' : 'Dette'} · ${row.tierName} · ${formatMad(row.outstandingAmountCents)}`;
  }
  if ('code' in row) {
    return `${row.code} · ${row.name} · ${row.defaultPriceHt.toLocaleString('fr-MA')} MAD HT`;
  }
  return `${row.type} · ${row.name}${row.ice ? ` · ICE ${row.ice}` : ''}`;
};

export const ErpOnboardingPage = () => {
  const { client, context } = useErpMarocContext();
  const navigate = useNavigate();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [readiness, setReadiness] = useState<ErpOnboardingReadiness | null>(
    null,
  );
  const [configuration, setConfiguration] =
    useState<ErpOnboardingConfiguration | null>(null);
  const [legalForm, setLegalForm] = useState<LegalForm>(emptyLegalForm);
  const [bankForm, setBankForm] = useState({
    name: 'Compte principal',
    bankName: '',
    rib: '',
    accountingAccountCode: '5141',
    openingBalanceMad: '0',
  });
  const [warehouseForm, setWarehouseForm] = useState({
    code: 'PRINCIPAL',
    name: 'Dépôt principal',
    address: '',
  });
  const [exerciceStartMonth, setExerciceStartMonth] = useState('1');
  const [configBusy, setConfigBusy] = useState<
    'LEGAL' | 'BANK' | 'WAREHOUSE' | 'ACCOUNTING' | 'COMPLETE' | null
  >(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);
  const [kind, setKind] = useState<ErpOnboardingImportKind>('TIERS');
  const [entryDate, setEntryDate] = useState(localToday);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<SpreadsheetRow[] | null>(null);
  const [preview, setPreview] = useState<ErpOnboardingImportPreview | null>(
    null,
  );
  const [result, setResult] = useState<ErpOnboardingImportApplyResult | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const definition = useMemo(
    () => importDefinitions.find((item) => item.kind === kind)!,
    [kind],
  );

  const loadReadiness = useCallback(async () => {
    setLoadState('loading');
    try {
      const [nextReadiness, nextConfiguration] = await Promise.all([
        client.request({
          method: 'GET',
          path: '/onboarding/readiness',
          schema: erpOnboardingReadinessSchema,
        }),
        client.request({
          method: 'GET',
          path: '/onboarding/configuration',
          schema: erpOnboardingConfigurationSchema,
        }),
      ]);
      setReadiness(nextReadiness);
      setConfiguration(nextConfiguration);
      setLegalForm({
        raisonSociale: nextConfiguration.legalProfile.raisonSociale,
        ice: nextConfiguration.legalProfile.ice ?? '',
        identifiantFiscal:
          nextConfiguration.legalProfile.identifiantFiscal ?? '',
        taxeProfessionnelleArticle:
          nextConfiguration.legalProfile.taxeProfessionnelleArticle ?? '',
        address: nextConfiguration.legalProfile.address ?? '',
        city: nextConfiguration.legalProfile.city ?? '',
        rc: nextConfiguration.legalProfile.rc ?? '',
        cnss: nextConfiguration.legalProfile.cnss ?? '',
      });
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [client]);

  const updateLegalField = (field: keyof LegalForm, value: string) => {
    setLegalForm((current) => ({ ...current, [field]: value }));
    setConfigError(null);
    setConfigSuccess(null);
  };

  const saveLegalProfile = async (event: FormEvent) => {
    event.preventDefault();
    setConfigBusy('LEGAL');
    setConfigError(null);
    setConfigSuccess(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'PATCH',
          path: '/onboarding/legal-profile',
          schema: erpSocieteLegalSummarySchema,
          body: legalForm,
        },
        { idempotency: 'forbidden' },
      );
      await intent.execute();
      setConfigSuccess('Identité légale et fiscale enregistrée.');
      await loadReadiness();
    } catch {
      setConfigError(
        "L'identité légale n'a pas été enregistrée. Vérifiez notamment les 15 chiffres de l’ICE.",
      );
    } finally {
      setConfigBusy(null);
    }
  };

  const createBankAccount = async (event: FormEvent) => {
    event.preventDefault();
    const openingBalance = Number(
      bankForm.openingBalanceMad.replace(/\s/g, '').replace(',', '.'),
    );
    if (!Number.isFinite(openingBalance)) {
      setConfigError("Le solde d'ouverture bancaire est invalide.");
      return;
    }
    setConfigBusy('BANK');
    setConfigError(null);
    setConfigSuccess(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/bank-accounts',
          schema: erpBankAccountSchema,
          body: {
            name: bankForm.name,
            bankName: bankForm.bankName,
            rib: bankForm.rib,
            accountingAccountCode: bankForm.accountingAccountCode,
            openingBalanceCents: Math.round(openingBalance * 100),
          },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setConfigSuccess('Compte bancaire ajouté.');
      await loadReadiness();
    } catch {
      setConfigError(
        "Le compte bancaire n'a pas été créé. Le RIB doit contenir 24 chiffres et le compte comptable doit exister.",
      );
    } finally {
      setConfigBusy(null);
    }
  };

  const createWarehouse = async (event: FormEvent) => {
    event.preventDefault();
    setConfigBusy('WAREHOUSE');
    setConfigError(null);
    setConfigSuccess(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/warehouses',
          schema: erpWarehouseSchema,
          body: {
            code: warehouseForm.code,
            name: warehouseForm.name,
            address: warehouseForm.address || null,
            isDefault: true,
          },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setConfigSuccess('Dépôt principal ajouté.');
      await loadReadiness();
    } catch {
      setConfigError(
        "Le dépôt n'a pas été créé. Vérifiez son code et son libellé.",
      );
    } finally {
      setConfigBusy(null);
    }
  };

  const initializeAccounting = async (event: FormEvent) => {
    event.preventDefault();
    setConfigBusy('ACCOUNTING');
    setConfigError(null);
    setConfigSuccess(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/onboarding/accounting-bootstrap',
          schema: erpOnboardingReadinessSchema,
          body: { exerciceStartMonth: Number(exerciceStartMonth) },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setConfigSuccess(
        'Plan PCGM, journaux, exercice, périodes et dossier de révision vérifiés.',
      );
      await loadReadiness();
    } catch {
      setConfigError(
        "La comptabilité n'a pas été initialisée. Vérifiez vos droits et les exercices déjà présents.",
      );
    } finally {
      setConfigBusy(null);
    }
  };

  const completeOnboarding = async () => {
    setConfigBusy('COMPLETE');
    setConfigError(null);
    setConfigSuccess(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/onboarding/complete',
          schema: erpOnboardingReadinessSchema,
        },
        { idempotency: 'required' },
      );
      setReadiness(await intent.execute());
      setConfigSuccess('Mise en service Zowka finalisée.');
    } catch {
      setConfigError(
        "La mise en service n'a pas été finalisée. Terminez les prérequis obligatoires ou vérifiez vos droits.",
      );
    } finally {
      setConfigBusy(null);
    }
  };

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness]);

  const resetImport = (nextKind?: ErpOnboardingImportKind) => {
    if (nextKind !== undefined) setKind(nextKind);
    setFileName(null);
    setRows(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const selectFile = async (file: File | null) => {
    setPreview(null);
    setResult(null);
    setError(null);
    if (file === null) {
      setFileName(null);
      setRows(null);
      return;
    }
    if (!/\.(csv|xls|xlsx)$/i.test(file.name)) {
      setFileName(null);
      setRows(null);
      setError('Sélectionnez un fichier CSV, XLS ou XLSX.');
      return;
    }
    try {
      const parsedRows = await parseSpreadsheet(file);
      setFileName(file.name);
      setRows(parsedRows);
    } catch (caught) {
      setFileName(null);
      setRows(null);
      setError(
        caught instanceof Error
          ? caught.message
          : 'Lecture du fichier impossible.',
      );
    }
  };

  const previewImport = async () => {
    if (rows === null) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/onboarding/imports/preview',
          schema: erpOnboardingImportPreviewSchema,
          body: {
            kind,
            rows,
            ...(dateRequiringKinds.has(kind) ? { entryDate } : {}),
          },
        },
        { idempotency: 'required' },
      );
      setPreview(await intent.execute());
    } catch {
      setPreview(null);
      setError(
        'La prévisualisation a échoué. Vérifiez les colonnes, les référentiels et les formats du fichier.',
      );
    } finally {
      setBusy(false);
    }
  };

  const applyImport = async () => {
    if (
      rows === null ||
      preview === null ||
      preview.errorCount > 0 ||
      preview.readyCount === 0
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/onboarding/imports/apply',
          schema: erpOnboardingImportApplyResultSchema,
          body: {
            kind,
            rows,
            ...(dateRequiringKinds.has(kind) ? { entryDate } : {}),
            previewDigest: preview.previewDigest,
            confirm: true,
          },
        },
        { idempotency: 'required' },
      );
      setResult(await intent.execute());
      await loadReadiness();
    } catch {
      setError(
        "L'import n'a pas été appliqué. Relancez la prévisualisation avant de réessayer.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ErpPageShell
      title="Mise en service PME"
      description="Préparation, reprise de données et contrôle avant démarrage"
      state={loadState}
      loadingLabel="Chargement de la checklist…"
      errorLabel="La checklist de mise en service est indisponible."
      onRetry={() => void loadReadiness()}
      actions={
        <Button
          title="Actualiser"
          ariaLabel="Actualiser la mise en service"
          Icon={IconRefresh}
          variant="secondary"
          disabled={busy}
          onClick={() => void loadReadiness()}
        />
      }
    >
      {readiness === null || configuration === null ? null : (
        <StyledWorkspace>
          <StyledReadiness>
            <StyledReadinessCopy>
              <ErpStatusBadge
                label={
                  readiness.completion !== null
                    ? 'Mise en service finalisée'
                    : readiness.readyForOperations
                    ? 'Prête pour les opérations'
                    : `${readiness.blockingCount} prérequis bloquant${readiness.blockingCount > 1 ? 's' : ''}`
                }
                tone={readiness.readyForOperations ? 'success' : 'warning'}
              />
              <StyledReadinessValue>
                {readiness.progressPercent}%
              </StyledReadinessValue>
              <StyledSecondary>
                {readiness.completedCount} étapes terminées sur{' '}
                {readiness.checks.length} · {readiness.importCount} import
                {readiness.importCount > 1 ? 's' : ''} appliqué
                {readiness.importCount > 1 ? 's' : ''}
              </StyledSecondary>
            </StyledReadinessCopy>
            <div>
              <StyledProgressTrack
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={readiness.progressPercent}
              >
                <StyledProgressFill value={readiness.progressPercent} />
              </StyledProgressTrack>
              <StyledSecondary>
                {readiness.openExercise === null
                  ? 'Aucun exercice comptable ouvert'
                  : `Exercice ${readiness.openExercise.year} · ${readiness.openExercise.startDate} au ${readiness.openExercise.endDate}`}
              </StyledSecondary>
            </div>
          </StyledReadiness>

          <StyledSection id="configuration">
            <StyledSectionHeader>
              <StyledSectionTitle>Configuration essentielle</StyledSectionTitle>
              <StyledSecondary>
                Société, comptabilité, banque et dépôt principal
              </StyledSecondary>
            </StyledSectionHeader>
            {configError === null ? null : (
              <StyledNotice danger role="alert">
                {configError}
              </StyledNotice>
            )}
            {configSuccess === null ? null : (
              <StyledNotice danger={false} role="status">
                {configSuccess}
              </StyledNotice>
            )}
            <StyledConfigurationGrid>
              <StyledConfigurationPanel onSubmit={saveLegalProfile}>
                <StyledConfigurationTitle>
                  Identité légale et fiscale
                </StyledConfigurationTitle>
                <StyledFormGrid>
                  {(
                    [
                      ['raisonSociale', 'Raison sociale'],
                      ['ice', 'ICE'],
                      ['identifiantFiscal', 'Identifiant fiscal'],
                      ['taxeProfessionnelleArticle', 'Taxe professionnelle'],
                      ['address', 'Adresse'],
                      ['city', 'Ville'],
                      ['rc', 'Registre de commerce'],
                      ['cnss', 'CNSS'],
                    ] as Array<[keyof LegalForm, string]>
                  ).map(([field, label]) => (
                    <StyledField key={field}>
                      {label}
                      <StyledTextInput
                        required={field !== 'rc' && field !== 'cnss'}
                        inputMode={field === 'ice' ? 'numeric' : undefined}
                        value={legalForm[field]}
                        onChange={(event) =>
                          updateLegalField(field, event.target.value)
                        }
                      />
                    </StyledField>
                  ))}
                </StyledFormGrid>
                <StyledFormActions>
                  <ErpStatusBadge
                    label={
                      readiness.checks.find(
                        (check) => check.key === 'LEGAL_PROFILE',
                      )?.complete
                        ? 'Complète'
                        : 'À compléter'
                    }
                    tone={
                      readiness.checks.find(
                        (check) => check.key === 'LEGAL_PROFILE',
                      )?.complete
                        ? 'success'
                        : 'danger'
                    }
                  />
                  <Button
                    type="submit"
                    title="Enregistrer"
                    ariaLabel="Enregistrer l’identité légale"
                    Icon={IconCheck}
                    accent="blue"
                    disabled={configBusy !== null}
                  />
                </StyledFormActions>
              </StyledConfigurationPanel>

              <StyledConfigurationPanel onSubmit={createBankAccount}>
                <StyledConfigurationTitle>
                  Compte bancaire
                </StyledConfigurationTitle>
                {configuration.bankAccounts.length > 0 ? (
                  <StyledConfiguredList>
                    {configuration.bankAccounts.map((account) => (
                      <StyledConfiguredItem key={account.id}>
                        <StyledCheckTitle>{account.name}</StyledCheckTitle>
                        <StyledSecondary>
                          {account.bankName} · RIB •••• {account.rib.slice(-4)}
                        </StyledSecondary>
                        <StyledSecondary>
                          Compte {account.accountingAccountCode} ·{' '}
                          {account.isActive ? 'Actif' : 'Inactif'}
                        </StyledSecondary>
                      </StyledConfiguredItem>
                    ))}
                  </StyledConfiguredList>
                ) : (
                  <StyledFormGrid>
                    {[
                      ['name', 'Libellé'],
                      ['bankName', 'Banque'],
                      ['rib', 'RIB à 24 chiffres'],
                      ['accountingAccountCode', 'Compte comptable'],
                      ['openingBalanceMad', "Solde d'ouverture MAD"],
                    ].map(([field, label]) => (
                      <StyledField key={field}>
                        {label}
                        <StyledTextInput
                          required
                          inputMode={
                            field === 'rib' || field === 'openingBalanceMad'
                              ? 'decimal'
                              : undefined
                          }
                          value={bankForm[field as keyof typeof bankForm]}
                          onChange={(event) =>
                            setBankForm((current) => ({
                              ...current,
                              [field]: event.target.value,
                            }))
                          }
                        />
                      </StyledField>
                    ))}
                  </StyledFormGrid>
                )}
                <StyledFormActions>
                  <ErpStatusBadge
                    label={
                      configuration.bankAccounts.length > 0
                        ? 'Configuré'
                        : 'Non configuré'
                    }
                    tone={
                      configuration.bankAccounts.length > 0
                        ? 'success'
                        : 'neutral'
                    }
                  />
                  {configuration.bankAccounts.length > 0 ? null : (
                    <Button
                      type="submit"
                      title="Ajouter"
                      ariaLabel="Ajouter le compte bancaire"
                      Icon={IconCheck}
                      accent="blue"
                      disabled={configBusy !== null}
                    />
                  )}
                </StyledFormActions>
              </StyledConfigurationPanel>

              <StyledConfigurationPanel onSubmit={createWarehouse}>
                <StyledConfigurationTitle>
                  Dépôt principal
                </StyledConfigurationTitle>
                {configuration.warehouses.length > 0 ? (
                  <StyledConfiguredList>
                    {configuration.warehouses.map((warehouse) => (
                      <StyledConfiguredItem key={warehouse.id}>
                        <StyledCheckTitle>
                          {warehouse.code} · {warehouse.name}
                        </StyledCheckTitle>
                        <StyledSecondary>
                          {warehouse.address ?? 'Adresse non renseignée'}
                        </StyledSecondary>
                        <StyledSecondary>
                          {warehouse.isDefault
                            ? 'Dépôt par défaut'
                            : 'Dépôt secondaire'}
                        </StyledSecondary>
                      </StyledConfiguredItem>
                    ))}
                  </StyledConfiguredList>
                ) : (
                  <StyledFormGrid>
                    {[
                      ['code', 'Code'],
                      ['name', 'Libellé'],
                      ['address', 'Adresse'],
                    ].map(([field, label]) => (
                      <StyledField key={field}>
                        {label}
                        <StyledTextInput
                          required={field !== 'address'}
                          value={
                            warehouseForm[field as keyof typeof warehouseForm]
                          }
                          onChange={(event) =>
                            setWarehouseForm((current) => ({
                              ...current,
                              [field]: event.target.value,
                            }))
                          }
                        />
                      </StyledField>
                    ))}
                  </StyledFormGrid>
                )}
                <StyledFormActions>
                  <ErpStatusBadge
                    label={
                      configuration.warehouses.length > 0
                        ? 'Configuré'
                        : 'Non configuré'
                    }
                    tone={
                      configuration.warehouses.length > 0
                        ? 'success'
                        : 'neutral'
                    }
                  />
                  {configuration.warehouses.length > 0 ? null : (
                    <Button
                      type="submit"
                      title="Créer"
                      ariaLabel="Créer le dépôt principal"
                      Icon={IconCheck}
                      accent="blue"
                      disabled={configBusy !== null}
                    />
                  )}
                </StyledFormActions>
              </StyledConfigurationPanel>

              <StyledConfigurationPanel onSubmit={initializeAccounting}>
                <StyledConfigurationTitle>
                  Comptabilité marocaine
                </StyledConfigurationTitle>
                <StyledConfiguredList>
                  {readiness.checks
                    .filter((check) =>
                      ['PCGM', 'JOURNALS', 'OPEN_EXERCISE'].includes(check.key),
                    )
                    .map((check) => (
                      <StyledConfiguredItem key={check.key}>
                        <StyledCheckTitle>{check.label}</StyledCheckTitle>
                        <StyledSecondary>{check.detail}</StyledSecondary>
                      </StyledConfiguredItem>
                    ))}
                </StyledConfiguredList>
                <StyledField>
                  Premier mois de l’exercice
                  <StyledSelect
                    value={exerciceStartMonth}
                    onChange={(event) => {
                      setExerciceStartMonth(event.target.value);
                      setConfigError(null);
                      setConfigSuccess(null);
                    }}
                  >
                    {fiscalStartMonths.map((label, index) => (
                      <option key={label} value={index + 1}>
                        {label}
                      </option>
                    ))}
                  </StyledSelect>
                </StyledField>
                <StyledFormActions>
                  <ErpStatusBadge
                    label={
                      ['PCGM', 'JOURNALS', 'OPEN_EXERCISE'].every(
                        (key) =>
                          readiness.checks.find((check) => check.key === key)
                            ?.complete,
                      )
                        ? 'Configurée'
                        : 'À initialiser'
                    }
                    tone={
                      ['PCGM', 'JOURNALS', 'OPEN_EXERCISE'].every(
                        (key) =>
                          readiness.checks.find((check) => check.key === key)
                            ?.complete,
                      )
                        ? 'success'
                        : 'danger'
                    }
                  />
                  <Button
                    type="submit"
                    title="Initialiser"
                    ariaLabel="Initialiser la comptabilité"
                    Icon={IconCheck}
                    accent="blue"
                    disabled={configBusy !== null}
                  />
                </StyledFormActions>
              </StyledConfigurationPanel>
            </StyledConfigurationGrid>
          </StyledSection>

          <StyledSection>
            <StyledSectionHeader>
              <StyledSectionTitle>Checklist de démarrage</StyledSectionTitle>
              <StyledSecondary>
                Les étapes obligatoires conditionnent le démarrage.
              </StyledSecondary>
            </StyledSectionHeader>
            <StyledChecks>
              {readiness.checks.map((check) => {
                const canNavigate =
                  !check.complete &&
                  check.actionPath !== erpMarocPaths.onboarding;
                return (
                  <StyledCheck key={check.key}>
                    <StyledCheckIcon complete={check.complete}>
                      {check.complete ? (
                        <IconCheck size={18} />
                      ) : (
                        <IconX size={18} />
                      )}
                    </StyledCheckIcon>
                    <StyledCheckCopy>
                      <StyledCheckTitle>{check.label}</StyledCheckTitle>
                      <StyledSecondary>{check.detail}</StyledSecondary>
                    </StyledCheckCopy>
                    {canNavigate ? (
                      <Button
                        title="Ouvrir"
                        ariaLabel={`Ouvrir ${check.label}`}
                        variant="secondary"
                        onClick={() => navigate(check.actionPath)}
                      />
                    ) : (
                      <ErpStatusBadge
                        label={
                          check.complete
                            ? 'Terminé'
                            : importCheckKeys.has(check.key)
                              ? 'À importer'
                              : check.required
                                ? 'Obligatoire'
                                : 'Optionnel'
                        }
                        tone={
                          check.complete
                            ? 'success'
                            : check.required
                              ? 'danger'
                              : 'neutral'
                        }
                      />
                    )}
                  </StyledCheck>
                );
              })}
            </StyledChecks>
          </StyledSection>

          <StyledSection id="activation">
            <StyledSectionHeader>
              <StyledSectionTitle>Démarrage de l’équipe</StyledSectionTitle>
              <StyledSecondary>
                Accès, salariés et activation opérationnelle
              </StyledSecondary>
            </StyledSectionHeader>
            <StyledLaunchPanel>
              <StyledLaunchCopy>
                <ErpStatusBadge
                  label={
                    readiness.completion === null
                      ? readiness.readyForOperations
                        ? 'Activation disponible'
                        : 'Prérequis en attente'
                      : 'Activation terminée'
                  }
                  tone={
                    readiness.completion !== null
                      ? 'success'
                      : readiness.readyForOperations
                        ? 'warning'
                        : 'neutral'
                  }
                />
                <StyledSecondary>
                  {readiness.completion === null
                    ? `${readiness.blockingCount} prérequis bloquant${readiness.blockingCount > 1 ? 's' : ''}`
                    : `Finalisée le ${new Intl.DateTimeFormat('fr-MA', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(readiness.completion.completedAt))}`}
                </StyledSecondary>
              </StyledLaunchCopy>
              <StyledLaunchActions>
                <Button
                  title="Salariés"
                  ariaLabel="Ouvrir les salariés et leur import"
                  Icon={IconUsers}
                  variant="secondary"
                  onClick={() => navigate(erpMarocPaths.hrCore)}
                />
                <Button
                  title="Membres"
                  ariaLabel="Inviter les membres de l’équipe"
                  Icon={IconUsers}
                  variant="secondary"
                  onClick={() =>
                    navigate(getSettingsPath(SettingsPath.WorkspaceMembersPage))
                  }
                />
                <Button
                  title="Rôles"
                  ariaLabel="Configurer les rôles de l’équipe"
                  Icon={IconLock}
                  variant="secondary"
                  onClick={() => navigate(getSettingsPath(SettingsPath.Roles))}
                />
                {context?.role === 'OWNER' || context?.role === 'ADMIN' ? (
                  <Button
                    title={
                      readiness.completion === null
                        ? 'Finaliser'
                        : 'Finalisée'
                    }
                    ariaLabel="Finaliser la mise en service Zowka"
                    Icon={IconCheck}
                    accent="blue"
                    disabled={
                      configBusy !== null ||
                      readiness.blockingCount > 0 ||
                      readiness.completion !== null
                    }
                    onClick={() => void completeOnboarding()}
                  />
                ) : null}
              </StyledLaunchActions>
            </StyledLaunchPanel>
          </StyledSection>

          <StyledSection id="imports">
            <StyledSectionHeader>
              <div>
                <StyledSectionTitle>Reprise de données</StyledSectionTitle>
                <StyledSecondary>{definition.description}</StyledSecondary>
              </div>
              <Button
                title="Télécharger le modèle"
                ariaLabel={`Télécharger le modèle ${definition.label}`}
                Icon={IconDownload}
                variant="secondary"
                onClick={() => downloadTemplate(definition)}
              />
            </StyledSectionHeader>
            <StyledImportWorkspace>
              <StyledSegments aria-label="Type de données à importer">
                {importDefinitions.map((item) => (
                  <StyledSegment
                    key={item.kind}
                    type="button"
                    active={item.kind === kind}
                    aria-pressed={item.kind === kind}
                    onClick={() => resetImport(item.kind)}
                  >
                    {item.label}
                  </StyledSegment>
                ))}
              </StyledSegments>

              <StyledImportControls>
                <StyledField>
                  Fichier
                  <StyledFileLabel>
                    <IconUpload size={18} />
                    <span>{fileName ?? 'Choisir un fichier CSV ou Excel'}</span>
                    <StyledFileInput
                      key={kind}
                      type="file"
                      accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={(event) =>
                        void selectFile(event.target.files?.[0] ?? null)
                      }
                    />
                  </StyledFileLabel>
                </StyledField>
                {dateRequiringKinds.has(kind) ? (
                  <StyledField>
                    Date de reprise
                    <StyledDateInput
                      type="date"
                      value={entryDate}
                      onChange={(event) => {
                        setEntryDate(event.target.value);
                        setPreview(null);
                        setResult(null);
                      }}
                    />
                  </StyledField>
                ) : (
                  <div />
                )}
                <Button
                  title="Prévisualiser"
                  ariaLabel={`Prévisualiser l’import ${definition.label}`}
                  Icon={IconRefresh}
                  variant="secondary"
                  disabled={
                    busy ||
                    rows === null ||
                    (dateRequiringKinds.has(kind) && entryDate === '')
                  }
                  onClick={() => void previewImport()}
                />
                <Button
                  title={`Importer ${preview?.readyCount ?? 0} lignes`}
                  ariaLabel={`Importer ${preview?.readyCount ?? 0} lignes`}
                  Icon={IconUpload}
                  accent="blue"
                  disabled={
                    busy ||
                    preview === null ||
                    preview.errorCount > 0 ||
                    preview.readyCount === 0 ||
                    result !== null
                  }
                  onClick={() => void applyImport()}
                />
              </StyledImportControls>

              {error === null ? null : (
                <StyledNotice danger role="alert">
                  {error}
                </StyledNotice>
              )}
              {result === null ? null : (
                <StyledNotice danger={false} role="status">
                  Import terminé : {result.createdCount} création
                  {result.createdCount > 1 ? 's' : ''} et {result.skippedCount}{' '}
                  ligne{result.skippedCount > 1 ? 's' : ''} déjà présente
                  {result.skippedCount > 1 ? 's' : ''}.
                </StyledNotice>
              )}

              {preview === null ? null : (
                <>
                  <StyledMetrics>
                    {[
                      ['Prêtes', preview.readyCount],
                      ['Déjà présentes', preview.skippedCount],
                      ['Erreurs', preview.errorCount],
                    ].map(([label, value]) => (
                      <StyledMetric key={label}>
                        <StyledSecondary>{label}</StyledSecondary>
                        <StyledMetricValue>{value}</StyledMetricValue>
                      </StyledMetric>
                    ))}
                  </StyledMetrics>
                  <StyledTableWrap>
                    <StyledTable>
                      <colgroup>
                        <col style={{ width: 72 }} />
                        <col style={{ width: 150 }} />
                        <col />
                        <col />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>Ligne</th>
                          <th>Statut</th>
                          <th>Référence</th>
                          <th>Contrôle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row) => (
                          <tr key={row.rowNumber}>
                            <td>{row.rowNumber}</td>
                            <td>
                              <ErpStatusBadge
                                label={
                                  row.status === 'READY'
                                    ? 'Prête'
                                    : row.status === 'SKIP_EXISTING'
                                      ? 'Déjà présente'
                                      : 'Erreur'
                                }
                                tone={
                                  row.status === 'READY'
                                    ? 'success'
                                    : row.status === 'SKIP_EXISTING'
                                      ? 'neutral'
                                      : 'danger'
                                }
                              />
                            </td>
                            <td>
                              <StyledReference>
                                {row.reference || 'Sans référence'}
                              </StyledReference>
                              <StyledSecondary>
                                {normalizedSummary(row.normalized)}
                              </StyledSecondary>
                            </td>
                            <td>
                              {row.errors.length === 0 ? (
                                <StyledSecondary>
                                  Aucune anomalie
                                </StyledSecondary>
                              ) : (
                                row.errors.map((issue) => (
                                  <StyledIssue key={issue}>{issue}</StyledIssue>
                                ))
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </StyledTable>
                  </StyledTableWrap>
                  {preview.totalDebitCents === undefined ? null : (
                    <StyledSecondary>
                      Balance contrôlée : débit{' '}
                      {formatMad(preview.totalDebitCents)} · crédit{' '}
                      {formatMad(preview.totalCreditCents ?? 0)}
                    </StyledSecondary>
                  )}
                  {preview.totalReceivableCents === undefined ? null : (
                    <StyledSecondary>
                      Encours contrôlés : créances{' '}
                      {formatMad(preview.totalReceivableCents)} · dettes{' '}
                      {formatMad(preview.totalPayableCents ?? 0)}
                    </StyledSecondary>
                  )}
                </>
              )}
            </StyledImportWorkspace>
          </StyledSection>
        </StyledWorkspace>
      )}
    </ErpPageShell>
  );
};
