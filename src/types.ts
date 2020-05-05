import { SignedOrder } from '@0x/order-utils';
import { BigNumber } from '@0x/utils';

// Requires that one of many properites is specified
// See https://stackoverflow.com/a/49725198
type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
    { [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>> }[Keys];

export type TakerRequest = RequireOnlyOne<
    {
        sellToken: string;
        buyToken: string;
        takerAddress: string;
        apiKey: string|undefined;
        sellAmount?: BigNumber;
        buyAmount?: BigNumber;
    },
    'sellAmount' | 'buyAmount'
>;

export interface RFQMFirmQuote {
    signedOrder: SignedOrder;
    quoteExpiry: number;
}

export type IndicativeQuote = Pick<
    SignedOrder,
    'makerAssetData' | 'makerAssetAmount' | 'takerAssetData' | 'takerAssetAmount' | 'expirationTimeSeconds'
>;

export interface Quoter {
    fetchRFQTIndicativeQuoteAsync(takerRequest: TakerRequest): Promise<IndicativeQuote | undefined>;
    fetchRFQTFirmQuoteAsync(takerRequest: TakerRequest): Promise<SignedOrder | undefined>;
    fetchRFQMIndicativeQuoteAsync(takerRequest: TakerRequest): Promise<IndicativeQuote | undefined>;
    fetchRFQMFirmQuoteAsync(takerRequest: TakerRequest): Promise<RFQMFirmQuote | undefined>;
}
