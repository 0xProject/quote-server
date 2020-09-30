import { Schema, SchemaValidator } from '@0x/json-schemas';
import { BigNumber } from '@0x/utils';
import * as express from 'express';

import { ZERO_EX_API_KEY_HEADER_STRING } from './constants';
import * as submitRequestSchema from './schemas/submit_request_schema.json';
import * as takerRequestSchema from './schemas/taker_request_schema.json';
import { SubmitRequest, TakerRequest, TakerRequestQueryParams } from './types';

type ParsedTakerRequest = { isValid: true; takerRequest: TakerRequest } | { isValid: false; errors: string[] };

export const parseTakerRequest = (req: Pick<express.Request, 'headers' | 'query'>): ParsedTakerRequest => {
    const query: TakerRequestQueryParams = req.query;

    // Create schema validator
    const schemaValidator = new SchemaValidator();
    // HACK(sk): for some reason, TS considers our oneOf as not a valid schema
    const schema = (takerRequestSchema as unknown) as Schema;

    const validationResult = schemaValidator.validate(query, schema);
    if (validationResult.valid) {
        let apiKey = req.headers[ZERO_EX_API_KEY_HEADER_STRING];
        if (typeof apiKey !== 'string') {
            apiKey = undefined;
        }

        // Querystring values are always returned as strings, therefore a boolean must be parsed as string.
        const canMakerControlSettlement = query.canMakerControlSettlement === 'true' ? true : undefined;
        const takerRequestBase = {
            sellTokenAddress: query.sellTokenAddress,
            buyTokenAddress: query.buyTokenAddress,
            apiKey,
            takerAddress: query.takerAddress,
            canMakerControlSettlement,
            comparisonPrice: query.comparisonPrice ? new BigNumber(query.comparisonPrice) : undefined,
        };

        let takerRequest: TakerRequest;
        if (query.sellAmountBaseUnits) {
            takerRequest = {
                ...takerRequestBase,
                sellAmountBaseUnits: new BigNumber(query.sellAmountBaseUnits),
            };
        } else if (query.buyAmountBaseUnits) {
            takerRequest = {
                ...takerRequestBase,
                buyAmountBaseUnits: new BigNumber(query.buyAmountBaseUnits),
            };
        } else {
            throw new Error('"buyAmountBaseUnits" and "sellAmountBaseUnits" are mutually exclusive');
        }
        return { isValid: true, takerRequest };
    }

    const errors = validationResult.errors.map(e => e.toString());
    return {
        isValid: false,
        errors,
    };
};

type ParsedSubmitRequest = { isValid: true; submitRequest: SubmitRequest } | { isValid: false; errors: string[] };
export const parseSubmitRequest = (req: express.Request): ParsedSubmitRequest => {
    const body = req.body;

    // Create schema validator
    const schemaValidator = new SchemaValidator();
    // HACK(sk): for some reason, TS considers our oneOf as not a valid schema
    const schema = (submitRequestSchema as unknown) as Schema;

    const validationResult = schemaValidator.validate(body, schema);
    if (validationResult.valid) {
        let apiKey = req.headers[ZERO_EX_API_KEY_HEADER_STRING];
        if (typeof apiKey !== 'string') {
            apiKey = undefined;
        }
        const submitRequest: SubmitRequest = {
            zeroExTransaction: body.zeroExTransaction,
            signature: body.signature,
            apiKey,
        };

        return { isValid: true, submitRequest };
    }

    const errors = validationResult.errors.map(e => e.toString());
    return {
        isValid: false,
        errors,
    };
};
