# RBMK Simulator – Android App Plan

Status: **planned 2026-10-20; not started.** Moved out of the old implementation plan on 2026-11-09 (§22 there, §-numbers kept), with the steps that had already been done here removed.

The goal is to ship the game as a standalone Android app on Google Play. iOS is out of scope for this round: the owner will decide on it once the Android app has been out for a while (§22.10).

The design source of truth stays [high-level-plan.md](high-level-plan.md) (the "bible"). This file only covers wrapping the finished web game as an app.

### 22.1 Approach

- **A separate repo, cloned from this one with its history**, e.g. `RBMK_Simulator_Android`. This repo stays as its `upstream` remote, so physics, events and UI fixes made here can be merged in (`git fetch upstream && git merge upstream/main`).
- **Capacitor wraps the game.** `next build` with static export writes plain files to `out/`. Capacitor bundles them into the APK and shows them in an Android WebView. There is no server, and the game runs fully offline. This works because the game is entirely client-side: no API routes and no server actions. The sim is pure TypeScript (`lib/sim`), and the save is in `localStorage`.
- **Keep the app's differences small, so merges from upstream stay easy:**
  - App-only code goes in new files: `capacitor.config.ts`, `android/` and `lib/native/`. Guard it with `Capacitor.isNativePlatform()` so the same code still runs on the web.
  - Edits to shared files stay small: `next.config.mjs`, `app/layout.tsx`, and an added `pause()` in `hooks/use-game-state.ts`.
  - Changes that help both versions go back to this repo too: local alarm files, viewport settings and phone layout fixes.
- **House-rule exceptions in the new repo only:**
  - New npm dependencies are allowed there. The web repo's no-new-dependencies habit came from a second lockfile (`pnpm-lock.yaml`) on Vercel, which has since been removed; the app repo uses `package-lock.json` only.
  - The owner still commits.

### 22.2 Owner decisions and accounts (before or alongside step A1)

| # | Decision | Notes |
|---|---|---|
| D1 | App name | Store titles are limited to 30 characters, e.g. "RBMK Reactor Simulator". |
| D2 | **Application ID** | Reverse-domain, e.g. `io.github.tjdcavey.rbmk`. **It can never change once published.** |
| D3 | Free or paid | Free is simplest. Paid needs a Play payments profile, and paid → free is one-way. |
| D4 | Orientation | Portrait, landscape or both. Decide after the phone check (A6). |
| D5 | Tablets | Supporting them is recommended. The listing then needs tablet screenshots. |
| D6 | Footer link | Keep the "© 1986 SKALA CONTROL SYSTEMS" GitHub link, opening in the system browser, or drop it in the app. |

