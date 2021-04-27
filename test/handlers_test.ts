// tslint:disable:max-file-line-count
import { SignedOrder } from '@0x/order-utils';
import { BigNumber, NULL_ADDRESS } from '@0x/utils';
import * as chai from 'chai';
import * as HttpStatus from 'http-status-codes';
import * as httpMocks from 'node-mocks-http';
import * as TypeMoq from 'typemoq';

import { ZERO_EX_API_KEY_HEADER_STRING } from '../src/constants';
import { generateApiKeyHandler, submitRequestHandler, takerRequestHandler } from '../src/handlers';
import { parseTakerRequest } from '../src/request_parser';
import {
    Quoter,
    SubmitReceipt,
    SubmitRequest,
    TakerRequest,
    V3RFQFirmQuote,
    V3RFQIndicativeQuote,
    V4RFQFirmQuote,
    V4SignedRfqOrder,
    VersionedQuote,
} from '../src/types';

const expect = chai.expect;

const fakeV3Order: SignedOrder = {
    chainId: 1,
    exchangeAddress: '0xabc',
    makerAddress: '0xabc',
    takerAddress: '0xabc',
    feeRecipientAddress: '0xabc',
    senderAddress: '',
    makerAssetAmount: new BigNumber(1),
    takerAssetAmount: new BigNumber(1),
    makerFee: new BigNumber(0),
    takerFee: new BigNumber(0),
    expirationTimeSeconds: new BigNumber(1000),
    salt: new BigNumber(1000),
    makerAssetData: '0xabc',
    takerAssetData: '0xabc',
    makerFeeAssetData: '0xabc',
    takerFeeAssetData: '0xabc',
    signature: 'fakeSignature',
};

const fakeV4Order: V4SignedRfqOrder = {
    makerToken: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
    takerToken: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
    makerAmount: new BigNumber(1),
    takerAmount: new BigNumber(1),
    maker: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
    taker: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
    txOrigin: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
    pool: '0x00',
    expiry: new BigNumber(1000),
    salt: new BigNumber(1000),
    chainId: 1,
    verifyingContract: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
    signature: {
        signatureType: 3,
        v: 27,
        r: '0x00',
        s: '0x00',
    },
};

