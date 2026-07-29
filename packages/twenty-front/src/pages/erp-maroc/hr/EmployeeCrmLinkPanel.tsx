import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { styled } from '@linaria/react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  hrEmployeeCrmLinkResultSchema,
  type HrCrmPublicField,
  type HrEmployeeDetail,
} from 'twenty-shared/erp-maroc';
import { IconExternalLink, IconLink, IconUnlink } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type TwentyEmployeePerson = {
  __typename: 'Person';
  id: string;
  createdAt: string;
  name: { firstName: string; lastName: string };
  emails?: { primaryEmail?: string | null } | null;
  phones?: {
    primaryPhoneCallingCode?: string | null;
    primaryPhoneNumber?: string | null;
  } | null;
  jobTitle?: string | null;
};

type Props = {
  employee: HrEmployeeDetail;
  canWrite: boolean;
  onUpdated: () => Promise<void>;
  onNotify: (message: string, danger: boolean) => void;
};

const fields: Array<{ key: HrCrmPublicField; label: string }> = [
  { key: 'firstName', label: 'Prénom' },
  { key: 'lastName', label: 'Nom' },
  { key: 'email', label: 'E-mail professionnel' },
  { key: 'phone', label: 'Téléphone professionnel' },
  { key: 'jobTitle', label: 'Fonction' },
];

const StyledSection = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
`;

const StyledHeader = styled.header`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  min-height: 48px;
  padding: 0 ${themeCssVariables.spacing[4]};
`;

const StyledTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  letter-spacing: 0;
  margin: 0;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledContent = styled.div`
  background: ${themeCssVariables.background.secondary};
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns: minmax(240px, 0.8fr) minmax(440px, 1.7fr);
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const StyledPicker = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledLabel = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  display: grid;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const fieldStyles = `
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  height: 34px;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledInput = styled.input`
  ${fieldStyles}
`;

const StyledSelect = styled.select`
  ${fieldStyles}
`;

const StyledSecurity = styled.div`
  border-left: 3px solid ${themeCssVariables.color.green};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.45;
  padding-left: ${themeCssVariables.spacing[2]};
`;

const StyledComparison = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  overflow: hidden;
`;

const StyledComparisonHeader = styled.div`
  background: ${themeCssVariables.background.primary};
  color: ${themeCssVariables.font.color.tertiary};
  display: grid;
  font-size: ${themeCssVariables.font.size.sm};
  grid-template-columns: 34px minmax(150px, 0.8fr) minmax(170px, 1fr) minmax(
      170px,
      1fr
    );
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledComparisonRow = styled.label`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: 34px minmax(150px, 0.8fr) minmax(170px, 1fr) minmax(
      170px,
      1fr
    );
  min-height: 42px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledMuted = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
