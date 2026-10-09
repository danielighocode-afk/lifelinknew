# LIFELINK — linked web app (front-end prototype)

Run it: open a terminal in this folder and run `python3 -m http.server 8000`, then visit http://localhost:8000
(Opening index.html directly also works in Chrome, but some browsers isolate storage per file.)

Starting accounts
- Admin: admin@lifelink.ng / admin12345
- Customers and providers start empty. Create them from the sign-in page.

Flows
- Customer: index -> signin (sign up) -> personalize -> dashboard -> request -> compare-quotes -> payment -> booking -> tracking -> review (dispute / trust-safety / settings from there)
- Provider: index -> signin (sign up as professional) -> provider-onboarding -> provider-verification -> provider-dashboard -> provider-request (send quote)
- Admin: signin -> admin
- The round-trip still works for newly created accounts: a customer's request appears in the provider's Jobs, and the provider's quote shows up on the customer's compare page.

Notes
- All data is stored in the browser (localStorage). Passwords are only lightly hashed. A real launch needs a backend, real auth, and Paystack/Termii integration.
- The repository now starts from a zero-data state for customers, providers, reviews, and dashboard analytics.
- Messages, Wallet, Earnings, Customers and most admin sections show a "coming soon" notice (no designs yet).
- The ☰ button (bottom-left) lists pages, signs out, and resets local data.
