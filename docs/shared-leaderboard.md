# Shared Leaderboard Setup

The game reads and writes shared records through a Google Apps Script Web App. The frontend uses `VITE_LEADERBOARD_API_URL` at build time.

## 1. Add the Apps Script

1. Open the Google Spreadsheet for the leaderboard.
2. Go to **Extensions > Apps Script**.
3. Replace the script contents with `google-apps-script/leaderboard.gs` from this repo.
4. Save the project.

If the script is not bound to the spreadsheet, set a Script Property named `SPREADSHEET_ID` with the spreadsheet ID.

## 2. Deploy the Web App

1. In Apps Script, choose **Deploy > New deployment**.
2. Select **Web app**.
3. Set **Execute as** to **Me**.
4. Set **Who has access** to **Anyone**.
5. Deploy and copy the Web App URL ending in `/exec`.

When you edit the Apps Script later, use **Deploy > Manage deployments > Edit > New version** so the public Web App updates.

## 3. Run Locally

Create `.env.local`:

```bash
VITE_LEADERBOARD_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Then run:

```bash
npm run dev
```

## 4. Deploy On GitHub Pages

Add a repository variable:

```text
VITE_LEADERBOARD_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Location: **GitHub repo > Settings > Secrets and variables > Actions > Variables > New repository variable**.

After adding it, rerun the Pages workflow or push a new commit.
