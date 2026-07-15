import { ErpMarocError } from '@/erp-maroc/api/erpMarocError';
import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { ErpTierFilters } from '@/erp-maroc/tiers/ErpTierFilters';
import { ErpTierFormDrawer } from '@/erp-maroc/tiers/ErpTierFormDrawer';
import { ErpTierSyncDrawer } from '@/erp-maroc/tiers/ErpTierSyncDrawer';
import { buildTwentyCompanySyncPreview } from '@/erp-maroc/tiers/buildTwentyCompanySyncPreview';
import {
  EMPTY_TIER_FORM,
  TIER_PICKER_PAGE_LIMIT,
  isCollectiveAccount,
  isTierType,
  nullableTierValue,
  parseCreditLimit,
  parsePaymentDelayDays,
  toSyncFormValues,
  toTierFormValues,
  type PreviewFieldKey,
  type ReconciliationState,
  type SyncFormValues,
  type TierFormValues,
  type TwentyCompanyRecord,
  type TwentyPersonRecord,
} from '@/erp-maroc/tiers/tierForm';
import {
  canonicalizeErpQueryState,
  updateErpQueryState,
} from '@/erp-maroc/utils/queryState';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  erpTierListSchema,
  erpTierSchema,
  type ErpTier,
} from 'twenty-shared/erp-maroc';
import { AppPath } from 'twenty-shared/types';
import { getAppPath, isValidUuid } from 'twenty-shared/utils';
import { IconEdit, IconPlus, IconRefresh } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type DrawerState =
  | { kind: 'form'; mode: 'create' }
  | { kind: 'form'; mode: 'edit'; tier: ErpTier }
  | { kind: 'sync'; tier: ErpTier | null };

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledCompanyLink = styled(Link)`
  color: ${themeCssVariables.color.blue};
  font-size: ${themeCssVariables.font.size.sm};
`;

const getReconciliationMessage = (error: unknown) => {
  if (!(error instanceof ErpMarocError) || error.statusCode >= 500) {
    return 'État à vérifier';
  }
  if (error.statusCode === 409) {
    return 'Conflit ERP : vérifiez les données actualisées';
  }
  if (error.statusCode === 429) {
    return 'Limitation ERP : vérifiez les données actualisées';
  }
  return null;
};