describe('parseTakerRequest', () => {
    it('should handle an optional comparisonPrice', () => {
        const query = {
            sellTokenAddress: NULL_ADDRESS,
            buyTokenAddress: NULL_ADDRESS,
            takerAddress: NULL_ADDRESS,
            sellAmountBaseUnits: '1225000000',
            comparisonPrice: '320.12',
        };
        const request = {
            query,
            headers: {
                [ZERO_EX_API_KEY_HEADER_STRING]: '0xfoo',
            },
        };
        const parsedRequest = parseTakerRequest(request);
        if (parsedRequest.isValid && parsedRequest.takerRequest.comparisonPrice) {
            // tslint:disable-next-line: custom-no-magic-numbers
            expect(parsedRequest.takerRequest.comparisonPrice.toNumber()).to.eql(320.12);
        } else {
            expect.fail('Parsed request is not valid or comparisonPrice was not parsed correctly');
        }
    });

    it('should fail validation with an invalid comparison price', () => {
        const query = {
            sellTokenAddress: NULL_ADDRESS,
            buyTokenAddress: NULL_ADDRESS,
            takerAddress: NULL_ADDRESS,
            sellAmountBaseUnits: '1225000000',
            comparisonPrice: 'three twenty',
        };
        const request = {
            query,
            headers: {
                [ZERO_EX_API_KEY_HEADER_STRING]: '0xfoo',
            },
        };
        const parsedRequest = parseTakerRequest(request);
        expect(parsedRequest.isValid).to.eql(false);
    });

    it('should fail validation if both buyAmountBaseUnits and sellAmountBaseUnits are present', () => {
        const query = {
            sellTokenAddress: NULL_ADDRESS,
            buyTokenAddress: NULL_ADDRESS,
            takerAddress: NULL_ADDRESS,
            buyAmountBaseUnits: '1225000000',
            sellAmountBaseUnits: '1225000000',
        };
        const request = {
            query,
            headers: {
                [ZERO_EX_API_KEY_HEADER_STRING]: '0xfoo',
            },
        };
        const parsedRequest = parseTakerRequest(request);
        expect(parsedRequest.isValid).to.eql(false);
    });

    it('should still validate without a comparison price', () => {
        const query = {
            sellTokenAddress: NULL_ADDRESS,
            buyTokenAddress: NULL_ADDRESS,
            takerAddress: NULL_ADDRESS,
            sellAmountBaseUnits: '1225000000',
        };
        const request = {
            query,
            headers: {
                [ZERO_EX_API_KEY_HEADER_STRING]: '0xfoo',
            },
        };
        const parsedRequest = parseTakerRequest(request);
        if (parsedRequest.isValid) {
            expect(parsedRequest.takerRequest.comparisonPrice).to.eql(undefined);
        } else {
            expect.fail('Parsed request is not valid');
        }
    });

    it('should default to v3 requests', () => {
        const query = {
            sellTokenAddress: NULL_ADDRESS,
            buyTokenAddress: NULL_ADDRESS,
            takerAddress: NULL_ADDRESS,
            sellAmountBaseUnits: '1225000000',
        };
        const request = {
            query,
            headers: {
                [ZERO_EX_API_KEY_HEADER_STRING]: '0xfoo',
            },
        };
        const parsedRequest = parseTakerRequest(request);
        if (parsedRequest.isValid) {
            expect(parsedRequest.takerRequest.protocolVersion).to.eql('3');
        } else {
            expect.fail('Parsed request is not valid');
        }
    });

    it('should handle requests where v4 is specified', () => {
        const query = {
            sellTokenAddress: NULL_ADDRESS,
            buyTokenAddress: NULL_ADDRESS,
            takerAddress: NULL_ADDRESS,
            sellAmountBaseUnits: '1225000000',
            protocolVersion: '4',
            txOrigin: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
        };
        const request = {
            query,
            headers: {
                [ZERO_EX_API_KEY_HEADER_STRING]: '0xfoo',
            },
        };
        const parsedRequest = parseTakerRequest(request);
        if (parsedRequest.isValid) {
            if (parsedRequest.takerRequest.protocolVersion === '4') {
                expect(parsedRequest.takerRequest.txOrigin === '0x61935cbdd02287b511119ddb11aeb42f1593b7ef');
            } else {
                expect.fail('Returned protocol version is not 4');
            }
        } else {
            expect.fail('Parsed request is not valid');
        }
    });

    it('should raise an error for v4 requests with isLastLook but no fee', () => {
        const query = {
            sellTokenAddress: NULL_ADDRESS,
            buyTokenAddress: NULL_ADDRESS,
            takerAddress: NULL_ADDRESS,
            sellAmountBaseUnits: '1225000000',
            protocolVersion: '4',
            txOrigin: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
            isLastLook: 'true',
        };
        const request = {
            query,
            headers: {
                [ZERO_EX_API_KEY_HEADER_STRING]: '0xfoo',
            },
        };
        const parsedRequest = parseTakerRequest(request);
        if (parsedRequest.isValid) {
            expect.fail('Parsed request should not be valid');
        } else {
            expect(parsedRequest.errors.length).to.eql(1);
            expect(parsedRequest.errors[0]).to.eql('When isLastLook is true, a fee must be present');
        }
    });

    it('should handle v4 requests with isLastLook', () => {
        const query = {
            sellTokenAddress: NULL_ADDRESS,
            buyTokenAddress: NULL_ADDRESS,
            takerAddress: NULL_ADDRESS,
            sellAmountBaseUnits: '1225000000',
            protocolVersion: '4',
            txOrigin: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
            isLastLook: 'true',
            fee: '300000',
        };
        const request = {
            query,
            headers: {
                [ZERO_EX_API_KEY_HEADER_STRING]: '0xfoo',
            },
        };
        const parsedRequest = parseTakerRequest(request);
        if (parsedRequest.isValid) {
            if (parsedRequest.takerRequest.protocolVersion === '4') {
                expect(parsedRequest.takerRequest.isLastLook).to.equal(true);
            } else {
                expect.fail('Returned protocol version is not 4');
            }
        } else {
            expect.fail('Parsed request is not valid');
        }
    });

    it('should fail version with an invalid protocol or txOrigin', () => {
        const tests: { protocolVersion: string; txOrigin?: string; expectedErrorMsg: string }[] = [
            {
                protocolVersion: '4',
                txOrigin: '0xfoo',
                expectedErrorMsg: '.txOrigin should match pattern "^0x[0-9a-fA-F]{40}$"',
            },
            { protocolVersion: '4', txOrigin: NULL_ADDRESS, expectedErrorMsg: 'V4 queries require a valid "txOrigin"' },
            { protocolVersion: '4', txOrigin: undefined, expectedErrorMsg: 'V4 queries require a valid "txOrigin"' },
            {
                protocolVersion: '5',
                txOrigin: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
                expectedErrorMsg: 'Invalid protocol version: 5.',
            },
        ];
        for (const test of tests) {
            const { protocolVersion, txOrigin, expectedErrorMsg } = test;
            const query = {
                sellTokenAddress: NULL_ADDRESS,
                buyTokenAddress: NULL_ADDRESS,
                takerAddress: NULL_ADDRESS,
                sellAmountBaseUnits: '1225000000',
                protocolVersion,
                ...(txOrigin ? { txOrigin } : {}),
            };
            const request = {
                query,
                headers: {
                    [ZERO_EX_API_KEY_HEADER_STRING]: '0xfoo',
                },
            };
            const parsedRequest = parseTakerRequest(request);
            if (parsedRequest.isValid) {
                expect.fail('Request should be invalid');
            } else {
                expect(parsedRequest.errors[0]).to.eql(expectedErrorMsg);
            }
        }
    });
});

