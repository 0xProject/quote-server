import { SignedOrder } from '@0x/order-utils';
import { BigNumber } from '@0x/utils';
import * as chai from 'chai';
import * as HttpStatus from 'http-status-codes';
import * as httpMocks from 'node-mocks-http';
import * as TypeMoq from 'typemoq';

import { generateApiKeyHandler, takerRequestHandler } from '../src/handlers';
import { Quoter, TakerRequest } from '../src/types';

const expect = chai.expect;

const fakeOrder: SignedOrder = {
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

describe('api key handler', () => {
    it('reject when canMakerControlSettlement == false & no API key specified', () => {
        const handler = generateApiKeyHandler();
        const req = httpMocks.createRequest();
        const resp = httpMocks.createResponse();

        handler(req, resp, () => {
            return;
        });

        expect(resp._getStatusCode()).to.eql(HttpStatus.UNAUTHORIZED);
        expect(resp._getJSONData()).to.eql({ errors: ['Invalid API key'] });
    });
    it('accept when canMakerControlSettlement == false & API Key specified', () => {
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
    it('accept when canMakerControlSettlement == true & no API Key specified', () => {
        const handler = generateApiKeyHandler();
        const req = httpMocks.createRequest({
            query: {
                canMakerControlSettlement: true,
            }
        });
        const resp = httpMocks.createResponse();

        handler(req, resp, () => {
            return;
        });

        expect(resp._getStatusCode()).to.eql(HttpStatus.OK);
    });
    it('accept when canMakerControlSettlement == true & API Key specified', () => {
        const handler = generateApiKeyHandler();
        const req = httpMocks.createRequest({
            query: {
                canMakerControlSettlement: true,
            },
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
    const fakeTakerRequest: TakerRequest = {
        buyToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
        sellToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        buyAmount: new BigNumber(1000000000000000000),
        takerAddress: '0x8a333a18B924554D6e83EF9E9944DE6260f61D3B',
        apiKey: 'kool-api-key',
        canMakerControlSettlement: undefined,
    };

    it('should defer to quoter and return response for firm quote', async () => {
        const quoter = TypeMoq.Mock.ofType<Quoter>(undefined, TypeMoq.MockBehavior.Strict);
        const expectedResponse = {
            signedOrder: fakeOrder,
            quoteExpiry: +new Date(),
        };
        quoter
            .setup(async q => q.fetchFirmQuoteAsync(fakeTakerRequest))
            .returns(async () => expectedResponse)
            .verifiable(TypeMoq.Times.once());

        const req = httpMocks.createRequest({
            query: {
                buyToken: fakeTakerRequest.buyToken,
                sellToken: fakeTakerRequest.sellToken,
                buyAmount: fakeTakerRequest.buyAmount.toString(),
                takerAddress: fakeTakerRequest.takerAddress,
            },
            headers: { '0x-api-key': fakeTakerRequest.apiKey },
        });
        const resp = httpMocks.createResponse();

        await takerRequestHandler('firm', quoter.object, req, resp);

        expect(resp._getStatusCode()).to.eql(HttpStatus.OK);
        expect(resp._getJSONData()).to.eql(JSON.parse(JSON.stringify(expectedResponse)));

        quoter.verifyAll();
    });
    it('should succeed without an API key if `canMakerControlSettlement` is set to `true` when requesting a firm quote', async () => {
        const quoter = TypeMoq.Mock.ofType<Quoter>(undefined, TypeMoq.MockBehavior.Strict);
        const expectedResponse = {
            signedOrder: fakeOrder,
            quoteExpiry: +new Date(),
        };
        const takerRequest = {
            ...fakeTakerRequest,
            canMakerControlSettlement: true,
            apiKey: undefined,
        };
        quoter
            .setup(async q => q.fetchFirmQuoteAsync(takerRequest))
            .returns(async () => expectedResponse)
            .verifiable(TypeMoq.Times.once());

        const req = httpMocks.createRequest({
            query: {
                buyToken: takerRequest.buyToken,
                sellToken: takerRequest.sellToken,
                buyAmount: takerRequest.buyAmount.toString(),
                takerAddress: takerRequest.takerAddress,
                canMakerControlSettlement: takerRequest.canMakerControlSettlement,
            }
        });
        const resp = httpMocks.createResponse();

        await takerRequestHandler('firm', quoter.object, req, resp);

        expect(resp._getStatusCode()).to.eql(HttpStatus.OK);
        expect(resp._getJSONData()).to.eql(JSON.parse(JSON.stringify(expectedResponse)));

        quoter.verifyAll();
    });
    it('should defer to quoter and return response for indicative quote', async () => {
        const quoter = TypeMoq.Mock.ofType<Quoter>(undefined, TypeMoq.MockBehavior.Strict);

        const { makerAssetData, makerAssetAmount, takerAssetAmount, takerAssetData, expirationTimeSeconds } = fakeOrder;
        const indicativeQuote = {
            makerAssetData,
            makerAssetAmount,
            takerAssetAmount,
            takerAssetData,
            expirationTimeSeconds,
        };
        quoter
            .setup(async q => q.fetchIndicativeQuoteAsync(fakeTakerRequest))
            .returns(async () => indicativeQuote)
            .verifiable(TypeMoq.Times.once());

        const req = httpMocks.createRequest({
            query: {
                buyToken: fakeTakerRequest.buyToken,
                sellToken: fakeTakerRequest.sellToken,
                buyAmount: fakeTakerRequest.buyAmount.toString(),
                takerAddress: fakeTakerRequest.takerAddress,
            },
            headers: { '0x-api-key': fakeTakerRequest.apiKey },
        });
        const resp = httpMocks.createResponse();

        await takerRequestHandler('indicative', quoter.object, req, resp);

        expect(resp._getStatusCode()).to.eql(HttpStatus.OK);
        expect(resp._getJSONData()).to.eql(JSON.parse(JSON.stringify(indicativeQuote)));

        quoter.verifyAll();
    });
    it('should handle empty indicative quote', async () => {
        const quoter = TypeMoq.Mock.ofType<Quoter>(undefined, TypeMoq.MockBehavior.Strict);
        quoter
            .setup(async q => q.fetchIndicativeQuoteAsync(fakeTakerRequest))
            .returns(async () => undefined)
            .verifiable(TypeMoq.Times.once());

        const req = httpMocks.createRequest({
            query: {
                buyToken: fakeTakerRequest.buyToken,
                sellToken: fakeTakerRequest.sellToken,
                buyAmount: fakeTakerRequest.buyAmount.toString(),
                takerAddress: fakeTakerRequest.takerAddress,
            },
            headers: { '0x-api-key': fakeTakerRequest.apiKey },
        });
        const resp = httpMocks.createResponse();

        await takerRequestHandler('indicative', quoter.object, req, resp);

        expect(resp._getStatusCode()).to.eql(HttpStatus.NO_CONTENT);

        quoter.verifyAll();
    });
    it('should handle empty firm quote', async () => {
        const quoter = TypeMoq.Mock.ofType<Quoter>(undefined, TypeMoq.MockBehavior.Strict);
        quoter
            .setup(async q => q.fetchFirmQuoteAsync(fakeTakerRequest))
            .returns(async () => undefined)
            .verifiable(TypeMoq.Times.once());

        const req = httpMocks.createRequest({
            query: {
                buyToken: fakeTakerRequest.buyToken,
                sellToken: fakeTakerRequest.sellToken,
                buyAmount: fakeTakerRequest.buyAmount.toString(),
                takerAddress: fakeTakerRequest.takerAddress,
            },
            headers: { '0x-api-key': fakeTakerRequest.apiKey },
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
                sellToken: fakeTakerRequest.sellToken,
                buyAmount: fakeTakerRequest.buyAmount.toString(),
                takerAddress: fakeTakerRequest.takerAddress,
            },
            headers: { '0x-api-key': fakeTakerRequest.apiKey },
        });
        const resp = httpMocks.createResponse();

        await takerRequestHandler('firm', quoter.object, req, resp);
        expect(resp._getStatusCode()).to.eql(HttpStatus.BAD_REQUEST);
        const returnedData = resp._getJSONData();
        expect(Object.keys(returnedData)).to.eql(['errors']);
        expect(returnedData.errors.length).to.eql(1);
        expect(returnedData.errors[0]).to.eql('instance requires property "buyToken"');
    });
});
