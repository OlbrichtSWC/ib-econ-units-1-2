# Reusable parts

Copy this whole `shared/` folder (and `src/econ/calc.ts` if the new app needs the same calculations) into the Units 3 and 4 app.
Each part only depends on Preact and on the parts listed under "Needs".

| Folder | What it does | Needs |
| --- | --- | --- |
| `design/` | Colours, fonts, buttons, cards, badges, tabs, dialogs (`tokens.css`, `components.tsx`) | nothing |
| `diagrams/` | IB-style diagram engine: axes, curves, draggable handles, dashed guides, shaded areas, arrows, labels | `design/` colours, `econ/calc.ts` types |
| `content/` | Loads content files, safe Markdown, glossary terms students can tap | `design/` |
| `activity/` | Learn it / Try it / Check it / Self-rate frame, hint ladder, mastery suggestion, sentence frames | `design/`, `content/`, `progress/` |
| `progress/` | Save and load progress, progress codes with checksum and version, QR codes, summary image | nothing (QR uses `qrcode-generator`) |
| `fun/` | Sounds (made in the browser), confetti, rubber-stamp pictures and the "new stamp" pop-up | `design/`, `progress/` (stamp flags) |
