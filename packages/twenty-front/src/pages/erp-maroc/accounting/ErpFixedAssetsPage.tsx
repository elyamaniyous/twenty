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
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  erpAccountingReferencesSchema,
  erpFixedAssetCategoryListSchema,
  erpFixedAssetCategorySchema,
  erpFixedAssetListSchema,
  erpFixedAssetSchema,
  type ErpAccountingReferences,
  type ErpFixedAsset,
  type ErpFixedAssetCategory,
  type ErpFixedAssetCategoryList,
  type ErpFixedAssetList,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconCoins,
  IconListDetails,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const EMPTY_ASSETS: ErpFixedAssetList = {
  items: [],
  summary: {
    acquisitionCostCents: 0,
    accumulatedDepreciationCents: 0,
    netBookValueCents: 0,
  },
};
const EMPTY_CATEGORIES: ErpFixedAssetCategoryList = { items: [] };
const EMPTY_REFERENCES: ErpAccountingReferences = { accounts: [], journals: [] };

type View = 'register' | 'categories' | 'schedule';

type AssetForm = {
  id: string | null;
  categoryId: string;
  code: string;
  name: string;
  acquisitionDate: string;
  inServiceDate: string;
  acquisitionCost: string;
  residualValue: string;
  usefulLifeMonths: string;
  supplierInvoiceReference: string;
  serialNumber: string;
  location: string;
};

type CategoryForm = {
  id: string | null;
  code: string;
  name: string;
  journalCode: string;
  assetAccountCode: string;
  accumulatedDepreciationAccountCode: string;
  depreciationExpenseAccountCode: string;
  disposalGainAccountCode: string;
  disposalLossAccountCode: string;
  defaultUsefulLifeMonths: string;
  isActive: boolean;
};

type DisposalForm = {
  type: 'SALE' | 'SCRAP' | 'LOSS';
  disposalDate: string;
  proceeds: string;
  proceedsAccountCode: string;
  reason: string;
};

const STATUS: Record<
  ErpFixedAsset['status'],
  { label: string; tone: ErpStatusTone }
> = {
  DRAFT: { label: 'Brouillon', tone: 'warning' },
  ACTIVE: { label: 'En service', tone: 'success' },
  FULLY_DEPRECIATED: { label: 'Amortie', tone: 'neutral' },
  DISPOSED: { label: 'Sortie', tone: 'danger' },
  CANCELLED: { label: 'Annulée', tone: 'danger' },
};

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const parseMad = (value: string, allowZero = false): number | null => {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) && (allowZero ? cents >= 0 : cents > 0)
    ? cents
    : null;
};

const controlCss = `
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 34px;
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;
const StyledToolbar = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;
const StyledTabs = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;
const StyledTab = styled.button<{ active: boolean }>`
  background: ${({ active }) =>
    active ? themeCssVariables.background.tertiary : 'transparent'};
  border: 0;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  font: inherit;
  height: 32px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;
const StyledSpacer = styled.div`
  flex: 1;
`;
const StyledSelect = styled.select`
  ${controlCss}
`;
const StyledInput = styled.input`
  ${controlCss}
`;
const StyledTextarea = styled.textarea`
  ${controlCss}
  height: 72px;
  padding-bottom: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[2]};
  resize: vertical;
`;
const StyledSummary = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 1fr));

  @media (max-width: 650px) {
    grid-template-columns: 1fr;
  }
`;
const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  span {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
  }
  strong {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.lg};
  }
`;
const StyledForm = styled.form`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  max-height: 50vh;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[4]};

  @media (max-width: 1050px) {
    grid-template-columns: repeat(2, minmax(150px, 1fr));
  }
  @media (max-width: 650px) {
    grid-template-columns: 1fr;
  }
`;
const StyledField = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;
const StyledFormActions = styled.div`
  align-items: end;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;
const StyledRowActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;
const StyledAlert = styled.div`
  background: ${themeCssVariables.background.danger};
  color: ${themeCssVariables.font.color.danger};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;
const StyledSelection = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};

  strong {
    color: ${themeCssVariables.font.color.primary};
  }
  span {
    color: ${themeCssVariables.font.color.secondary};
  }
