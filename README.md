# Credit Card Tracker

A browser-based credit card balance and payoff planner.

## Features

- Track multiple cards with balance, APR, limit, minimum payment and planned monthly payment.
- See total balance, utilisation, monthly payments, payoff date and interest forecast.
- Compare avalanche and snowball payoff strategies.
- Use the what-if planner for extra monthly payments and one-off payments.
- Track monthly bills and tick shared bills that Rachel goes halves on.
- See Rachel's monthly total, your bill share and possible extra money for card payments.
- View a payoff chart and the next 12 months of projected balances.
- Export and import your tracker data as JSON.
- Data syncs to Supabase and also keeps a local browser backup with `localStorage`.

## Run

Open `index.html` in a browser. No build step is required.

The app uses CDN-hosted Chart.js, Supabase JS and Lucide icons, so an internet connection is needed on first load.

## Supabase setup

This app uses the same Supabase project URL and publishable key as the trading journal app. Run `schema.sql` in the Supabase SQL editor to create the `credit_card_tracker_state` table before expecting online sync to work.

If Supabase is unavailable or the table has not been created yet, the app continues working from the local browser backup.
