// tslint:disable:no-non-null-assertion
import { SchemaValidator } from '@0x/json-schemas';
import { BigNumber, NULL_ADDRESS } from '@0x/utils';
import * as express from 'express';

import { ZERO_EX_API_KEY_HEADER_STRING } from './constants';
import * as feeSchema from './schemas/fee.json';
import * as submitRequestSchema from './schemas/submit_request_schema.json';
import * as takerRequestSchema from './schemas/taker_request_schema.json';
import {
    BaseTakerRequest,
    SubmitRequest,
    SubmitRequestQueryParamsNested,
    SubmitRequestQueryParamsUnnested,
    SupportedVersion,
    TakerRequest,
    TakerRequestQueryParamsNested,
    TakerRequestQueryParamsUnnested,
    V4TakerRequest,
} from './types';

type ParsedTakerRequest = { isValid: true; takerRequest: TakerRequest } | { isValid: false; errors: string[] };

const schemaValidator = new SchemaValidator();
schemaValidator.addSchema(feeSchema);

export const parseTakerRequest = (req: Pick<express.Request, 'headers' | 'query'>): ParsedTakerRequest => {
    const queryUnnested: TakerRequestQueryParamsUnnested = req.query;
    const {feeAmount, feeToken, feeType, ...rest} = queryUnnested;
    const query: TakerRequestQueryParamsNested = rest;
    if (feeType && feeToken && feeAmount) {
        query.fee = {
            amount: feeAmount,
            token: feeToken,
            type: feeType,
        };
    }

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
        const v4SpecificFields: Pick<V4TakerRequest, 'txOrigin' | 'isLastLook' | 'fee'> = {
            txOrigin: query.txOrigin!,
            isLastLook,
        };
        if (isLastLook) {
            if (!query.fee || (query.fee.type !== 'bps' && query.fee.type !== 'fixed')){
                return {
                    isValid: false,
                    errors: [`When isLastLook is true, a fee must be present`],
                };
            }
            v4SpecificFields.fee = {
                token: query.fee.token,
                amount: new BigNumber(query.fee.amount),
                type: query.fee.type,
            }
        }

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

    const errors = validationResult.errors.map(e => `${e.dataPath} ${e.message}`);
    return {
        isValid: false,
        errors,
    };
};

type ParsedSubmitRequest = { isValid: true; submitRequest: SubmitRequest } | { isValid: false; errors: string[] };
export const parseSubmitRequest = (req: express.Request): ParsedSubmitRequest => {
    const body = req.body;

    // Create schema validator
    const validationResult = schemaValidator.validate(body, submitRequestSchema);
    if (!validationResult.errors) {
        let apiKey = req.headers[ZERO_EX_API_KEY_HEADER_STRING];
        if (typeof apiKey !== 'string') {
            apiKey = undefined;
        }
        const submitRequest: SubmitRequest = {
            fee: {
                amount: new BigNumber(body.fee.amount),
                token: body.fee.token,
                type: body.fee.type,
            },
            order: {
                ...body.order,
                makerAmount: new BigNumber(body.order.makerAmount),
                takerAmount: new BigNumber(body.order.takerAmount),
                expiry: new BigNumber(body.order.expiry),
                salt: new BigNumber(body.order.salt),
            },
            orderHash: body.orderHash,
            apiKey,
        };

        return { isValid: true, submitRequest };
    }

    const errors = validationResult.errors.map(e => {
        const optionalDataPath = e.dataPath.length > 0 ? `${e.dataPath} ` : '';
        return `${optionalDataPath}${e.message}`;
    });
    return {
        isValid: false,
        errors,
    };
};
