# Sawa

Sawa books a reserved seat on a licensed shared vehicle for UAE commute corridors. It is a demonstration of the product in the November 2026 planning brief: Sharjah–Dubai, Ajman–Dubai, and Dubai–Abu Dhabi.

It is not a marketplace where a private-car owner charges strangers for a lift. The database has no supply type for a private car. Running this repository does not authorize passenger transport. A live service still needs written comfort from Dubai RTA, Abu Dhabi’s Integrated Transport Centre, and Sharjah RTA, plus a licensed operator.

## Screens

![English home](docs/screenshots/home-en.png)

![Arabic home, right to left](docs/screenshots/home-ar.png)

![Sharjah–Dubai on the OpenStreetMap road network](docs/screenshots/corridor-map.png)

![Live trip, with the van kept on the road when the phone is off the corridor](docs/screenshots/live-trip.png)

![Driver shift](docs/screenshots/driver-shift.png)

![Staff planning board](docs/screenshots/staff-plan.png)

## Run it

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open http://127.0.0.1:3000/en

The dev server listens on all interfaces. On a phone paired with wireless ADB:

```bash
adb reverse tcp:3000 tcp:3000
adb shell am start -a android.intent.action.VIEW -d http://127.0.0.1:3000/en
```

## Demo accounts

| Who | Sign in | Code |
| --- | --- | --- |
| Rider Layla Hassan | +971 50 100 0001 at /en/ride/login | 123456 |
| Driver Omar Al Hashimi | +971 50 100 0002 at /en/drive/login | 123456 |
| Staff owner | ops@sawa.test at /en/ops/login | sawa-demo |
| Finance | finance@sawa.test | sawa-demo |

Other seeded drivers: Fatima (+971 50 100 0003, ladies-licensed), Imran (documents incomplete), Sami (suspended, insurance expired).

Card checkout accepts only `4242 4242 4242 4242`. The app stores the last four digits and a fake processor reference. No SMS provider and no UAE acquirer are connected. The code `123456` is the stand-in for Unifonic or Twilio.

## What the first version includes

- Marketing site in English and Arabic (real right-to-left layout), with FAQ schema, sitemap, robots, Open Graph, and `/llms.txt`
- Rider flow: OTP, profile, corridor timetable, single seat or monthly pass, sandbox payment, boarding PIN, live trip, share link, SOS, tickets, cancellation rule, account deletion, large type
- Driver flow: enrolled login, document upload, shift start only when documents are valid, manifest, PIN boarding, no-show, delay, incident, background-location disclosure. The map draws the driving route from OpenStreetMap roads. A phone GPS fix on the corridor moves the van and the ETA. A fix far from the corridor is stored, and the van stays on the road instead of jumping across countries. “Move along the road” steps the van about 3 km along that driving route.
- Staff CRM: roles, enrollment, document review, planning board with hard filters and weighted scores, confirm or override with an audit reason, live runs, substitution, invoices, refunds, payouts, tickets, CSV import, CSV export, employer view, audit log

Matching hard-fails an unapproved driver, expired documents, a missing operator licence, a driver already on another corridor that shift, too few seats, a wheelchair need the vehicle cannot meet, a women-only request without a ladies-licensed driver, a ladies vehicle on a mixed group, and a driving detour over 12 minutes. Detour minutes come from the road route, not a fixed penalty. A second SOS on the same trip reuses the open alert. Weights: distance 20, detour 20, overlap 15, seat fit 15, schedule 15, rating 5, vehicle 5, women-only fit 5.

## Store readiness

This build is not submitted to Google Play or the App Store. When a UAE entity is ready:

- Privacy policy and terms are real URLs: `/en/privacy` and `/en/terms`, linked inside the app.
- Account deletion is in rider settings, not email-only.
- Background location copy is on the driver home screen and says location continues during a shift.
- Ride fares are real-world transport. Do not put them through Apple In-App Purchase (Guideline 3.1.3(e)).
- Reviewers need the demo rider, driver, and staff accounts above, plus a note that the fleet in the database is fictional.

## Production path

