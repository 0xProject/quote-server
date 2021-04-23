// tslint:disable:no-non-null-assertion
import { SchemaValidator } from '@0x/json-schemas';
import { BigNumber, NULL_ADDRESS } from '@0x/utils';
import * as express from 'express';

import { ZERO_EX_API_KEY_HEADER_STRING } from './constants';
import * as submitRequestSchema from './schemas/submit_request_schema.json';
import * as takerRequestSchema from './schemas/taker_request_schema.json';
import { BaseTakerRequest, SubmitRequest, SupportedVersion, TakerRequest, TakerRequestQueryParams } from './types';

type ParsedTakerRequest = { isValid: true; takerRequest: TakerRequest } | { isValid: false; errors: string[] };

export const parseTakerRequest = (req: Pick<express.Request, 'headers' | 'query'>): ParsedTakerRequest => {
    const query: TakerRequestQueryParams = req.query;

    // Create schema validator
    const schemaValidator = new SchemaValidator();

    const validationResult = schemaValidator.validate(query, takerRequestSchema);
    if (!validationResult.errors) {
        let apiKey = req.headers[ZERO_EX_API_KEY_HEADER_STRING];
        if (typeof apiKey !== 'string') {
            apiKey = undefined;
        }

        let protocolVersion: SupportedVersion;
        if (query.protocolVersion === undefined || query.protocolVersion === '3') {
            protocolVersion = '3';
        } else if (query.protocolVersion === '4') {
            protocolVersion = '4';

            // V4 requests should always pass in a txOrigin, so we need to perform
            // that bit of validation.
            if (query.txOrigin === undefined || query.txOrigin === NULL_ADDRESS) {
                return { isValid: false, errors: ['V4 queries require a valid "txOrigin"'] };
            }
        } else {
            return { isValid: false, errors: [`Invalid protocol version: ${query.protocolVersion}.`] };
        }

        // Exactly one of (buyAmountBaseUnits, sellAmountBaseUnits) must be present
        if (Boolean(query.buyAmountBaseUnits) === Boolean(query.sellAmountBaseUnits)) {
            return {
                isValid: false,
                errors: [
                    'A request must specify either a "buyAmountBaseUnits" or a "sellAmountBaseUnits" (but not both).',
                ],
            };
        }

        // Querystring values are always returned as strings, therefore a boolean must be parsed as string.
        const isLastLook = query.isLastLook === 'true';
        const takerRequestBase: BaseTakerRequest = {
            sellTokenAddress: query.sellTokenAddress,
            buyTokenAddress: query.buyTokenAddress,
            apiKey,
            takerAddress: query.takerAddress,
            comparisonPrice: query.comparisonPrice ? new BigNumber(query.comparisonPrice) : undefined,
            sellAmountBaseUnits: query.sellAmountBaseUnits ? new BigNumber(query.sellAmountBaseUnits) : undefined,
            buyAmountBaseUnits: query.buyAmountBaseUnits ? new BigNumber(query.buyAmountBaseUnits) : undefined,
        };
        const v4SpecificFields = {
            txOrigin: query.txOrigin!,
            isLastLook,
        };

        let takerRequest: TakerRequest;
        if (protocolVersion === '3') {
            takerRequest = {
                ...takerRequestBase,
                protocolVersion,
            };
        } else {
            takerRequest = {
                ...takerRequestBase,
                ...v4SpecificFields,
                protocolVersion,
            };
        }

        return { isValid: true, takerRequest };
    }

    const errors = validationResult.errors.map(e => `${e.dataPath} ${e.message!}`);
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
    const validationResult = schemaValidator.validate(body, submitRequestSchema);
    if (!validationResult.errors) {
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
