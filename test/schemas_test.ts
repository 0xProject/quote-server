// tslint:disable:max-file-line-count
import { SchemaValidator } from '@0x/json-schemas';
import { OtcOrderFields, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import * as chai from 'chai';

import { SubmitReceipt, TakerRequest } from '../src';
import * as feeSchema from '../src/schemas/fee.json';
import * as otcQuoteResponseSchema from '../src/schemas/otc_quote_response_schema.json';
import * as submitReceiptSchema from '../src/schemas/submit_receipt_schema.json';
import * as signRequestSchema from '../src/schemas/sign_request_schema.json';
import * as signResponseSchema from '../src/schemas/sign_response_schema.json';
import * as takerRequestSchema from '../src/schemas/taker_request_schema.json';
import { SignRequest } from '../src/types';

const expect = chai.expect;

function toHexString(bn: BigNumber): string {
    const base16 = 16;
    return `0x${bn.toString(base16)}`;
}

describe('Schema', () => {
    // Share a SchemaValidator across all runs
    const validator = new SchemaValidator();
    validator.addSchema(feeSchema);

    const validateAgainstSchema = (testCases: any[], schema: any, shouldFail = false) => {
        testCases.forEach((testCase: any) => {
            const validationResult = validator.validate(testCase, schema);
            const hasErrors = validationResult.errors && validationResult.errors.length !== 0;
            if (shouldFail) {
                if (!hasErrors) {
                    throw new Error(
                        `Expected testCase: ${JSON.stringify(testCase, null, '\t')} to fail and it didn't.`,
                    );
                }
            } else {
                if (hasErrors) {
                    throw new Error(JSON.stringify(validationResult.errors, null, '\t'));
                }
            }
        });
    };

    describe('TakerRequestSchema', () => {
        it('should parse valid schema', () => {
            const validSchema1 = {
                sellTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                buyTokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                takerAddress: '0x0000000000000000000000000000000000000000',
                sellAmountBaseUnits: new BigNumber('1000000000000000000000000'),
                fee: {
                    amount: new BigNumber(100),
                    type: 'fixed',
                    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                },
                protocolVersion: '4',
                txOrigin: '0xdd296e166d7ed5288e7849c1ba5664f34af8765b',
                isLastLook: 'true',
                nonce: '1632177158',
                nonceBucket: '1',
            };

            const validSchema2 = {
                sellTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                buyTokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                takerAddress: '0x0000000000000000000000000000000000000000',
                sellAmountBaseUnits: '1000000000000000000000000',
                fee: {
                    amount: 100,
                    type: 'fixed',
                    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                },
                protocolVersion: '4',
                txOrigin: '0xdd296e166d7ed5288e7849c1ba5664f34af8765b',
                isLastLook: 'true',
                nonce: '1632177158',
                nonceBucket: '1',
            };

            validateAgainstSchema([validSchema1, validSchema2], takerRequestSchema, false);
        });
    });

    describe('OtcOrderQuoteResponseSchema', () => {
        it('should parse valid schema', () => {
            const validSchema1 = {
                order: {
                    expiryAndNonce: '0x6148f04f00000000000000010000000000000000000000006148f437',
                    makerAmount: '123660506086783300',
                    takerAmount: '125000000000000000000',
                    makerToken: '0x374a16f5e686c09b0cc9e8bc3466b3b645c74aa7',
                    takerToken: '0xf84830b73b2ed3c7267e7638f500110ea47fdf30',
                    chainId: 3,
                    verifyingContract: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
                    maker: '0x06754422cf9f54ae0e67D42FD788B33D8eb4c5D5',
                    taker: '0x06652BDD5A8eB3d206caedd6b95b61F820Abb9B1',
                    txOrigin: '0x06652BDD5A8eB3d206caedd6b95b61F820Abb9B1',
                },
                signature: {
                    r: '0x81483df776387dbc439dd6daee3f365b57f4640f523c24f7e5ebdfd585ba5991',
                    s: '0x140c07f0b775c43c3e048205d1ac1360fb0d3254a48d928b7775a850d29536ff',
                    v: 27,
                    signatureType: 3,
                },
            };

            validateAgainstSchema([validSchema1], otcQuoteResponseSchema, false);
        });
    });

    describe('SubmitRequestSchema', () => {
        it('should parse valid schema', () => {
            const validSchema1: SubmitReceipt = {
                fee: {
                    amount: new BigNumber(100),
                    type: 'fixed',
                    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                },
                takerTokenFillAmount: new BigNumber('1225000000000000000'),
                proceedWithFill: true,
                signedOrderHash: 'asdf',
            };

            const validSchema2 = {
                fee: {
                    amount: 100, // not a BigNumber
                    type: 'fixed',
                    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                },
                takerTokenFillAmount: '1225000000000000000',
                proceedWithFill: false,
                signedOrderHash: 'asdf',
            };

            const validSchema3 = {
                fee: {
                    amount: '100', // not a BigNumber
                    type: 'fixed',
                    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                },
                takerTokenFillAmount: '1225000000000000000',
                proceedWithFill: false,
                signedOrderHash: 'asdf',
            };

            validateAgainstSchema([validSchema1, validSchema2, validSchema3], submitReceiptSchema, false);
        });

        it('should reject schema that have proceedWithFill as a string', () => {
            const invalidSchema = {
                fee: {
                    amount: new BigNumber(100),
                    type: 'fixed',
                    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                },
                proceedWithFill: 'true', // should be a boolean
                signedOrderHash: 'asdf',
            };

            validateAgainstSchema([invalidSchema], submitReceiptSchema, true);
        });

        it('should reject schema with a malformed fee property', () => {
            const invalidSchema = {
                fee: {
                    amount: new BigNumber(100),
                    type: 'pastry', // not a valid type
                    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                },
                proceedWithFill: true,
                signedOrderHash: 'asdf',
            };

            validateAgainstSchema([invalidSchema], submitReceiptSchema, true);
        });
    });
    describe('SignRequestSchema', () => {
        const fakeTakerSignature: Signature = {
            signatureType: 3,
            v: 27,
            r: '0x00',
            s: '0x00',
        };

        const sampleOtcOrder: OtcOrderFields = {
            makerToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
            takerToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            makerAmount: new BigNumber(1000000000000000000),
            takerAmount: new BigNumber(1),
            maker: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
            taker: '0x8a333a18B924554D6e83EF9E9944DE6260f61D3B',
            txOrigin: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
            expiryAndNonce: new BigNumber('0x6148f04f00000000000000010000000000000000000000006148f437'),
            chainId: 1,
            verifyingContract: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
        };

        it('should parse valid schema', () => {
            const validSchema1 = {
                fee: {
                    amount: new BigNumber(100),
                    type: 'fixed',
                    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                },
                takerSignature: fakeTakerSignature,
                order: { ...sampleOtcOrder, expiryAndNonce: toHexString(sampleOtcOrder.expiryAndNonce) },
                expiry: '1636418321',
                orderHash: '0xdeadbeef',
            };

            const validSchema2 = {
                fee: {
                    amount: 100, // not a BigNumber
                    type: 'fixed',
                    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                },
                takerSignature: fakeTakerSignature,
                order: { ...sampleOtcOrder, expiryAndNonce: toHexString(sampleOtcOrder.expiryAndNonce) },
                expiry: 1636418321,
                orderHash: '0xdeadbeef',
            };

            validateAgainstSchema([validSchema1, validSchema2], signRequestSchema, false);
        });

        it('should reject schema with a malformed fee property', () => {
            const invalidSchema = {
                fee: {
                    amount: new BigNumber(100),
                    type: 'pastry', // not a valid type
                    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                },
                takerSignature: fakeTakerSignature,
                order: sampleOtcOrder,
                orderHash: 'asdf',
            };

            validateAgainstSchema([invalidSchema], signRequestSchema, true);
        });
    });
    describe('SignResponseSchema', () => {
        const fakeMakerSignature: Signature = {
            signatureType: 3,
            v: 27,
            r: '0x00',
            s: '0x00',
        };

        const sampleOtcOrder: OtcOrderFields = {
            makerToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
            takerToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            makerAmount: new BigNumber(1000000000000000000),
            takerAmount: new BigNumber(1),
            maker: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
            taker: '0x8a333a18B924554D6e83EF9E9944DE6260f61D3B',
            txOrigin: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
            expiryAndNonce: new BigNumber('0x6148f04f00000000000000010000000000000000000000006148f437'),
            chainId: 1,
            verifyingContract: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
        };

        it('should parse valid schema', () => {
            const validSchema1 = {
                fee: {
                    amount: new BigNumber(100),
                    type: 'fixed',
                    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                },
                makerSignature: fakeMakerSignature,
                proceedWithFill: true,
            };

            const validSchema2 = {
                proceedWithFill: false,
            };

            validateAgainstSchema([validSchema1, validSchema2], signResponseSchema, false);
        });

        it('should reject schema without required properties', () => {
            const invalidSchema = {};

            validateAgainstSchema([invalidSchema], signResponseSchema, true);
        });
    });
});