Keep the Prisma schema. Move `DATABASE_URL` to Postgres with PostGIS in AWS `me-central-1` or Azure UAE. Swap the demo OTP for a UAE sender ID, and the test card for a local acquirer (Checkout.com, Network International, Telr, or PayTabs — confirm onboarding). Replace the haversine adapter with Google Routes or a self-hosted OSRM/Valhalla instance before promising peak ETAs on E11 and E311. UAE Pass stays a later identity link; do not block the product on it.

## Now in this build

- Shared rides on the same road, day, and time join one open van of 4. The listed seat price falls as seats fill, until someone agrees a price.
- A passenger can share a referral code. Both wallets receive AED 20 when the new passenger's first ride is confirmed.
- The wallet stores that balance. Adding money uses the test card `4242…`. A confirmed fare can be paid from the balance.
- Two passengers on the same van can split one fare. The other person accepts or declines.
- Call stays inside the ride. Phone numbers are not shown. Both people need the ride open, and a microphone. This is not a carrier masked-number service.
- Staff can prepare a WhatsApp message for passengers who opted in. Each send opens WhatsApp. It is not marked delivered.
- `sawa-store.apk` is a separate Android application id (`dev.sawa.store`) so it installs beside the test app. It is not listed on Google Play.

## Two phones, 16 November 2026

Infinix X697 signed in as the driver (Omar, Sharjah–Dubai, already on shift). Pixel 7a stayed the passenger and booked a shared seat: Rolla Square to Al Fahidi, morning 7:00–8:10, one day, 103 AED. Both phones ran the installed app against https://sawa.induswebagency.com. The full set of step frames is in `docs/walkthrough`. Two frames of the driver queue are kept only on the machine that ran the test, because they show the passenger's uploaded profile photo.

The passenger asked for the seat. The open van showed 1 of 4, and the driver agreed 103 AED.

![Passenger home](docs/walkthrough/08-pixel-home.png)

![Sharjah–Dubai quote, 103 AED to share the van](docs/walkthrough/12-pixel-sharjah.png)

![Waiting, 1 of 4 seats](docs/walkthrough/14-pixel-request.png)

![Driver home, on shift, Sharjah–Dubai](docs/walkthrough/07-infinix-driver-home.png)

![Driver agrees 103 AED](docs/walkthrough/19-infinix-agree.png)

The driver sent “On my way” and confirmed the seat. The passenger answered “See you at Rolla” on that same request. Those two lines stayed on the request. The ride chat opened after confirm is a different thread and was empty.

![Confirm, with the driver's message](docs/walkthrough/24-infinix-confirm.png)

![Passenger sees the message, and the seat count has dropped to 0 of 4](docs/walkthrough/26-pixel-after-confirm.png)

![Ride chat after confirm, with none of the earlier messages](docs/walkthrough/58-pixel-chat.png)

The home card showed pickup number 1643 and plate D 44021. The driver entered 1643 and the app recorded boarding. The phone was not on the corridor, so the van stayed on the mapped route.

![Pickup number on the passenger home](docs/walkthrough/32-pixel-reloaded.png)

![Boarding recorded](docs/walkthrough/38-infinix-boarded.png)

Both phones opened the in-app call. No phone number was shown. Each side reached “The call is open.” When the driver hung up, his screen returned to Call, and the passenger stayed on “The call is open” until he hung up himself.

![Driver, call open](docs/walkthrough/45-infinix-answered.png)

![Passenger, call open](docs/walkthrough/46-pixel-in-call.png)

Paying 103 AED from the wallet failed honestly: the balance was 0. “Everyone is dropped off” finished the run and ended the shift. The other three seats on that van were still waiting. History then counted all four fares, including a 0 AED seat, as 303 AED. The passenger rated the ride 5 with the note “Smooth ride.”

![Wallet does not cover the fare](docs/walkthrough/51-pixel-wallet.png)

![Finished van in driver history](docs/walkthrough/53-infinix-dropped.png)

![Passenger rated 5 out of 5](docs/walkthrough/57-pixel-rated.png)

One load of the chat URL failed in the WebView with `net::ERR_NAME_NOT_RESOLVED`. Opening the app again reached the ride. The back key can also leave the app entirely.

![WebView error, with no way back inside the app](docs/walkthrough/31-pixel-sawa.png)

## Licence

All rights reserved. Demonstration software. Not legal advice.
