# How to edit content

Every word students read lives in plain text files in `public/content/` (on Netlify: `site/content/`).
You can fix a typo, rewrite a hint or add a question without touching any code.

| File | What it holds |
| --- | --- |
| `content/glossary.json` | Glossary terms and meanings |
| `content/activities/ppc-explorer.json` | Everything in PPC Explorer |
| `content/activities/island-economy.json` | Everything in Castaway Council |
| `content/activities/circular-flow.json` | Everything in Money River |
| `content/activities/positive-normative.json` | Everything in Fact Lab |
| `content/activities/market-shock.json` | Everything in Market Shock Simulator |
| `content/activities/surplus-shader.json` | Everything in Surplus Shader |
| `content/activities/bias-lab.json` | Everything in Mind Tricks Lab |
| `content/activities/elasticity-cafe.json` | Everything in The Elasticity Café |
| `content/activities/ped-line.json` | Everything in Same Slope, Different PED |
| `content/activities/hints-yed.json` | Everything in HINTS Market |
| `content/activities/supply-speed.json` | Everything in Supply Speed |
| `content/activities/gov-toolkit.json` | Everything in Government Toolkit |
| `content/activities/externality-fixer.json` | Everything in Smoke and Sunshine |
| `content/activities/fish-pond.json` | Everything in Fish Pond |
| `content/activities/streetlight-fund.json` | Everything in Streetlight Fund |

## Three rules for JSON files

JSON is a strict format. Most mistakes come from these three things:

1. Text goes inside straight double quotes: `"like this"`. To use a quote mark inside text, type `\"`.
2. Items in a list are separated by commas, but there is **no comma after the last item**.
3. Every `{` needs a matching `}` and every `[` needs a matching `]`.

If the app shows "this activity could not load" after an edit, there is a JSON mistake. Paste the file into **https://jsonlint.com** (it runs in your browser) to find the line. On GitHub you can also undo: open the file, click **History**, and restore the previous version.

## Formatting inside text

| Type this | To get |
| --- | --- |
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `[[opportunity cost]]` | a glossary term students can tap |
| `[[PPC\|production possibilities curve]]` | shows "PPC", opens the glossary entry for "production possibilities curve" |
| `^HL^` | an HL label |
| `\n\n` | a new paragraph |
| `- item` lines | a bulleted list |

Type subscripts directly: D₁ D₂ S₁ S₂ P₁ Q₁. (Copy them from here if your keyboard has no way to type them.)

## Change a question

Each activity file has a `"check"` list. One multiple-choice question looks like this:

```json
{
  "id": "q1",
  "type": "choice",
  "level": "core",
  "prompt": "An economy produces at a point **inside** its PPC. What does this show?",
  "options": [
    { "text": "Unemployment of resources", "correct": true, "feedback": "Yes. Some resources are not being used." },
    { "text": "The economy is efficient", "feedback": "Efficient points are **on** the curve." }
  ],
  "hints": ["First hint: a nudge.", "Second hint: narrows it down."],
  "worked": "A worked example of a similar problem.",
  "explanation": "Why the answer is right. Shown after the student answers."
}
```

- `"level"`: `"core"` for checking understanding, `"apply"` for using it in a new situation. **Exemplary in Self-rate needs "apply" questions**, so keep at least two in each activity.
- `"feedback"` on each wrong option should explain the mistake, not just say it is wrong.
- Add `"hl": true` to label a question HL.
- `"id"` must be different for each question in the file.

A number question:

```json
{
  "id": "q3",
  "type": "number",
  "level": "core",
  "prompt": "Calculate PED when the price rises from $4 to $5 and quantity falls from 100 to 80.",
  "answer": -0.8,
  "tolerance": 0.01,
  "suffix": "",
  "mistakes": [
    { "value": -1.25, "feedback": "You divided the other way. PED = %change in quantity ÷ %change in price." }
  ],
  "hints": ["...", "..."],
  "worked": "...",
  "explanation": "..."
}
```

- `"tolerance"`: how close counts as correct (0.01 means -0.79 to -0.81 are accepted).
- `"prefix"` / `"suffix"`: shown before or after the answer box, for example `"$"` or `"%"`.
- `"mistakes"`: common wrong answers with feedback that explains the slip.
- Students can type `$`, `%` and commas; the app ignores them.

To add a question, copy a whole question from `{` to `}`, paste it after the last one, add a comma between them, and change the `id`.

## Add a glossary term

In `content/glossary.json`, add:

```json
{ "term": "Market", "meaning": "Any place or system where buyers and sellers meet to exchange goods or services.", "code": "2.1" }
```

Optional: `"aliases": ["markets"]`, `"example": "..."`, `"hl": true`.

## Writing style for students

Short, direct sentences. Plain words (many students are learning English). No em dashes. Avoid "genuinely", "honestly" and "actually". Say "mark" or "checkmark", not "tick". Use invented numbers ("a café", "a ski hill"); if you use real data, name the source.
