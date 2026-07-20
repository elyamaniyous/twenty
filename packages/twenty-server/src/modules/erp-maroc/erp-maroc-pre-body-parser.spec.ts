import express from 'express';
import request from 'supertest';

import { createErpMarocPreBodyParser } from './erp-maroc-pre-body-parser';

const MiB = 1024 * 1024;

describe('ERP Maroc pre-body parser', () => {
  let enabled = true;

  beforeAll(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.useFakeTimers();
  });

  const createApp = () => {
    const app = express();
    app.use(
      createErpMarocPreBodyParser({
        get: jest.fn(() => enabled),
      }),
    );
    app.use(express.json({ limit: '5mb' }));
    app.all(/^\/erp-maroc-api(?:\/.*)?$/i, (req, res) => {
      res.status(200).json({ body: req.body });
    });
    app.use(
      (
        error: { status?: number },
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        res
          .status(error.status ?? 500)
          .json({ statusCode: error.status ?? 500 });
      },
    );
    return app;
  };

  beforeEach(() => {
    enabled = true;
  });

  it.each([
    ['invalid JSON', '{"unterminated"'],
    ['a body over 1 MiB', JSON.stringify({ data: 'x'.repeat(MiB + 1) })],
  ])('returns disabled before parsing %s', async (_label, payload) => {
    enabled = false;

    await request(createApp())
      .post('/erp-maroc-api/products')
      .set('Content-Type', 'application/json')
      .send(payload)
      .expect(404)
      .expect({ statusCode: 404, code: 'ERP_DISABLED' });
  });

  it('rejects an enabled JSON body over 1 MiB before the controller', async () => {
    await request(createApp())
      .post('/erp-maroc-api/products')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ data: 'x'.repeat(MiB + 1) }))
      .expect(413);
  });

  it('accepts a bank statement upload over the standard 1 MiB limit', async () => {
    const contentBase64 = 'A'.repeat(2 * MiB);

    await request(createApp())
      .post('/erp-maroc-api/bank-statements')
      .send({ filename: 'releve.pdf', contentBase64 })
      .expect(200)
      .expect({ body: { filename: 'releve.pdf', contentBase64 } });
  });

  it('accepts a document upload over the standard 1 MiB limit', async () => {
    await request(createApp())
      .post('/erp-maroc-api/documents')
      .send({ filename: 'facture.pdf', contentBase64: 'A'.repeat(2 * MiB) })
      .expect(200);
  });

  it('accepts a FEC import over the standard 1 MiB limit', async () => {
    await request(createApp())
      .post('/erp-maroc-api/accounting-compliance/fec/import')
      .send({ filename: 'fec.txt', contentBase64: 'A'.repeat(2 * MiB) })
      .expect(200);
  });

  it('parses an enabled body within the limit and the global parser skips it', async () => {
    await request(createApp())
      .post('/erp-maroc-api/products')
      .send({ code: 'SKU-1' })
      .expect(200)
      .expect({ body: { code: 'SKU-1' } });
  });

  it('uses strict JSON parsing', async () => {
    await request(createApp())
      .post('/erp-maroc-api/products')
      .set('Content-Type', 'application/json')
      .send('"primitive"')
      .expect(400);
  });

  it.each([
    ['invalid JSON', '{"unterminated"'],
    ['a body over 1 MiB', JSON.stringify({ data: 'x'.repeat(MiB + 1) })],
  ])(
    'returns disabled before parsing uppercase namespace %s',
    async (_label, payload) => {
      enabled = false;

      await request(createApp())
        .post('/ERP-MAROC-API/products')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(404)
        .expect({ statusCode: 404, code: 'ERP_DISABLED' });
    },
  );

  it('enforces the 1 MiB limit on the uppercase namespace', async () => {
    await request(createApp())
      .post('/ERP-MAROC-API/products')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ data: 'x'.repeat(MiB + 1) }))
      .expect(413);
  });

  it('does not match neighboring prefixes', async () => {
    await request(createApp())
      .post('/ERP-MAROC-API-EVIL/products')
      .send({ code: 'SKU-1' })
      .expect(404);
  });
});