export const ErpTiersPage = () => {
  const { client, context } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tiers, setTiers] = useState<ErpTier[]>([]);
  const [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [generation, setGeneration] = useState(0);
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [reconciliation, setReconciliation] =
    useState<ReconciliationState>(null);
  const [selectedCompanyRecord, setSelectedCompanyRecord] =
    useState<TwentyCompanyRecord | null>(null);
  const [selectedPersonRecord, setSelectedPersonRecord] =
    useState<TwentyPersonRecord | null>(null);
  // The lock must update synchronously before React can process a second submit.
  // oxlint-disable-next-line twenty/no-state-useref
  const mutationLock = useRef(false);
  // oxlint-disable-next-line twenty/no-state-useref
  const handledSyncDeepLink = useRef<string | null>(null);
  // oxlint-disable-next-line twenty/no-state-useref
  const initializedTargetedCompany = useRef<string | null>(null);
  const form = useForm<TierFormValues>({ defaultValues: EMPTY_TIER_FORM });
  const syncForm = useForm<SyncFormValues>({
    defaultValues: toSyncFormValues(null, null, null),
  });
  const isSyncDrawer = drawer?.kind === 'sync';
  const companySearch = syncForm.watch('companySearch');
  const selectedCompanyId = syncForm.watch('companyId');
  const selectedPersonId = syncForm.watch('personId');
  const overwriteConfirmed = syncForm.watch('overwriteConfirmed');
  const normalizedCompanySearch = companySearch.trim();
  const canonicalSearchParams = useMemo(
    () => canonicalizeErpQueryState('tiers', searchParams),
    [searchParams],
  );
  const syncCompanyId = canonicalSearchParams.get('syncCompanyId');
  const resumeOpportunityId = canonicalSearchParams.get('resumeOpportunityId');
  const hasTierPermission = () => context?.capabilities.manageTiers === true;
  const canManageTiers = hasTierPermission();
  const companyFilter =
    isSyncDrawer && normalizedCompanySearch !== ''
      ? { name: { ilike: `%${normalizedCompanySearch}%` } }
      : undefined;
  const personFilter =
    isSyncDrawer && selectedCompanyId !== ''
      ? { companyId: { eq: selectedCompanyId } }
      : undefined;

  const {
    records: companies,
    loading: companiesLoading,
    error: companiesError,
    hasNextPage: companiesHaveNextPage,
    fetchMoreRecords: fetchMoreCompanies,
    refetch: refetchCompanies,
  } = useFindManyRecords<TwentyCompanyRecord>({
    objectNameSingular: 'company',
    recordGqlFields: {
      id: true,
      name: true,
      address: {
        addressStreet1: true,
        addressStreet2: true,
        addressPostcode: true,
        addressCity: true,
      },
    },
    filter: companyFilter,
    limit: TIER_PICKER_PAGE_LIMIT,
    skip: !isSyncDrawer,
  });
  const shouldResolveTargetedCompany =
    isSyncDrawer &&
    canManageTiers &&
    syncCompanyId !== null &&
    selectedCompanyId === syncCompanyId;
  const {
    records: targetedCompanies,
    loading: targetedCompanyLoading,
    error: targetedCompanyError,
    refetch: refetchTargetedCompany,
  } = useFindManyRecords<TwentyCompanyRecord>({
    objectNameSingular: 'company',
    recordGqlFields: {
      id: true,
      name: true,
      address: {
        addressStreet1: true,
        addressStreet2: true,
        addressPostcode: true,
        addressCity: true,
      },
    },
    filter: syncCompanyId === null ? undefined : { id: { eq: syncCompanyId } },
    limit: 1,
    skip: !shouldResolveTargetedCompany,
  });
  const {
    records: people,
    loading: peopleLoading,
    error: peopleError,
    hasNextPage: peopleHaveNextPage,
    fetchMoreRecords: fetchMorePeople,
    refetch: refetchPeople,
  } = useFindManyRecords<TwentyPersonRecord>({
    objectNameSingular: 'person',
    recordGqlFields: {
      id: true,
      companyId: true,
      name: { firstName: true, lastName: true },
      emails: { primaryEmail: true },
      phones: {
        primaryPhoneCallingCode: true,
        primaryPhoneNumber: true,
      },
    },
    filter: personFilter,
    limit: TIER_PICKER_PAGE_LIMIT,
    skip: !isSyncDrawer || selectedCompanyId === '',
  });
  const knownSelectedPerson =
    people.find(
      ({ id, companyId }) =>
        id === selectedPersonId && companyId === selectedCompanyId,
    ) ??
    (selectedPersonRecord?.id === selectedPersonId &&
    selectedPersonRecord.companyId === selectedCompanyId
      ? selectedPersonRecord
      : null);
  const shouldResolveLinkedPerson =
    isSyncDrawer && selectedPersonId !== '' && knownSelectedPerson === null;
  const {
    records: linkedPeople,
    loading: linkedPersonLoading,
    error: linkedPersonError,
    refetch: refetchLinkedPerson,
  } = useFindManyRecords<TwentyPersonRecord>({
    objectNameSingular: 'person',
    recordGqlFields: {
      id: true,
      companyId: true,
      name: { firstName: true, lastName: true },
      emails: { primaryEmail: true },
      phones: {
        primaryPhoneCallingCode: true,
        primaryPhoneNumber: true,
      },
    },
    filter: shouldResolveLinkedPerson
      ? { id: { eq: selectedPersonId } }
      : undefined,
    limit: 1,
    skip: !shouldResolveLinkedPerson,
  });
  useEffect(() => {
    if (searchParams.toString() !== canonicalSearchParams.toString()) {
      setSearchParams(canonicalSearchParams, { replace: true });
    }
  }, [canonicalSearchParams, searchParams, setSearchParams]);

  useEffect(() => {
    const abortController = new AbortController();
    let isCurrent = true;
    setListStatus('loading');
    client
      .request({
        method: 'GET',
        path: '/tiers',
        schema: erpTierListSchema,
        signal: abortController.signal,
      })
      .then((loaded) => {
        if (!isCurrent || abortController.signal.aborted) return;
        setTiers(loaded);
        setListStatus('ready');
        setReconciliation((current) =>
          current === 'refreshing' ? 'ready' : current,
        );
      })
      .catch(() => {
        if (!isCurrent || abortController.signal.aborted) return;
        setListStatus('error');
        setReconciliation((current) =>
          current === 'refreshing' ? 'failed' : current,
        );
      });
    return () => {
      isCurrent = false;
      abortController.abort();
    };
  }, [client, generation]);

  const selectedCompany =
    companies.find(({ id }) => id === selectedCompanyId) ??
    targetedCompanies.find(({ id }) => id === selectedCompanyId) ??
    (selectedCompanyRecord?.id === selectedCompanyId
      ? selectedCompanyRecord
      : null);

  useEffect(() => {
    if (
      !shouldResolveTargetedCompany ||
      selectedCompany === null ||
      listStatus !== 'ready' ||
      initializedTargetedCompany.current === selectedCompany.id
    ) {
      return;
    }

    initializedTargetedCompany.current = selectedCompany.id;
    const linkedTier =
      tiers.find(
        ({ twentyCompanyId }) => twentyCompanyId === selectedCompany.id,
      ) ?? null;
    const currentCompanySearch = syncForm.getValues('companySearch');
    setSelectedCompanyRecord(selectedCompany);
    setSelectedPersonRecord(null);
    syncForm.reset({
      ...toSyncFormValues(selectedCompany, null, linkedTier),
      companySearch: currentCompanySearch,
    });
  }, [
    listStatus,
    selectedCompany,
    shouldResolveTargetedCompany,
    syncForm,
    tiers,
  ]);
  const targetedCompanyResolution = !shouldResolveTargetedCompany
    ? 'not-required'
    : selectedCompany !== null
      ? 'resolved'
      : targetedCompanyLoading
        ? 'loading'
        : targetedCompanyError
          ? 'error'
          : 'unresolved';
  const resolvedLinkedPerson =
    linkedPeople.find(
      ({ id, companyId }) =>
        id === selectedPersonId && companyId === selectedCompanyId,
    ) ?? null;
  const selectedPerson = knownSelectedPerson ?? resolvedLinkedPerson;
  const linkedPersonResolution =
    selectedPersonId === ''
      ? 'not-required'
      : selectedPerson !== null
        ? 'resolved'
        : linkedPersonLoading
          ? 'loading'
          : linkedPersonError
            ? 'error'
            : 'unresolved';
  const companyOptions =
    selectedCompany !== null &&
    companies.every(({ id }) => id !== selectedCompany.id)
      ? [selectedCompany, ...companies]
      : companies;
  const peopleOptions =
    selectedPerson !== null &&
    people.every(({ id }) => id !== selectedPerson.id)
      ? [selectedPerson, ...people]
      : people;
  const resolveSyncTier = (companyId: string) => {
    const linkedTier =
      tiers.find((tier) => tier.twentyCompanyId === companyId) ?? null;
    if (linkedTier !== null) return linkedTier;
    return drawer?.kind === 'sync' && drawer.tier?.twentyCompanyId === null
      ? drawer.tier
      : null;
  };
  const existingSyncTier =
    drawer?.kind === 'sync' ? resolveSyncTier(selectedCompanyId) : null;
  const preview = useMemo(
    () =>
      selectedCompany === null
        ? null
        : buildTwentyCompanySyncPreview(
            selectedCompany,
            selectedPerson,
            existingSyncTier,
          ),
    [existingSyncTier, selectedCompany, selectedPerson],
  );
  const previewSignature = useMemo(() => JSON.stringify(preview), [preview]);
  // The previous signature tracks external CRM changes without reacting to the
  // confirmation checkbox itself.
  // oxlint-disable-next-line twenty/no-state-useref
  const previousPreviewSignature = useRef(previewSignature);

  useEffect(() => {
    if (
      previousPreviewSignature.current !== previewSignature &&
      syncForm.getValues('overwriteConfirmed')
    ) {
      syncForm.setValue('overwriteConfirmed', false, { shouldDirty: true });
    }
    previousPreviewSignature.current = previewSignature;
  }, [previewSignature, syncForm]);

  const sentPreviewValue = (key: PreviewFieldKey, values: SyncFormValues) => {
    if (preview === null) return null;
    const field = preview[key];
    const source = values.sources[key];
    if (source === 'manual') return values.manualValues[key];
    if (source === field.selected) return field.proposed;
    return source === 'crm' ? field.crm : field.erp;
  };

  const clearOverwriteConfirmation = () =>
    syncForm.setValue('overwriteConfirmed', false, { shouldDirty: true });

  const search = canonicalSearchParams.get('search') ?? '';
  const typeFilter = canonicalSearchParams.get('type') ?? 'all';
  const activeFilter = canonicalSearchParams.get('active') ?? 'all';
  const filteredTiers = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();
    return tiers.filter((tier) => {
      const matchesSearch =
        normalized === '' ||
        [tier.name, tier.email, tier.phone, tier.ice]
          .filter((value): value is string => value !== null)
          .some((value) => value.toLocaleLowerCase().includes(normalized));
      const matchesType = typeFilter === 'all' || tier.type === typeFilter;
      const matchesActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' ? tier.isActive : !tier.isActive);
      return matchesSearch && matchesType && matchesActive;
    });
  }, [activeFilter, search, tiers, typeFilter]);

  const updateFilters = (changes: Record<string, string | null>) =>
    setSearchParams(
      updateErpQueryState('tiers', canonicalSearchParams, changes),
    );

  const retryList = () => {
    setReconciliation((current) =>
      current === 'failed' ? 'refreshing' : current,
    );
    setGeneration((current) => current + 1);
  };

  const acknowledgeReconciliation = () => {
    setReconciliation(null);
    setMutationError(null);
  };

  const openCreate = () => {
    if (!hasTierPermission()) return;
    form.reset(EMPTY_TIER_FORM);
    setMutationError(null);
    setReconciliation(null);
    setDrawer({ kind: 'form', mode: 'create' });
  };

  const openEdit = (tier: ErpTier) => {
    if (!hasTierPermission()) return;
    form.reset(toTierFormValues(tier));
    setMutationError(null);
    setReconciliation(null);
    setDrawer({ kind: 'form', mode: 'edit', tier });
  };

  const openSync = (tier: ErpTier | null) => {
    if (!hasTierPermission()) return;
    const company =
      companies.find(({ id }) => id === tier?.twentyCompanyId) ?? null;
    const person =
      company === null
        ? null
        : (people.find(({ id }) => id === tier?.twentyPersonId) ?? null);
    const initialValues = toSyncFormValues(company, person, tier);
    if (company === null && tier?.twentyCompanyId !== null) {
      initialValues.companyId = tier?.twentyCompanyId ?? '';
    }
    if (person === null && tier?.twentyPersonId !== null) {
      initialValues.personId = tier?.twentyPersonId ?? '';
    }
    setSelectedCompanyRecord(company);
    setSelectedPersonRecord(person);
    syncForm.reset(initialValues);
    setMutationError(null);
    setReconciliation(null);
    setDrawer({ kind: 'sync', tier });
  };

  useEffect(() => {
    if (!canManageTiers || syncCompanyId === null) return;
    const deepLinkKey = `${syncCompanyId}:${resumeOpportunityId ?? ''}`;
    if (handledSyncDeepLink.current === deepLinkKey) return;

    handledSyncDeepLink.current = deepLinkKey;
    const initialValues = toSyncFormValues(null, null, null);
    initialValues.companyId = syncCompanyId;
    setSelectedCompanyRecord(null);
    setSelectedPersonRecord(null);
    syncForm.reset(initialValues);
    setMutationError(null);
    setReconciliation(null);
    setDrawer({ kind: 'sync', tier: null });
  }, [canManageTiers, resumeOpportunityId, syncCompanyId, syncForm]);

  const closeDrawer = () => {
    if (mutationLock.current) return;
    setDrawer(null);
    setMutationError(null);
    setReconciliation(null);
  };

  const saveAuthoritativeTier = (saved: ErpTier) =>
    setTiers((current) => {
      const savedIdIndex = current.findIndex((tier) => tier.id === saved.id);
      const savedCompanyIndex =
        saved.twentyCompanyId === null
          ? -1
          : current.findIndex(
              (tier) => tier.twentyCompanyId === saved.twentyCompanyId,
            );
      const replacementIndex =
        savedIdIndex === -1 ? savedCompanyIndex : savedIdIndex;
      return replacementIndex === -1
        ? [...current, saved]
        : current.map((tier, index) =>
            index === replacementIndex ? saved : tier,
          );
    });

  const handleMutationError = (error: unknown) => {
    const reconciliationMessage = getReconciliationMessage(error);
    if (reconciliationMessage !== null) {
      setMutationError(reconciliationMessage);
      setReconciliation('refreshing');
      setGeneration((current) => current + 1);
    } else {
      setMutationError('La modification a été refusée');
    }
    enqueueErrorSnackBar({ message: 'Impossible d’enregistrer le tiers' });
  };

  const submitTier = form.handleSubmit(async (values) => {
    if (
      drawer?.kind !== 'form' ||
      context === null ||
      !hasTierPermission() ||
      mutationLock.current ||
      reconciliation !== null
    )
      return;
    let paymentDelayDays: number;
    let creditLimit: number;
    try {
      paymentDelayDays = parsePaymentDelayDays(values.paymentDelayDays);
      creditLimit = parseCreditLimit(values.creditLimit);
    } catch {
      setMutationError('Vérifiez le délai et le plafond de crédit');
      return;
    }
    const existing = drawer.mode === 'edit' ? drawer.tier : null;
    const body = {
      societeId: context.societeId,
      type: values.type,
      name: values.name.trim(),
      email: nullableTierValue(values.email),
      phone: nullableTierValue(values.phone),
      ice: nullableTierValue(values.ice),
      identifiantFiscal: nullableTierValue(values.identifiantFiscal),
      address: nullableTierValue(values.address),
      city: nullableTierValue(values.city),
      paymentDelayDays,
      creditLimit,
      twentyCompanyId: existing?.twentyCompanyId ?? null,
      twentyPersonId: existing?.twentyPersonId ?? null,
      compteCollectifCode: values.compteCollectifCode,
      isActive: values.isActive,
    };
    mutationLock.current = true;
    setIsMutating(true);
    setMutationError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: drawer.mode === 'create' ? 'POST' : 'PATCH',
          path:
            drawer.mode === 'create' ? '/tiers' : `/tiers/${drawer.tier.id}`,
          schema: erpTierSchema,
          body,
        },
        { idempotency: 'forbidden' },
      );
      const saved = await intent.execute();
      saveAuthoritativeTier(saved);
      enqueueSuccessSnackBar({
        message: drawer.mode === 'create' ? 'Tiers créé' : 'Tiers mis à jour',
      });
      setDrawer(null);
    } catch (error) {
      handleMutationError(error);
    } finally {
      mutationLock.current = false;
      setIsMutating(false);
    }
  });

  const submitSync = syncForm.handleSubmit(async (values) => {
    if (
      drawer?.kind !== 'sync' ||
      context === null ||
      !hasTierPermission() ||
      preview === null ||
      mutationLock.current ||
      reconciliation !== null ||
      (targetedCompanyResolution !== 'not-required' &&
        targetedCompanyResolution !== 'resolved') ||
      (linkedPersonResolution !== 'not-required' &&
        linkedPersonResolution !== 'resolved') ||
      !values.overwriteConfirmed
    )
      return;
    const rawName = sentPreviewValue('name', values);
    if (typeof rawName !== 'string' || rawName.trim() === '') {
      setMutationError('Le nom ERP est requis');
      return;
    }
    const type = sentPreviewValue('type', values);
    const compteCollectifCode = sentPreviewValue('compteCollectifCode', values);
    if (!isTierType(type) || !isCollectiveAccount(compteCollectifCode)) {
      setMutationError('Vérifiez le type et le compte collectif');
      return;
    }
    let paymentDelayDays: number;
    let creditLimit: number;
    try {
      paymentDelayDays = parsePaymentDelayDays(
        sentPreviewValue('paymentDelayDays', values),
      );
      creditLimit = parseCreditLimit(sentPreviewValue('creditLimit', values));
    } catch {
      setMutationError('Vérifiez le délai et le plafond de crédit');
      return;
    }
    const sentNullableString = (key: PreviewFieldKey) => {
      const value = sentPreviewValue(key, values);
      return typeof value === 'string' ? nullableTierValue(value) : null;
    };
    const body = {
      societeId: context.societeId,
      twentyCompanyId: preview.twentyCompanyId,
      twentyPersonId: preview.twentyPersonId,
      name: rawName.trim(),
      address: sentNullableString('address'),
      city: sentNullableString('city'),
      email: sentNullableString('email'),
      phone: sentNullableString('phone'),
      ice: sentNullableString('ice'),
      identifiantFiscal: sentNullableString('identifiantFiscal'),
      type,
      compteCollectifCode,
      paymentDelayDays,
      creditLimit,
      isActive: existingSyncTier?.isActive ?? true,
    };
    mutationLock.current = true;
    setIsMutating(true);
    setMutationError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/tiers/sync-from-twenty-company',
          schema: erpTierSchema,
          body,
        },
        { idempotency: 'forbidden' },
      );
      const saved = await intent.execute();
      saveAuthoritativeTier(saved);
      enqueueSuccessSnackBar({ message: 'Tiers synchronisé' });
      if (resumeOpportunityId !== null) {
        const query = new URLSearchParams({ resumeOpportunityId });
        navigate(`/erp-maroc/quotes?${query.toString()}`, { replace: true });
      } else {
        setDrawer(null);
      }
    } catch (error) {
      handleMutationError(error);
    } finally {
      mutationLock.current = false;
      setIsMutating(false);
    }
  });

  const selectCompany = (value: string) => {
    const company = companyOptions.find(({ id }) => id === value) ?? null;
    const currentCompanySearch = syncForm.getValues('companySearch');
    setSelectedCompanyRecord(company);
    setSelectedPersonRecord(null);
    syncForm.reset({
      ...toSyncFormValues(company, null, resolveSyncTier(value)),
      companySearch: currentCompanySearch,
    });
  };

  const selectPerson = (value: string) => {
    const person = peopleOptions.find(({ id }) => id === value) ?? null;
    const currentCompanySearch = syncForm.getValues('companySearch');
    setSelectedPersonRecord(person);
    syncForm.reset({
      ...toSyncFormValues(selectedCompany, person, existingSyncTier),
      companySearch: currentCompanySearch,
    });
  };

  const companyById = new Map(
    companies.map((company) => [company.id, company]),
  );
  const columns: ErpOperationalTableColumn<ErpTier>[] = [
    { key: 'name', header: 'Nom', width: '180px', render: (row) => row.name },
    { key: 'type', header: 'Type', width: '110px', render: (row) => row.type },
    {
      key: 'email',
      header: 'E-mail',
      width: '180px',
      render: (row) => row.email,
    },
    {
      key: 'phone',
      header: 'Téléphone',
      width: '140px',
      render: (row) => row.phone,
    },
    { key: 'ice', header: 'ICE', width: '140px', render: (row) => row.ice },
    {
      key: 'account',
      header: 'Compte collectif',
      width: '120px',
      render: (row) => row.compteCollectifCode,
    },
    {
      key: 'state',
      header: 'État',
      width: '90px',
      render: (row) => (
        <ErpStatusBadge
          label={row.isActive ? 'Actif' : 'Inactif'}
          tone={row.isActive ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '300px',
      render: (row) => {
        const company = row.twentyCompanyId
          ? companyById.get(row.twentyCompanyId)
          : undefined;
        const companyLabel = company?.name.trim() || 'la société Twenty liée';
        return (
          <StyledActions>
            {canManageTiers ? (
              <>
                <Button
                  title="Modifier"
                  ariaLabel={`Modifier ${row.name}`}
                  Icon={IconEdit}
                  variant="tertiary"
                  size="small"
                  onClick={() => openEdit(row)}
                />
                <Button
                  title="Synchroniser"
                  ariaLabel={`Synchroniser ${row.name}`}
                  Icon={IconRefresh}
                  variant="tertiary"
                  size="small"
                  onClick={() => openSync(row)}
                />
              </>
            ) : null}
            {row.twentyCompanyId !== null &&
            isValidUuid(row.twentyCompanyId) ? (
              <StyledCompanyLink
                to={getAppPath(AppPath.RecordShowPage, {
                  objectNameSingular: 'company',
                  objectRecordId: row.twentyCompanyId,
                })}
                aria-label={`Ouvrir ${companyLabel} dans Twenty`}
              >
                Ouvrir
              </StyledCompanyLink>
            ) : null}
          </StyledActions>
        );
      },
    },
  ];

  const formDrawer = drawer?.kind === 'form' ? drawer : null;

  return (
    <ErpPageShell
      title="Tiers"
      actions={
        canManageTiers ? (
          <StyledActions>
            <Button
              title="Synchroniser depuis Twenty"
              ariaLabel="Synchroniser depuis Twenty"
              Icon={IconRefresh}
              variant="secondary"
              onClick={() => openSync(null)}
            />
            <Button
              title="Nouveau tiers"
              ariaLabel="Nouveau tiers"
              Icon={IconPlus}
              accent="blue"
              onClick={openCreate}
            />
          </StyledActions>
        ) : null
      }
    >
      <StyledContent>
        <ErpTierFilters
          search={search}
          typeFilter={typeFilter}
          activeFilter={activeFilter}
          onChange={updateFilters}
        />
        <ErpOperationalTable
          ariaLabel="Tiers"
          columns={columns}
          rows={filteredTiers}
          getRowKey={(row) => row.id}
          state={listStatus}
          loadingLabel="Chargement des tiers"
          emptyLabel="Aucun tiers sur la page chargée"
          errorLabel="Impossible de charger les tiers"
          retryLabel="Réessayer"
          onRetry={retryList}
        />
      </StyledContent>

      <ErpTierFormDrawer
        isOpen={formDrawer !== null}
        mode={formDrawer?.mode ?? 'create'}
        form={form}
        isBusy={isMutating}
        canManageTiers={canManageTiers}
        mutationError={mutationError}
        reconciliation={reconciliation}
        onSubmit={submitTier}
        onClose={closeDrawer}
        onRetryReconciliation={retryList}
        onAcknowledgeReconciliation={acknowledgeReconciliation}
      />
      <ErpTierSyncDrawer
        isOpen={isSyncDrawer}
        form={syncForm}
        preview={preview}
        selectedCompanyId={selectedCompanyId}
        overwriteConfirmed={overwriteConfirmed}
        companyPicker={{
          options: companyOptions,
          loadedCount: companies.length,
          loading: companiesLoading,
          error: companiesError,
          hasNextPage: companiesHaveNextPage,
          onLoadMore: () => void fetchMoreCompanies(),
          onRetry: () => void refetchCompanies(),
        }}
        targetedCompanyResolution={{
          status: targetedCompanyResolution,
          onRetry: () => void refetchTargetedCompany(),
        }}
        peoplePicker={{
          options: peopleOptions,
          loadedCount: people.length,
          loading: peopleLoading,
          error: peopleError,
          hasNextPage: peopleHaveNextPage,
          onLoadMore: () => void fetchMorePeople(),
          onRetry: () => void refetchPeople(),
        }}
        linkedPersonResolution={{
          status: linkedPersonResolution,
          selectedPersonId,
          onRetry: () => void refetchLinkedPerson(),
        }}
        mutation={{
          isBusy: isMutating,
          canManageTiers,
          error: mutationError,
          reconciliation,
        }}
        onSelectCompany={selectCompany}
        onSelectPerson={selectPerson}
        onChangePreviewSource={clearOverwriteConfirmation}
        onSubmit={submitSync}
        onClose={closeDrawer}
        onRetryReconciliation={retryList}
        onAcknowledgeReconciliation={acknowledgeReconciliation}
      />
    </ErpPageShell>
  );
};
