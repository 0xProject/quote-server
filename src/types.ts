import { SignedOrder as V3SignedOrder } from '@0x/order-utils';
import { RfqOrderFields as V4RfqOrder, Signature as V4Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

// Requires that one of many properites is specified
// See https://stackoverflow.com/a/49725198
type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
    { [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>> }[Keys];

export type SupportedVersion = '3' | '4';

export interface V4SignedRfqOrder extends V4RfqOrder {
    signature: V4Signature;
}

export interface BaseTakerRequest {
    sellTokenAddress: string;
    buyTokenAddress: string;
    takerAddress: string;
    apiKey?: string;
    sellAmountBaseUnits?: BigNumber;
    buyAmountBaseUnits?: BigNumber;
    comparisonPrice?: BigNumber;
}

export interface V3TakerRequest extends BaseTakerRequest {
    protocolVersion: '3';
}

export interface V4TakerRequest extends BaseTakerRequest {
    protocolVersion: '4';
    txOrigin: string;
    isLastLook: boolean;
    fee?: BigNumber;
}

export type TakerRequest = V3TakerRequest | V4TakerRequest;

export type TakerRequestQueryParams = RequireOnlyOne<
    {
        sellTokenAddress: string;
        buyTokenAddress: string;
        takerAddress: string;
        sellAmountBaseUnits?: string;
        buyAmountBaseUnits?: string;
        comparisonPrice?: string;
        protocolVersion?: string;
        txOrigin?: string;
        isLastLook?: string;
        fee?: string;
    },
    'sellAmountBaseUnits' | 'buyAmountBaseUnits'
>;

export interface VersionedQuote<Version, QuoteType> {
    protocolVersion: Version;
    response: QuoteType | undefined;
}

/*
// Indicative Quotes

Generate types for both V3 and V4 Indicative quotes. Then use the generic to tie them all together.
*/
export type V3RFQIndicativeQuote = Pick<
    V3SignedOrder,
    'makerAssetData' | 'makerAssetAmount' | 'takerAssetData' | 'takerAssetAmount' | 'expirationTimeSeconds'
>;

export type V4RFQIndicativeQuote = Pick<
    V4RfqOrder,
    'makerToken' | 'makerAmount' | 'takerToken' | 'takerAmount' | 'expiry'
>;

export type IndicativeQuoteResponse =
    | VersionedQuote<'3', V3RFQIndicativeQuote>
    | VersionedQuote<'4', V4RFQIndicativeQuote>;

// Firm quotes, similar pattern
export interface V3RFQFirmQuote {
    signedOrder: V3SignedOrder;
}

export interface V4RFQFirmQuote {
    signedOrder: V4SignedRfqOrder;
}

export type FirmQuoteResponse = VersionedQuote<'3', V3RFQFirmQuote> | VersionedQuote<'4', V4RFQFirmQuote>;

// Implement quoter that is version agnostic
export interface Quoter {
    fetchIndicativeQuoteAsync(takerRequest: TakerRequest): Promise<IndicativeQuoteResponse>;
    fetchFirmQuoteAsync(takerRequest: TakerRequest): Promise<FirmQuoteResponse>;
    submitFillAsync(submitRequest: SubmitRequest): Promise<SubmitReceipt | undefined>;
}

export interface SubmitReceipt {
    proceedWithFill: boolean; // must be true if maker agrees
    fee: BigNumber;
    signedOrderHash: string;
}

export interface SubmitRequest {
    order: V4RfqOrder;
    orderHash: string;
    fee: BigNumber;
    apiKey?: string;
}

export interface SubmitRequestBody {
    zeroExTransaction: ZeroExTransactionWithoutDomain;
    signature: string;
}

export interface ZeroExTransactionWithoutDomain {
    salt: BigNumber;
    expirationTimeSeconds: BigNumber;
    gasPrice: BigNumber;
    signerAddress: string;
    data: string;
}
