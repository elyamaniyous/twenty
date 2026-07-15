import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatMadCents } from '@/erp-maroc/utils/money';
import {
  canonicalizeErpQueryState,
  updateErpQueryState,
} from '@/erp-maroc/utils/queryState';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  erpLettrageMatchSchema,
  erpLettrageSuggestionsSchema,
  type ErpLettrageMatch,
  type ErpLettrageSuggestion,
  type ErpLettrageSuggestions,
} from 'twenty-shared/erp-maroc';
import { IconLink, IconSearch, IconUnlink } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const DEFAULT_ACCOUNT_CODE = '3421';

const EMPTY_RESULT: ErpLettrageSuggestions = {
  account: {
    id: '00000000-0000-0000-0000-000000000000',
    code: DEFAULT_ACCOUNT_CODE,
    label: '',
    classNumber: 0,
  },
  suggestions: [],
  activeMatches: [],
};

const formatDate = (date: string) => date.split('-').reverse().join('/');

const StyledToolbar = styled.form`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex: 0 0 auto;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledLabel = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledInput = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  height: 30px;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 110px;
`;

const StyledError = styled.div`
  background: ${themeCssVariables.background.danger};
  color: ${themeCssVariables.font.color.danger};
  flex: 0 0 auto;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledReports = styled.div`
  display: grid;
  flex: 1 1 auto;
  grid-template-rows: minmax(220px, 1fr) minmax(180px, 0.8fr);
  min-height: 0;
`;

const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  & + & {
    border-top: 1px solid ${themeCssVariables.border.color.medium};
  }
`;

const StyledSectionTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  flex: 0 0 auto;
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0;
  margin: 0;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