`;

const emptyAssetForm = (categories: ErpFixedAssetCategory[]): AssetForm => ({
  id: null,
  categoryId: categories.find((category) => category.isActive)?.id ?? '',
  code: '',
  name: '',
  acquisitionDate: localDate(),
  inServiceDate: localDate(),
  acquisitionCost: '',
  residualValue: '0',
  usefulLifeMonths: '',
  supplierInvoiceReference: '',
  serialNumber: '',
  location: '',
});

const emptyCategoryForm = (references: ErpAccountingReferences): CategoryForm => ({
  id: null,
  code: '',
  name: '',
  journalCode:
    references.journals.find((journal) => journal.type === 'OD' && journal.isActive)
      ?.code ?? '',
  assetAccountCode: '',
  accumulatedDepreciationAccountCode: '',
  depreciationExpenseAccountCode: '',
  disposalGainAccountCode: '',
  disposalLossAccountCode: '',
  defaultUsefulLifeMonths: '60',
  isActive: true,
});

export const ErpFixedAssetsPage = () => {
  const { client, context } = useErpMarocContext();
  const [assets, setAssets] = useState(EMPTY_ASSETS);
  const [categories, setCategories] = useState(EMPTY_CATEGORIES);
  const [references, setReferences] = useState(EMPTY_REFERENCES);
  const [view, setView] = useState<View>('register');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assetForm, setAssetForm] = useState<AssetForm | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm | null>(null);
  const [disposalForm, setDisposalForm] = useState<DisposalForm | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;
    setLoadState('loading');
    const query = statusFilter === '' ? '' : `?status=${statusFilter}`;
    void Promise.all([
      client.request({ method: 'GET', path: `/accounting/fixed-assets${query}`, schema: erpFixedAssetListSchema }),
      client.request({ method: 'GET', path: '/accounting/fixed-assets/categories', schema: erpFixedAssetCategoryListSchema }),
      client.request({ method: 'GET', path: '/accounting/references', schema: erpAccountingReferencesSchema }),
    ])
      .then(([nextAssets, nextCategories, nextReferences]) => {
        if (!active) return;
        setAssets(nextAssets);
        setCategories(nextCategories);
        setReferences(nextReferences);
        setSelectedId((current) =>
          current && nextAssets.items.some((asset) => asset.id === current)
            ? current
            : (nextAssets.items[0]?.id ?? null),
        );
        setLoadState('ready');
      })
      .catch(() => active && setLoadState('error'));
    return () => {
      active = false;
    };
  }, [client, statusFilter]);

  useEffect(() => load(), [load]);

  const selected = useMemo(
    () => assets.items.find((asset) => asset.id === selectedId) ?? null,
    [assets.items, selectedId],
  );

  const replaceAsset = (asset: ErpFixedAsset) => {
    setAssets((current) => {
      const visible = statusFilter === '' || asset.status === statusFilter;
      const items = visible
        ? current.items.some((item) => item.id === asset.id)
          ? current.items.map((item) => (item.id === asset.id ? asset : item))
          : [asset, ...current.items]
        : current.items.filter((item) => item.id !== asset.id);
      return {
        items,
        summary: items.reduce(
          (summary, item) => ({
            acquisitionCostCents: summary.acquisitionCostCents + item.acquisitionCostCents,
            accumulatedDepreciationCents:
              summary.accumulatedDepreciationCents + item.accumulatedDepreciationCents,
            netBookValueCents: summary.netBookValueCents + item.netBookValueCents,
          }),
          { acquisitionCostCents: 0, accumulatedDepreciationCents: 0, netBookValueCents: 0 },
        ),
      };
    });
    setSelectedId(asset.id);
  };

  const mutateAsset = async (method: 'POST' | 'PATCH', path: string, body: unknown) => {
    const intent = client.createMutationIntent(
      { method, path, body, schema: erpFixedAssetSchema },
      { idempotency: 'required' },
    );
    const asset = await intent.execute();
    replaceAsset(asset);
    return asset;
  };

  const mutateCategory = async (method: 'POST' | 'PATCH', path: string, body: unknown) => {
    const intent = client.createMutationIntent(
      { method, path, body, schema: erpFixedAssetCategorySchema },
      { idempotency: 'required' },
    );
    const category = await intent.execute();
    setCategories((current) => ({
      items: current.items.some((item) => item.id === category.id)
        ? current.items.map((item) => (item.id === category.id ? category : item))
        : [...current.items, category].sort((left, right) => left.code.localeCompare(right.code)),
    }));
  };

  const saveAsset = async (event: FormEvent) => {
    event.preventDefault();
    if (!assetForm || !context || isSubmitting) return;
    const acquisitionCostCents = parseMad(assetForm.acquisitionCost);
    const residualValueCents = parseMad(assetForm.residualValue, true);
    const usefulLifeMonths = assetForm.usefulLifeMonths === '' ? null : Number(assetForm.usefulLifeMonths);
    if (
      !acquisitionCostCents || residualValueCents === null ||
      assetForm.categoryId === '' || assetForm.code.trim() === '' || assetForm.name.trim().length < 2 ||
      (usefulLifeMonths !== null && (!Number.isInteger(usefulLifeMonths) || usefulLifeMonths < 1))
    ) {
      setError('Les données de l’immobilisation sont incomplètes.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await mutateAsset(
        assetForm.id ? 'PATCH' : 'POST',
        assetForm.id ? `/accounting/fixed-assets/${assetForm.id}` : '/accounting/fixed-assets',
        {
          societeId: context.societeId,
          categoryId: assetForm.categoryId,
          code: assetForm.code.trim(),
          name: assetForm.name.trim(),
          acquisitionDate: assetForm.acquisitionDate,
          inServiceDate: assetForm.inServiceDate,
          acquisitionCostCents,
          residualValueCents,
          usefulLifeMonths,
          supplierInvoiceReference: assetForm.supplierInvoiceReference.trim() || null,
          serialNumber: assetForm.serialNumber.trim() || null,
          location: assetForm.location.trim() || null,
        },
      );
      setAssetForm(null);
    } catch {
      setError('Impossible d’enregistrer l’immobilisation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveCategory = async (event: FormEvent) => {
    event.preventDefault();
    if (!categoryForm || !context || isSubmitting) return;
    const life = Number(categoryForm.defaultUsefulLifeMonths);
    if (
      categoryForm.code.trim() === '' || categoryForm.name.trim().length < 2 ||
      !Number.isInteger(life) || life < 1 ||
      [categoryForm.journalCode, categoryForm.assetAccountCode,
        categoryForm.accumulatedDepreciationAccountCode,
        categoryForm.depreciationExpenseAccountCode,
        categoryForm.disposalGainAccountCode, categoryForm.disposalLossAccountCode].some((value) => value === '')
    ) {
      setError('Le paramétrage comptable de la catégorie est incomplet.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await mutateCategory(
        categoryForm.id ? 'PATCH' : 'POST',
        categoryForm.id
          ? `/accounting/fixed-assets/categories/${categoryForm.id}`
          : '/accounting/fixed-assets/categories',
        { ...categoryForm, id: undefined, societeId: context.societeId, defaultUsefulLifeMonths: life },
      );
      setCategoryForm(null);
    } catch {
      setError('Impossible d’enregistrer la catégorie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activate = async (asset: ErpFixedAsset) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await mutateAsset('POST', `/accounting/fixed-assets/${asset.id}/activate`, {});
      setView('schedule');
      setSelectedId(updated.id);
    } catch {
      setError('Le plan d’amortissement n’a pas pu être généré.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const postDepreciation = async (id: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await mutateAsset('POST', `/accounting/fixed-assets/depreciations/${id}/post`, {});
    } catch {
      setError('La dotation n’a pas pu être comptabilisée. Vérifiez la période et les approbations.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dispose = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !disposalForm || isSubmitting) return;
    const proceedsCents = parseMad(disposalForm.proceeds, true);
    if (
      proceedsCents === null || disposalForm.reason.trim().length < 5 ||
      (proceedsCents > 0 && disposalForm.proceedsAccountCode === '')
    ) {
      setError('Le motif et le compte d’encaissement sont requis.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await mutateAsset('POST', `/accounting/fixed-assets/${selected.id}/dispose`, {
        type: disposalForm.type,
        disposalDate: disposalForm.disposalDate,
        proceedsCents,
        proceedsAccountCode: disposalForm.proceedsAccountCode || null,
        reason: disposalForm.reason.trim(),
      });
      setDisposalForm(null);
    } catch {
      setError('La sortie d’actif n’a pas pu être comptabilisée.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeAccounts = references.accounts.filter((account) => account.isActive);
  const accountOptions = (value: string, onChange: (value: string) => void) => (
    <StyledSelect value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Compte</option>
      {activeAccounts.map((account) => (
        <option key={account.id} value={account.code}>{account.code} · {account.libelle}</option>
      ))}
    </StyledSelect>
  );

  const assetColumns: ErpOperationalTableColumn<ErpFixedAsset>[] = [
    { key: 'code', header: 'Code', width: '110px', render: (asset) => asset.code },
    { key: 'name', header: 'Immobilisation', width: '240px', render: (asset) => asset.name },
    { key: 'category', header: 'Catégorie', width: '180px', render: (asset) => asset.categoryName },
    { key: 'service', header: 'Mise en service', width: '130px', render: (asset) => asset.inServiceDate },
    { key: 'cost', header: 'Valeur brute', width: '140px', align: 'right', render: (asset) => formatMadCents(asset.acquisitionCostCents) },
    { key: 'accumulated', header: 'Amortissements', width: '150px', align: 'right', render: (asset) => formatMadCents(asset.accumulatedDepreciationCents) },
    { key: 'net', header: 'VNC', width: '130px', align: 'right', render: (asset) => formatMadCents(asset.netBookValueCents) },
    { key: 'status', header: 'Statut', width: '130px', render: (asset) => <ErpStatusBadge label={STATUS[asset.status].label} tone={STATUS[asset.status].tone} /> },
    { key: 'actions', header: '', width: '150px', align: 'right', render: (asset) => (
      <StyledRowActions>
        {asset.status === 'DRAFT' ? <Button title="Modifier" ariaLabel={`Modifier ${asset.name}`} Icon={IconPencil} variant="secondary" onClick={() => setAssetForm({
          id: asset.id, categoryId: asset.categoryId, code: asset.code, name: asset.name,
          acquisitionDate: asset.acquisitionDate, inServiceDate: asset.inServiceDate,
          acquisitionCost: (asset.acquisitionCostCents / 100).toFixed(2), residualValue: (asset.residualValueCents / 100).toFixed(2),
          usefulLifeMonths: String(asset.usefulLifeMonths), supplierInvoiceReference: asset.supplierInvoiceReference ?? '',
          serialNumber: asset.serialNumber ?? '', location: asset.location ?? '',
        })} /> : null}
        {asset.status === 'DRAFT' ? <Button title="Mettre en service" ariaLabel={`Mettre ${asset.name} en service`} Icon={IconCheck} accent="blue" onClick={() => void activate(asset)} /> : null}
        {asset.status !== 'DRAFT' && asset.status !== 'CANCELLED' ? <Button title="Échéancier" ariaLabel={`Voir l’échéancier de ${asset.name}`} Icon={IconListDetails} variant="secondary" onClick={() => { setSelectedId(asset.id); setView('schedule'); }} /> : null}
      </StyledRowActions>
    ) },
  ];

  const categoryColumns: ErpOperationalTableColumn<ErpFixedAssetCategory>[] = [
    { key: 'code', header: 'Code', width: '100px', render: (category) => category.code },
    { key: 'name', header: 'Catégorie', width: '220px', render: (category) => category.name },
    { key: 'asset', header: 'Actif', width: '120px', render: (category) => category.assetAccountCode },
    { key: 'accumulated', header: 'Amort. cumulés', width: '140px', render: (category) => category.accumulatedDepreciationAccountCode },
    { key: 'expense', header: 'Dotation', width: '120px', render: (category) => category.depreciationExpenseAccountCode },
    { key: 'life', header: 'Durée', width: '100px', align: 'right', render: (category) => `${category.defaultUsefulLifeMonths} mois` },
    { key: 'active', header: 'Statut', width: '100px', render: (category) => <ErpStatusBadge label={category.isActive ? 'Active' : 'Inactive'} tone={category.isActive ? 'success' : 'neutral'} /> },
    { key: 'actions', header: '', width: '70px', align: 'right', render: (category) => <Button title="Modifier" ariaLabel={`Modifier ${category.name}`} Icon={IconPencil} variant="secondary" onClick={() => setCategoryForm({
      id: category.id, code: category.code, name: category.name, journalCode: category.journalCode,
      assetAccountCode: category.assetAccountCode, accumulatedDepreciationAccountCode: category.accumulatedDepreciationAccountCode,
      depreciationExpenseAccountCode: category.depreciationExpenseAccountCode, disposalGainAccountCode: category.disposalGainAccountCode,
      disposalLossAccountCode: category.disposalLossAccountCode, defaultUsefulLifeMonths: String(category.defaultUsefulLifeMonths), isActive: category.isActive,
    })} /> },
  ];

  const firstPlannedId = selected?.depreciations.find((line) => line.status === 'PLANNED')?.id;
  const depreciationColumns: ErpOperationalTableColumn<ErpFixedAsset['depreciations'][number]>[] = [
    { key: 'period', header: 'Période', width: '110px', render: (line) => line.periodKey },
    { key: 'dates', header: 'Prorata', width: '210px', render: (line) => `${line.periodStart} au ${line.periodEnd}` },
    { key: 'amount', header: 'Dotation', width: '140px', align: 'right', render: (line) => formatMadCents(line.depreciationCents) },
    { key: 'accumulated', header: 'Cumul', width: '140px', align: 'right', render: (line) => formatMadCents(line.accumulatedCents) },
    { key: 'net', header: 'VNC prévue', width: '140px', align: 'right', render: (line) => formatMadCents(line.netBookValueCents) },
    { key: 'status', header: 'Statut', width: '120px', render: (line) => <ErpStatusBadge label={line.status === 'POSTED' ? 'Comptabilisée' : line.status === 'PLANNED' ? 'Planifiée' : 'Annulée'} tone={line.status === 'POSTED' ? 'success' : line.status === 'PLANNED' ? 'warning' : 'neutral'} /> },
    { key: 'actions', header: '', width: '80px', align: 'right', render: (line) => line.id === firstPlannedId && selected?.status === 'ACTIVE' ? <Button title="Comptabiliser" ariaLabel={`Comptabiliser ${line.periodKey}`} Icon={IconCheck} accent="blue" disabled={isSubmitting} onClick={() => void postDepreciation(line.id)} /> : null },
  ];

  return (
    <ErpPageShell
      title="Immobilisations"
      description="Registre, amortissements et sorties d’actifs"
      state={loadState}
      loadingLabel="Chargement des immobilisations…"
      errorLabel="Impossible de charger les immobilisations."
      onRetry={load}
      actions={<Button title="Actualiser" ariaLabel="Actualiser" Icon={IconRefresh} variant="secondary" onClick={load} />}
    >
      <StyledContent>
        <StyledToolbar>
          <StyledTabs role="tablist" aria-label="Vues immobilisations">
            {(['register', 'categories', 'schedule'] as const).map((item) => (
              <StyledTab key={item} role="tab" active={view === item} aria-selected={view === item} onClick={() => setView(item)}>
                {item === 'register' ? 'Registre' : item === 'categories' ? 'Catégories' : 'Échéancier'}
              </StyledTab>
            ))}
          </StyledTabs>
          <StyledSpacer />
          {view === 'register' ? <StyledSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ width: 170 }}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
          </StyledSelect> : null}
          {view === 'register' ? <Button title="Nouvelle immobilisation" ariaLabel="Nouvelle immobilisation" Icon={IconPlus} accent="blue" disabled={!categories.items.some((category) => category.isActive)} onClick={() => setAssetForm(emptyAssetForm(categories.items))} /> : null}
          {view === 'categories' ? <Button title="Nouvelle catégorie" ariaLabel="Nouvelle catégorie" Icon={IconPlus} accent="blue" onClick={() => setCategoryForm(emptyCategoryForm(references))} /> : null}
        </StyledToolbar>
        {error ? <StyledAlert role="alert">{error}</StyledAlert> : null}
        {view === 'register' ? <StyledSummary>
          <StyledMetric><span>Valeur brute</span><strong>{formatMadCents(assets.summary.acquisitionCostCents)}</strong></StyledMetric>
          <StyledMetric><span>Amortissements cumulés</span><strong>{formatMadCents(assets.summary.accumulatedDepreciationCents)}</strong></StyledMetric>
          <StyledMetric><span>Valeur nette comptable</span><strong>{formatMadCents(assets.summary.netBookValueCents)}</strong></StyledMetric>
        </StyledSummary> : null}
        {assetForm ? <StyledForm onSubmit={saveAsset}>
          <StyledField>Catégorie<StyledSelect value={assetForm.categoryId} onChange={(event) => setAssetForm({ ...assetForm, categoryId: event.target.value })}>{categories.items.filter((category) => category.isActive || category.id === assetForm.categoryId).map((category) => <option key={category.id} value={category.id}>{category.code} · {category.name}</option>)}</StyledSelect></StyledField>
          <StyledField>Code<StyledInput value={assetForm.code} onChange={(event) => setAssetForm({ ...assetForm, code: event.target.value })} /></StyledField>
          <StyledField>Désignation<StyledInput value={assetForm.name} onChange={(event) => setAssetForm({ ...assetForm, name: event.target.value })} /></StyledField>
          <StyledField>Valeur brute (MAD)<StyledInput inputMode="decimal" value={assetForm.acquisitionCost} onChange={(event) => setAssetForm({ ...assetForm, acquisitionCost: event.target.value })} /></StyledField>
          <StyledField>Date d’acquisition<StyledInput type="date" value={assetForm.acquisitionDate} onChange={(event) => setAssetForm({ ...assetForm, acquisitionDate: event.target.value })} /></StyledField>
          <StyledField>Mise en service<StyledInput type="date" value={assetForm.inServiceDate} onChange={(event) => setAssetForm({ ...assetForm, inServiceDate: event.target.value })} /></StyledField>
          <StyledField>Valeur résiduelle (MAD)<StyledInput inputMode="decimal" value={assetForm.residualValue} onChange={(event) => setAssetForm({ ...assetForm, residualValue: event.target.value })} /></StyledField>
          <StyledField>Durée (mois)<StyledInput inputMode="numeric" placeholder="Catégorie" value={assetForm.usefulLifeMonths} onChange={(event) => setAssetForm({ ...assetForm, usefulLifeMonths: event.target.value })} /></StyledField>
          <StyledField>Facture fournisseur<StyledInput value={assetForm.supplierInvoiceReference} onChange={(event) => setAssetForm({ ...assetForm, supplierInvoiceReference: event.target.value })} /></StyledField>
          <StyledField>N° de série<StyledInput value={assetForm.serialNumber} onChange={(event) => setAssetForm({ ...assetForm, serialNumber: event.target.value })} /></StyledField>
          <StyledField>Emplacement<StyledInput value={assetForm.location} onChange={(event) => setAssetForm({ ...assetForm, location: event.target.value })} /></StyledField>
          <StyledFormActions><Button type="button" title="Fermer" ariaLabel="Fermer" Icon={IconX} variant="secondary" onClick={() => setAssetForm(null)} /><Button type="submit" title="Enregistrer" ariaLabel="Enregistrer" Icon={IconCheck} accent="blue" disabled={isSubmitting} /></StyledFormActions>
        </StyledForm> : null}
        {categoryForm ? <StyledForm onSubmit={saveCategory}>
          <StyledField>Code<StyledInput value={categoryForm.code} onChange={(event) => setCategoryForm({ ...categoryForm, code: event.target.value })} /></StyledField>
          <StyledField>Libellé<StyledInput value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} /></StyledField>
          <StyledField>Durée par défaut (mois)<StyledInput inputMode="numeric" value={categoryForm.defaultUsefulLifeMonths} onChange={(event) => setCategoryForm({ ...categoryForm, defaultUsefulLifeMonths: event.target.value })} /></StyledField>
          <StyledField>Journal<StyledSelect value={categoryForm.journalCode} onChange={(event) => setCategoryForm({ ...categoryForm, journalCode: event.target.value })}>{references.journals.filter((journal) => journal.isActive).map((journal) => <option key={journal.id} value={journal.code}>{journal.code} · {journal.libelle}</option>)}</StyledSelect></StyledField>
          <StyledField>Compte d’actif{accountOptions(categoryForm.assetAccountCode, (value) => setCategoryForm({ ...categoryForm, assetAccountCode: value }))}</StyledField>
          <StyledField>Amortissements cumulés{accountOptions(categoryForm.accumulatedDepreciationAccountCode, (value) => setCategoryForm({ ...categoryForm, accumulatedDepreciationAccountCode: value }))}</StyledField>
          <StyledField>Dotation{accountOptions(categoryForm.depreciationExpenseAccountCode, (value) => setCategoryForm({ ...categoryForm, depreciationExpenseAccountCode: value }))}</StyledField>
          <StyledField>Plus-value{accountOptions(categoryForm.disposalGainAccountCode, (value) => setCategoryForm({ ...categoryForm, disposalGainAccountCode: value }))}</StyledField>
          <StyledField>Moins-value{accountOptions(categoryForm.disposalLossAccountCode, (value) => setCategoryForm({ ...categoryForm, disposalLossAccountCode: value }))}</StyledField>
          <StyledField>Statut<StyledSelect value={categoryForm.isActive ? 'active' : 'inactive'} onChange={(event) => setCategoryForm({ ...categoryForm, isActive: event.target.value === 'active' })}><option value="active">Active</option><option value="inactive">Inactive</option></StyledSelect></StyledField>
          <StyledFormActions><Button type="button" title="Fermer" ariaLabel="Fermer" Icon={IconX} variant="secondary" onClick={() => setCategoryForm(null)} /><Button type="submit" title="Enregistrer" ariaLabel="Enregistrer" Icon={IconCheck} accent="blue" disabled={isSubmitting} /></StyledFormActions>
        </StyledForm> : null}
        {view === 'register' ? <ErpOperationalTable ariaLabel="Registre des immobilisations" columns={assetColumns} rows={assets.items} getRowKey={(asset) => asset.id} emptyLabel={categories.items.length === 0 ? 'Créez une catégorie comptable avant la première immobilisation.' : 'Aucune immobilisation.'} /> : null}
        {view === 'categories' ? <ErpOperationalTable ariaLabel="Catégories d’immobilisations" columns={categoryColumns} rows={categories.items} getRowKey={(category) => category.id} emptyLabel="Aucune catégorie d’immobilisation." /> : null}
        {view === 'schedule' ? <>
          <StyledSelection>
            <strong>{selected?.name ?? 'Aucune immobilisation'}</strong>
            {selected ? <span>{selected.code} · VNC {formatMadCents(selected.netBookValueCents)}</span> : null}
            <StyledSpacer />
            {selected && (selected.status === 'ACTIVE' || selected.status === 'FULLY_DEPRECIATED') ? <Button title="Sortir l’actif" ariaLabel="Sortir l’actif" Icon={IconCoins} variant="secondary" onClick={() => setDisposalForm({ type: 'SALE', disposalDate: localDate(), proceeds: '0', proceedsAccountCode: '', reason: '' })} /> : null}
          </StyledSelection>
          {disposalForm ? <StyledForm onSubmit={dispose}>
            <StyledField>Nature<StyledSelect value={disposalForm.type} onChange={(event) => setDisposalForm({ ...disposalForm, type: event.target.value as DisposalForm['type'], proceeds: event.target.value === 'SALE' ? disposalForm.proceeds : '0' })}><option value="SALE">Vente</option><option value="SCRAP">Mise au rebut</option><option value="LOSS">Perte / sinistre</option></StyledSelect></StyledField>
            <StyledField>Date de sortie<StyledInput type="date" value={disposalForm.disposalDate} onChange={(event) => setDisposalForm({ ...disposalForm, disposalDate: event.target.value })} /></StyledField>
            <StyledField>Prix de cession (MAD)<StyledInput inputMode="decimal" disabled={disposalForm.type !== 'SALE'} value={disposalForm.proceeds} onChange={(event) => setDisposalForm({ ...disposalForm, proceeds: event.target.value })} /></StyledField>
            <StyledField>Compte d’encaissement{accountOptions(disposalForm.proceedsAccountCode, (value) => setDisposalForm({ ...disposalForm, proceedsAccountCode: value }))}</StyledField>
            <StyledField>Motif<StyledTextarea value={disposalForm.reason} onChange={(event) => setDisposalForm({ ...disposalForm, reason: event.target.value })} /></StyledField>
            <StyledFormActions><Button type="button" title="Fermer" ariaLabel="Fermer" Icon={IconX} variant="secondary" onClick={() => setDisposalForm(null)} /><Button type="submit" title="Comptabiliser la sortie" ariaLabel="Comptabiliser la sortie" Icon={IconCheck} accent="blue" disabled={isSubmitting} /></StyledFormActions>
          </StyledForm> : null}
          <ErpOperationalTable ariaLabel="Plan d’amortissement" columns={depreciationColumns} rows={selected?.depreciations ?? []} getRowKey={(line) => line.id} emptyLabel="Aucun plan d’amortissement sélectionné." />
        </> : null}
      </StyledContent>
    </ErpPageShell>
  );
};
