import * as express from 'express';
import * as asyncHandler from 'express-async-handler';
import * as HttpStatus from 'http-status-codes';

import { RFQM_PATH, RFQT_PATH } from './constants';
import { generateApiKeyHandler, rfqmRequestHandler, rfqtRequestHandler } from './handlers';
import { Quoter } from './types';

export const serverRoutes = (allowedApiKeys: string[], quoteStrategy: Quoter) => {
    const router = express.Router();

    const apiKeyHandler = generateApiKeyHandler(allowedApiKeys);
    router.use(RFQT_PATH, apiKeyHandler);

    router.get(
        '/',
        asyncHandler(async (_req: express.Request, res: express.Response) => res.status(HttpStatus.NOT_FOUND).end()),
    );
    router.get(
        `${RFQT_PATH}/price`,
        asyncHandler(async (req: express.Request, res: express.Response) =>
            rfqtRequestHandler('indicative', quoteStrategy, req, res),
        ),
    );
    router.get(
        `${RFQT_PATH}/quote`,
        asyncHandler(async (req: express.Request, res: express.Response) =>
            rfqtRequestHandler('firm', quoteStrategy, req, res),
        ),
    );
    router.get(
        `${RFQM_PATH}/price`,
        asyncHandler(async (req: express.Request, res: express.Response) =>
            rfqmRequestHandler('indicative', quoteStrategy, req, res),
        ),
    );
    router.get(
        `${RFQM_PATH}/quote`,
        asyncHandler(async (req: express.Request, res: express.Response) =>
            rfqmRequestHandler('firm', quoteStrategy, req, res),
        ),
    );
    return router;
};
