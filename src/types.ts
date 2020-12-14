import { SignedOrder as V3SignedOrder } from '@0x/order-utils';
import { RfqOrderFields as V4RfqOrder, Signature as V4Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

// Requires that one of many properites is specified
// See https://stackoverflow.com/a/49725198
type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
    { [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>> }[Keys];

export type SupportedVersion = '3' | '4';

export interface BaseTakerRequest {
    sellTokenAddress: string;
    buyTokenAddress: string;
    takerAddress: string;
    apiKey?: string;
    canMakerControlSettlement?: boolean;
    sellAmountBaseUnits?: BigNumber;
    buyAmountBaseUnits?: BigNumber;
    comparisonPrice?: BigNumber;
};

export interface V3TakerRequest extends BaseTakerRequest {
    protocolVersion: '3';
}

export interface V4TakerRequest extends BaseTakerRequest {
    protocolVersion: '4';
    txOrigin: string;
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
        canMakerControlSettlement?: string;
        txOrigin?: string;
        protocolVersion?: string;
    },
    'sellAmountBaseUnits' | 'buyAmountBaseUnits'
>;

// Start suggested changes here

/*

🚨 Made some simplifications: when we built the first iteration of `quote-server`, we thought that RFQM was
round the corner. Since then, we have 1) decided to de-prioritize RFQM in the near future, and 2) we have decided to
change the logic behind the way we do RFQM (which is what we call 'Last Look RFQM'). Therefore I took the freedom to
strip out `quoteExpiry` from the types and remove the RFQM types since this field has never been used and no market maker
uses it at all.

✅ Used generics: One way to avoid creating every possible conbination of version and response type (Indicative or Firm) is
to create a generic. this generic can be used like `VersionedQuote<'4', V3RFQTIndicativeQuote>` to dynamically
build the following interface.

{
    protocolVersion: '4',
    response: {
        makerToken: ...,
        takerToken: ...,
        makerAmount: ...,
        takerAmount: ...,
        expiry: ...,
    }
}

*/


export interface VersionedQuote<Version, QuoteType> {
    protocolVersion: Version;
    response: QuoteType | undefined;
}

/*
// Indicative Quotes

Generate types for both V3 and V4 Indicative quotes. Then use the generic to tie them all together. Removing
RFQM definitely makes things a lot easier.
*/
export type V3RFQIndicativeQuote = Pick<
    V3SignedOrder,
    'makerAssetData' | 'makerAssetAmount' | 'takerAssetData' | 'takerAssetAmount' | 'expirationTimeSeconds'
>;

export type V4RFQIndicativeQuote = Pick<
    V4RfqOrder,
    'makerToken' | 'makerAmount' | 'takerToken' | 'takerAmount' | 'expiry'
>;

type IndicativeQuoteResponse = VersionedQuote<'3', V3RFQIndicativeQuote> | VersionedQuote<'4', V4RFQIndicativeQuote> | undefined;

/*
// Firm quotes

Same here, tie again different firm quote implementations. I like the approach you took with separating
order and signature in V4 RFQ 💯.

*/
export interface V3RFQFirmQuote {
    signedOrder: V3SignedOrder;
}

export interface V4RFQFirmQuote {
    order: V4RfqOrder;
    signature: V4Signature;
}

type FirmQuoteResponse = VersionedQuote<'3', V3RFQFirmQuote> | VersionedQuote<'4', V4RFQFirmQuote> | undefined;

// Implement
export interface Quoter {
    fetchIndicativeQuoteAsync(takerRequest: TakerRequest): Promise<IndicativeQuoteResponse>;
    fetchFirmQuoteAsync(takerRequest: TakerRequest): Promise<FirmQuoteResponse>;
    submitFillAsync(submitRequest: SubmitRequest): Promise<SubmitReceipt | undefined>;
}

export interface SubmitReceipt {
    ethereumTransactionHash: string;
    signedEthereumTransaction: string;
}

export interface SubmitRequest {
    zeroExTransaction: ZeroExTransactionWithoutDomain;
    signature: string;
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
