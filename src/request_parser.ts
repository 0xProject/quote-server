import { Schema, SchemaValidator } from '@0x/json-schemas';
import { BigNumber } from '@0x/utils';
import * as express from 'express';

import { ZERO_EX_API_KEY_HEADER_STRING } from './constants';
import * as takerRequestSchema from './schemas/taker_request_schema.json';
import { TakerRequest } from './types';

type ParsedTakerRequest = { isValid: true; takerRequest: TakerRequest } | { isValid: false; errors: string[] };
export const parseTakerRequest = (req: express.Request, isAPIKeyRequired: boolean): ParsedTakerRequest => {
    const query = req.query;

    // Create schema validator
    const schemaValidator = new SchemaValidator();
    // HACK(sk): for some reason, TS considers our oneOf as not a valid schema
    const schema = (takerRequestSchema as unknown) as Schema;

    const validationResult = schemaValidator.validate(query, schema);
    if (!validationResult.valid) {
        const errors = validationResult.errors.map(e => e.toString());
        return {
            isValid: false,
            errors,
        };
    }

    const apiKey = req.headers[ZERO_EX_API_KEY_HEADER_STRING];
    if (isAPIKeyRequired && typeof apiKey !== 'string' || Array.isArray(apiKey)) {
        throw new Error(`No API key specified`);
    }
    const takerRequestBase = {
        sellToken: query.sellToken,
        buyToken: query.buyToken,
        apiKey,
        takerAddress: query.takerAddress,
    };

    const takerRequest: TakerRequest = query.sellAmount
        ? { ...takerRequestBase, sellAmount: new BigNumber(query.sellAmount) }
        : { ...takerRequestBase, buyAmount: new BigNumber(query.buyAmount) };
    return { isValid: true, takerRequest };
};
