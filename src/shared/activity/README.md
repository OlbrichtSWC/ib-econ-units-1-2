# Activity framework

Every activity = a content file (`content/activities/<id>.json`, shape in `types.ts` `ActivityContent`) + a code module that exports `Try` and optionally `LearnDiagram`.
`ActivityShell` provides the four tabs, progress saving, Check it (`CheckIt.tsx`, hint ladder: hint 1, hint 2, worked example, then the answer), click-to-build explanations (`ExplainBox.tsx`, `explain.ts`: one sentence at a time, three endings each, a facts box) and Self-rate (`SelfRate.tsx`).
`mastery.ts` suggests a proficiency level from first-try answers, hints and "apply it" questions. Exemplary needs every apply question right on the first try with at most one hint.
