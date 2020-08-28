# CHANGELOG

## 3.0.0

-   Permit takerAddress to be undefined for indicative quotes.

## 2.0.2

-   Exported RFQT- and RFQ-M specific quote types.

## 2.0.1

-   Changed some types: FirmQuote's quoteExpiry field is now optional, and IndicativeQuote now has an (also optional) quoteExpiry as well.

## 1.0.0

-   Bumped version number for previous breaking changes, which should have bumped it itself, but didn't.
-   Promoted @types/express from devDependencies to dependencies in package.json

## 0.1.1

### Bug fixes

-   Add missing exports SubmitRequest and SubmitReceipt, via https://github.com/0xProject/quote-server/pull/5

## 0.1.0

### Breaking Changes

-   Renamed some TakerRequest parameters, via https://github.com/0xProject/quote-server/pull/5

## 0.0.1

### Features

-   Initial release