`;

const personPhone = (person: TwentyEmployeePerson | null) => {
  if (person === null) return null;
  const callingCode = person.phones?.primaryPhoneCallingCode?.trim() ?? '';
  const number = person.phones?.primaryPhoneNumber?.trim() ?? '';
  return `${callingCode}${number}`.trim() || null;
};

const personValue = (
  person: TwentyEmployeePerson | null,
  field: HrCrmPublicField,
): string | null => {
  if (person === null) return null;
  if (field === 'firstName') return person.name.firstName.trim() || null;
  if (field === 'lastName') return person.name.lastName.trim() || null;
  if (field === 'email') {
    return person.emails?.primaryEmail?.trim() || null;
  }
  if (field === 'phone') return personPhone(person);
  return person.jobTitle?.trim() || null;
};

const employeeValue = (
  employee: HrEmployeeDetail,
  field: HrCrmPublicField,
): string | null => {
  const value = employee[field];
  return typeof value === 'string' && value.trim() !== '' ? value : null;
};

export const EmployeeCrmLinkPanel = ({
  employee,
  canWrite,
  onUpdated,
  onNotify,
}: Props) => {
  const { client } = useErpMarocContext();
  const [query, setQuery] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState(
    employee.crmLink?.twentyPersonId ?? '',
  );
  const [syncFields, setSyncFields] = useState<Set<HrCrmPublicField>>(
    () => new Set(),
  );
  const [busy, setBusy] = useState(false);
  const {
    records: people,
    loading,
    error,
  } = useFindManyRecords<TwentyEmployeePerson>({
    objectNameSingular: 'person',
    recordGqlFields: {
      id: true,
      name: { firstName: true, lastName: true },
      emails: { primaryEmail: true },
      phones: {
        primaryPhoneCallingCode: true,
        primaryPhoneNumber: true,
      },
      jobTitle: true,
    },
    limit: 100,
    skip: !canWrite,
  });
  const {
    records: linkedPeople,
    loading: linkedLoading,
    error: linkedError,
  } = useFindManyRecords<TwentyEmployeePerson>({
    objectNameSingular: 'person',
    recordGqlFields: {
      id: true,
      name: { firstName: true, lastName: true },
      emails: { primaryEmail: true },
      phones: {
        primaryPhoneCallingCode: true,
        primaryPhoneNumber: true,
      },
      jobTitle: true,
    },
    filter:
      employee.crmLink === null
        ? undefined
        : { id: { eq: employee.crmLink.twentyPersonId } },
    limit: 1,
    skip: employee.crmLink === null,
  });

  useEffect(() => {
    setSelectedPersonId(employee.crmLink?.twentyPersonId ?? '');
    setSyncFields(new Set());
  }, [employee.crmLink?.twentyPersonId]);

  const selectedPerson =
    people.find(({ id }) => id === selectedPersonId) ??
    linkedPeople.find(({ id }) => id === selectedPersonId) ??
    null;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredPeople = useMemo(
    () =>
      people.filter((person) => {
        if (normalizedQuery === '') return true;
        return [
          person.name.firstName,
          person.name.lastName,
          person.emails?.primaryEmail,
          person.jobTitle,
        ]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
      }),
    [normalizedQuery, people],
  );
  const options =
    selectedPerson !== null &&
    filteredPeople.every(({ id }) => id !== selectedPerson.id)
      ? [selectedPerson, ...filteredPeople]
      : filteredPeople;

  const mutate = async (twentyPersonId: string | null) => {
    setBusy(true);
    try {
      const selectedFields = [...syncFields].filter(
        (field) => personValue(selectedPerson, field) !== null,
      );
      const publicProfile = Object.fromEntries(
        selectedFields.map((field) => [
          field,
          personValue(selectedPerson, field),
        ]),
      );
      const intent = client.createMutationIntent(
        {
          method: 'PATCH',
          path: `/hr-core/employees/${employee.id}/crm-link`,
          schema: hrEmployeeCrmLinkResultSchema,
          body:
            twentyPersonId === null
              ? { twentyPersonId: null }
              : {
                  twentyPersonId,
                  publicProfile,
                  syncFields: selectedFields,
                },
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      onNotify(
        twentyPersonId === null
          ? 'Liaison CRM supprimée.'
          : selectedFields.length === 0
            ? 'Collaborateur lié au CRM.'
            : 'Liaison CRM et champs publics synchronisés.',
        false,
      );
      await onUpdated();
    } catch {
      onNotify(
        'La liaison CRM n’a pas pu être enregistrée. Vérifiez que cette personne n’est pas déjà liée.',
        true,
      );
    } finally {
      setBusy(false);
    }
  };

  const crmUnavailable = error !== undefined || linkedError !== undefined;
  return (
    <StyledSection>
      <StyledHeader>
        <StyledTitle>Profil CRM</StyledTitle>
        <StyledActions>
          {employee.crmLink === null ? null : (
            <Link
              to={`/objects/people/${employee.crmLink.twentyPersonId}`}
              title="Ouvrir la personne dans le CRM"
              aria-label="Ouvrir la personne dans le CRM"
            >
              <IconExternalLink size={16} />
            </Link>
          )}
          {canWrite && employee.crmLink !== null ? (
            <Button
              title="Délier"
              ariaLabel="Supprimer la liaison CRM"
              Icon={IconUnlink}
              variant="secondary"
              disabled={busy}
              onClick={() => void mutate(null)}
            />
          ) : null}
          {canWrite ? (
            <Button
              title={employee.crmLink === null ? 'Lier' : 'Mettre à jour'}
              ariaLabel="Enregistrer la liaison CRM"
              Icon={IconLink}
              accent="blue"
              disabled={
                busy ||
                selectedPersonId === '' ||
                selectedPerson === null ||
                crmUnavailable
              }
              onClick={() => void mutate(selectedPersonId)}
            />
          ) : null}
        </StyledActions>
      </StyledHeader>
      <StyledContent>
        <StyledPicker>
          {canWrite ? (
            <>
              <StyledLabel>
                Rechercher une personne
                <StyledInput
                  value={query}
                  placeholder="Nom, e-mail ou fonction"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </StyledLabel>
              <StyledLabel>
                Personne CRM
                <StyledSelect
                  value={selectedPersonId}
                  disabled={loading || crmUnavailable}
                  onChange={(event) => {
                    setSelectedPersonId(event.target.value);
                    setSyncFields(new Set());
                  }}
                >
                  <option value="">
                    {loading ? 'Chargement…' : 'Sélectionner une personne'}
                  </option>
                  {options.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name.firstName} {person.name.lastName}
                      {person.emails?.primaryEmail
                        ? ` · ${person.emails.primaryEmail}`
                        : ''}
                    </option>
                  ))}
                </StyledSelect>
              </StyledLabel>
            </>
          ) : (
            <StyledMuted>
              {employee.crmLink === null
                ? 'Aucune personne CRM liée'
                : linkedLoading
                  ? 'Chargement du profil CRM…'
                  : selectedPerson === null
                    ? employee.crmLink.twentyPersonId
                    : `${selectedPerson.name.firstName} ${selectedPerson.name.lastName}`}
            </StyledMuted>
          )}
          <StyledSecurity>
            Seuls le nom, l’e-mail professionnel, le téléphone professionnel et
            la fonction peuvent être synchronisés. Les données de paie,
            d’identité, bancaires, sociales, médicales et documentaires restent
            exclusivement dans le dossier RH.
          </StyledSecurity>
        </StyledPicker>
        <StyledComparison>
          <StyledComparisonHeader>
            <span />
            <span>Champ</span>
            <span>Dossier RH</span>
            <span>CRM People</span>
          </StyledComparisonHeader>
          {fields.map(({ key, label }) => {
            const crmValue = personValue(selectedPerson, key);
            return (
              <StyledComparisonRow key={key}>
                <input
                  type="checkbox"
                  checked={syncFields.has(key)}
                  disabled={!canWrite || crmValue === null}
                  aria-label={`Synchroniser ${label}`}
                  onChange={(event) => {
                    setSyncFields((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(key);
                      else next.delete(key);
                      return next;
                    });
                  }}
                />
                <strong>{label}</strong>
                <span>{employeeValue(employee, key) ?? '—'}</span>
                <span>{crmValue ?? '—'}</span>
              </StyledComparisonRow>
            );
          })}
        </StyledComparison>
      </StyledContent>
    </StyledSection>
  );
};
