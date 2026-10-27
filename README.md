# Serendib Portfolio

A personal Colombo Stock Exchange portfolio manager in Sri Lankan rupees. GitHub Pages hosts the static website; Firebase Authentication and Firestore provide the private login and cloud portfolio.

## Access

Open https://gihan22.github.io/serendib-portfolio/. Use the owner account email and select **Set up or reset your password** to choose a password through Firebase's email link. There is no public registration form. Database access is restricted to the configured owner UID by deployed Firestore rules. The Firebase web configuration and UID are public identifiers, not passwords or administrative credentials.

The app includes opening balances, trades with fees, weighted average cost, realised and unrealised gains, dividends, a watchlist, dated CSE/manual prices, sector allocation, private research notes, transaction CSV export and full JSON backup/restore. It does not place trades. Splits and other corporate actions require manual adjustments.

## Market data and research

The Pages workflow fetches public market-wide CSE data on deployment and weekdays at 10:30 UTC (16:00 Sri Lanka). GitHub may delay schedules. Sign-in and the research refresh button load the latest published snapshot; this is not a real-time streaming feed. Source outages preserve the last dated snapshot. Individual quotes show their last-traded date. No holdings or account data are sent to the collector.

The collector uses the public CSE trade summary, company summary and financial-report endpoints used by the CSE website. They may change or become unavailable. The public feed contains all available securities, not a list of the owner's holdings. Fundamental notes and their metrics are reviewed, dated private content; new filing timestamps flag reviews that need updating. Filings and market measures refresh automatically, but written analysis does not.

Technical analysis uses reported price ranges and collected daily observations. SMA20/SMA50 and Wilder RSI14 are unavailable until enough observations exist. The observations are unadjusted and do not provide a corporate-action-adjusted historical series. Opening balances preserve supplied total costs; import dates are not represented as purchase dates. Estimated selling fees are separate from gross gains.

## Data

The private document `portfolios/{ownerUID}` contains a bounded serialized portfolio, an increasing revision and a server timestamp. Transaction revision checks reject stale saves instead of overwriting another device's changes. The screen confirms completed saves with “Saved to Firebase”. Failed changes are downloadable as a backup. Restore/reset replaces the cloud portfolio on all devices after confirmation. Export backups regularly.

Firebase is configured in a separate project with a Standard database in Mumbai (`asia-south1`). Billing is disabled at setup; usage remains subject to Firebase quotas. No actual holdings, passwords, service-account keys or user tokens belong in this repository. Security Rules are a prototype and should be reviewed before wider sharing.

## Development and deployment

The website is in `dist/` and uses Firebase modular SDK browser imports. Run `node preview.cjs` for a local preview. No production build is needed. GitHub Actions deploys `dist/` to Pages on pushes to `main`.

Use `npm ci` then `npm test` for portfolio and save-recovery checks, and `node tests/research.cjs` for opening-balance and indicator checks. Use `npm run test:rules` (Java required) for Firebase emulator allow/deny checks. The tests do not write to the live database.

After changing Firebase settings or rules, use an authorized Firebase CLI session and deploy the configuration separately:

```
npx -y firebase-tools@latest deploy --only firestore:rules,auth --project serendib-portfolio-gihan
```

GitHub Pages deployments do not change Firebase rules automatically.