export const ErpLettragePage = () => {
  const { client } = useErpMarocContext();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const canonicalQuery = useMemo(
    () => canonicalizeErpQueryState('accountingLettrage', searchParams),
    [searchParams],
  );
  const query = useMemo(() => {
    const result = new URLSearchParams(canonicalQuery);
    if (!result.has('accountCode'))
      result.set('accountCode', DEFAULT_ACCOUNT_CODE);
    return result;
  }, [canonicalQuery]);
  const [accountCode, setAccountCode] = useState(
    query.get('accountCode') ?? DEFAULT_ACCOUNT_CODE,
  );
  const [result, setResult] = useState<ErpLettrageSuggestions>(EMPTY_RESULT);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setAccountCode(query.get('accountCode') ?? DEFAULT_ACCOUNT_CODE);
  }, [query]);

  useEffect(() => {
    if (
      location.pathname === '/erp-maroc/accounting/lettrage' &&
      searchParams.toString() !== query.toString()
    ) {
      setSearchParams(query, { replace: true });
    }
  }, [location.pathname, query, searchParams, setSearchParams]);

  useEffect(() => {
    let active = true;
    setState('loading');
    setActionError(null);
    void client
      .request({
        method: 'GET',
        path: '/accounting/lettrage/suggestions',
        query: {
          accountCode: query.get('accountCode') ?? DEFAULT_ACCOUNT_CODE,
        },
        schema: erpLettrageSuggestionsSchema,
      })
      .then((response) => {
        if (!active) return;
        setResult(response);
        setState('ready');
      })
      .catch(() => {
        if (active) setState('error');
      });
    return () => {
      active = false;
    };
  }, [client, generation, query]);

  const refresh = () => setGeneration((value) => value + 1);

  const submitAccount = (event: FormEvent) => {
    event.preventDefault();
    setSearchParams(
      updateErpQueryState('accountingLettrage', query, { accountCode }),
    );
  };

  const match = async (suggestion: ErpLettrageSuggestion) => {
    const key = `${suggestion.debitLine.lineId}:${suggestion.creditLine.lineId}`;
    if (pendingKey !== null) return;
    setPendingKey(key);
    setActionError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/accounting/lettrage/match',
          schema: erpLettrageMatchSchema,
          body: {
            accountCode: result.account.code,
            debitLineId: suggestion.debitLine.lineId,
            creditLineId: suggestion.creditLine.lineId,
          },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      refresh();
    } catch {
      setActionError('Impossible de confirmer ce lettrage.');
    } finally {
      setPendingKey(null);
    }
  };

  const unmatch = async (lettering: ErpLettrageMatch) => {
    if (pendingKey !== null) return;
    setPendingKey(lettering.id);
    setActionError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/accounting/lettrage/unmatch',
          schema: erpLettrageMatchSchema,
          body: {
            accountCode: result.account.code,
            reference: lettering.reference,
          },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      refresh();
    } catch {
      setActionError('Impossible de délettrer cette référence.');
    } finally {
      setPendingKey(null);
    }
  };

  const suggestionColumns: ErpOperationalTableColumn<ErpLettrageSuggestion>[] =
    [
      {
        key: 'debitDate',
        header: 'Date débit',
        width: '110px',
        render: (item) => formatDate(item.debitLine.entryDate),
      },
      {
        key: 'debit',
        header: 'Écriture au débit',
        width: '260px',
        render: (item) => (
          <Link to={`/erp-maroc/accounting/entries/${item.debitLine.entryId}`}>
            {item.debitLine.label}
          </Link>
        ),
      },
      {
        key: 'creditDate',
        header: 'Date crédit',
        width: '110px',
        render: (item) => formatDate(item.creditLine.entryDate),
      },
      {
        key: 'credit',
        header: 'Écriture au crédit',
        width: '260px',
        render: (item) => (
          <Link to={`/erp-maroc/accounting/entries/${item.creditLine.entryId}`}>
            {item.creditLine.label}
          </Link>
        ),
      },
      {
        key: 'amount',
        header: 'Montant',
        width: '150px',
        align: 'right',
        render: (item) => formatMadCents(item.amountCents),
      },
      {
        key: 'distance',
        header: 'Écart',
        width: '90px',
        align: 'right',
        render: (item) => `${item.dateDistanceDays} j`,
      },
      {
        key: 'action',
        header: 'Action',
        width: '130px',
        render: (item) => {
          const key = `${item.debitLine.lineId}:${item.creditLine.lineId}`;
          return (
            <Button
              title="Lettrer"
              ariaLabel="Confirmer le lettrage suggéré"
              Icon={IconLink}
              variant="secondary"
              disabled={pendingKey !== null}
              isLoading={pendingKey === key}
              onClick={() => void match(item)}
            />
          );
        },
      },
    ];

  const matchColumns: ErpOperationalTableColumn<ErpLettrageMatch>[] = [
    {
      key: 'reference',
      header: 'Référence',
      width: '110px',
      render: (item) => item.reference,
    },
    {
      key: 'date',
      header: 'Lettré le',
      width: '150px',
      render: (item) => new Date(item.matchedAt).toLocaleDateString('fr-MA'),
    },
    {
      key: 'lines',
      header: 'Écritures rapprochées',
      width: '420px',
      render: (item) => item.lines.map((line) => line.label).join(' · '),
    },
    {
      key: 'amount',
      header: 'Montant',
      width: '150px',
      align: 'right',
      render: (item) => formatMadCents(item.totalDebitCents),
    },
    {
      key: 'action',
      header: 'Action',
      width: '140px',
      render: (item) => (
        <Button
          title="Délettrer"
          ariaLabel={`Délettrer la référence ${item.reference}`}
          Icon={IconUnlink}
          accent="danger"
          disabled={pendingKey !== null}
          isLoading={pendingKey === item.id}
          onClick={() => void unmatch(item)}
        />
      ),
    },
  ];

  return (
    <ErpPageShell
      title="Lettrage clients"
      description={
        state === 'ready'
          ? `${result.account.code} · ${result.account.label}`
          : 'Rapprochement des débits et crédits clients'
      }
    >
      <StyledToolbar onSubmit={submitAccount}>
        <StyledLabel htmlFor="lettrage-account">Compte</StyledLabel>
        <StyledInput
          id="lettrage-account"
          value={accountCode}
          pattern="[A-Za-z0-9][A-Za-z0-9.-]{0,31}"
          maxLength={32}
          disabled={state === 'loading' || pendingKey !== null}
          onChange={(event) => setAccountCode(event.target.value)}
        />
        <Button
          type="submit"
          title="Afficher le compte"
          ariaLabel="Afficher le compte à lettrer"
          Icon={IconSearch}
          variant="secondary"
          disabled={
            state === 'loading' ||
            pendingKey !== null ||
            accountCode.trim().length === 0
          }
        />
      </StyledToolbar>
      {actionError === null ? null : (
        <StyledError role="alert">{actionError}</StyledError>
      )}
      <StyledReports>
        <StyledSection>
          <StyledSectionTitle>Suggestions exactes</StyledSectionTitle>
          <ErpOperationalTable
            ariaLabel="Suggestions de lettrage"
            columns={suggestionColumns}
            rows={result.suggestions}
            getRowKey={(item) =>
              `${item.debitLine.lineId}:${item.creditLine.lineId}`
            }
            state={state}
            loadingLabel="Recherche des correspondances"
            emptyLabel="Aucune correspondance exacte à confirmer"
            errorLabel="Impossible de charger les suggestions"
            retryLabel="Réessayer"
            onRetry={refresh}
          />
        </StyledSection>
        <StyledSection>
          <StyledSectionTitle>Lettrages actifs</StyledSectionTitle>
          <ErpOperationalTable
            ariaLabel="Lettrages actifs"
            columns={matchColumns}
            rows={result.activeMatches}
            getRowKey={(item) => item.id}
            state={state}
            loadingLabel="Chargement des lettrages"
            emptyLabel="Aucun lettrage actif pour ce compte"
            errorLabel="Impossible de charger les lettrages"
            retryLabel="Réessayer"
            onRetry={refresh}
          />
        </StyledSection>
      </StyledReports>
    </ErpPageShell>
  );
};
