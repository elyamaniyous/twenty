import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import {
  ErpWorkspaceSummaryItem,
  StyledErpWorkspaceContent,
  StyledErpWorkspaceField,
  StyledErpWorkspaceFormGrid,
  StyledErpWorkspaceInlineActions,
  StyledErpWorkspaceInput,
  StyledErpWorkspacePanel,
  StyledErpWorkspacePanelTitle,
  StyledErpWorkspaceSelect,
  StyledErpWorkspaceSummary,
  StyledErpWorkspaceToolbar,
} from '@/erp-maroc/components/ErpComplianceUi';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useEffect, useState } from 'react';
import {
  erpRegulatoryListSchema,
  erpRegulatoryObjectSchema,
} from 'twenty-shared/erp-maroc';
import { IconCheck, IconPlus, IconRefresh, IconX } from 'twenty-ui/display';
import { Button, TabButton } from 'twenty-ui/input';

type EntityType =
  | 'PURCHASE_ORDER'
  | 'EXPENSE_NOTE'
  | 'SUPPLIER_PAYMENT'
  | 'ACCOUNTING_ENTRY';

type ApprovalMatrix = {
  id: string;
  name: string;
  entityType: EntityType;
  department: string | null;
  minAmountCents: number;
  maxAmountCents: number | null;
  steps: Array<{ step: number; role: string; label?: string }>;
  isActive: boolean;
  _count?: { requests: number };
};

type ApprovalRequest = {
  id: string;
  entityType: EntityType;
  entityId: string;
  amountCents: number;
  department: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  currentStep: number;
  matrix: ApprovalMatrix;
};

const entityLabels: Record<EntityType, string> = {
  PURCHASE_ORDER: 'Bon de commande achat',
  EXPENSE_NOTE: 'Note de frais',
  SUPPLIER_PAYMENT: 'Paiement fournisseur',
  ACCOUNTING_ENTRY: 'Écriture comptable',
};

const roles = ['COMPTABLE', 'ADMIN', 'OWNER'] as const;

