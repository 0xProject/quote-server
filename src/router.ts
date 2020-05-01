import * as express from 'express';
import * as asyncHandler from 'express-async-handler';
import * as HttpStatus from 'http-status-codes';

import { generateApiKeyHandler, takerRequestHandler } from './handlers';
import { Quoter } from './types';

export const serverRoutes = (allowedApiKeys: string[], quoteStrategy: Quoter) => {
    const router = express.Router();

    const apiKeyHandler = generateApiKeyHandler(allowedApiKeys);
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
    return router;
};
