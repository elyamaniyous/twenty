import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { styled } from '@linaria/react';
import { useState } from 'react';
import {
  hrEmployeeBankAccountSchema,
  hrEmployeeDependantSchema,
  hrEmployeeEmergencyContactSchema,
  hrEmployeePrivateProfileSchema,
  type HrEmployeeDependant,
  type HrEmployeeDetail,
  type HrEmployeeEmergencyContact,
} from 'twenty-shared/erp-maroc';
import { IconCheck, IconEdit, IconPlus } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type Drawer =
  | { kind: 'profile' }
  | { kind: 'dependant'; value: HrEmployeeDependant | null }
  | { kind: 'emergency'; value: HrEmployeeEmergencyContact | null }
  | { kind: 'bank' }
  | null;

type EmployeePrivateProfileSectionsProps = {
  employee: HrEmployeeDetail;
  canWritePrivate: boolean;
  canWriteBank: boolean;
  onUpdated: () => Promise<void>;
  onNotify: (message: string, danger: boolean) => void;
};

const StyledSection = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
`;

const StyledSectionHeader = styled.header`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 ${themeCssVariables.spacing[4]};
`;

const StyledSectionTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  letter-spacing: 0;
  margin: 0;
`;

const StyledFields = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(170px, 1fr));
  overflow-x: auto;
`;

const StyledFieldValue = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-height: 48px;
  min-width: 170px;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledValue = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  letter-spacing: 0;
`;

const StyledRows = styled.div`
  overflow-x: auto;
`;

const StyledRow = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  grid-template-columns:
    minmax(200px, 1.4fr) minmax(160px, 1fr) minmax(180px, 1fr)
    minmax(120px, 0.7fr) auto;
  min-width: 850px;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};

  &:last-child {
    border-bottom: 0;
  }
`;

const StyledRowField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

const StyledEmpty = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledDrawerForm = styled.form`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledFormField = styled.label`
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

const StyledCheckboxField = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  min-height: 34px;
`;

const relationshipLabel: Record<string, string> = {
  CHILD: 'Enfant',
  SPOUSE: 'Conjoint',
  ASCENDANT: 'Ascendant',
  OTHER: 'Autre',
};

const genderLabel: Record<string, string> = {
  FEMALE: 'Femme',
  MALE: 'Homme',
  OTHER: 'Autre',
  UNDISCLOSED: 'Non communiqué',
};

const maritalStatusLabel: Record<string, string> = {
  SINGLE: 'Célibataire',
  MARRIED: 'Marié(e)',
  DIVORCED: 'Divorcé(e)',
  WIDOWED: 'Veuf / veuve',
};

const today = () => new Date().toISOString().slice(0, 10);

