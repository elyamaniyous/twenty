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
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  erpBankStatementSchema,
  erpDocumentContentSchema,
  erpDocumentListSchema,
  erpDocumentSchema,
  erpPurchaseOrderListSchema,
  erpSupplierInvoiceSchema,
  type ErpDocument,
  type ErpPurchaseOrder,
} from 'twenty-shared/erp-maroc';
import {
  IconCheck,
  IconFileText,
  IconLink,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconUpload,
  IconX,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type DocumentType = ErpDocument['type'];
type UploadDocumentType = DocumentType | 'AUTO';
type InvoiceLineDraft = {
  quantity: string;
  unitPriceHt: string;
  tvaRate: string;
};
type ExtractedInvoiceData = {
  detectedType?: DocumentType | null;
  classificationReasons?: string[];
  dates?: string[];
  amountsCents?: number[];
  iceNumbers?: string[];
  accountReference?: string | null;
  supplierIce?: string | null;
  externalReference?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  totalHtCents?: number | null;
  totalTvaCents?: number | null;
  totalTtcCents?: number | null;
  purchaseOrderId?: string | null;
  lines?: Array<{
    purchaseOrderLineId?: string;
    quantity?: number;
    unitPriceHt?: number;
    tvaRate?: number;
  }>;
};

const statusAppearance: Record<
  ErpDocument['status'],
  { label: string; tone: ErpStatusTone }
> = {
  UPLOADED: { label: 'Déposé', tone: 'neutral' },
  OCR_PENDING: { label: 'OCR en attente', tone: 'info' },
  OCR_PROCESSING: { label: 'OCR en cours', tone: 'info' },
  REVIEW_REQUIRED: { label: 'À contrôler', tone: 'warning' },
  VALIDATED: { label: 'Validé', tone: 'success' },
  REJECTED: { label: 'Rejeté', tone: 'danger' },
  FAILED: { label: 'OCR en échec', tone: 'danger' },
};

const documentTypes: Array<{ value: DocumentType | ''; label: string }> = [
  { value: '', label: 'Tous les types' },
  { value: 'SUPPLIER_INVOICE', label: 'Facture fournisseur' },
  { value: 'CUSTOMER_INVOICE', label: 'Facture client' },
  { value: 'BANK_STATEMENT', label: 'Relevé bancaire' },
  { value: 'RECEIPT', label: 'Reçu' },
  { value: 'CONTRACT', label: 'Contrat' },
  { value: 'FISCAL', label: 'Fiscal' },
  { value: 'PAYROLL', label: 'Paie' },
  { value: 'OTHER', label: 'Autre' },
];

const uploadDocumentTypes: Array<{
  value: UploadDocumentType;
  label: string;
}> = [
  { value: 'AUTO', label: 'Classement automatique' },
  ...documentTypes.filter(
    (entry): entry is { value: DocumentType; label: string } =>
      entry.value !== '',
  ),
];

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
`;

const StyledInput = styled.input`
  ${controlCss}
`;

const StyledSelect = styled.select`
  ${controlCss}
`;

const StyledTextarea = styled.textarea`
  ${controlCss}
  height: 64px;
  padding-block: ${themeCssVariables.spacing[2]};
  resize: vertical;
`;

const StyledHiddenInput = styled.input`
  display: none;
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

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const StyledUploadForm = styled.form`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: 170px minmax(220px, 1fr) minmax(180px, 1fr) auto;
  padding: ${themeCssVariables.spacing[3]};

  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const StyledDetail = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: minmax(320px, 0.9fr) minmax(420px, 1.1fr);
  min-height: 0;
  overflow: hidden;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    overflow: auto;
  }
`;

const StyledPreview = styled.div`
  background: ${themeCssVariables.background.secondary};
  border-right: 1px solid ${themeCssVariables.border.color.light};
  min-height: 360px;
  overflow: hidden;

  iframe,
  img {
    border: 0;
    height: 100%;
    object-fit: contain;
    width: 100%;
  }
`;

const StyledPreviewState = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  height: 100%;
  justify-content: center;
  min-height: 280px;
`;

const StyledReview = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const StyledReviewHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledReviewForm = styled.form`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledFullWidth = styled.div`
  grid-column: 1 / -1;
`;

const StyledOcrMetrics = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
`;

const StyledMetric = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};

  span {
    color: ${themeCssVariables.font.color.secondary};
    font-size: ${themeCssVariables.font.size.sm};
  }
`;

const StyledLines = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  grid-column: 1 / -1;
`;

const StyledLine = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(180px, 1fr) 90px 120px 90px;
  padding: ${themeCssVariables.spacing[2]} 0;
`;

const StyledLineLabel = styled.div`
  color: ${themeCssVariables.font.color.primary};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  small {
    color: ${themeCssVariables.font.color.tertiary};
    display: block;
  }
`;

const StyledFormActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  grid-column: 1 / -1;
  justify-content: flex-end;
`;

const readFileBase64 = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunkSize = 32_768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return btoa(binary);
};

const previewUrlFromBase64 = (contentBase64: string, mimeType: string) => {
  const binary = atob(contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
};

const asExtractedData = (value: unknown): ExtractedInvoiceData =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as ExtractedInvoiceData)
    : {};

const centsLabel = (value: number | null | undefined) =>
  value == null ? '—' : formatMadCents(value);

export const ErpDocumentsPage = () => {
  const { client, context } = useErpMarocContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<ErpDocument[]>([]);
  const [orders, setOrders] = useState<ErpPurchaseOrder[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [generation, setGeneration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    danger: boolean;
  } | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | ''>('');
  const [tagFilter, setTagFilter] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    type: '' as DocumentType | '',
    tag: '',
  });
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<UploadDocumentType>('AUTO');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState('');
  const [externalReference, setExternalReference] = useState('');
  const [supplierIce, setSupplierIce] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [validationNotes, setValidationNotes] = useState('');
  const [reviewType, setReviewType] =
    useState<DocumentType>('SUPPLIER_INVOICE');
  const [lineDrafts, setLineDrafts] = useState<
    Record<string, InvoiceLineDraft>
  >({});

  const canAccount =
    context?.role === 'OWNER' ||
    context?.role === 'ADMIN' ||
    context?.role === 'COMPTABLE';

  const notify = useCallback((text: string, danger = false) => {
    setMessage({ text, danger });
  }, []);

  const load = useCallback(() => {
    const abortController = new AbortController();
    setState('loading');
    const query = Object.fromEntries(
      Object.entries(appliedFilters).filter(([, value]) => value !== ''),
    ) as Record<string, string>;
    void Promise.all([
      client.request({
        method: 'GET',
        path: '/documents',
        query,
        schema: erpDocumentListSchema,
        signal: abortController.signal,
      }),
      client.request({
        method: 'GET',
        path: '/purchase-orders',
        schema: erpPurchaseOrderListSchema,
        signal: abortController.signal,
      }),
    ])
      .then(([nextDocuments, nextOrders]) => {
        if (abortController.signal.aborted) return;
        setDocuments(nextDocuments);
        setOrders(nextOrders);
        setSelectedId((current) =>
          nextDocuments.some(({ id }) => id === current) ? current : '',
        );
        setState('ready');
      })
      .catch(() => {
        if (!abortController.signal.aborted) setState('error');
      });
    return () => abortController.abort();
  }, [appliedFilters, client]);

  useEffect(() => load(), [generation, load]);

  useEffect(() => {
    if (
      !documents.some(({ status }) =>
        ['OCR_PENDING', 'OCR_PROCESSING'].includes(status),
      )
    ) {
      return;
    }
    const timer = window.setTimeout(
      () => setGeneration((value) => value + 1),
      4_000,
    );
    return () => window.clearTimeout(timer);
  }, [documents]);

  const selectedDocument =
    documents.find(({ id }) => id === selectedId) ?? null;
  const selectedOrder = orders.find(({ id }) => id === selectedOrderId) ?? null;

  useEffect(() => {
    if (!selectedDocument) {
      setPreviewUrl(null);
      return;
    }
    let active = true;
    let objectUrl: string | null = null;
    void client
      .request({
        method: 'GET',
        path: `/documents/${selectedDocument.id}/content`,
        schema: erpDocumentContentSchema,
      })
      .then((content) => {
        if (!active) return;
        objectUrl = previewUrlFromBase64(
          content.contentBase64,
          content.mimeType,
        );
        setPreviewMimeType(content.mimeType);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (active) setPreviewUrl(null);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [client, selectedDocument]);

  useEffect(() => {
    if (!selectedDocument) return;
    const extracted = asExtractedData(selectedDocument.extractedData);
    setReviewType(selectedDocument.type);
    setExternalReference(extracted.externalReference ?? '');
    setSupplierIce(extracted.supplierIce ?? '');
    setIssueDate(extracted.issueDate ?? '');
    setDueDate(extracted.dueDate ?? extracted.issueDate ?? '');
    setValidationNotes(selectedDocument.validationNotes ?? '');
    setSelectedOrderId(extracted.purchaseOrderId ?? '');
    const extractedLines = extracted.lines ?? [];
    setLineDrafts(
      Object.fromEntries(
        extractedLines
          .filter((line) => typeof line.purchaseOrderLineId === 'string')
          .map((line) => [
            line.purchaseOrderLineId as string,
            {
              quantity: String(line.quantity ?? ''),
              unitPriceHt: String(line.unitPriceHt ?? ''),
              tvaRate: String(line.tvaRate ?? ''),
            },
          ]),
      ),
    );
  }, [selectedDocument]);

  useEffect(() => {
    if (!selectedOrder) return;
    setLineDrafts((current) =>
      Object.fromEntries(
        selectedOrder.lines.map((line) => [
          line.id,
          current[line.id] ?? {
            quantity: String(line.quantityReceived || ''),
            unitPriceHt: String(line.unitPriceHtCents / 100),
            tvaRate: String(line.tvaRate),
          },
        ]),
      ),
    );
  }, [selectedOrder]);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    setAppliedFilters({
      search: search.trim(),
      type: typeFilter,
      tag: tagFilter.trim().toLowerCase(),
    });
  };

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setUploadFile(file);
    if (file && !uploadTitle) setUploadTitle(file.name);
  };

  const uploadDocument = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !uploadFile ||
      uploadFile.size === 0 ||
      uploadFile.size > 20 * 1024 * 1024
    ) {
      notify('Le fichier doit peser entre 1 octet et 20 Mo.', true);
      return;
    }
    const extension = uploadFile.name.split('.').pop()?.toLowerCase();
    if (
      !['application/pdf', 'image/png', 'image/jpeg'].includes(
        uploadFile.type,
      ) &&
      !['pdf', 'png', 'jpg', 'jpeg'].includes(extension ?? '')
    ) {
      notify('Seuls les fichiers PDF, PNG et JPEG sont acceptés.', true);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const contentBase64 = await readFileBase64(uploadFile);
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/documents',
          body: {
            type: uploadType,
            filename: uploadFile.name,
            title: uploadTitle.trim() || uploadFile.name,
            tags: uploadTags
              .split(',')
              .map((tag) => tag.trim().toLowerCase())
              .filter(Boolean),
            contentBase64,
          },
          schema: erpDocumentSchema,
        },
        { idempotency: 'required' },
      );
      const created = await intent.execute();
      setSelectedId(created.id);
      setUploadFile(null);
      setUploadTitle('');
      setUploadTags('');
      setShowUpload(false);
      setGeneration((value) => value + 1);
      notify('Document déposé et traitement lancé.');
    } catch {
      notify('Le dépôt du document a échoué.', true);
    } finally {
      setBusy(false);
    }
  };

  const retryOcr = async () => {
    if (!selectedDocument) return;
    setBusy(true);
    setMessage(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/documents/${selectedDocument.id}/ocr/retry`,
          schema: erpDocumentSchema,
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setGeneration((value) => value + 1);
      notify('Nouvelle tentative OCR programmée.');
    } catch {
      notify('La relance OCR a échoué.', true);
    } finally {
      setBusy(false);
    }
  };

  const invoiceLines = () => {
    if (!selectedOrder) return null;
    const lines = selectedOrder.lines
      .map((line) => {
        const draft = lineDrafts[line.id];
        const quantity = Number(draft?.quantity.replace(',', '.'));
        const unitPriceHt = Number(draft?.unitPriceHt.replace(',', '.'));
        const tvaRate = Number(draft?.tvaRate);
        return {
          purchaseOrderLineId: line.id,
          quantity,
          unitPriceHt,
          tvaRate,
        };
      })
      .filter(({ quantity }) => Number.isFinite(quantity) && quantity > 0);
    if (
      lines.length === 0 ||
      lines.some(
        ({ purchaseOrderLineId, quantity, unitPriceHt, tvaRate }) =>
          !Number.isFinite(unitPriceHt) ||
          unitPriceHt < 0 ||
          ![0, 7, 10, 14, 20].includes(tvaRate) ||
          quantity >
            (selectedOrder.lines.find(({ id }) => id === purchaseOrderLineId)
              ?.quantityReceived ?? 0),
      )
    ) {
      return null;
    }
    return lines;
  };

  const correctedExtractedData = () => {
    const lines = invoiceLines();
    if (
      !selectedOrder ||
      !lines ||
      !externalReference.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(issueDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
      dueDate < issueDate
    ) {
      return null;
    }
    const original = asExtractedData(selectedDocument?.extractedData);
    return {
      ...original,
      supplierIce: supplierIce.trim() || null,
      externalReference: externalReference.trim(),
      issueDate,
      dueDate,
      currency: 'MAD',
      purchaseOrderId: selectedOrder.id,
      lines,
      requiresPurchaseOrderMapping: false,
    };
  };

  const validateOcr = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedDocument) return;
    const extractedData =
      reviewType === 'SUPPLIER_INVOICE'
        ? correctedExtractedData()
        : {
            ...asExtractedData(selectedDocument.extractedData),
            detectedType: reviewType,
          };
    if (!extractedData) {
      notify(
        'Référence, dates, bon de commande et lignes valides sont requis.',
        true,
      );
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/documents/${selectedDocument.id}/ocr/validate`,
          body: {
            type: reviewType,
            extractedData,
            validationNotes: validationNotes.trim() || null,
          },
          schema: erpDocumentSchema,
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setGeneration((value) => value + 1);
      notify('Extraction OCR validée par le contrôle humain.');
    } catch {
      notify('La validation OCR a échoué.', true);
    } finally {
      setBusy(false);
    }
  };

  const createSupplierInvoice = async () => {
    if (!selectedDocument || selectedDocument.type !== 'SUPPLIER_INVOICE')
      return;
    const corrected = correctedExtractedData();
    if (!corrected) {
      notify('Les données validées de la facture sont incomplètes.', true);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/documents/${selectedDocument.id}/create-supplier-invoice`,
          body: corrected,
          schema: erpSupplierInvoiceSchema,
        },
        { idempotency: 'required' },
      );
      const invoice = await intent.execute();
      setGeneration((value) => value + 1);
      notify(`Facture fournisseur ${invoice.externalReference} créée.`);
    } catch {
      notify('La création de la facture fournisseur a échoué.', true);
    } finally {
      setBusy(false);
    }
  };

  const createBankStatement = async () => {
    if (!selectedDocument || selectedDocument.type !== 'BANK_STATEMENT') return;
    setBusy(true);
    setMessage(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: `/documents/${selectedDocument.id}/create-bank-statement`,
          body: {},
          schema: erpBankStatementSchema,
        },
        { idempotency: 'required' },
      );
      await intent.execute();
      setGeneration((value) => value + 1);
      notify('Relevé transmis au rapprochement bancaire.');
    } catch {
      notify("La création de l'import bancaire a échoué.", true);
    } finally {
      setBusy(false);
    }
  };

  const documentColumns = useMemo<ErpOperationalTableColumn<ErpDocument>[]>(
    () => [
      {
        key: 'title',
        header: 'Document',
        width: '280px',
        render: (document) => document.title,
      },
      {
        key: 'type',
        header: 'Type',
        width: '170px',
        render: (document) =>
          documentTypes.find(({ value }) => value === document.type)?.label ??
          document.type,
      },
      {
        key: 'status',
        header: 'Statut',
        width: '150px',
        render: (document) => (
          <ErpStatusBadge
            label={statusAppearance[document.status].label}
            tone={statusAppearance[document.status].tone}
          />
        ),
      },
      {
        key: 'confidence',
        header: 'Confiance OCR',
        width: '130px',
        render: (document) =>
          document.ocrConfidenceBasisPoints == null
            ? '—'
            : `${(document.ocrConfidenceBasisPoints / 100).toLocaleString(
                'fr-FR',
                { maximumFractionDigits: 2 },
              )} %`,
      },
      {
        key: 'tags',
        header: 'Tags',
        width: '220px',
        render: (document) => document.tags.join(', ') || '—',
      },
      {
        key: 'created',
        header: 'Déposé le',
        width: '170px',
        render: (document) =>
          new Date(document.createdAt).toLocaleString('fr-FR'),
      },
      {
        key: 'action',
        header: '',
        width: '70px',
        render: (document) => (
          <Button
            title="Ouvrir"
            ariaLabel={`Ouvrir ${document.title}`}
            Icon={IconFileText}
            variant="secondary"
            onClick={() => setSelectedId(document.id)}
          />
        ),
      },
    ],
    [],
  );

  const extracted = asExtractedData(selectedDocument?.extractedData);
  const availableOrders = orders.filter(({ status }) =>
    ['PARTIALLY_RECEIVED', 'RECEIVED', 'INVOICED'].includes(status),
  );

  return (
    <ErpPageShell
      title="Zowka Inbox"
      state={state}
      loadingLabel="Chargement des documents"
      errorLabel="Impossible de charger les documents"
      onRetry={() => setGeneration((value) => value + 1)}
      actions={
        <StyledToolbarGroup>
          <Button
            title="Actualiser"
            ariaLabel="Actualiser les documents"
            Icon={IconRefresh}
            variant="secondary"
            disabled={busy}
            onClick={() => setGeneration((value) => value + 1)}
          />
          {canAccount ? (
            <Button
              title="Déposer"
              ariaLabel="Déposer un document"
              Icon={IconPlus}
              accent="blue"
              onClick={() => setShowUpload((value) => !value)}
            />
          ) : null}
        </StyledToolbarGroup>
      }
    >
      {message === null ? null : (
        <StyledNotice danger={message.danger}>{message.text}</StyledNotice>
      )}
      {showUpload ? (
        <StyledUploadForm onSubmit={uploadDocument}>
          <StyledHiddenInput
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            onChange={chooseFile}
          />
          <Button
            type="button"
            title={uploadFile?.name ?? 'Choisir le fichier'}
            ariaLabel="Choisir le document"
            Icon={IconUpload}
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          />
          <StyledSelect
            aria-label="Type de document"
            value={uploadType}
            onChange={(event) =>
              setUploadType(event.target.value as UploadDocumentType)
            }
          >
            {uploadDocumentTypes.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </StyledSelect>
          <StyledInput
            aria-label="Titre du document"
            placeholder="Titre"
            value={uploadTitle}
            onChange={(event) => setUploadTitle(event.target.value)}
          />
          <StyledInput
            aria-label="Tags du document"
            placeholder="Tags séparés par une virgule"
            value={uploadTags}
            onChange={(event) => setUploadTags(event.target.value)}
          />
          <StyledFormActions>
            <Button
              type="submit"
              title="Envoyer"
              ariaLabel="Envoyer le document"
              Icon={IconUpload}
              accent="blue"
              disabled={busy || uploadFile === null}
            />
            <Button
              type="button"
              title="Annuler"
              ariaLabel="Annuler le dépôt"
              Icon={IconX}
              variant="secondary"
              disabled={busy}
              onClick={() => setShowUpload(false)}
            />
          </StyledFormActions>
        </StyledUploadForm>
      ) : null}
      <StyledToolbar>
        <form onSubmit={applyFilters}>
          <StyledToolbarGroup>
            <StyledInput
              aria-label="Rechercher dans les documents"
              placeholder="Recherche plein texte"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <StyledSelect
              aria-label="Filtrer par type"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as DocumentType | '')
              }
            >
              {documentTypes.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </StyledSelect>
            <StyledInput
              aria-label="Filtrer par tag"
              placeholder="Tag"
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
            />
            <Button
              type="submit"
              title="Rechercher"
              ariaLabel="Appliquer les filtres documentaires"
              Icon={IconSearch}
              variant="secondary"
            />
          </StyledToolbarGroup>
        </form>
      </StyledToolbar>
      <StyledContent>
        {selectedDocument === null ? (
          <ErpOperationalTable
            ariaLabel="Documents comptables"
            columns={documentColumns}
            rows={documents}
            getRowKey={(document) => document.id}
            emptyLabel="Aucun document"
          />
        ) : (
          <StyledDetail>
            <StyledPreview>
              {previewUrl === null ? (
                <StyledPreviewState>
                  Prévisualisation indisponible
                </StyledPreviewState>
              ) : previewMimeType === 'application/pdf' ? (
                <iframe src={previewUrl} title={selectedDocument.title} />
              ) : (
                <img src={previewUrl} alt={selectedDocument.title} />
              )}
            </StyledPreview>
            <StyledReview>
              <StyledReviewHeader>
                <StyledToolbarGroup>
                  <strong>{selectedDocument.title}</strong>
                  <ErpStatusBadge
                    label={statusAppearance[selectedDocument.status].label}
                    tone={statusAppearance[selectedDocument.status].tone}
                  />
                </StyledToolbarGroup>
                <StyledToolbarGroup>
                  {selectedDocument.status === 'FAILED' ? (
                    <Button
                      title="Relancer OCR"
                      ariaLabel="Relancer le traitement OCR"
                      Icon={IconRefresh}
                      variant="secondary"
                      disabled={!canAccount || busy}
                      onClick={() => void retryOcr()}
                    />
                  ) : null}
                  {selectedDocument.type === 'SUPPLIER_INVOICE' &&
                  selectedDocument.status === 'VALIDATED' &&
                  selectedDocument.linkedEntityId === null ? (
                    <Button
                      title="Créer la facture"
                      ariaLabel="Créer la facture fournisseur"
                      Icon={IconLink}
                      accent="blue"
                      disabled={!canAccount || busy}
                      onClick={() => void createSupplierInvoice()}
                    />
                  ) : null}
                  {selectedDocument.type === 'BANK_STATEMENT' &&
                  selectedDocument.status === 'VALIDATED' &&
                  selectedDocument.linkedEntityId === null ? (
                    <Button
                      title="Préparer le rapprochement"
                      ariaLabel="Créer un import de relevé bancaire"
                      Icon={IconLink}
                      accent="blue"
                      disabled={!canAccount || busy}
                      onClick={() => void createBankStatement()}
                    />
                  ) : null}
                  <Button
                    title="Fermer"
                    ariaLabel="Fermer le document"
                    Icon={IconX}
                    variant="secondary"
                    onClick={() => setSelectedId('')}
                  />
                </StyledToolbarGroup>
              </StyledReviewHeader>
              <StyledOcrMetrics>
                <StyledMetric>
                  <span>Moteur OCR</span>
                  <strong>{selectedDocument.ocrEngine ?? '—'}</strong>
                </StyledMetric>
                <StyledMetric>
                  <span>Confiance</span>
                  <strong>
                    {selectedDocument.ocrConfidenceBasisPoints == null
                      ? '—'
                      : `${selectedDocument.ocrConfidenceBasisPoints / 100} %`}
                  </strong>
                </StyledMetric>
                <StyledMetric>
                  <span>Total détecté</span>
                  <strong>
                    {centsLabel(
                      extracted.totalTtcCents ?? extracted.amountsCents?.[0],
                    )}
                  </strong>
                </StyledMetric>
              </StyledOcrMetrics>
              <StyledReviewForm onSubmit={validateOcr}>
                <StyledSelect
                  aria-label="Classement du document"
                  value={reviewType}
                  disabled={selectedDocument.status !== 'REVIEW_REQUIRED'}
                  onChange={(event) =>
                    setReviewType(event.target.value as DocumentType)
                  }
                >
                  {documentTypes
                    .filter(({ value }) => value !== '')
                    .map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                </StyledSelect>
                {reviewType === 'SUPPLIER_INVOICE' ? (
                  <>
                    <StyledInput
                      aria-label="Référence de facture fournisseur"
                      placeholder="Référence facture"
                      value={externalReference}
                      disabled={selectedDocument.status !== 'REVIEW_REQUIRED'}
                      onChange={(event) =>
                        setExternalReference(event.target.value)
                      }
                    />
                    <StyledInput
                      aria-label="ICE fournisseur"
                      placeholder="ICE fournisseur"
                      value={supplierIce}
                      disabled={selectedDocument.status !== 'REVIEW_REQUIRED'}
                      onChange={(event) => setSupplierIce(event.target.value)}
                    />
                    <StyledInput
                      aria-label="Date de facture fournisseur"
                      type="date"
                      value={issueDate}
                      disabled={selectedDocument.status !== 'REVIEW_REQUIRED'}
                      onChange={(event) => setIssueDate(event.target.value)}
                    />
                    <StyledInput
                      aria-label="Échéance de facture fournisseur"
                      type="date"
                      value={dueDate}
                      disabled={selectedDocument.status !== 'REVIEW_REQUIRED'}
                      onChange={(event) => setDueDate(event.target.value)}
                    />
                    <StyledSelect
                      aria-label="Bon de commande fournisseur"
                      value={selectedOrderId}
                      disabled={selectedDocument.status !== 'REVIEW_REQUIRED'}
                      onChange={(event) =>
                        setSelectedOrderId(event.target.value)
                      }
                    >
                      <option value="">Bon de commande</option>
                      {availableOrders.map((order) => (
                        <option key={order.id} value={order.id}>
                          {order.number} · {order.supplier.name}
                        </option>
                      ))}
                    </StyledSelect>
                    {selectedOrder === null ? null : (
                      <StyledLines>
                        {selectedOrder.lines.map((line) => (
                          <StyledLine key={line.id}>
                            <StyledLineLabel>
                              {line.description}
                              <small>
                                Reçu {line.quantityReceived} {line.unit ?? ''}
                              </small>
                            </StyledLineLabel>
                            <StyledInput
                              aria-label={`Quantité ${line.description}`}
                              inputMode="decimal"
                              placeholder="Quantité"
                              value={lineDrafts[line.id]?.quantity ?? ''}
                              disabled={
                                selectedDocument.status !== 'REVIEW_REQUIRED'
                              }
                              onChange={(event) =>
                                setLineDrafts((current) => ({
                                  ...current,
                                  [line.id]: {
                                    ...(current[line.id] ?? {
                                      quantity: '',
                                      unitPriceHt: '',
                                      tvaRate: '',
                                    }),
                                    quantity: event.target.value,
                                  },
                                }))
                              }
                            />
                            <StyledInput
                              aria-label={`Prix unitaire ${line.description}`}
                              inputMode="decimal"
                              placeholder="Prix HT"
                              value={lineDrafts[line.id]?.unitPriceHt ?? ''}
                              disabled={
                                selectedDocument.status !== 'REVIEW_REQUIRED'
                              }
                              onChange={(event) =>
                                setLineDrafts((current) => ({
                                  ...current,
                                  [line.id]: {
                                    ...(current[line.id] ?? {
                                      quantity: '',
                                      unitPriceHt: '',
                                      tvaRate: '',
                                    }),
                                    unitPriceHt: event.target.value,
                                  },
                                }))
                              }
                            />
                            <StyledSelect
                              aria-label={`TVA ${line.description}`}
                              value={lineDrafts[line.id]?.tvaRate ?? ''}
                              disabled={
                                selectedDocument.status !== 'REVIEW_REQUIRED'
                              }
                              onChange={(event) =>
                                setLineDrafts((current) => ({
                                  ...current,
                                  [line.id]: {
                                    ...(current[line.id] ?? {
                                      quantity: '',
                                      unitPriceHt: '',
                                      tvaRate: '',
                                    }),
                                    tvaRate: event.target.value,
                                  },
                                }))
                              }
                            >
                              {[0, 7, 10, 14, 20].map((rate) => (
                                <option key={rate} value={rate}>
                                  {rate} %
                                </option>
                              ))}
                            </StyledSelect>
                          </StyledLine>
                        ))}
                      </StyledLines>
                    )}
                  </>
                ) : (
                  <StyledFullWidth>
                    <strong>Classement proposé</strong>
                    <p>
                      {extracted.classificationReasons?.length
                        ? extracted.classificationReasons.join(' · ')
                        : 'Aucun indice suffisamment fiable. Vérifiez le type avant validation.'}
                    </p>
                    <p>
                      Dates détectées : {extracted.dates?.join(' · ') || '—'}
                    </p>
                    <p>
                      ICE détectés : {extracted.iceNumbers?.join(' · ') || '—'}
                    </p>
                    <p>
                      Référence bancaire : {extracted.accountReference || '—'}
                    </p>
                  </StyledFullWidth>
                )}
                <StyledFullWidth>
                  <StyledTextarea
                    aria-label="Notes de validation OCR"
                    placeholder="Notes de validation"
                    value={validationNotes}
                    disabled={selectedDocument.status !== 'REVIEW_REQUIRED'}
                    onChange={(event) => setValidationNotes(event.target.value)}
                  />
                </StyledFullWidth>
                {selectedDocument.lastError ? (
                  <StyledFullWidth>
                    {selectedDocument.lastError}
                  </StyledFullWidth>
                ) : null}
                {selectedDocument.linkedEntityId ? (
                  <StyledFullWidth>
                    Élément ERP lié · {selectedDocument.linkedEntityId}
                  </StyledFullWidth>
                ) : null}
                {selectedDocument.status === 'REVIEW_REQUIRED' ? (
                  <StyledFormActions>
                    <Button
                      type="submit"
                      title="Valider"
                      ariaLabel="Valider les données OCR corrigées"
                      Icon={IconCheck}
                      accent="blue"
                      disabled={!canAccount || busy}
                    />
                  </StyledFormActions>
                ) : null}
              </StyledReviewForm>
            </StyledReview>
          </StyledDetail>
        )}
      </StyledContent>
    </ErpPageShell>
  );
};
