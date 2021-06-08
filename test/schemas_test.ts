// tslint:disable:max-file-line-count
import { SchemaValidator } from '@0x/json-schemas';
import { BigNumber } from '@0x/utils';
import * as chai from 'chai';

import { SubmitReceipt } from '../src';
import * as feeSchema from '../src/schemas/fee.json';
import * as submitReceiptSchema from '../src/schemas/submit_receipt_schema.json';

const expect = chai.expect;

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
});
