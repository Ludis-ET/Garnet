# Connect Android push to Firebase

Firebase is used for delivery only (P-101): no analytics, database or sign-in. It is free on the Spark plan and needs no card. You need a Google account. About 10 minutes.

## 1. Create the Firebase project

1. Open <https://console.firebase.google.com> and sign in.
2. **Create a project.** Name it `Garnet`.
3. When asked about **Google Analytics, turn it off** (Garnet allows no analytics, AGENTS.md §5).
4. Wait for "Your new project is ready", then **Continue**.

## 2. Add the Android app

1. On the project's home page, click the **Android** icon ("Add app").
2. **Android package name:** `app.garnet.prototype`. It must match exactly (it's `android.package` in `apps/mobile/app.json`).
3. **App nickname:** `Garnet`. Leave **SHA-1** empty (push doesn't need it).
4. Click **Register app**.
5. **Download `google-services.json`.**
6. Skip the remaining SDK steps (Expo does them): click **Next** until **Continue to console**.

## 3. Put the file in the app

1. Copy `google-services.json` to `apps/mobile/google-services.json` (next to `app.json`).
2. It is git-ignored: it stays on your computer, and the build picks it up (`app.config.js`).
3. **Rebuild the APK.** Push is native, so a new build is needed (the same one the keyboard and photo changes need).

## 4. Give the server permission to send

1. In the Firebase console: **⚙ Project settings → Service accounts**.
2. Click **Generate new private key**, then **Generate key**. A file like `garnet-xxxx-firebase-adminsdk-xxxxx.json` downloads.
3. **This file is a password.** Never commit it, email it or paste it into chat.
4. On the server (cPanel → File Manager), upload it **outside `public_html`**, for example to `/home/<your user>/secrets/fcm.json`.
5. Add this line to the API's `.env` on the server:

   ```
   GARNET_FCM_SERVICE_ACCOUNT_FILE=/home/<your user>/secrets/fcm.json
   ```

   Or, if you can't upload files outside the app folder, base64-encode the file and use `GARNET_FCM_SERVICE_ACCOUNT_JSON=<base64>` instead.

6. Restart the app (cPanel → Setup Node.js App → **Restart**, or touch `tmp/restart.txt`).

## 5. Check it works

1. Make sure **Cloud Messaging API (V1)** shows **Enabled** under ⚙ Project settings → **Cloud Messaging**. It is on by default for new projects; ignore the "Legacy" one.
2. On the phone, install the new APK, sign in, and allow notifications (setup's "Stay close" step, or Android settings → Apps → Garnet → Notifications).
3. Have your partner send a message or a thought while Garnet is **closed** on your phone. A "Garnet" notification should arrive. Tapping it opens the right screen.

### If nothing arrives

| Sign                                                   | Likely cause                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Nothing at all, even on the partner's phone            | The APK was built without `google-services.json`: rebuild after step 3.                     |
| The server's log says `fcm_auth_400` or `fcm_auth_401` | Wrong or broken service-account file, or the path in `.env` is wrong.                       |
| `SENDER_ID_MISMATCH`                                   | The app file and the server key come from different Firebase projects.                      |
| Works with the app open, not closed                    | Battery saver is killing Garnet: Android settings → Apps → Garnet → Battery → Unrestricted. |
| A Huawei phone without Google services                 | FCM can't reach it. Realtime still works while Garnet is open.                              |

## iPhone

Not through Firebase. When the Apple Developer membership exists, the server will talk to Apple's push service (APNs) directly with a `.p8` key from developer.apple.com → Keys.
