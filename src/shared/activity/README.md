# Activity framework

Every activity = a content file (`content/activities/<id>.json`, shape in `types.ts` `ActivityContent`) + a code module that exports `Try` and optionally `LearnDiagram`.
`ActivityShell` provides the four tabs, progress saving, Check it (`CheckIt.tsx`, hint ladder: hint 1, hint 2, worked example, then the answer), sentence frames (`ExplainBox.tsx`) and Self-rate (`SelfRate.tsx`).
`mastery.ts` suggests a proficiency level from first-try answers, hints and "apply it" questions. Exemplary needs every apply question right with no hints.
