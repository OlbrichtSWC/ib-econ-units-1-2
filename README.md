# IB Economics: Units 1 and 2

Games and simulations for IB Economics Unit 1 (Introduction to economics) and Unit 2 (Microeconomics).
Every activity has four steps: Learn it, Try it, Check it, Self-rate.

- No accounts, no logins, no names, no tracking, no ads.
- Progress is saved only in each student's own browser.
- Works on Chromebooks, Windows, iPads and phones, and offline after the first visit.
- All numbers in activities are invented examples.

This guide is written for teachers. You do not need to know how to code.

---

## 1. Open the app

The app is live at **https://olbrichtswc.github.io/ib-econ-units-1-2/**. That is all students need.

Every change saved to this repository on GitHub is tested and published automatically, usually within a minute or two. If a test fails, the change is not published, so a broken calculation never reaches students.

The app works in Chrome, Edge, Safari and Firefox. Students do not sign in.

## 2. What is in this folder

| Folder | What it is | Do you edit it? |
| --- | --- | --- |
| `public/content/` | All the words students read: explanations, questions, hints, event cards, glossary | **Yes.** See [docs/EDITING-CONTENT.md](docs/EDITING-CONTENT.md) |
| `public/config/settings.json` | Teacher passcode, which activities are on, HL content, proficiency scale | **Yes.** See section 5 |
| `docs/` | Teacher guide, student help sheet, content guide | Read and share |
| `src/` | The app's code | No |
| `tests/` | Automated tests for every calculation | No |
| `test-report/TEST-REPORT.md` | The latest test results in plain language | Read |

## 3. Publish the app (free)

You have two choices. Both are free.

### Choice A: Netlify Drop (fastest, about 3 minutes)

1. Get the ready-to-publish folder called `site` (I send it to you as a zip file). Unzip it.
2. Go to **https://app.netlify.com/drop** and create a free account (you can sign up with your email).
3. Drag the whole `site` folder onto the page.
4. Netlify gives you a link like `https://random-name.netlify.app`. That is your app. Share it with students.
5. Optional: click **Site configuration**, then **Change site name**, and type a name such as `churchill-econ`.

To publish an update later: open your site on Netlify, click **Deploys**, and drag the new `site` folder onto the box that says **Drag and drop your site output folder here**.

### Choice B: GitHub Pages (best for sharing with colleagues and editing content online)

1. Create a free account at **https://github.com** (click **Sign up**).
2. Click the **+** in the top right, then **New repository**.
3. Name it `ib-econ-units-1-2`. Choose **Public**. Leave the other options as they are. Click **Create repository**.
4. Tell Claude the repository name. Claude uploads the app and turns on automatic publishing for you.
5. Your app link will be `https://YOUR-USERNAME.github.io/ib-econ-units-1-2/`.

After that, every time anyone saves a change on GitHub, the tests run automatically.
If they pass, the app republishes in about 2 minutes. If a test fails, the old version stays online, so a broken calculation never reaches students.

## 4. Change content (questions, hints, glossary, event cards)

All student-facing text is in `public/content/`. Open [docs/EDITING-CONTENT.md](docs/EDITING-CONTENT.md) for a step-by-step guide with examples.

On GitHub: open the file, click the pencil icon (**Edit this file**), make your change, then click **Commit changes**.
On Netlify: edit the file inside your `site` folder (it is in `site/content/`), then drag the folder onto Netlify again.

## 5. Turn activities on or off

Open `public/config/settings.json` (on Netlify: `site/config/settings.json`). Find the `"modules"` part:

```json
"modules": {
  "ppc-explorer": true,
  "market-shock": true,
  "surplus-shader": false
}
```

`true` means students can open it. `false` hides it until you are ready. Save the file and publish.

You can also preview changes in the app: open **Teacher**, enter the passcode, and use the checkboxes. Those checkboxes only change **your** device. The teacher view shows the exact text to copy into `settings.json`.

**Quicker way for your class: the class link.** In **Teacher**, find **Class link**, choose the activities, then share the link or QR code with your class. Each student's app asks before using it. No file editing needed. Make a new link when you release more activities.

## 6. Teacher view

Click **Teacher** in the top bar and enter the passcode. It shows answers in Check it, teacher notes in Learn it, hidden activities, a **projector mode** with large text, all three levels of every game open, the **Class link** maker, and **Class mode** in Market Shock (teams vote, one shared class score).

**Change the passcode before you share the app.** It is the `"teacherPasscode"` line in `settings.json`. The default is `change-me`.

The passcode keeps answers out of casual view. It is not a real lock: because the app has no server, a student who knows how could read the settings file. Do not use it to protect anything secret.

## 7. Other settings

- `"showHlContent": true` shows HL questions and activities to everyone, labelled **HL**. Set it to `false` to hide HL-only parts from students (you still see them in teacher view).
- `"scale"`: the names and short descriptions of the 8 proficiency levels used in Self-rate. Colleagues outside CBE can change these to their own scale. Keep exactly 8 levels.

## 8. Privacy (Alberta POPA)

- The app has no server, no database, no accounts and no analytics.
- A privacy lock (a Content Security Policy) stops the browser from loading or sending anything to any other website.
- Progress (activities done, scores, self-ratings) is stored in the browser's local storage on that device. **Reset my progress** deletes it after asking "Are you sure?".
- A progress code contains only that progress data. No names and no written answers. Students choose whether to copy it.
- The progress summary image is made in the browser. Students choose whether to hand it in. The app never sends it.
- Written answers in "Explain it in writing" are saved in the browser on that device only, so students do not lose them. They are never sent and are not in the progress code. **Reset my progress** deletes them too.
- A class link holds only which activities are on and whether HL content shows. The app asks before using it.
- Stamps are saved with progress, on the device only. They are never compared between students, and there is no leaderboard.
- The **Sound on / Sound off** choice is saved in the browser. Sounds are made in the browser; there are no sound files and nothing is downloaded.

## 9. For the technical helper (optional)

Node.js 22. `npm install`, then `npm run dev` to work locally, `npm test` to run the tests, `npm run test:report` to rebuild the test report, `npm run build` to make the `dist` folder (the `site` folder above).

Reusable parts for the Units 3 and 4 app live in `src/shared/` (each folder has its own README):
`diagrams/` (diagram engine), `design/` (colours, fonts, buttons, cards), `activity/` (Learn it / Try it / Check it framework, hint ladder, self-rating), `progress/` (save, load, progress code, summary), `content/` (glossary, content loading, Markdown).
All economics calculations are in `src/econ/calc.ts` with tests in `tests/calc.test.ts`.
