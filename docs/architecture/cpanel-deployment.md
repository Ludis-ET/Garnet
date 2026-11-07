# Garnet Backend: cPanel Deployment & CI/CD Guide (FTP Production Pipeline)

This guide details how to deploy the Garnet API to a shared cPanel hosting environment without Docker, run database migrations automatically on cPanel PostgreSQL, configure environment variables, and automate deployments using GitHub Actions with pure FTP.

---

## 1. Overview & Architecture

```mermaid
flowchart TD
    subgraph Local["Local Machine (Zero CI Waste)"]
        PreCommit["Git Pre-Commit Hook\n(Prettier + ESLint + TypeScript in 3s)"]
        Push["git push origin main"]
    end

    subgraph GitHub["GitHub Actions (.github/workflows/deploy.yml)"]
        BuildAPI["Compile API & Migrations\n(esbuild -> dist/main.mjs, dist/migrate.mjs)"]
        DeployBundle["Isolate Production Dependencies\n(pnpm deploy --legacy --prod)"]
        RestartSignal["Touch Passenger Signal\n(tmp/restart.txt)"]
        FTPDeploy["FTP-Deploy-Action\n(Syncs deploy-bundle to server ./)"]
    end

    subgraph cPanel["cPanel Shared Hosting (No SSH / No Docker)"]
        FTP["FTP Server (Port 21)"]
        Passenger["Phusion Passenger (Setup Node.js App)\n(Loads app.js on startup)"]
        AutoMigrate["Auto-Run Migrations\n(app.js executes dist/migrate.mjs)"]
        PG[("cPanel PostgreSQL Database\n(127.0.0.1:5432)")]
        Mail["cPanel Exim Mail Server\n(mail.yourdomain.com:465)"]
    end

    subgraph External["External Cloud Storage & Auth"]
        R2[("Cloudflare R2 Bucket\n(Media Photos / Audio)")]
        Google["Google Cloud OAuth\n(Sign-in with Google)"]
    end

    subgraph Mobile["Mobile App (Expo Client / APK)"]
        App["Garnet Client\n(EXPO_PUBLIC_API_URL=https://api.yourdomain.com)"]
    end

    PreCommit --> Push
    Push --> BuildAPI --> DeployBundle --> RestartSignal --> FTPDeploy
    FTPDeploy -->|FTP Sync| FTP
    FTP --> Passenger
    Passenger --> AutoMigrate --> PG
    Passenger --> Mail
    Passenger --> R2
    Passenger --> Google
    App -->|HTTPS API Requests| Passenger
    App -->|Direct Media Uploads| R2
```

---

## 2. cPanel Configuration Checklist

### Step A: Setup Node.js App in cPanel

1. In your cPanel dashboard, search for and open **Setup Node.js App** (Phusion Passenger).
2. Click **Create Application**:
   - **Node.js version**: Select **20.x** or **22.x** (Node 22 recommended).
   - **Application mode**: `Production`
   - **Application root**: Path where your FTP files land (e.g. `garnet-api` or your target directory).
   - **Application URL**: Your domain or subdomain (e.g. `api.yourdomain.com`).
   - **Application startup file**: `app.js`
3. Click **Create**.

### Step B: Create PostgreSQL Database & User

1. In cPanel, open **PostgreSQL Database Wizard** (or **PostgreSQL Databases**).
2. Create your database: e.g. `youruser_garnet`.
3. Create your user: e.g. `youruser_garnetuser` with a strong password.
4. Assign the user to the database and grant **ALL PRIVILEGES**.
5. Your database connection string is:
   ```text
   postgres://youruser_garnetuser:YourStrongPassword@127.0.0.1:5432/youruser_garnet
   ```

### Step C: Create an FTP Account

1. In cPanel, navigate to **FTP Accounts**.
2. Create an account with a strong password.
3. **Directory**: Set to the exact folder where your Node.js application is located (e.g., `garnet-api` or `public_html/api`).
   _(Because the GitHub Actions workflow deploys to `./`, all files sync directly into this directory)._

---

## 3. Server Environment Configuration (`.env`)

In cPanel **File Manager**, create or edit `.env` inside your application directory. The FTP deployment uses `dangerous-clean-slate: false`, so your server `.env` is **never overwritten or deleted** by CI/CD updates.

