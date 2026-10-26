# Serendib Portfolio

A personal Colombo Stock Exchange portfolio manager in Sri Lankan rupees. GitHub Pages hosts the static website; Firebase Authentication and Firestore provide the private login and cloud portfolio.

## Access

Open https://gihan22.github.io/serendib-portfolio/. Use the owner account email and select **Set up or reset your password** to choose a password through Firebase's email link. There is no public registration form. Database access is restricted to the configured owner UID by deployed Firestore rules. The Firebase web configuration and UID are public identifiers, not passwords or administrative credentials.

The app includes trades with fees, weighted average cost, realised and unrealised gains, dividends, a watchlist, manual dated prices, sector allocation, transaction CSV export and full JSON backup/restore. It does not place trades or fetch live prices. Splits and other corporate actions require manual adjustments.

## Data

The private document `portfolios/{ownerUID}` contains a bounded serialized portfolio, an increasing revision and a server timestamp. Transaction revision checks reject stale saves instead of overwriting another device's changes. The screen confirms completed saves with “Saved to Firebase”. Failed changes are downloadable as a backup. Restore/reset replaces the cloud portfolio on all devices after confirmation. Export backups regularly.

Firebase is configured in a separate project with a Standard database in Mumbai (`asia-south1`). Billing is disabled at setup; usage remains subject to Firebase quotas. No actual holdings, passwords, service-account keys or user tokens belong in this repository. Security Rules are a prototype and should be reviewed before wider sharing.

## Development and deployment

The website is in `dist/` and uses Firebase modular SDK browser imports. Run `node preview.cjs` for a local preview. No production build is needed. GitHub Actions deploys `dist/` to Pages on pushes to `main`.

Use `npm ci` then `npm test` for portfolio and save-recovery checks. Use `npm run test:rules` (Java required) for Firebase emulator allow/deny checks. The tests do not write to the live database.

After changing Firebase settings or rules, use an authorized Firebase CLI session and deploy the configuration separately:

```
npx -y firebase-tools@latest deploy --only firestore:rules,auth --project serendib-portfolio-gihan
```

GitHub Pages deployments do not change Firebase rules automatically.
