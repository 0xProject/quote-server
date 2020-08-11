# @0x/quote-server

A reference implementation of the [Maker Endpoint API](https://0x.org/docs/guides/rfqt-in-the-0x-api#maker-endpoint-specification) that's used in the RFQ-T model within the [0x API](https://0x.org/api).  For more details, see [RFQ-T in the 0x API](https://0x.org/docs/guides/rfqt-in-the-0x-api).

Demonstrated here is an implementation of the HTTP resource routing, and the request and response handling, which are required for to respond to the 0x API with quotes.  The resource routing is implemented in `src/router.ts`, and the request and response handling is implemented in `src/request_parser.ts` and `src/handlers.ts`.  JSON schemas describing the request types are in `src/schemas`.

What's _not_ demonstrated here is the backend logic required to determine when to offer quotes (vs when to decline to offer) and what pricing to offer in those quotes. Those details are omitted here because they will be specific to each individual market maker.