export const ErpApprovalsPage = () => {
  const { client } = useErpMarocContext();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();
  const [view, setView] = useState<'requests' | 'matrices'>('requests');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [matrices, setMatrices] = useState<ApprovalMatrix[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [name, setName] = useState('Validation achats');
  const [entityType, setEntityType] = useState<EntityType>('PURCHASE_ORDER');
  const [department, setDepartment] = useState('');
  const [minAmount, setMinAmount] = useState('0');
  const [maxAmount, setMaxAmount] = useState('');
  const [role1, setRole1] = useState<(typeof roles)[number]>('COMPTABLE');
  const [role2, setRole2] = useState<(typeof roles)[number] | ''>('OWNER');
  const [entityId, setEntityId] = useState('');
  const [requestEntityType, setRequestEntityType] =
    useState<EntityType>('PURCHASE_ORDER');
  const [requestDepartment, setRequestDepartment] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = () => setGeneration((value) => value + 1);

  useEffect(() => {
    const abortController = new AbortController();
    setState('loading');
    Promise.all([
      client.request({
        method: 'GET',
        path: '/approvals/matrices',
        schema: erpRegulatoryListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/approvals/requests',
        schema: erpRegulatoryListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(([loadedMatrices, loadedRequests]) => {
        if (abortController.signal.aborted) return;
        setMatrices(loadedMatrices as unknown as ApprovalMatrix[]);
        setRequests(loadedRequests as unknown as ApprovalRequest[]);
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [client, generation]);

  const createMatrix = async () => {
    const minAmountCents = Math.round(Number(minAmount) * 100);
    const maxAmountCents =
      maxAmount === '' ? null : Math.round(Number(maxAmount) * 100);
    if (name.trim() === '' || !Number.isSafeInteger(minAmountCents)) return;
    setBusyId('matrix');
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/approvals/matrices',
            schema: erpRegulatoryObjectSchema,
            body: {
              name: name.trim(),
              entityType,
              department: department.trim() || null,
              minAmountCents,
              maxAmountCents,
              steps: [
                { step: 1, role: role1, label: 'Premier contrôle' },
                ...(role2 === ''
                  ? []
                  : [{ step: 2, role: role2, label: 'Validation finale' }]),
              ],
            },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({ message: 'Matrice d’approbation créée' });
      refresh();
    } catch {
      enqueueErrorSnackBar({
        message: 'Création impossible ou plage déjà couverte',
      });
    } finally {
      setBusyId(null);
    }
  };

  const setMatrixActive = async (matrix: ApprovalMatrix) => {
    setBusyId(matrix.id);
    try {
      await client
        .createMutationIntent(
          {
            method: 'PATCH',
            path: `/approvals/matrices/${matrix.id}/active`,
            schema: erpRegulatoryObjectSchema,
            body: { isActive: !matrix.isActive },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Mise à jour impossible' });
    } finally {
      setBusyId(null);
    }
  };

  const submitRequest = async () => {
    if (entityId.trim() === '') return;
    setBusyId('request');
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: '/approvals/requests',
            schema: erpRegulatoryObjectSchema,
            body: {
              entityType: requestEntityType,
              entityId: entityId.trim(),
              department: requestDepartment.trim() || null,
            },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      setEntityId('');
      enqueueSuccessSnackBar({ message: 'Demande soumise au circuit' });
      refresh();
    } catch {
      enqueueErrorSnackBar({
        message: 'Opération introuvable ou matrice absente',
      });
    } finally {
      setBusyId(null);
    }
  };

  const decide = async (
    request: ApprovalRequest,
    decision: 'APPROVED' | 'REJECTED',
  ) => {
    setBusyId(request.id);
    try {
      await client
        .createMutationIntent(
          {
            method: 'POST',
            path: `/approvals/requests/${request.id}/decision`,
            schema: erpRegulatoryObjectSchema,
            body: { decision, notes: decisionNotes.trim() || null },
          },
          { idempotency: 'forbidden' },
        )
        .execute();
      enqueueSuccessSnackBar({
        message:
          decision === 'APPROVED' ? 'Étape approuvée' : 'Demande rejetée',
      });
      refresh();
    } catch {
      enqueueErrorSnackBar({ message: 'Votre rôle ne permet pas cette étape' });
    } finally {
      setBusyId(null);
    }
  };

  const matrixColumns: ErpOperationalTableColumn<ApprovalMatrix>[] = [
    {
      key: 'name',
      header: 'Matrice',
      width: '240px',
      render: (row) => row.name,
    },
    {
      key: 'scope',
      header: 'Opération',
      width: '210px',
      render: (row) => entityLabels[row.entityType],
    },
    {
      key: 'department',
      header: 'Service',
      width: '140px',
      render: (row) => row.department ?? 'Tous',
    },
    {
      key: 'amount',
      header: 'Plage MAD',
      width: '220px',
      render: (row) =>
        `${formatMadCents(row.minAmountCents)} – ${row.maxAmountCents === null ? 'sans plafond' : formatMadCents(row.maxAmountCents)}`,
    },
    {
      key: 'steps',
      header: 'Circuit',
      width: '230px',
      render: (row) =>
        row.steps.map((step) => `${step.step}. ${step.role}`).join(' → '),
    },
    {
      key: 'active',
      header: 'Statut',
      width: '130px',
      render: (row) => (
        <Button
          title={row.isActive ? 'Désactiver' : 'Activer'}
          ariaLabel={`${row.isActive ? 'Désactiver' : 'Activer'} ${row.name}`}
          Icon={row.isActive ? IconX : IconCheck}
          variant="secondary"
          disabled={busyId !== null}
          onClick={() => void setMatrixActive(row)}
        />
      ),
    },
  ];

  const requestColumns: ErpOperationalTableColumn<ApprovalRequest>[] = [
    {
      key: 'type',
      header: 'Opération',
      width: '200px',
      render: (row) => entityLabels[row.entityType],
    },
    {
      key: 'id',
      header: 'Identifiant',
      width: '260px',
      render: (row) => row.entityId,
    },
    {
      key: 'amount',
      header: 'Montant',
      width: '150px',
      align: 'right',
      render: (row) => formatMadCents(row.amountCents),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '120px',
      render: (row) => row.status,
    },
    {
      key: 'step',
      header: 'Étape',
      width: '120px',
      render: (row) => `${row.currentStep}/${row.matrix.steps.length}`,
    },
    {
      key: 'actions',
      header: '',
      width: '230px',
      render: (row) =>
        row.status === 'PENDING' ? (
          <StyledErpWorkspaceInlineActions>
            <Button
              title="Approuver"
              ariaLabel={`Approuver ${row.entityId}`}
              Icon={IconCheck}
              variant="secondary"
              disabled={busyId !== null}
              onClick={() => void decide(row, 'APPROVED')}
            />
            <Button
              title="Rejeter"
              ariaLabel={`Rejeter ${row.entityId}`}
              Icon={IconX}
              variant="secondary"
              disabled={busyId !== null}
              onClick={() => void decide(row, 'REJECTED')}
            />
          </StyledErpWorkspaceInlineActions>
        ) : null,
    },
  ];

  const pending = requests.filter(
    (request) => request.status === 'PENDING',
  ).length;

  return (
    <ErpPageShell
      title="Approbations"
      description="Circuits de contrôle selon montant, service et responsabilité"
      state={state}
      onRetry={refresh}
      actions={
        <Button
          title="Actualiser"
          ariaLabel="Actualiser les approbations"
          Icon={IconRefresh}
          variant="secondary"
          onClick={refresh}
        />
      }
    >
      <StyledErpWorkspaceToolbar>
        <TabButton
          id="approvals-requests"
          title="Demandes"
          active={view === 'requests'}
          onClick={() => setView('requests')}
        />
        <TabButton
          id="approvals-matrices"
          title="Matrices"
          active={view === 'matrices'}
          onClick={() => setView('matrices')}
        />
      </StyledErpWorkspaceToolbar>
      <StyledErpWorkspaceSummary>
        <ErpWorkspaceSummaryItem label="À approuver" value={pending} />
        <ErpWorkspaceSummaryItem
          label="Matrices actives"
          value={matrices.filter((matrix) => matrix.isActive).length}
        />
        <ErpWorkspaceSummaryItem
          label="Approuvées"
          value={
            requests.filter((request) => request.status === 'APPROVED').length
          }
        />
      </StyledErpWorkspaceSummary>
      <StyledErpWorkspaceContent>
        {view === 'matrices' ? (
          <>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Nouvelle matrice
              </StyledErpWorkspacePanelTitle>
              <StyledErpWorkspaceFormGrid>
                <StyledErpWorkspaceField>
                  Nom
                  <StyledErpWorkspaceInput
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Opération
                  <StyledErpWorkspaceSelect
                    value={entityType}
                    onChange={(event) =>
                      setEntityType(event.target.value as EntityType)
                    }
                  >
                    {Object.entries(entityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Service
                  <StyledErpWorkspaceInput
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    placeholder="Tous si vide"
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Minimum MAD
                  <StyledErpWorkspaceInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={minAmount}
                    onChange={(event) => setMinAmount(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Maximum MAD
                  <StyledErpWorkspaceInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={maxAmount}
                    onChange={(event) => setMaxAmount(event.target.value)}
                    placeholder="Sans plafond"
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Étape 1
                  <StyledErpWorkspaceSelect
                    value={role1}
                    onChange={(event) =>
                      setRole1(event.target.value as (typeof roles)[number])
                    }
                  >
                    {roles.map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Étape 2
                  <StyledErpWorkspaceSelect
                    value={role2}
                    onChange={(event) =>
                      setRole2(
                        event.target.value as (typeof roles)[number] | '',
                      )
                    }
                  >
                    <option value="">Aucune</option>
                    {roles.map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <Button
                  title="Créer"
                  ariaLabel="Créer la matrice"
                  Icon={IconPlus}
                  variant="primary"
                  disabled={busyId !== null}
                  onClick={() => void createMatrix()}
                />
              </StyledErpWorkspaceFormGrid>
            </StyledErpWorkspacePanel>
            <ErpOperationalTable
              ariaLabel="Matrices d'approbation"
              columns={matrixColumns}
              rows={matrices}
              getRowKey={(row) => row.id}
              emptyLabel="Aucune matrice configurée"
            />
          </>
        ) : (
          <>
            <StyledErpWorkspacePanel>
              <StyledErpWorkspacePanelTitle>
                Soumettre une opération
              </StyledErpWorkspacePanelTitle>
              <StyledErpWorkspaceFormGrid>
                <StyledErpWorkspaceField>
                  Type
                  <StyledErpWorkspaceSelect
                    value={requestEntityType}
                    onChange={(event) =>
                      setRequestEntityType(event.target.value as EntityType)
                    }
                  >
                    {Object.entries(entityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </StyledErpWorkspaceSelect>
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Identifiant de l’opération
                  <StyledErpWorkspaceInput
                    value={entityId}
                    onChange={(event) => setEntityId(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Service
                  <StyledErpWorkspaceInput
                    value={requestDepartment}
                    onChange={(event) =>
                      setRequestDepartment(event.target.value)
                    }
                  />
                </StyledErpWorkspaceField>
                <StyledErpWorkspaceField>
                  Note de décision
                  <StyledErpWorkspaceInput
                    value={decisionNotes}
                    onChange={(event) => setDecisionNotes(event.target.value)}
                  />
                </StyledErpWorkspaceField>
                <Button
                  title="Soumettre"
                  ariaLabel="Soumettre l'opération"
                  Icon={IconPlus}
                  variant="primary"
                  disabled={busyId !== null || entityId.trim() === ''}
                  onClick={() => void submitRequest()}
                />
              </StyledErpWorkspaceFormGrid>
            </StyledErpWorkspacePanel>
            <ErpOperationalTable
              ariaLabel="Demandes d'approbation"
              columns={requestColumns}
              rows={requests}
              getRowKey={(row) => row.id}
              emptyLabel="Aucune demande d'approbation"
            />
          </>
        )}
      </StyledErpWorkspaceContent>
    </ErpPageShell>
  );
};
