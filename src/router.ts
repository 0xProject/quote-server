import * as express from 'express';
import * as asyncHandler from 'express-async-handler';
import * as HttpStatus from 'http-status-codes';

import {
    fetchOtcPriceHandler,
    generateApiKeyHandler,
    signOtcRequestHandler,
    submitRequestHandler,
    takerRequestHandler,
} from './handlers';
import { Quoter } from './types';

export const serverRoutes = (quoteStrategy: Quoter) => {
    const router = express.Router();

    const apiKeyHandler = generateApiKeyHandler();
    router.use(express.json());
    router.use(apiKeyHandler);

    router.get(
        '/',
        asyncHandler(async (_req: express.Request, res: express.Response) => res.status(HttpStatus.NOT_FOUND).end()),
    );
    router.get(
        '/price',
        asyncHandler(async (req: express.Request, res: express.Response) =>
            takerRequestHandler('indicative', quoteStrategy, req, res),
        ),
    );
    router.get(
        '/quote',
        asyncHandler(async (req: express.Request, res: express.Response) =>
            takerRequestHandler('firm', quoteStrategy, req, res),
        ),
    );
    router.post(
        '/submit',
        asyncHandler(async (req: express.Request, res: express.Response) =>
            submitRequestHandler(quoteStrategy, req, res),
        ),
    );

    router.get(
        'rfqm/v2/price',
        asyncHandler(async (req: express.Request, res: express.Response) =>
            fetchOtcPriceHandler(quoteStrategy, req, res),
        ),
    );

    router.post(
        'rfqm/v2/sign',
        asyncHandler(async (req: express.Request, res: express.Response) =>
            signOtcRequestHandler(quoteStrategy, req, res),
        ),
    );
    return router;
};
