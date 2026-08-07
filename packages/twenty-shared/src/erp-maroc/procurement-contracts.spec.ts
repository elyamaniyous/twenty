import { describe, expect, it } from 'vitest';

import {
  erpMarocUpstreamRoutes,
  erpPurchaseRequestSchema,
  erpSourcingEventSchema,
} from './erp-maroc-contracts';

const ids = {
  societe: '11111111-1111-4111-8111-111111111111',
  request: '22222222-2222-4222-8222-222222222222',
  requestLine: '33333333-3333-4333-8333-333333333333',
  event: '44444444-4444-4444-8444-444444444444',
  invitation: '55555555-5555-4555-8555-555555555555',
  supplier: '66666666-6666-4666-8666-666666666666',
  bid: '77777777-7777-4777-8777-777777777777',
  bidLine: '88888888-8888-4888-8888-888888888888',
} as const;

const instant = '2026-08-07T10:00:00.000Z';

const requestLine = {
  id: ids.requestLine,
  purchaseRequestId: ids.request,
  productId: null,
  description: 'Ordinateur portable',
  unit: 'unité',
  quantity: 2,
  estimatedUnitPriceHtCents: 100_000,
  tvaRate: 20,
  position: 0,
  createdAt: instant,
  updatedAt: instant,
  product: null,
};

const request = {
  id: ids.request,
  societeId: ids.societe,
  number: 'DA-2026-00001',
  year: 2026,
  title: 'Renouvellement du parc informatique',
  department: 'IT',
  status: 'SOURCING' as const,
  requestDate: '2026-08-07T00:00:00.000Z',
  desiredDeliveryDate: '2026-08-30T00:00:00.000Z',
  estimatedBudgetCents: 240_000,
  notes: null,
  requestedByTwentyUserId: 'user-1',
  submittedAt: instant,
  approvedAt: instant,
  approvedByTwentyUserId: 'user-2',
  cancelledAt: null,
  cancelledByTwentyUserId: null,
  cancellationReason: null,
  createdAt: instant,
  updatedAt: instant,
  lines: [requestLine],
};

describe('procurement contracts', () => {
  it('normalizes purchase request civil dates', () => {
    const parsed = erpPurchaseRequestSchema.parse({
      ...request,
      sourcingEvents: [
        {
          id: ids.event,
          type: 'REQUEST_FOR_QUOTATION',
          status: 'OPEN',
          responseDeadline: '2026-08-20T23:59:59.999Z',
          generatedPurchaseOrderId: null,
        },
      ],
    });

    expect(parsed.requestDate).toBe('2026-08-07');
    expect(parsed.desiredDeliveryDate).toBe('2026-08-30');
  });

  it('parses evaluated supplier bids returned by the sourcing API', () => {
    const parsed = erpSourcingEventSchema.parse({
      id: ids.event,
      societeId: ids.societe,
      purchaseRequestId: ids.request,
      type: 'REQUEST_FOR_QUOTATION',
      status: 'CLOSED',
      title: 'Consultation informatique',
      responseDeadline: '2026-08-20T23:59:59.999Z',
      priceWeight: 60,
      deliveryWeight: 25,
      paymentTermsWeight: 15,
      notes: null,
      openedAt: instant,
      closedAt: instant,
      awardedAt: null,
      awardedByTwentyUserId: null,
      selectedBidId: null,
      generatedPurchaseOrderId: null,
      createdByTwentyUserId: 'user-1',
      createdAt: instant,
      updatedAt: instant,
      purchaseRequest: request,
      invitedSuppliers: [
        {
          id: ids.invitation,
          sourcingEventId: ids.event,
          supplierId: ids.supplier,
          invitedAt: instant,
          respondedAt: instant,
          createdAt: instant,
          updatedAt: instant,
          supplier: {
            id: ids.supplier,
            name: 'Atlas Informatique',
            type: 'FOURNISSEUR',
            email: 'achats@atlas.example',
            ice: null,
          },
        },
      ],
      bids: [
        {
          id: ids.bid,
          societeId: ids.societe,
          sourcingEventId: ids.event,
          supplierId: ids.supplier,
          externalReference: 'DEV-2026-081',
          status: 'SUBMITTED',
          issueDate: '2026-08-08T00:00:00.000Z',
          validityDate: '2026-09-08T00:00:00.000Z',
          currency: 'MAD',
          deliveryDays: 5,
          paymentTermsDays: 30,
          warranty: '12 mois',
          notes: null,
          totalHtCents: 200_000,
          totalTvaCents: 40_000,
          totalTtcCents: 240_000,
          receivedAt: instant,
          recordedByTwentyUserId: 'user-1',
          createdAt: instant,
          updatedAt: instant,
          supplier: {
            id: ids.supplier,
            name: 'Atlas Informatique',
            type: 'FOURNISSEUR',
            email: 'achats@atlas.example',
            ice: null,
          },
          lines: [
            {
              id: ids.bidLine,
              supplierBidId: ids.bid,
              purchaseRequestLineId: ids.requestLine,
              quantity: 2,
              unitPriceHtCents: 100_000,
              tvaRate: 20,
              totalHtCents: 200_000,
              totalTvaCents: 40_000,
              totalTtcCents: 240_000,
              position: 0,
              createdAt: instant,
              updatedAt: instant,
              purchaseRequestLine: {
                id: ids.requestLine,
                productId: null,
                description: 'Ordinateur portable',
                unit: 'unité',
                quantity: 2,
                position: 0,
              },
            },
          ],
          evaluationScore: 94.25,
          evaluationRank: 1,
        },
      ],
      generatedPurchaseOrder: null,
    });

    expect(parsed.bids[0].evaluationScore).toBe(94.25);
    expect(parsed.bids[0].issueDate).toBe('2026-08-08');
  });

  it('builds every procurement upstream route with encoded UUIDs', () => {
    expect(erpMarocUpstreamRoutes.procurement.submitRequest(ids.request)).toBe(
      `/procurement/requests/${ids.request}/submit`,
    );
    expect(erpMarocUpstreamRoutes.procurement.createEvent(ids.request)).toBe(
      `/procurement/requests/${ids.request}/sourcing-events`,
    );
    expect(erpMarocUpstreamRoutes.procurement.awardEvent(ids.event)).toBe(
      `/procurement/sourcing-events/${ids.event}/award`,
    );
  });
});
