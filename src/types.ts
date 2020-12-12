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

export type TakerRequest = V3TakerRequest | V4TakerRequest;;

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

export type V3RFQTIndicativeQuote = Pick<
    V3SignedOrder,
    'makerAssetData' | 'makerAssetAmount' | 'takerAssetData' | 'takerAssetAmount' | 'expirationTimeSeconds'
>;

export type V4RFQTIndicativeQuote = Pick<
    V4RfqOrder,
    'makerToken' | 'makerAmount' | 'takerToken' | 'takerAmount' | 'expiry'
>;

export interface V3RFQMIndicativeQuote extends V3RFQTIndicativeQuote {
    quoteExpiry: number;
}

export interface V4RFQMIndicativeQuote extends V4RFQTIndicativeQuote {
    quoteExpiry: number;
}

export type V3IndicativeQuote = V3RFQTIndicativeQuote | V3RFQMIndicativeQuote;
export type V4IndicativeQuote = V4RFQTIndicativeQuote | V4RFQMIndicativeQuote;

export interface V3RFQTFirmQuote {
    signedOrder: V3SignedOrder;
}

export interface V4RFQTFirmQuote {
    order: V4RfqOrder;
    signature: V4Signature;
}

export interface V3RFQMFirmQuote extends V3RFQTFirmQuote {
    quoteExpiry: number;
}

export interface V4RFQMFirmQuote extends V4RFQTFirmQuote {
    quoteExpiry: number;
}

export type V3FirmQuote = V3RFQTFirmQuote | V3RFQMFirmQuote;
export type V4FirmQuote = V4RFQTFirmQuote | V4RFQMFirmQuote;

export interface V3VersionedIndicativeQuote {
    protocolVersion: '3';
    response: V3IndicativeQuote | undefined;
}

export interface V4VersionedIndicativeQuote {
    protocolVersion: '4';
    response: V4IndicativeQuote | undefined;
}

export interface V3VersionedFirmQuote {
    protocolVersion: '3';
    response: V3FirmQuote | undefined;
}

export interface V4VersionedFirmQuote {
    protocolVersion: '4';
    response: V4FirmQuote | undefined;
}

export interface Quoter {
    fetchIndicativeQuoteAsync(takerRequest: TakerRequest): Promise<V3VersionedIndicativeQuote | V4VersionedIndicativeQuote | undefined>;
    fetchFirmQuoteAsync(takerRequest: TakerRequest): Promise<V3VersionedFirmQuote | V4VersionedFirmQuote | undefined>;
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