describe('api key handler', () => {
    it('reject when no API key specified', () => {
        const handler = generateApiKeyHandler();
        const req = httpMocks.createRequest();
        const resp = httpMocks.createResponse();

        handler(req, resp, () => {
            return;
        });

        expect(resp._getStatusCode()).to.eql(HttpStatus.UNAUTHORIZED);
        expect(resp._getJSONData()).to.eql({ errors: ['Invalid API key'] });
    });
    it('accept when API Key specified', () => {
        const handler = generateApiKeyHandler();
        const req = httpMocks.createRequest({
            headers: { '0x-api-key': 'cde' },
        });
        const resp = httpMocks.createResponse();

        handler(req, resp, () => {
            return;
        });

        expect(resp._getStatusCode()).to.eql(HttpStatus.OK);
    });
});

describe('taker request handler', () => {
    const fakeV3TakerRequest: TakerRequest = {
        buyTokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
        sellTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        buyAmountBaseUnits: new BigNumber(1000000000000000000),
        sellAmountBaseUnits: undefined,
        takerAddress: '0x8a333a18B924554D6e83EF9E9944DE6260f61D3B',
        apiKey: 'kool-api-key',
        comparisonPrice: undefined,
        protocolVersion: '3',
    };
    const fakeV4TakerRequest: TakerRequest = {
        buyTokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
        sellTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        buyAmountBaseUnits: new BigNumber(1000000000000000000),
        sellAmountBaseUnits: undefined,
        takerAddress: '0x8a333a18B924554D6e83EF9E9944DE6260f61D3B',
        apiKey: 'kool-api-key',
        comparisonPrice: undefined,
        txOrigin: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
        protocolVersion: '4',
        isLastLook: false,
    };

    it('should defer to quoter and return response for firm quote', async () => {
        const quoter = TypeMoq.Mock.ofType<Quoter>(undefined, TypeMoq.MockBehavior.Strict);
        const expectedResponse: VersionedQuote<'3', V3RFQFirmQuote> = {
            response: {
                signedOrder: fakeV3Order,
            },
            protocolVersion: '3',
        };
        quoter
            .setup(async q => q.fetchFirmQuoteAsync(fakeV3TakerRequest))
            .returns(async () => expectedResponse)
            .verifiable(TypeMoq.Times.once());

        const req = httpMocks.createRequest({
            query: {
                buyTokenAddress: fakeV3TakerRequest.buyTokenAddress,
                sellTokenAddress: fakeV3TakerRequest.sellTokenAddress,
                // tslint:disable-next-line: no-non-null-assertion
                buyAmountBaseUnits: fakeV3TakerRequest.buyAmountBaseUnits!.toString(),
                takerAddress: fakeV3TakerRequest.takerAddress,
            },
            headers: { '0x-api-key': fakeV3TakerRequest.apiKey },
        });
        const resp = httpMocks.createResponse();

        await takerRequestHandler('firm', quoter.object, req, resp);

        expect(resp._getStatusCode()).to.eql(HttpStatus.OK);
        expect(resp._getJSONData()).to.eql(JSON.parse(JSON.stringify(expectedResponse.response)));

        quoter.verifyAll();
    });

    it('should defer to quoter and return response for indicative quote', async () => {
        const quoter = TypeMoq.Mock.ofType<Quoter>(undefined, TypeMoq.MockBehavior.Strict);

        const {
            makerAssetData,
            makerAssetAmount,
            takerAssetAmount,
            takerAssetData,
            expirationTimeSeconds,
        } = fakeV3Order;
        const indicativeQuote: VersionedQuote<'3', V3RFQIndicativeQuote> = {
            protocolVersion: '3',
            response: {
                makerAssetData,
                makerAssetAmount,
                takerAssetAmount,
                takerAssetData,
                expirationTimeSeconds,
            },
        };
        quoter
            .setup(async q => q.fetchIndicativeQuoteAsync(fakeV3TakerRequest))
            .returns(async () => indicativeQuote)
            .verifiable(TypeMoq.Times.once());

        const req = httpMocks.createRequest({
            query: {
                buyTokenAddress: fakeV3TakerRequest.buyTokenAddress,
                sellTokenAddress: fakeV3TakerRequest.sellTokenAddress,
                // tslint:disable-next-line: no-non-null-assertion
                buyAmountBaseUnits: fakeV3TakerRequest.buyAmountBaseUnits!.toString(),
                takerAddress: fakeV3TakerRequest.takerAddress,
            },
            headers: { '0x-api-key': fakeV3TakerRequest.apiKey },
        });
        const resp = httpMocks.createResponse();

        await takerRequestHandler('indicative', quoter.object, req, resp);

        expect(resp._getStatusCode()).to.eql(HttpStatus.OK);
        expect(resp._getJSONData()).to.eql(JSON.parse(JSON.stringify(indicativeQuote.response)));

        quoter.verifyAll();
    });
    it('should handle empty indicative quote', async () => {
        const quoter = TypeMoq.Mock.ofType<Quoter>(undefined, TypeMoq.MockBehavior.Strict);
        quoter
            .setup(async q => q.fetchIndicativeQuoteAsync(fakeV3TakerRequest))
            .returns(async () => {
                return { protocolVersion: '3', response: undefined };
            })
            .verifiable(TypeMoq.Times.once());

        const req = httpMocks.createRequest({
            query: {
                buyTokenAddress: fakeV3TakerRequest.buyTokenAddress,
                sellTokenAddress: fakeV3TakerRequest.sellTokenAddress,
                // tslint:disable-next-line:no-non-null-assertion
                buyAmountBaseUnits: fakeV3TakerRequest.buyAmountBaseUnits!.toString(),
                takerAddress: fakeV3TakerRequest.takerAddress,
            },
            headers: { '0x-api-key': fakeV3TakerRequest.apiKey },
        });
        const resp = httpMocks.createResponse();

        await takerRequestHandler('indicative', quoter.object, req, resp);

        expect(resp._getStatusCode()).to.eql(HttpStatus.NO_CONTENT);

        quoter.verifyAll();
    });
    it('should handle empty firm quote', async () => {
        const quoter = TypeMoq.Mock.ofType<Quoter>(undefined, TypeMoq.MockBehavior.Strict);
        quoter
            .setup(async q => q.fetchFirmQuoteAsync(fakeV3TakerRequest))
            .returns(async () => {
                return { protocolVersion: '3', response: undefined };
            })
            .verifiable(TypeMoq.Times.once());

        const req = httpMocks.createRequest({
            query: {
                buyTokenAddress: fakeV3TakerRequest.buyTokenAddress,
                sellTokenAddress: fakeV3TakerRequest.sellTokenAddress,
                // tslint:disable-next-line:no-non-null-assertion
                buyAmountBaseUnits: fakeV3TakerRequest.buyAmountBaseUnits!.toString(),
                takerAddress: fakeV3TakerRequest.takerAddress,
            },
            headers: { '0x-api-key': fakeV3TakerRequest.apiKey },
        });
        const resp = httpMocks.createResponse();

        await takerRequestHandler('firm', quoter.object, req, resp);

        expect(resp._getStatusCode()).to.eql(HttpStatus.NO_CONTENT);

        quoter.verifyAll();
    });
    it('should invalidate a bad request', async () => {
        const quoter = TypeMoq.Mock.ofType<Quoter>(undefined, TypeMoq.MockBehavior.Strict);

        const req = httpMocks.createRequest({
            query: {
                sellTokenAddress: fakeV3TakerRequest.sellTokenAddress,
                // tslint:disable-next-line:no-non-null-assertion
                buyAmountBaseUnits: fakeV3TakerRequest.buyAmountBaseUnits!.toString(),
                takerAddress: fakeV3TakerRequest.takerAddress,
            },
            headers: { '0x-api-key': fakeV3TakerRequest.apiKey },
        });
        const resp = httpMocks.createResponse();

        await takerRequestHandler('firm', quoter.object, req, resp);
        expect(resp._getStatusCode()).to.eql(HttpStatus.BAD_REQUEST);
        const returnedData = resp._getJSONData();
        expect(Object.keys(returnedData)).to.eql(['errors']);
        expect(returnedData.errors.length).to.eql(1);
        expect(returnedData.errors[0]).to.eql(" should have required property 'buyTokenAddress'");
    });
    it('should handle a valid v4 request', async () => {
        const quoter = TypeMoq.Mock.ofType<Quoter>(undefined, TypeMoq.MockBehavior.Strict);
        const expectedResponse: VersionedQuote<'4', V4RFQFirmQuote> = {
            response: {
                signedOrder: fakeV4Order,
            },
            protocolVersion: '4',
        };
        quoter
            .setup(async q => q.fetchFirmQuoteAsync(fakeV4TakerRequest))
            .returns(async () => expectedResponse)
            .verifiable(TypeMoq.Times.once());

        const req = httpMocks.createRequest({
            query: {
                buyTokenAddress: fakeV4TakerRequest.buyTokenAddress,
                sellTokenAddress: fakeV4TakerRequest.sellTokenAddress,
                // tslint:disable-next-line:no-non-null-assertion
                buyAmountBaseUnits: fakeV4TakerRequest.buyAmountBaseUnits!.toString(),
                takerAddress: fakeV4TakerRequest.takerAddress,
                txOrigin: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
                protocolVersion: '4',
            },
            headers: { '0x-api-key': fakeV4TakerRequest.apiKey },
        });
        const resp = httpMocks.createResponse();

        await takerRequestHandler('firm', quoter.object, req, resp);

        expect(resp._getStatusCode()).to.eql(HttpStatus.OK);
        expect(resp._getJSONData()).to.eql(JSON.parse(JSON.stringify(expectedResponse.response)));

        quoter.verifyAll();
    });
});

