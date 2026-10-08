# Progress

`types.ts` defines the `ProgressStore` interface (load, save, reset, exportCode, importCode, subscribe).
`LocalProgressStore` keeps progress in localStorage. A school-approved database could be added later as another class with the same methods; activities would not change.
`code.ts`: progress codes. Bit-packed, version number first, CRC-16 checksum last, Crockford Base32 (no I, L, O, U). The activity id table is append-only.
`merge.ts`: replace, or keep the newer progress per activity. `summary.ts`: one-page PNG summary. `qr.ts`: QR codes made in the browser.
