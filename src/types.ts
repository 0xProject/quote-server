import { SignedOrder } from '@0x/order-utils';
import { BigNumber } from '@0x/utils';

// Requires that one of many properites is specified
// See https://stackoverflow.com/a/49725198
type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
    { [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>> }[Keys];

export type TakerRequest = RequireOnlyOne<
    {
        sellTokenAddress: string;
        buyTokenAddress: string;
        takerAddress: string;
        apiKey?: string;
        canMakerControlSettlement?: boolean;
        sellAmountBaseUnits?: BigNumber;
        buyAmountBaseUnits?: BigNumber;
        comparisonPrice?: BigNumber;
    },
    'sellAmountBaseUnits' | 'buyAmountBaseUnits'
>;

export type RFQTIndicativeQuote = Pick<
    SignedOrder,
    'makerAssetData' | 'makerAssetAmount' | 'takerAssetData' | 'takerAssetAmount' | 'expirationTimeSeconds'
>;

export interface RFQMIndicativeQuote extends RFQTIndicativeQuote {
    quoteExpiry: number;
}

export type IndicativeQuote = RFQTIndicativeQuote | RFQMIndicativeQuote;

export interface RFQTFirmQuote {
    signedOrder: SignedOrder;
}

export interface RFQMFirmQuote extends RFQTFirmQuote {
    quoteExpiry: number;
}

export type FirmQuote = RFQTFirmQuote | RFQMFirmQuote;

export interface Quoter {
    fetchIndicativeQuoteAsync(takerRequest: TakerRequest): Promise<IndicativeQuote | undefined>;
    fetchFirmQuoteAsync(takerRequest: TakerRequest): Promise<FirmQuote | undefined>;
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