describe('submit request handler', () => {
    const { signature, ...restOrder } = fakeV4Order;
    const order = {
        ...restOrder,
        makerAmount: new BigNumber(restOrder.makerAmount),
        takerAmount: new BigNumber(restOrder.takerAmount),
        expiry: new BigNumber(restOrder.expiry),
        salt: new BigNumber(restOrder.salt),
    };

    const fakeSubmitRequest: SubmitRequest = {
        order,
        orderHash: '0xf000',
        apiKey: 'kool-api-key',
        fee: new BigNumber(0),
    };

    const expectedSuccessResponse: SubmitReceipt = {
        fee: new BigNumber(0),
        proceedWithFill: true,
        signedOrderHash: '0xf000',
    };

    it('should defer to quoter and return response for submit request', async () => {
        const quoter = TypeMoq.Mock.ofType<Quoter>(undefined, TypeMoq.MockBehavior.Strict);
        quoter
            .setup(async q => q.submitFillAsync(fakeSubmitRequest))
            .returns(async () => expectedSuccessResponse)
            .verifiable(TypeMoq.Times.once());

        const req = httpMocks.createRequest({
            body: {
                order,
                orderHash: '0xf000',
                fee: '0',
            },
            headers: { '0x-api-key': fakeSubmitRequest.apiKey },
        });
        const resp = httpMocks.createResponse();

        await submitRequestHandler(quoter.object, req, resp);

        expect(resp._getStatusCode()).to.eql(HttpStatus.OK);
        expect(resp._getJSONData()).to.eql(JSON.parse(JSON.stringify(expectedSuccessResponse)));

        quoter.verifyAll();
    });
    it('should invalidate a bad request', async () => {
        const quoter = TypeMoq.Mock.ofType<Quoter>(undefined, TypeMoq.MockBehavior.Strict);

        const req = httpMocks.createRequest({
            body: {
                order,
                fee: '0',
            },
            headers: { '0x-api-key': fakeSubmitRequest.apiKey },
        });
        const resp = httpMocks.createResponse();

        await submitRequestHandler(quoter.object, req, resp);
        expect(resp._getStatusCode()).to.eql(HttpStatus.BAD_REQUEST);
        const returnedData = resp._getJSONData();
        expect(Object.keys(returnedData)).to.eql(['errors']);
        expect(returnedData.errors.length).to.eql(1);
        expect(returnedData.errors[0]).to.eql("should have required property 'orderHash'");
    });
    it('should handle empty indicative quote', async () => {
        const quoter = TypeMoq.Mock.ofType<Quoter>(undefined, TypeMoq.MockBehavior.Strict);
        quoter
            .setup(async q => q.submitFillAsync(fakeSubmitRequest))
            .returns(async () => undefined)
            .verifiable(TypeMoq.Times.once());

        const req = httpMocks.createRequest({
            body: {
                order,
                orderHash: '0xf000',
                fee: '0',
            },
            headers: { '0x-api-key': fakeSubmitRequest.apiKey },
        });
        const resp = httpMocks.createResponse();

        await submitRequestHandler(quoter.object, req, resp);

        expect(resp._getStatusCode()).to.eql(HttpStatus.NO_CONTENT);

        quoter.verifyAll();
    });
});
