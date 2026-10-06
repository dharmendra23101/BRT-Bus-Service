# BRT — Bus Rapid Transit Platform

**A transit platform for the Raipur ↔ Naya Raipur BRTS corridor.** Plan a journey against the
published timetable, check the official fare between any two stops, book a ticket, and follow
buses that drivers are actively sharing — in English or Hindi.

[![CI](https://github.com/Mukund934/BRT-Bus-Service-3/actions/workflows/ci.yml/badge.svg)](https://github.com/Mukund934/BRT-Bus-Service-3/actions/workflows/ci.yml)
![Tests](https://img.shields.io/badge/tests-1359%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/lines-97.7%25-brightgreen)
![Languages](https://img.shields.io/badge/languages-English%20%7C%20%E0%A4%B9%E0%A4%BF%E0%A4%A8%E0%A5%8D%E0%A4%A6%E0%A5%80-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)

**Live:** https://bus-service-lyart.vercel.app/

![Home](docs/screenshots/desktop/home.jpg)

---

## The problem

Riders on this corridor had no single place to answer three ordinary questions: **when does my
bus leave, what will it cost, and where is it now.** The timetable and the fare chart are
published as documents. Live positions were not published at all.

This turns those documents into something usable while standing at a stop — and refuses to
invent the parts that are not published.

> **The rule the whole project runs on:** where data does not exist, the interface says so.
> No estimated arrival times, no invented coordinates, no simulated payment presented as a real
> one. Every number a passenger sees is traceable to a published source or to the app's own
> clock.

---

## Passenger experience

### Timetable

Every published departure for all eight numbered workings, in both directions, with the next
bus called out and the grid it came from named and dated.

![Timetable](docs/screenshots/desktop/timetable.png)

### Journey planner

Two stops gives departures from the published timetable and the price from the official fare
chart. Weekday and weekend services differ and are handled separately.

![Journey planner](docs/screenshots/desktop/plan-journey.png)

### Journeys that need a change

**68 of the 380 stop pairs on this corridor are served by no single bus.** The planner used to
say "no scheduled service" for all of them. It now shows the change — both legs, their routes,
where to get off and how long the wait is.

![One-change journey](docs/screenshots/desktop/plan-one-change.png)

The wait is the timetable's arithmetic and nothing more: no allowance is made for walking
between platforms or for a bus running late, because the timetable does not say how long
either takes. A change is also two tickets, so the page says it cannot be booked in one go.

### Fares

Prices come from the official BRTS fare chart, never from distance measured on a map. A pair
the chart does not price is reported as unavailable rather than estimated.

![Fares](docs/screenshots/desktop/fares.png)

### Network

A connection diagram rather than a map — which routes call at which stops and in what order.
Distances and directions on it mean nothing, and it says so.

![Route network with the simulated fleet](docs/screenshots/desktop/route-network.png)

> The vehicles above come from the **development fleet simulator**, and the interface labels
> them: *"Showing 12 simulated buses. These are not real vehicles and no bus is reporting
> them."* Nothing simulated is ever presented as operator data.

### Nearby places

Destinations across Nava Raipur with the nearest stop for each.

![Nearby places](docs/screenshots/desktop/nearby-places.png)

Each place carries its own provenance, and the interesting case is a bad one. The operator
publishes the same coordinate for this university and for a second, different institution:

![Place detail with a disputed coordinate](docs/screenshots/desktop/place-detail.jpg)

> *"We do not show this place on a map. The operator publishes this exact point for a second,
> different institution. At most one can be right, so neither is shown as located."*

A conflicting coordinate is **labelled rather than quietly corrected**, alongside the source it
came from and the date it was last checked.

### Search

One search across stops, routes and places. Only names the corridor actually publishes are
searched, and nothing is guessed at.

![Search](docs/screenshots/desktop/search.png)

### Live tracking

![Live map](docs/screenshots/desktop/live-map.jpg)

This is the map as it truthfully stands today: **"Live tracking is unavailable right now."**
Positions need the Realtime Database rules deployed and a driver on shift sharing one, and
neither is true of the hosted project yet. The app says so rather than showing a stale bus or
an invented one.

When positions do arrive, each vehicle carries one of five reporting states, so "stopped
reporting" is distinguishable from "never started" — and the map never claims which stop a bus
reaches next, because that needs surveyed stop positions the corridor does not have.

### Help and provenance

`/help` answers what a passenger actually asks, with **every figure read from the domain**
rather than written out, so the page cannot drift from the code.

![Help](docs/screenshots/desktop/help.png)

`/about` separates what the operator publishes from what this project counts, and attributes
each figure to the document and date it was read from.

![About, operator facts](docs/screenshots/desktop/about-operator-facts.png)

### Accounts

![Sign in](docs/screenshots/desktop/sign-in.png)

Email and Google sign-in. Password recovery reports the same outcome whether or not an account
exists, so the form cannot be used to discover registered addresses — and every credential
failure collapses to one message, in every language, for the same reason.

---

## हिन्दी — the interface in Hindi

**The whole interface** is available in Hindi: every page, every dialog, every error, and the
live-region announcements a screen reader hears.

| | |
|---|---|
| ![Hindi home](docs/screenshots/desktop/hindi-home.jpg) | ![Hindi timetable](docs/screenshots/desktop/hindi-timetable.png) |
| ![Hindi one-change journey](docs/screenshots/desktop/hindi-plan-one-change.png) | ![Hindi help](docs/screenshots/desktop/hindi-help.png) |

Look at the timetable above: the chrome, the day switcher and the next-bus card are Hindi,
while **the stop names and times are exactly as the operator publishes them.** That is the
rule, not an oversight — official Devanagari forms of stop and route names are the operator's
to supply, and a machine transliteration reads as wrong to somebody who lives on the corridor.

The transactional surfaces are translated too, which is the harder half — the words a
passenger meets when something goes wrong.

![Hindi sign in](docs/screenshots/desktop/hindi-sign-in.png)

Those validation messages do not live in the screen. Ten domain registries report **which**
rule failed and leave the wording to whatever is rendering, so a module with no idea what
language anybody reads in no longer picks their words.

`<html lang>` follows the words actually on screen rather than the language requested, because
English read aloud by a Hindi synthesiser is unusable rather than merely wrong.

> ⚠️ **The Hindi has not been reviewed by a native speaker.** It uses the plain civic register
> Indian transit signage uses and should be read by somebody from Raipur before it reaches
> passengers.

---

## Mobile

The same application, not a cut-down one. Installable as a PWA, and a page already visited
opens with no connection.

| Home | Timetable | One-change journey | Nearby places | Sign in |
|---|---|---|---|---|
| ![Mobile home](docs/screenshots/mobile/home.png) | ![Mobile timetable](docs/screenshots/mobile/timetable.png) | ![Mobile one-change](docs/screenshots/mobile/plan-one-change.png) | ![Mobile nearby places](docs/screenshots/mobile/nearby-places.png) | ![Mobile sign in](docs/screenshots/mobile/sign-in.png) |

---

## What is not pictured, and why

Honesty about the gallery matters as much as the gallery.

| Surface | Why there is no screenshot |
|---|---|
| Booking, payment, ticket | Behind authentication against a live Firebase project, with no seeded local account to sign in as. Staging them would mean manufacturing a screenshot |
| Passenger dashboard | Same |
| Driver live-location screen | Same, and it additionally needs an operator-issued vehicle assignment |
| Admin panel and fleet status | Same |
| Contact page | It carries three people's personal emails and phone numbers. It works; it is simply not something to publish as an image |

These surfaces are built and tested — the suite covers booking refusals, payment states, the
ticket lifecycle, the driver publishing path and the admin roster — they are just not
photographable without either credentials or invention.

---

## Fleet and realtime platform

- Driver positions are written to the **Realtime Database, sharded by route**
  (`busLocationsByRoute/{routeId}/{vehicleId}`), so a passenger watching one route is not sent
  the other seven. Measured: an exact **8× reduction** in delivered payloads across eight
  shards.
- Positions are **stamped by the server**, not the device, so a phone with a wrong clock cannot
  backdate where a bus was.
- A driver may publish **only while the operator has assigned them that specific vehicle**, and
  only inside that shift's window. The allowlist and the assignments are unwritable by every
  client, so granting the driver role in the admin panel is deliberately not enough on its own.
- Publishing runs on a **30-second cadence** with a freshness ladder above it; a bus that stops
  reporting is retired rather than left on the map, and the server clears a position if the
  connection drops.
- Positions carry coordinates, a route and an opaque label such as `BUS-4K2P`. **No driver
  name, email or account id is ever published**, and the rules reject any other field.

---

## Open transit data

`npm run gtfs:export` builds a **GTFS static feed** from the same timetable the site renders —
agency, stops, routes, trips, stop times, calendar and `feed_info`.

It **refuses to produce a partial feed.** Missing surveyed stop coordinates, an unnamed
operator or an unnamed feed publisher are each reported as a named gap and the export stops:

```
The feed cannot be published yet. What is missing:

  STOP_COORDINATES
    GTFS requires a latitude and longitude for every stop, and this application's
    coordinates are a generated lattice rather than a survey. Publishing them would
    route passengers to places no bus stops at.
    20 stops need a surveyed position
```

The feed's publisher is a required input distinct from the agency: the operator runs the buses,
this project assembled the file, and crediting them with it would be false.

---

## Architecture

Pages compose components; components ask contexts for state; contexts call services; services
are the only code that talks to Firebase. The domain underneath is pure TypeScript with no
React and no network — **453 of its tests run with no DOM at all**, which is what makes the
rules portable to a native client.

```mermaid
flowchart TD
    UI["Pages and components"] --> CTX["Contexts<br/>Auth · Tickets · Locale"]
    UI --> GUARD["Route guards"]
    CTX --> SVC["Services<br/>ticket · location · user · announcement · audit"]
    GUARD --> PERM["Permission model<br/>can(actor, PERMISSION)"]
    SVC --> DOM["Domain<br/>transit · ticket · fleet · i18n · gtfs · auth"]
    PERM --> DOM
    SVC --> FB["Firebase"]
    FB --> AUTH["Authentication"]
    FB --> FS["Firestore<br/>users · tickets · announcements · audit"]
    FB --> RTDB["Realtime Database<br/>busLocationsByRoute"]
    FS --> RULES["Security rules<br/>the real boundary"]
    RTDB --> RULES
```

| Layer | Choices |
|---|---|
| **Frontend** | React 18, TypeScript (strict), Vite 5, Tailwind, Radix primitives |
| **State** | React Context — session and role, tickets, locale. No state library |
| **Validation** | zod, at every trust boundary |
| **Backend** | Firebase Auth, Cloud Firestore, Realtime Database |
| **i18n** | No library — a typed catalogue per language, loaded on demand |
| **Testing** | Vitest, Testing Library, user-event, jsdom, v8 coverage, Firebase emulator |

**Two decisions worth naming.** Authorization is enforced twice — in the browser for what to
render, and in security rules for what is permitted — and only the second is treated as a
boundary. And ten domain registries that used to return English sentences now return a
`TranslationKey`, so a module that cannot know the reader's language no longer chooses their
words.

---

## Quality

| | |
|---|---|
| Tests | **1,359** across 86 files, plus **121** against the Firebase emulator |
| Coverage | **97.7% lines**, 90.4% branches, 92.6% functions |
| Domain suite | 453 tests, no DOM |
| Typecheck | clean, strict |
| Lint | 0 errors |
| Bundle | 193 kB gzipped initial payload, enforced by a test against the build |

Eight gates run in CI on Node 20 and 22, and `npm run verify` runs the identical sequence
locally. Guards are held honest by mutation: a rule is only trusted once removing it has been
watched to fail a test by name.

---

## Getting started

**Requirements:** Node 20 or 22.

```bash
git clone https://github.com/Mukund934/BRT-Bus-Service-3.git
cd BRT-Bus-Service-3
npm install
cp .env.example .env   # fill from Firebase console → Project settings → SDK setup
npm run dev            # http://localhost:8080
```

> Firebase web configuration is **not secret** — it is compiled into the bundle every visitor
> downloads. What protects the data is the security rules, which run on Google's servers.

| Command | Does |
|---|---|
| `npm run dev` | development server |
| `npm run build` | production build |
| `npm test` | test suite |
| `npm run test:coverage` | suite with coverage |
| `npm run test:domain` | the domain suite, no DOM |
| `npm run test:bundle` | initial payload against its budget |
| `npm run test:rules:db` | Realtime Database rules on the emulator |
| `npm run test:rules:firestore` | Firestore rules on the emulator |
| `npm run gtfs:export` | build a GTFS feed, or report what is missing |
| `npm run verify` | everything CI runs, in the same order |

`test:rules` starts three emulators at once, each a JVM. On a machine short of memory that
fails to **start** rather than failing a test — exit code `3221225786`. The two split commands
run one emulator at a time and cover the same ground.

---

## Current status

| | |
|---|---|
| ✅ **Built and verified** | Timetable, planner including one-change journeys, fares, network, nearby places, search, booking, tickets, alerts, admin, driver publishing, full Hindi interface, GTFS export, offline shell |
| 🧪 **Simulated in development** | Fleet positions, via the dev-only simulator that labels itself in the UI |
| 🎭 **Demonstration only** | Payment. No money moves, the interface says so on the confirm screen, and a ticket bought here is not accepted as a fare |
| ⏳ **Waiting on deployment** | Security rules are written and tested against Firebase's own evaluator but **not deployed**, so live positions cannot flow |
| 🔒 **Waiting on the operator** | Surveyed stop coordinates, official Devanagari stop names, and any real GPS feed |

**Coordinates are synthetic.** `STOP_COORDS` is a generated lattice, not a survey. That is why
buses are not plotted on a real basemap, no ETA is calculated, no nearest-stop search exists,
and the GTFS feed refuses to build. Twenty stops need a real position.

---

## Roadmap

The implementation backlog is empty — everything remaining is waiting on something outside the
repository.

- **20 surveyed stop coordinates** → unlocks the map, ETAs and GTFS publication
- **A native-speaker review of the Hindi** → before it reaches passengers
- **Deploying the security rules** → before live tracking can work at all
- **A LICENSE**, which needs an authorship agreement first
- **A published privacy policy and terms** → deployment-specific legal decisions
- **An error-reporting destination** → scrubbing and rate limiting are built; sending anything
  to a third party is a privacy decision, not a configuration step
- **A device or emulator** for the native mobile build

Deliberately **not** built, each for a stated reason: occupancy and crowding (no honest data
source), route recommendation (two routes — it returns the same answer for every input),
nearest-stop search and historical punctuality (both would need data invented first), and a
statistical ETA confidence band (it would launder a guess as a measurement).

---

## Licence

**No licence file yet.** One cannot be chosen until an authorship agreement exists between the
contributors below, so all rights are currently reserved by default. This is listed as an open
item rather than papered over with a licence nobody agreed to.

---

## Authors

**Mukund Thakur** — [github.com/Mukund934](https://github.com/Mukund934)

**Dharmendra Dhruw** — [github.com/dharmendra23101](https://github.com/dharmendra23101)

Transit data is reproduced from published Tatpar BRTS sources with attribution. This is an
independent, student-built project: it is not an official NRANVP product, it is not affiliated
with the operator, and nothing here is endorsed by them.
