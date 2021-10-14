import { NextFunction } from 'express';
// tslint:disable-next-line: no-duplicate-imports
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

import { ZERO_EX_API_KEY_HEADER_STRING } from './constants';
import { parseSignRequest, parseSubmitRequest, parseTakerRequest } from './request_parser';
import { Quoter } from './types';

const API_KEY_DISABLED_PATHS = new Set(['/submit']);

export const generateApiKeyHandler = (): express.RequestHandler => {
    const handler = (req: express.Request, res: express.Response, next: NextFunction) => {
        const query = req.query;
        const zeroExApiKey = req.headers[ZERO_EX_API_KEY_HEADER_STRING];
        const pathIsNotApiKeyConstrained = API_KEY_DISABLED_PATHS.has(req.path);

        const isValid =
            pathIsNotApiKeyConstrained ||
            query.canMakerControlSettlement ||
            (!query.canMakerControlSettlement && zeroExApiKey && typeof zeroExApiKey === 'string');
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

    const { protocolVersion, response } = await responsePromise;
    if (protocolVersion !== takerRequest.protocolVersion) {
        /* tslint:disable-next-line */
        console.error('Response and request protocol versions do not match');
        return res
            .status(HttpStatus.NOT_IMPLEMENTED)
            .json({ errors: ['Server does not support the requested protocol version'] })
            .end();
    }
    const result = response ? res.status(HttpStatus.OK).json(response) : res.status(HttpStatus.NO_CONTENT);
    return result.end();
};

export const fetchOtcQuoteHandler = async (quoter: Quoter, req: express.Request, res: express.Response) => {
    const takerRequestResponse = parseTakerRequest(req);

    if (!takerRequestResponse.isValid) {
        return res.status(HttpStatus.BAD_REQUEST).json({ errors: takerRequestResponse.errors });
    }

    const takerRequest = takerRequestResponse.takerRequest;

    const response = await quoter.fetchFirmOtcQuoteAsync(takerRequest);
    const result = response.order ? res.status(HttpStatus.OK).json(response) : res.status(HttpStatus.NO_CONTENT);
    return result.end();
};

export const submitRequestHandler = async (quoter: Quoter, req: express.Request, res: express.Response) => {
    const submitRequestResponse = parseSubmitRequest(req);

    if (!submitRequestResponse.isValid) {
        return res.status(HttpStatus.BAD_REQUEST).json({ errors: submitRequestResponse.errors });
    }

    const submitRequest = submitRequestResponse.submitRequest;
    const response = await quoter.submitFillAsync(submitRequest);

    const result = response ? res.status(HttpStatus.OK).json(response) : res.status(HttpStatus.NO_CONTENT);
    return result.end();
};

export const signOtcRequestHandler = async (quoter: Quoter, req: express.Request, res: express.Response) => {
    const signRequestResponse = parseSignRequest(req);

    if (!signRequestResponse.isValid) {
        return res.status(HttpStatus.BAD_REQUEST).json({ errors: signRequestResponse.errors });
    }

    const signRequest = signRequestResponse.signRequest;
    const response = await quoter.signOtcOrderAsync(signRequest);

    const result = response ? res.status(HttpStatus.OK).json(response) : res.status(HttpStatus.NO_CONTENT);
    return result.end();
};