export const EmployeePrivateProfileSections = ({
  employee,
  canWritePrivate,
  canWriteBank,
  onUpdated,
  onNotify,
}: EmployeePrivateProfileSectionsProps) => {
  const { client } = useErpMarocContext();
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [busy, setBusy] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    cin: '',
    cnssNumber: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
    birthPlace: '',
    nationalityCountryCode: 'MA',
    gender: '',
    maritalStatus: '',
    personalEmail: '',
    personalPhone: '',
    addressLine2: '',
    city: '',
    postalCode: '',
  });
  const [dependantForm, setDependantForm] = useState({
    firstName: '',
    lastName: '',
    relationship: 'CHILD',
    birthDate: '',
    isTaxDependant: true,
    hasDisability: false,
    validFrom: today(),
    validTo: '',
  });
  const [emergencyForm, setEmergencyForm] = useState({
    firstName: '',
    lastName: '',
    relationship: '',
    phone: '',
    email: '',
    isPrimary: false,
  });
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountHolderName: '',
    rib: '',
    effectiveFrom: today(),
    verified: false,
  });

  const currentBank =
    employee.bankAccounts.find(
      (account) => account.isPrimary && account.effectiveTo === null,
    ) ?? null;

  const executeMutation = async (
    input: Parameters<typeof client.createMutationIntent>[0],
    successMessage: string,
  ) => {
    setBusy(true);
    try {
      const intent = client.createMutationIntent(input, {
        idempotency: 'required',
      });
      await intent.execute();
      setDrawer(null);
      onNotify(successMessage, false);
      await onUpdated();
    } catch {
      onNotify(
        "L'opération n'a pas abouti. Vérifiez les données et vos droits.",
        true,
      );
    } finally {
      setBusy(false);
    }
  };

  const openProfile = () => {
    const profile = employee.privateProfile;
    setProfileForm({
      firstName: employee.firstName,
      lastName: employee.lastName,
      cin: employee.cin ?? '',
      cnssNumber: employee.cnssNumber ?? '',
      email: employee.email ?? '',
      phone: employee.phone ?? '',
      address: employee.address ?? '',
      birthDate: profile?.birthDate ?? '',
      birthPlace: profile?.birthPlace ?? '',
      nationalityCountryCode: profile?.nationalityCountryCode ?? 'MA',
      gender: profile?.gender ?? '',
      maritalStatus: profile?.maritalStatus ?? '',
      personalEmail: profile?.personalEmail ?? '',
      personalPhone: profile?.personalPhone ?? '',
      addressLine2: profile?.addressLine2 ?? '',
      city: profile?.city ?? '',
      postalCode: profile?.postalCode ?? '',
    });
    setDrawer({ kind: 'profile' });
  };

  const openDependant = (value: HrEmployeeDependant | null) => {
    setDependantForm({
      firstName: value?.firstName ?? '',
      lastName: value?.lastName ?? employee.lastName,
      relationship: value?.relationship ?? 'CHILD',
      birthDate: value?.birthDate ?? '',
      isTaxDependant: value?.isTaxDependant ?? true,
      hasDisability: value?.hasDisability ?? false,
      validFrom: value?.validFrom ?? today(),
      validTo: value?.validTo ?? '',
    });
    setDrawer({ kind: 'dependant', value });
  };

  const openEmergency = (value: HrEmployeeEmergencyContact | null) => {
    setEmergencyForm({
      firstName: value?.firstName ?? '',
      lastName: value?.lastName ?? '',
      relationship: value?.relationship ?? '',
      phone: value?.phone ?? '',
      email: value?.email ?? '',
      isPrimary: value?.isPrimary ?? employee.emergencyContacts.length === 0,
    });
    setDrawer({ kind: 'emergency', value });
  };

  const openBank = () => {
    setBankForm({
      bankName: currentBank?.bankName ?? '',
      accountHolderName:
        currentBank?.accountHolderName ??
        `${employee.firstName} ${employee.lastName}`,
      rib: '',
      effectiveFrom: today(),
      verified: currentBank?.verifiedAt != null,
    });
    setDrawer({ kind: 'bank' });
  };

  const submitProfile = () => {
    if (
      profileForm.firstName.trim() === '' ||
      profileForm.lastName.trim() === ''
    ) {
      onNotify('Le prénom et le nom sont obligatoires.', true);
      return;
    }
    void executeMutation(
      {
        method: 'PATCH',
        path: `/hr-core/employees/${employee.id}/personal-details`,
        schema: hrEmployeePrivateProfileSchema,
        body: {
          ...profileForm,
          cin: profileForm.cin || null,
          cnssNumber: profileForm.cnssNumber || null,
          email: profileForm.email || null,
          phone: profileForm.phone || null,
          address: profileForm.address || null,
          birthDate: profileForm.birthDate || null,
          birthPlace: profileForm.birthPlace || null,
          nationalityCountryCode: profileForm.nationalityCountryCode || null,
          gender: profileForm.gender || null,
          maritalStatus: profileForm.maritalStatus || null,
          personalEmail: profileForm.personalEmail || null,
          personalPhone: profileForm.personalPhone || null,
          addressLine2: profileForm.addressLine2 || null,
          city: profileForm.city || null,
          postalCode: profileForm.postalCode || null,
        },
      },
      'Informations personnelles mises à jour.',
    );
  };

  const submitDependant = () => {
    if (
      drawer?.kind !== 'dependant' ||
      dependantForm.firstName.trim() === '' ||
      dependantForm.lastName.trim() === '' ||
      dependantForm.validFrom === ''
    ) {
      onNotify('Complétez le nom, le prénom et la date de validité.', true);
      return;
    }
    const existing = drawer.value;
    void executeMutation(
      {
        method: existing === null ? 'POST' : 'PATCH',
        path:
          existing === null
            ? `/hr-core/employees/${employee.id}/dependants`
            : `/hr-core/dependants/${existing.id}`,
        schema: hrEmployeeDependantSchema,
        body: {
          ...dependantForm,
          birthDate: dependantForm.birthDate || null,
          validTo: dependantForm.validTo || null,
        },
      },
      existing === null
        ? 'Personne à charge ajoutée.'
        : 'Personne à charge mise à jour.',
    );
  };

  const submitEmergency = () => {
    if (
      drawer?.kind !== 'emergency' ||
      emergencyForm.firstName.trim() === '' ||
      emergencyForm.lastName.trim() === '' ||
      emergencyForm.relationship.trim() === '' ||
      emergencyForm.phone.trim() === ''
    ) {
      onNotify('Complétez le contact, le lien et le téléphone.', true);
      return;
    }
    const existing = drawer.value;
    void executeMutation(
      {
        method: existing === null ? 'POST' : 'PATCH',
        path:
          existing === null
            ? `/hr-core/employees/${employee.id}/emergency-contacts`
            : `/hr-core/emergency-contacts/${existing.id}`,
        schema: hrEmployeeEmergencyContactSchema,
        body: {
          ...emergencyForm,
          email: emergencyForm.email || null,
        },
      },
      existing === null
        ? "Contact d'urgence ajouté."
        : "Contact d'urgence mis à jour.",
    );
  };

  const submitBank = () => {
    if (
      bankForm.bankName.trim() === '' ||
      bankForm.accountHolderName.trim() === '' ||
      !/^\d{24}$/.test(bankForm.rib.replace(/[\s-]+/g, '')) ||
      bankForm.effectiveFrom === ''
    ) {
      onNotify(
        'Complétez la banque, le titulaire, la date et un RIB de 24 chiffres.',
        true,
      );
      return;
    }
    void executeMutation(
      {
        method: 'PATCH',
        path: `/hr-core/employees/${employee.id}/bank-account`,
        schema: hrEmployeeBankAccountSchema,
        body: bankForm,
      },
      'Coordonnées bancaires chiffrées et mises à jour.',
    );
  };

  const submitDrawer = () => {
    if (drawer?.kind === 'profile') submitProfile();
    if (drawer?.kind === 'dependant') submitDependant();
    if (drawer?.kind === 'emergency') submitEmergency();
    if (drawer?.kind === 'bank') submitBank();
  };

  const drawerTitle =
    drawer?.kind === 'profile'
      ? 'Informations personnelles'
      : drawer?.kind === 'dependant'
        ? drawer.value === null
          ? 'Nouvelle personne à charge'
          : 'Modifier la personne à charge'
        : drawer?.kind === 'emergency'
          ? drawer.value === null
            ? "Nouveau contact d'urgence"
            : "Modifier le contact d'urgence"
          : 'Coordonnées bancaires';

  return (
    <>
      <StyledSection>
        <StyledSectionHeader>
          <StyledSectionTitle>Identité et coordonnées</StyledSectionTitle>
          {canWritePrivate ? (
            <Button
              title="Modifier les informations personnelles"
              ariaLabel="Modifier les informations personnelles"
              Icon={IconEdit}
              variant="secondary"
              onClick={openProfile}
            />
          ) : null}
        </StyledSectionHeader>
        {!employee.access.canReadPrivate ? (
          <StyledEmpty>Accès aux données privées restreint.</StyledEmpty>
        ) : (
          <StyledFields>
            <StyledFieldValue>
              <StyledLabel>Naissance</StyledLabel>
              <StyledValue>
                {employee.privateProfile?.birthDate ?? 'À compléter'}
              </StyledValue>
              <StyledLabel>
                {employee.privateProfile?.birthPlace ?? 'Lieu non renseigné'}
              </StyledLabel>
            </StyledFieldValue>
            <StyledFieldValue>
              <StyledLabel>Situation</StyledLabel>
              <StyledValue>
                {maritalStatusLabel[
                  employee.privateProfile?.maritalStatus ?? ''
                ] ?? 'À compléter'}
              </StyledValue>
              <StyledLabel>
                {genderLabel[employee.privateProfile?.gender ?? ''] ??
                  'Genre non renseigné'}
              </StyledLabel>
            </StyledFieldValue>
            <StyledFieldValue>
              <StyledLabel>Coordonnées personnelles</StyledLabel>
              <StyledValue>
                {employee.privateProfile?.personalPhone ??
                  employee.phone ??
                  'À compléter'}
              </StyledValue>
              <StyledLabel>
                {employee.privateProfile?.personalEmail ??
                  employee.email ??
                  'Email non renseigné'}
              </StyledLabel>
            </StyledFieldValue>
            <StyledFieldValue>
              <StyledLabel>Adresse</StyledLabel>
              <StyledValue>
                {employee.privateProfile?.city ??
                  employee.address ??
                  'À compléter'}
              </StyledValue>
              <StyledLabel>
                {employee.privateProfile?.nationalityCountryCode ?? 'MA'}
              </StyledLabel>
            </StyledFieldValue>
          </StyledFields>
        )}
      </StyledSection>

      <StyledSection>
        <StyledSectionHeader>
          <StyledSectionTitle>Personnes à charge</StyledSectionTitle>
          {canWritePrivate ? (
            <Button
              title="Ajouter une personne à charge"
              ariaLabel="Ajouter une personne à charge"
              Icon={IconPlus}
              variant="secondary"
              onClick={() => openDependant(null)}
            />
          ) : null}
        </StyledSectionHeader>
        {!employee.access.canReadPrivate ? (
          <StyledEmpty>Accès aux données privées restreint.</StyledEmpty>
        ) : employee.dependants.length === 0 ? (
          <StyledEmpty>Aucune personne à charge enregistrée.</StyledEmpty>
        ) : (
          <StyledRows>
            {employee.dependants.map((dependant) => (
              <StyledRow key={dependant.id}>
                <StyledRowField>
                  <StyledValue>
                    {dependant.firstName} {dependant.lastName}
                  </StyledValue>
                  <StyledLabel>
                    {relationshipLabel[dependant.relationship] ??
                      dependant.relationship}
                  </StyledLabel>
                </StyledRowField>
                <StyledRowField>
                  <StyledLabel>Naissance</StyledLabel>
                  <span>{dependant.birthDate ?? 'Non renseignée'}</span>
                </StyledRowField>
                <StyledRowField>
                  <StyledLabel>Validité</StyledLabel>
                  <span>
                    {dependant.validFrom} → {dependant.validTo ?? 'en cours'}
                  </span>
                </StyledRowField>
                <StyledRowField>
                  <StyledLabel>Fiscalité</StyledLabel>
                  <span>
                    {dependant.isTaxDependant
                      ? 'Pris en compte'
                      : 'Hors déduction'}
                  </span>
                </StyledRowField>
                {canWritePrivate ? (
                  <Button
                    title="Modifier la personne à charge"
                    ariaLabel="Modifier la personne à charge"
                    Icon={IconEdit}
                    variant="secondary"
                    onClick={() => openDependant(dependant)}
                  />
                ) : (
                  <span />
                )}
              </StyledRow>
            ))}
          </StyledRows>
        )}
      </StyledSection>

      <StyledSection>
        <StyledSectionHeader>
          <StyledSectionTitle>Contacts d’urgence</StyledSectionTitle>
          {canWritePrivate ? (
            <Button
              title="Ajouter un contact d’urgence"
              ariaLabel="Ajouter un contact d’urgence"
              Icon={IconPlus}
              variant="secondary"
              onClick={() => openEmergency(null)}
            />
          ) : null}
        </StyledSectionHeader>
        {!employee.access.canReadPrivate ? (
          <StyledEmpty>Accès aux contacts d’urgence restreint.</StyledEmpty>
        ) : employee.emergencyContacts.length === 0 ? (
          <StyledEmpty>Aucun contact d’urgence enregistré.</StyledEmpty>
        ) : (
          <StyledRows>
            {employee.emergencyContacts.map((contact) => (
              <StyledRow key={contact.id}>
                <StyledRowField>
                  <StyledValue>
                    {contact.firstName} {contact.lastName}
                  </StyledValue>
                  <StyledLabel>{contact.relationship}</StyledLabel>
                </StyledRowField>
                <StyledRowField>
                  <StyledLabel>Téléphone</StyledLabel>
                  <span>{contact.phone}</span>
                </StyledRowField>
                <StyledRowField>
                  <StyledLabel>Email</StyledLabel>
                  <span>{contact.email ?? 'Non renseigné'}</span>
                </StyledRowField>
                <StyledRowField>
                  <StyledLabel>Priorité</StyledLabel>
                  <span>{contact.isPrimary ? 'Principal' : 'Secondaire'}</span>
                </StyledRowField>
                {canWritePrivate ? (
                  <Button
                    title="Modifier le contact d’urgence"
                    ariaLabel="Modifier le contact d’urgence"
                    Icon={IconEdit}
                    variant="secondary"
                    onClick={() => openEmergency(contact)}
                  />
                ) : (
                  <span />
                )}
              </StyledRow>
            ))}
          </StyledRows>
        )}
      </StyledSection>

      <StyledSection>
        <StyledSectionHeader>
          <StyledSectionTitle>Coordonnées bancaires</StyledSectionTitle>
          {canWriteBank ? (
            <Button
              title="Remplacer les coordonnées bancaires"
              ariaLabel="Remplacer les coordonnées bancaires"
              Icon={currentBank === null ? IconPlus : IconEdit}
              variant="secondary"
              onClick={openBank}
            />
          ) : null}
        </StyledSectionHeader>
        {!employee.access.canReadBank ? (
          <StyledEmpty>Accès aux coordonnées bancaires restreint.</StyledEmpty>
        ) : currentBank === null ? (
          <StyledEmpty>Aucun compte bancaire sécurisé enregistré.</StyledEmpty>
        ) : (
          <StyledFields>
            <StyledFieldValue>
              <StyledLabel>Banque</StyledLabel>
              <StyledValue>{currentBank.bankName}</StyledValue>
            </StyledFieldValue>
            <StyledFieldValue>
              <StyledLabel>Titulaire</StyledLabel>
              <StyledValue>{currentBank.accountHolderName}</StyledValue>
            </StyledFieldValue>
            <StyledFieldValue>
              <StyledLabel>RIB protégé</StyledLabel>
              <StyledValue>{currentBank.maskedRib}</StyledValue>
            </StyledFieldValue>
            <StyledFieldValue>
              <StyledLabel>Contrôle</StyledLabel>
              <StyledValue>
                {currentBank.verifiedAt === null ? 'À vérifier' : 'Vérifié'}
              </StyledValue>
              <StyledLabel>
                Actif depuis {currentBank.effectiveFrom}
              </StyledLabel>
            </StyledFieldValue>
          </StyledFields>
        )}
      </StyledSection>

      <ErpFormDrawer
        isOpen={drawer !== null}
        title={drawerTitle}
        description={
          drawer?.kind === 'bank'
            ? 'Le RIB sera chiffré avant stockage et ne sera plus réaffiché.'
            : 'Les modifications sont réservées aux administrateurs RH.'
        }
        isBusy={busy}
        onClose={() => setDrawer(null)}
        footer={
          <>
            <Button
              title="Annuler"
              ariaLabel="Annuler"
              variant="secondary"
              disabled={busy}
              onClick={() => setDrawer(null)}
            />
            <Button
              title="Enregistrer"
              ariaLabel="Enregistrer"
              Icon={IconCheck}
              accent="blue"
              disabled={busy}
              onClick={submitDrawer}
            />
          </>
        }
      >
        <StyledDrawerForm
          onSubmit={(event) => {
            event.preventDefault();
            submitDrawer();
          }}
        >
          {drawer?.kind === 'profile' ? (
            <>
              <StyledFormField>
                Prénom
                <StyledInput
                  value={profileForm.firstName}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Nom
                <StyledInput
                  value={profileForm.lastName}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                CIN
                <StyledInput
                  value={profileForm.cin}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      cin: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Numéro CNSS
                <StyledInput
                  value={profileForm.cnssNumber}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      cnssNumber: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Date de naissance
                <StyledInput
                  type="date"
                  value={profileForm.birthDate}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      birthDate: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Lieu de naissance
                <StyledInput
                  value={profileForm.birthPlace}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      birthPlace: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Nationalité (ISO)
                <StyledInput
                  maxLength={2}
                  value={profileForm.nationalityCountryCode}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      nationalityCountryCode: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Genre
                <StyledSelect
                  value={profileForm.gender}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      gender: event.target.value,
                    }))
                  }
                >
                  <option value="">Non renseigné</option>
                  <option value="FEMALE">Femme</option>
                  <option value="MALE">Homme</option>
                  <option value="OTHER">Autre</option>
                  <option value="UNDISCLOSED">Non communiqué</option>
                </StyledSelect>
              </StyledFormField>
              <StyledFormField>
                Situation familiale
                <StyledSelect
                  value={profileForm.maritalStatus}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      maritalStatus: event.target.value,
                    }))
                  }
                >
                  <option value="">Non renseignée</option>
                  <option value="SINGLE">Célibataire</option>
                  <option value="MARRIED">Marié(e)</option>
                  <option value="DIVORCED">Divorcé(e)</option>
                  <option value="WIDOWED">Veuf / veuve</option>
                </StyledSelect>
              </StyledFormField>
              <StyledFormField>
                Email professionnel
                <StyledInput
                  type="email"
                  value={profileForm.email}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Téléphone professionnel
                <StyledInput
                  value={profileForm.phone}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Email personnel
                <StyledInput
                  type="email"
                  value={profileForm.personalEmail}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      personalEmail: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Téléphone personnel
                <StyledInput
                  value={profileForm.personalPhone}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      personalPhone: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Adresse
                <StyledInput
                  value={profileForm.address}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Complément d’adresse
                <StyledInput
                  value={profileForm.addressLine2}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      addressLine2: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Ville
                <StyledInput
                  value={profileForm.city}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Code postal
                <StyledInput
                  value={profileForm.postalCode}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      postalCode: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
            </>
          ) : null}

          {drawer?.kind === 'dependant' ? (
            <>
              <StyledFormField>
                Prénom
                <StyledInput
                  value={dependantForm.firstName}
                  onChange={(event) =>
                    setDependantForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Nom
                <StyledInput
                  value={dependantForm.lastName}
                  onChange={(event) =>
                    setDependantForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Lien
                <StyledSelect
                  value={dependantForm.relationship}
                  onChange={(event) =>
                    setDependantForm((current) => ({
                      ...current,
                      relationship: event.target.value,
                    }))
                  }
                >
                  <option value="CHILD">Enfant</option>
                  <option value="SPOUSE">Conjoint</option>
                  <option value="ASCENDANT">Ascendant</option>
                  <option value="OTHER">Autre</option>
                </StyledSelect>
              </StyledFormField>
              <StyledFormField>
                Date de naissance
                <StyledInput
                  type="date"
                  value={dependantForm.birthDate}
                  onChange={(event) =>
                    setDependantForm((current) => ({
                      ...current,
                      birthDate: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Valide depuis
                <StyledInput
                  type="date"
                  value={dependantForm.validFrom}
                  onChange={(event) =>
                    setDependantForm((current) => ({
                      ...current,
                      validFrom: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Valide jusqu’au
                <StyledInput
                  type="date"
                  value={dependantForm.validTo}
                  onChange={(event) =>
                    setDependantForm((current) => ({
                      ...current,
                      validTo: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledCheckboxField>
                <input
                  type="checkbox"
                  checked={dependantForm.isTaxDependant}
                  onChange={(event) =>
                    setDependantForm((current) => ({
                      ...current,
                      isTaxDependant: event.target.checked,
                    }))
                  }
                />
                Pris en compte pour les déductions familiales
              </StyledCheckboxField>
              <StyledCheckboxField>
                <input
                  type="checkbox"
                  checked={dependantForm.hasDisability}
                  onChange={(event) =>
                    setDependantForm((current) => ({
                      ...current,
                      hasDisability: event.target.checked,
                    }))
                  }
                />
                Situation de handicap déclarée
              </StyledCheckboxField>
            </>
          ) : null}

          {drawer?.kind === 'emergency' ? (
            <>
              <StyledFormField>
                Prénom
                <StyledInput
                  value={emergencyForm.firstName}
                  onChange={(event) =>
                    setEmergencyForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Nom
                <StyledInput
                  value={emergencyForm.lastName}
                  onChange={(event) =>
                    setEmergencyForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Lien avec le salarié
                <StyledInput
                  value={emergencyForm.relationship}
                  onChange={(event) =>
                    setEmergencyForm((current) => ({
                      ...current,
                      relationship: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Téléphone
                <StyledInput
                  value={emergencyForm.phone}
                  onChange={(event) =>
                    setEmergencyForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Email
                <StyledInput
                  type="email"
                  value={emergencyForm.email}
                  onChange={(event) =>
                    setEmergencyForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledCheckboxField>
                <input
                  type="checkbox"
                  checked={emergencyForm.isPrimary}
                  onChange={(event) =>
                    setEmergencyForm((current) => ({
                      ...current,
                      isPrimary: event.target.checked,
                    }))
                  }
                />
                Contact principal
              </StyledCheckboxField>
            </>
          ) : null}

          {drawer?.kind === 'bank' ? (
            <>
              <StyledFormField>
                Banque
                <StyledInput
                  value={bankForm.bankName}
                  onChange={(event) =>
                    setBankForm((current) => ({
                      ...current,
                      bankName: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Titulaire du compte
                <StyledInput
                  value={bankForm.accountHolderName}
                  onChange={(event) =>
                    setBankForm((current) => ({
                      ...current,
                      accountHolderName: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                RIB marocain (24 chiffres)
                <StyledInput
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={bankForm.rib}
                  onChange={(event) =>
                    setBankForm((current) => ({
                      ...current,
                      rib: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledFormField>
                Date d’effet
                <StyledInput
                  type="date"
                  value={bankForm.effectiveFrom}
                  onChange={(event) =>
                    setBankForm((current) => ({
                      ...current,
                      effectiveFrom: event.target.value,
                    }))
                  }
                />
              </StyledFormField>
              <StyledCheckboxField>
                <input
                  type="checkbox"
                  checked={bankForm.verified}
                  onChange={(event) =>
                    setBankForm((current) => ({
                      ...current,
                      verified: event.target.checked,
                    }))
                  }
                />
                RIB contrôlé sur justificatif
              </StyledCheckboxField>
            </>
          ) : null}
        </StyledDrawerForm>
      </ErpFormDrawer>
    </>
  );
};