```env
# ==============================================================================
# GARNET BACKEND PRODUCTION CONFIGURATION (cPanel)
# ==============================================================================

# 1. Database (cPanel PostgreSQL)
# GARNET_DISABLE_ROLE_SWITCH=true enables shared hosting compatibility
GARNET_API_DATABASE_URL=postgres://youruser_garnetuser:YourStrongPassword@127.0.0.1:5432/youruser_garnet
GARNET_DATABASE_OWNER_URL=postgres://youruser_garnetuser:YourStrongPassword@127.0.0.1:5432/youruser_garnet
GARNET_DISABLE_ROLE_SWITCH=true

# 2. Server & Host
GARNET_API_HOST=0.0.0.0
GARNET_API_PORT=3000
GARNET_API_LOG_LEVEL=info

# 3. Authentication & Sessions
# Generate a secret: node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
GARNET_AUTH_SECRET=replace_with_a_random_32_character_string
GARNET_AUTH_BASE_URL=https://api.yourdomain.com

# 4. Security & Account Policies
GARNET_PASSWORD_MIN_LENGTH=15
GARNET_SESSION_DAYS=30
GARNET_SESSION_MAX_DAYS=90
GARNET_SESSION_REFRESH_HOURS=24
GARNET_AUTH_RATE_WINDOW_SECONDS=60
GARNET_AUTH_RATE_MAX=10
GARNET_VERIFY_TOKEN_MINUTES=1440
GARNET_RESET_TOKEN_MINUTES=30
GARNET_INVITE_TTL_HOURS=24

# 5. Email (cPanel Mail Account)
GARNET_SMTP_URL=smtps://hello%40yourdomain.com:YourEmailPassword@mail.yourdomain.com:465
GARNET_MAIL_FROM=Garnet <hello@yourdomain.com>

# 6. Media Storage (Cloudflare R2 or AWS S3)
GARNET_MEDIA_STORAGE=s3
GARNET_S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
GARNET_S3_REGION=auto
GARNET_S3_ACCESS_KEY_ID=your-r2-or-s3-access-key-id
GARNET_S3_SECRET_ACCESS_KEY=your-r2-or-s3-secret-access-key
GARNET_MEDIA_BUCKET=garnet-media

# 7. Google OAuth Sign-In (Optional)
GARNET_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GARNET_GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## 4. GitHub Actions CI/CD Pipeline

The single, lean deployment workflow is located in [`.github/workflows/deploy.yml`](file:///.github/workflows/deploy.yml).

### GitHub Repository Secrets

Configure these in GitHub: **Settings &rarr; Secrets and variables &rarr; Actions**:

| Secret Name         | Description                                      | Example                                 |
| :------------------ | :----------------------------------------------- | :-------------------------------------- |
| `SERVER`            | Server IP or FTP domain _(use IP to bypass DNS)_ | `198.54.115.10` or `ftp.yourdomain.com` |
| `USERNAME`          | Your FTP account username                        | `garnet@yourdomain.com`                 |
| `PASSWORD`          | Your FTP account password                        | `YourFtpPassword123!`                   |
| `PORT` _(optional)_ | FTP port (defaults to `21`)                      | `21`                                    |

### Pipeline Workflow:

1. **Pre-Commit Verification (Local)**:
   - Git automatically checks code formatting (Prettier), linting (ESLint), and TypeScript types before every commit via `scripts/pre-commit.mjs`.
2. **Push to `main`**:
   - Triggers `.github/workflows/deploy.yml`.
   - Compiles standalone production API artifacts and migration runner.
   - Packages isolated production `node_modules`.
   - Writes `tmp/restart.txt`.
   - Connects via FTP and delta-syncs files to `./` on cPanel in ~2 minutes.
3. **Automatic Startup Migrations**:
   - When Phusion Passenger reloads `app.js`, `app.js` runs `dist/migrate.mjs` against PostgreSQL before opening HTTP connections.

---

## 5. Connecting the Mobile App

1. In `apps/mobile/.env`:
   ```env
   EXPO_PUBLIC_API_URL=https://api.yourdomain.com
   EXPO_PUBLIC_API_AREAS=all
   ```
2. Build the Android APK:
   ```sh
   pnpm --filter @garnet/mobile apk -- --install
   ```
3. Your mobile app is now connected to your live cPanel backend.