Accounts and tools. **Start these first, because they take calendar time:**
- **Google Play Console developer account:** $25, one-time. Identity verification can take several days.
- **12+ testers for closed testing:** new personal accounts must run a closed test with **12 testers opted in for 14 days in a row** before they can publish to production (Google's rule as of 2025; re-check). Line them up early.
- **On the owner's PC:** Android Studio (includes the SDK and an emulator), JDK 21, Node 22+.

### 22.3 Steps

Each step ends with something the owner can check.

**A1. Create the repo** (about 1 hour). GitHub won't let you fork your own repo into the same account, so clone it and change the remotes:

```bash
git clone https://github.com/T-J-D-Cavey/RBMK_Nuclear_Reactor_Simulator.git RBMK_Simulator_Android
cd RBMK_Simulator_Android
git remote rename origin upstream
git remote add origin https://github.com/T-J-D-Cavey/RBMK_Simulator_Android.git
git push -u origin main
```

Then:
- add a README section on building the app and syncing from upstream;
- start the new repo's own plan file with a copy of this file.

*Check:* the new repo is on GitHub and `git remote -v` shows both `origin` and `upstream`.

**A2. Make the web build self-contained** (about half a day).
1. **Static export.** In `next.config.mjs`, add `output: "export"` and `trailingSlash: true` (`/game` becomes `game/index.html`, which the WebView serves reliably). Images are already `unoptimized`, which static export needs.
2. **Bundle the remote sounds.** `hooks/use-audio-manager.ts` still loads the hum and four alarms (general, high radiation, high reactor temperature, high steam) from `vercel-storage.com` blob URLs. Every other sound is already in `public/sounds/`. Download these five into `public/sounds/` and point the code at the local files. Without this there are no alarms or hum offline. **Upstream this change too.**
3. **Remove `@vercel/analytics`** from `app/layout.tsx` and `package.json`. It doesn't work in the app, and removing it means the data safety form can say "no data collected" (A9).
4. **Fonts:** nothing to do. `next/font/google` downloads the fonts at build time and serves them from the app. Confirm in airplane mode (A7).
5. **External links:** `target="_blank"` links (the footer) must open in the system browser via `@capacitor/browser`, not inside the game (D6).

*Check:* `npm run build` writes `out/` with `index.html`, `game/` and `instructions/`. Serving `out/` with any static server and the network off gives a playable game with every alarm.

**A3. Add Capacitor and get a first build** (about half a day).

```bash
npm i @capacitor/core @capacitor/app @capacitor/browser
npm i -D @capacitor/cli @capacitor/android
npx cap init "RBMK Reactor Simulator" io.github.tjdcavey.rbmk --web-dir out
npx cap add android
npm run build && npx cap sync android
npx cap open android      # Run ▶ on an emulator or a USB-connected phone
```

- Add a script: `"android": "next build && cap sync android"`.
- Commit `android/`. It's a normal Android Studio project and later steps edit it.

*Check:* the game opens and plays on the owner's phone.

**A4. Behave like an app** (1–2 days). The code goes in `lib/native/`.
1. **Pause when the app goes to the background.**
   - The tick is a `setInterval` in `hooks/use-game-state.ts`. Android throttles timers in the background, so the reactor would run unevenly.
   - Add `pause()` (sets `isPaused: true`) next to `togglePause`, because a toggle could *un*pause by mistake. Call it from `App.addListener("appStateChange", ({ isActive }) => …)`.
   - On return the game stays paused and the player resumes it. Pausing already silences sound through `audioLive` in `app/game/page.tsx`.
2. **Hardware back button** (`App.addListener("backButton")`):
   - if a modal is open, close it;
   - in a shift, pause and ask "Leave shift?";
   - on the homepage, `App.exitApp()`.
3. **Keep the screen awake** during a shift with `@capacitor-community/keep-awake`. Release it when paused and after the shift ends.
4. **Viewport and edge-to-edge.**
   - Export a Next `viewport` from `app/layout.tsx` with `viewportFit: "cover"`, `maximumScale: 1` and `userScalable: false`.
   - Pad the page with `env(safe-area-inset-*)`. Android 15+ forces edge-to-edge, so content otherwise sits under the status and gesture bars.
   - Set the status bar style with `@capacitor/status-bar`.
5. **Touch polish** (`app/globals.css`, app-only class on `<html>`): `overscroll-behavior: none`, `touch-action: manipulation` (no double-tap zoom), and no long-press callout (`-webkit-touch-callout: none`). The controls already block text selection (bible §10).
6. **Orientation:** set `android:screenOrientation` in `AndroidManifest.xml` once D4 is decided.
7. **Audio checks in the WebView:**
   - sound starts after the first tap;
   - the hum bed loops without a gap;
   - alarms overlap correctly;
   - the volume sliders work;
   - sound stops in the background and during a phone call.
8. **Optional:** haptics (`@capacitor/haptics`) on AZ-5 and on new alarms.

Saves stay in `localStorage`. The Android WebView keeps it until the user clears the app's data, so `@capacitor/preferences` can wait for iOS.

*Check:* send the app to the background mid-shift and come back: it's paused, with the same state. The back button behaves as listed. The screen stays on.

**A5. Branding** (about half a day).
- App icon: a 1024×1024 source, plus adaptive-icon foreground and background layers. Generate every size with `npx @capacitor/assets generate --android`.
- Splash screen (`@capacitor/splash-screen`): dark, with the logo. Hide it once `isLoaded` is true.
- Label and version in `android/app/build.gradle`: `versionCode 1`, `versionName "1.0.0"`. `versionCode` goes up on every upload.

*Check:* the icon looks right on the home screen, with no white flash between the splash screen and the homepage.

**A6. Phone check on real devices** (1–4 days, time-boxed; the main unknown).
- The web game has been checked at 360 and 390 px wide in headless Chrome (no sideways scroll), but touch, especially the rods modal, has **never been tested on a real phone**.
- Play a full Easy shift, a Hard shift and the Safety Test at:
  - a small phone (360×640),
  - a large phone (412×915),
  - a 10" tablet,

  in both orientations. List the problems: tap targets under 48 dp, text you can't read, modals that overflow, sliders that are hard to drag, and the chart recorder and reactivity cards being cramped.
- Decide D4 and lock the orientation.
- Fix the problems with responsive classes in shared components where possible, and upstream them. Where a component needs a phone-only layout, use a small `useIsCompact()` hook rather than forking it.
- **Performance:** test on a cheap or older Android phone. Aim for no visible stutter in the 1 s tick, chart recorder, camera image swaps or audio.

*Check:* the owner plays all three modes on their phone without zooming or mis-taps.

**A7. Testing.**

Automated, before every release build:
- `npx tsc --noEmit -p .`
- `node --run sim:test`
- `npm run build`, then confirm the three routes are in `out/`.

Manual, on a real phone in airplane mode:
- [ ] Cold start: splash screen → homepage, with no blank flash.
- [ ] New game in each mode. Play one shift to a win and one to a failure. Check the end screen and incident report.
- [ ] Every modal opens and closes: rods (including AZ-5), pumps, turbine, sound.
- [ ] Background mid-shift → paused on return, same state.
- [ ] Force-close mid-shift → the save is restored.
- [ ] The back button on every screen does what A4 lists.
- [ ] Every alarm and sound effect plays. The sliders work. Sound mutes in the background.
- [ ] The screen stays on during a shift.
- [ ] The footer link opens the system browser.
- [ ] Fonts appear with no network.

**A8. Release build and signing** (about half a day).
- **Upload key:** create one in Android Studio (Build → Generate Signed Bundle). Keep the keystore and passwords in a password manager **and** an offline backup. **Never commit them.**
- **Play App Signing** (the default): Google holds the app signing key, and a lost upload key can be reset through support.
- **Build** an `.aab` with `./gradlew bundleRelease`.
- **Target API level:** set `targetSdkVersion` to whatever Play currently requires; it goes up every August. Capacitor's template follows it.
- **Optional CI:** a GitHub Actions workflow running A7's automated checks, then `cap sync` and `bundleRelease`, with the keystore in repo secrets.

**A9. Store listing and compliance** (about 1 day of the owner's admin).
- **Listing:**
  - title (30 characters), short description (80), full description (4,000);
  - 512×512 icon and a 1024×500 feature graphic;
  - at least 2 phone screenshots, plus tablet screenshots if D5;
  - category: *Simulation*.
- **Privacy policy URL:** required even when nothing is collected. A one-page "this app collects no data" on GitHub Pages is enough.
- **Data safety form:** no data collected or shared. This depends on A2 step 3.
- **Content rating:** the IARC questionnaire. There's no violence or gambling, so expect a low rating.
- **Target audience:** 13+ or 16+, not children. That keeps the app out of the Families policy.
- **Ads:** declare "no ads".
- **Disclaimer:** add one line to the description: "A game inspired by the RBMK reactor design. Not a training tool, and not affiliated with any organisation."

**A10. Testing tracks to production** (at least 2 weeks, mostly waiting).
1. **Internal testing:** upload the first `.aab` and install it from Play. Read the **pre-launch report**, where Google runs the app on real devices and flags crashes and accessibility problems.
2. **Closed testing:** 12+ testers opted in for 14 days in a row. Ship fixes as new `versionCode`s; updates don't restart the 14 days.
3. **Apply for production access** in Play Console (questions about the test). Review takes a few days.
4. **Production:** a staged rollout at about 20%. Check Android vitals (crash and ANR rates), then go to 100%.

### 22.4 Timeline

| Step | Working time | Calendar time |
|---|---|---|
| Accounts (§22.2) | 1 hr | several days for verification |
| A1–A3 repo, export, first build | about 1 day | |
| A4 app behaviour | 1–2 days | |
| A5 branding | about half a day | |
| A6 phone check and fixes | 1–4 days (the main unknown) | |
| A7–A9 testing, signing, listing | 2–3 days | |
| A10 testing tracks | a few hours | **14+ days** waiting |
| **Total** | **about 1.5–2 weeks** | **about 4–5 weeks end to end** |

### 22.5 After launch

- **Updates:** merge from `upstream`, run A7, increase `versionCode`, release through internal testing, then production.
- **Monitoring:** watch Play vitals, reviews and installs for 1–2 months.

### 22.6 Re-check before starting (these change over time)

- Google's closed-testing rule (12 testers / 14 days).
- The target API level Play requires.
- The current stable Capacitor version and its Node, JDK and Android Studio requirements.
- The file names in this plan (`hooks/use-game-state.ts`, `hooks/use-audio-manager.ts`, `app/game/page.tsx`): the web game kept changing after this plan was written.

### 22.7 Questions for the owner

D1–D6 in §22.2. Also: who are the 12+ closed testers?

### 22.8 Decisions made without the owner (please review)

- Capacitor rather than a PWA/TWA (Bubblewrap). A TWA can't reach iOS later, while Capacitor's steps A2–A6 carry over straight to iOS.
- `localStorage` stays for saves on Android (see A4).
- Pausing on background, not running on, because timers in the background are unreliable.

### 22.9 What's done

Nothing yet.

### 22.10 iOS (a future iteration)

Go/no-go after 1–2 months on Play. The owner sets the bar in advance, for example:
- crash-free rate above 99%,
- rating of 4.0 or higher,
- an install count the owner is happy with.

iOS would add:
- a Mac or a cloud build service (e.g. Codemagic, GitHub Actions macOS runners);
- the Apple Developer Program ($99/year);
- `npx cap add ios`;
- saves moved to `@capacitor/preferences`;
- TestFlight, then App Store review. Apple's guideline 4.2 rejects apps that are just a website in a wrapper, so A4's app polish matters there.
