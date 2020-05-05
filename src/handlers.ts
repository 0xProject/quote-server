import { NextFunction } from 'express';
// tslint:disable-next-line: no-duplicate-imports
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

import { ZERO_EX_API_KEY_HEADER_STRING } from './constants';
import { parseTakerRequest } from './request_parser';
import { Quoter } from './types';

export const generateApiKeyHandler = (): express.RequestHandler => {
    const handler = (req: express.Request, res: express.Response, next: NextFunction) => {
        const query = req.query;
        const zeroExApiKey = req.headers[ZERO_EX_API_KEY_HEADER_STRING];

        const isValid = query.canMakerControlSettlement || (!query.canMakerControlSettlement && zeroExApiKey && typeof zeroExApiKey === 'string');
        if (isValid) {
            next();
        } else {
            res.status(HttpStatus.UNAUTHORIZED)
                .json({ errors: ['Invalid API key'] })
                .end();
        }
    };
    return handler;
};

export const takerRequestHandler = async (
    takerRequestType: 'firm' | 'indicative',
    quoter: Quoter,
    req: express.Request,
    res: express.Response,
) => {
    const takerRequestResponse = parseTakerRequest(req);

    if (!takerRequestResponse.isValid) {
        return res.status(HttpStatus.BAD_REQUEST).json({ errors: takerRequestResponse.errors });
    }

    const takerRequest = takerRequestResponse.takerRequest;
    const responsePromise =
        takerRequestType === 'firm'
            ? quoter.fetchFirmQuoteAsync(takerRequest)
            : quoter.fetchIndicativeQuoteAsync(takerRequest);

    const response = await responsePromise;
    const result = response ? res.status(HttpStatus.OK).json(response) : res.status(HttpStatus.NO_CONTENT);
    return result.end();
};
