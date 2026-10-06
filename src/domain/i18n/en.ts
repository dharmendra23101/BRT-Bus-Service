/**
 * The English interface copy, and the keys every other language is typed
 * against.
 *
 * WHAT IS TRANSLATED AND WHAT IS NOT, because the distinction is the whole
 * design and getting it wrong is the failure mode.
 *
 * Translated: the interface. Buttons, navigation, headings, the words that
 * describe a state. Those are ours to write.
 *
 * NOT translated: stop names, route names and headlines, fares, and every
 * fact quoted from the operator. `Ekatm Path` and `DKS Bhawan` have official
 * Devanagari forms that only the operator can supply, and machine
 * transliteration produces strings that look plausible and read as WRONG to
 * somebody who lives there. Rendering published names in their published form
 * in both locales is normal practice and is honest; inventing them is not.
 * See ARCHITECTURE-2.0 SS10.
 *
 * This module is the one catalogue that ships in the entry bundle. It is the
 * fallback every other locale falls back TO, and a fallback that has to be
 * fetched is not a fallback - so English is static and every other language
 * is loaded on demand. See `strings.ts`.
 */

export const en = {
  "nav.home": "Home",
  "nav.plan": "Plan Journey",
  "nav.routes": "Routes",
  "nav.nearby": "Nearby",
  "nav.nearbyPlaces": "Nearby Places",
  "nav.map": "Live Map",
  "nav.timetable": "Timetable",
  "nav.fares": "Fares",
  "nav.contact": "Contact",
  "nav.help": "Help",
  "nav.search": "Search",
  "nav.about": "About",
  "nav.dashboard": "Dashboard",
  "nav.login": "Login",
  "nav.logout": "Log out",
  "nav.menu": "Menu",
  "nav.openMenu": "Open menu",
  "nav.closeMenu": "Close menu",
  "nav.primary": "Primary",

  /*
    The wordmark itself is NOT here. "BRT Bus Service" is a name, and a name
    is not translated - it is allow-listed in the surface guard instead. The
    line under it says something, so it is.
  */
  "brand.tagline": "Your Journey, Our Priority",
  "nav.homeAria": "{brand}, go to home page",
  "footer.quickLinks": "Quick Links",
  "footer.blurb":
    "Your trusted partner for reliable and comfortable bus transportation services.",
  "footer.location": "Location",
  "footer.explore": "Explore",
  "footer.rights": "© BRT Bus Services. All Rights Reserved.",

  "language.label": "Language",
  "language.change": "Change language",

  "state.loading": "Loading…",
  "state.retry": "Try again",
  "state.none": "Nothing to show yet.",
  "state.offline": "You appear to be offline.",

  "action.search": "Search",
  "action.cancel": "Cancel",
  "action.close": "Close",
  "action.back": "Back",

  "skip.toContent": "Skip to main content",

  /*
    Stage 2: the pitch surface. Home first.

    The rotating headlines are marketing copy and ours to write, so they are
    translated rather than transliterated - a Hindi reader should meet a Hindi
    sentence, not English words in Devanagari letters.
  */
  "home.headline.1": "Experience the Best BRT Service",
  "home.headline.2": "Plan Your Commute with Ease",
  "home.headline.3": "Stay Informed About Routes & Fares",
  "home.headline.4": "Welcome to the Bus Tracker",
  "home.strapline": "Your Journey, Our Priority — Fast, Safe, and Reliable",
  "home.search.label": "Search stops, routes and places",
  "home.search.placeholder": "Search a stop, route or place",

  "home.why": "Why travel with us",
  "home.feature.timetable.title": "Published timetable",
  "home.feature.timetable.body":
    "Departures come from the operator's published timetable, shown for today's service.",
  "home.feature.live.title": "Live when shared",
  "home.feature.live.body":
    "A bus appears on the map while its driver is sharing a position. Nothing is predicted.",
  "home.feature.fares.title": "Official fares",
  "home.feature.fares.body":
    "Prices come from the official BRTS fare chart, never from distance measured on a map.",
  "home.feature.plan.title": "One place to plan",
  "home.feature.plan.body":
    "Two stops gives you the departures, the fare and the journey time together.",

  "home.places.title": "Places to explore",
  "home.places.body":
    "Campuses, hospitals, government offices and attractions across Nava Raipur, each with its nearest BRT stop.",
  "home.places.cta": "Explore nearby places",

  "home.next.title": "Still to come today",
  "home.next.finished": "Today's service has finished.",
  "home.next.checkTimetable": "Check the timetable",
  "home.next.forWhenItStarts": "for when it starts again.",

  "fares.title": "Official fare information",
  "fares.intro":
    "Travel confidently using the official BRTS fare structure. Check the fare between any two stops, or read the full chart.",
  "fares.sameStop": "Choose two different stops.",
  "fares.findDepartures": "Find departures and book",
  "fares.noFare":
    "The official chart does not publish a fare for this journey, so it cannot be booked yet.",
  "fares.popular": "Popular journeys",
  "fares.chart": "Official fare chart",
  "fares.openFullScreen": "Open full screen",
  "fares.cannotDisplay": "Your browser cannot display the fare chart inline.",
  "fares.openNewTab": "Open it in a new tab",
  "fares.notes": "Fare information",
  /*
    Our explanation of how the official chart works, not text quoted from it.
    The organisation names stay as published inside the Hindi sentence, which
    is ordinary practice and avoids inventing a Devanagari form for a body
    that has its own.
  */
  "fares.note.1":
    "Fares follow the official Tatpar BRTS fare chart for Nava Raipur Atal Nagar.",
  "fares.note.2":
    "The price depends on the stop you board at and the stop you alight at, not on distance travelled inside the bus.",
  "fares.note.3": "The same fare applies in both directions between any two stops.",
  "fares.note.4":
    "Where the official chart publishes no fare for a pair, the journey cannot be booked.",

  /*
    Placeholders sit inside the sentence rather than around it. "Next from
    HNLU" is "HNLU से अगली बस" - the stop leads in Hindi and trails in English,
    which no amount of concatenation expresses.

    The route NUMBER is published and is substituted, never translated. Only
    the word describing it is ours.
  */
  "timetable.source": "Times as published by {publisher}, read on {date}.",
  "about.timetable.heading": "Where the timetable came from",
  "about.timetable.body":
    "Every departure on this site is read from one document: {title}, published by {publisher} as {document}. It was read on {date}, and nothing has been added to it since.",
  "about.timetable.stale":
    "If the operator has reprinted it, we may be behind. A printed timetable at the stop is the operator's; this one is a copy of theirs, dated.",

  "timetable.title": "Bus timetable",
  "timetable.nextFrom": "Next from {stop}",
  "timetable.scheduled": "Scheduled · Route {route}",
  "timetable.then": "Then",
  "timetable.finished": "Service has finished for today",
  "timetable.resumes": "Resumes {weekday} at",
  "timetable.onThe": "on the {service}.",
  "timetable.showing":
    "Showing the {shown}. Booking stays on today's {today}.",

  "service.weekdays": "Weekdays",
  "service.weekends": "Weekends",
  "timetable.notToday":
    "This service does not run today, so it cannot be booked. The times are listed for reference.",
  "timetable.departs": "Departs",
  "timetable.next": "Next",
  "timetable.serviceDay": "Service day",
  /*
    The caption keeps the operator's service name and the published direction
    as they are; only the frame around them is ours.
  */
  "timetable.caption": "BRT Service - {direction} ({service})",
  "booking.book": "Book",
  "booking.bookTrip": "route {route} departing {time}",
  "service.weekday": "Weekday service",
  "service.weekend": "Weekend service",
  "service.weekday.short": "Weekday",
  "service.weekend.short": "Weekend",
  "timetable.today": " (today)",
  "timetable.towards": "Towards {terminus}",
  "timetable.fromStop": "from {stop} · ",
  "timetable.alsoToday": " · today",
  "timetable.now": "Now {time}",
  "timetable.noneForDirection":
    "No services are published for this direction on the {service}.",

  "plan.officialFare": "Official fare",
  "plan.bookTicket": "Book ticket",
  "plan.todayOnly":
    "Tickets are issued for travel today, so booking is available on today's departures only.",
  "plan.noTrip":
    "No published trip runs from {from} to {to} on the selected day after {time}. Both directions are searched; try an earlier time, or check the timetable for the days this journey runs.",
  "home.busAlt": "A BRT bus on the Raipur to Naya Raipur corridor",
  "home.places.short":
    "Campuses, hospitals, government offices and attractions across Nava Raipur, each with its nearest BRT stop.",
  "fares.from": "From",
  "fares.notPublished": "Not published",
  "fares.download": "Download",
  "fares.chartTitle": "Official Tatpar BRTS fare chart",
  "action.dismiss": "Dismiss",

  "plan.change.title": "No direct bus, but one change gets you there",
  "plan.change.intro":
    "Times are the published timetable's. Nothing is allowed for walking between platforms or for a bus running late, because the timetable does not say how long either takes.",
  "plan.change.route": "Route {route}",
  "plan.change.changeAt": "Change at {stop}",
  "plan.change.wait": "{minutes} min wait",
  "plan.change.noWait": "No wait",
  "plan.change.cannotBook":
    "A journey with a change cannot be booked here. Each leg is a separate ticket, so book them from the timetable.",
  "plan.change.arrives": "Arrives {time}",
  "plan.departureOne": "{count} departure",
  "plan.departureMany": "{count} departures",

  "plan.title": "Plan your journey",
  "plan.intro":
    "Choose where you are boarding and where you are going. Fares come from the official BRTS fare chart.",
  "plan.browseNearby": "Not sure where to go? Browse nearby places",
  "plan.from": "From",
  "plan.to": "To",
  "plan.date": "Travel date",
  "plan.leavingAfter": "Leaving after",
  "plan.search": "Search journeys",
  "plan.swap": "Swap",
  "plan.sameStop": "Choose two different stops.",
  "plan.unresolved":
    "Pick both stops from the suggestions so we can price the journey.",
  "plan.notPublished": "Not published",
  "plan.noFare":
    "The official fare chart does not price this journey, so it cannot be booked yet.",
  "plan.noService": "No scheduled service for this journey",
  "plan.unservedStop":
    "{stop} is on the published network but has no departures yet. Browse the routes to see which stops the timetable covers.",
  "stopField.placeholder": "Type to search stops",

  /*
    Form validation.

    Named by the problem rather than the sentence, because the schema that
    detects the problem should not be choosing the words - it runs in a domain
    that has no idea which language anybody is reading in.
  */

  /*
    Stage 3: the transactional surface, starting where an account does.

    "Continue with Google" keeps the product name in both languages - it names
    a button in somebody else's product, and a translated form of it would be
    a button nobody recognises.
  */

  /*
    Booking. The route NUMBER and the times are published data substituted
    into the sentence, never translated - as are the two stop names in the
    clash warning.
  */
  "booking.title": "Book your ticket",
  "booking.description":
    "Route {route}, departing {time}. Choose where you are boarding and where you are travelling to.",
  "booking.fromStop": "From stop",
  "booking.toStop": "To stop",
  "booking.selectDestination": "Select destination",
  "journey.from": "From",
  "journey.to": "To",
  "journey.departure": "Departure",
  "journey.arrival": "Arrival",
  "booking.fare": "Fare",
  "booking.departed":
    "This bus has already departed. Please choose a later service.",
  "booking.unpriced":
    "No fare is published for this journey yet, so it cannot be booked. Please choose a different destination.",
  "booking.conflict":
    "You already have a ticket from {from} to {to} that overlaps this journey.",
  "booking.proceed": "Proceed to pay",


  /*
    Why a booking was refused, and why a payment failed.

    Keyed off the failure code rather than written at the call site, because
    the same refusal is shown in the payment dialog and listed on /help - and
    those two drifting apart is how a help page starts describing behaviour
    the app no longer has.
  */
  "booking.failure.notAuthenticated": "Please sign in to book a ticket.",
  "booking.failure.alreadyDeparted":
    "This service has already departed. Please choose a later bus.",
  "booking.failure.overlapping":
    "You already hold a ticket for a journey that overlaps this one.",
  "booking.failure.invalidJourney":
    "That journey is not valid. Please reselect your stops.",
  "booking.failure.storageFailed":
    "Your ticket could not be saved. Your device storage may be full.",

  "payment.failure.declined":
    "The payment was declined. No money has left your account.",
  "payment.failure.unavailable":
    "Payments are unavailable right now. Please try again in a moment.",

  "payment.title": "Payment",
  "payment.description":
    "Review your journey, then confirm to receive your virtual ticket.",
  "payment.srTo": "to",
  "payment.srUntil": "until",

  /*
    The honesty notice, which is the most important string in this file. It
    must say plainly in every language that confirming moves no money - a
    Hindi reader shown a softened version has been misled about whether they
    have paid for their journey.
  */
  "payment.noMoney.title": "No payment will be taken",
  "payment.noMoney.body":
    "This service is not connected to a payment provider. Confirming issues a demonstration ticket and moves no money. Pay the conductor on board as usual.",

  "payment.pay": "Pay ₹{fare}",
  "payment.payDemo": "Issue a demonstration ticket for ₹{fare}",

  "payment.processing.title": "Processing payment",
  "payment.processing.description":
    "This will only take a moment. Please do not close this window.",
  "payment.processing.status": "Processing payment…",

  "payment.success.title": "Payment successful",
  "payment.success.description": "Your ticket from {from} to {to} is confirmed.",
  "payment.success.demo": "Demonstration ticket. No payment was taken.",
  "payment.success.notSaved":
    "Your ticket could not be saved to this device, so it may not be here later.",
  "payment.viewTicket": "View my ticket",

  "payment.failed.title": "Payment failed",
  "payment.failed.generic":
    "Something went wrong while processing your payment.",
  "payment.error.signedOut": "You must be signed in to complete this payment.",
  "payment.error.unknown": "Could not complete your payment. Please try again.",

  "payment.announce.signedOut": "Payment failed. You must be signed in.",
  "payment.announce.bookingFailed": "Booking failed. {reason}",
  "payment.announce.processing": "Processing your payment, please wait.",
  "payment.announce.paymentFailed": "Payment failed. {reason}",
  "payment.announce.success":
    "Payment successful. Your ticket from {from} to {to} is confirmed.",
  "payment.announce.retry": "Payment failed. Please try again.",


  /*
    What a ticket says it is. Shown on the ticket itself, in the history list
    and explained on /help - three surfaces that have to agree, which is why
    the status engine names a key rather than each screen writing its own.
  */

  /*
    The ticket a passenger shows a conductor.

    "BRT Bus Service" is NOT here: it is the operator's name printed on the
    ticket, and it stays as published in both languages.

    Two keys for the countdown rather than one with a plural rule. English
    needs "1 more minute" and "5 more minutes"; a rule engine for one string
    is more machinery than the string is worth, and Hindi does not inflect it
    at all.
  */
  "ticket.expired": "Expired",
  "ticket.heading": "Route {route} · {from} to {to}",
  "ticket.statusPrefix": "Ticket status: ",
  "ticket.farePaid": "Fare paid",
  "ticket.validFor": "Valid for",
  "ticket.qrLabel": "Boarding QR code for booking {id}",
  "ticket.qrLabelExpired": "Expired boarding QR code for booking {id}",
  "ticket.copied": "Booking reference copied",
  "ticket.copy": "Copy booking reference {id}",
  "ticket.saveQr": "Save QR",
  "ticket.cancel": "Cancel ticket",
  "ticket.cancelFor": " for {from} to {to}",

  "ticket.announce.validForOne":
    "Your ticket is valid for about {minutes} more minute.",
  "ticket.announce.validForMany":
    "Your ticket is valid for about {minutes} more minutes.",
  "ticket.announce.copied": "Booking reference copied to clipboard.",
  "ticket.announce.copyFailed": "Could not copy the booking reference.",
  "ticket.announce.qrFailed": "Could not prepare the QR code for download.",
  "ticket.announce.qrDownloaded": "QR code downloaded.",


  /*
    A passenger's own dashboard.

    The empty history states are three separate strings rather than one with
    the filter name substituted. English wants "No completed tickets" from a
    label that reads "Completed", and lower-casing a translated word is an
    assumption that only holds for languages with letter case.
  */
  "dashboard.avatarAlt": "User",
  "dashboard.passenger": "Passenger",
  "dashboard.tripsCompleted": "Trips Completed",
  "dashboard.totalSpent": "Total Spent",
  "dashboard.favouriteRoute": "Favourite Route",

  "dashboard.yourTicket": "Your Ticket",
  "dashboard.noActiveTickets": "No active tickets",
  "dashboard.bookPrompt":
    "Book a seat from the timetable and your ticket will appear here.",
  "dashboard.bookCta": "Book a Ticket",

  "dashboard.alerts.title": "Arrival Alerts",
  "dashboard.alerts.body":
    "Tells you when your bus is close to your boarding stop.",
  "dashboard.alerts.on": "On",
  "dashboard.alerts.off": "Off",
  "dashboard.alerts.suffix": " — arrival alerts",
  "dashboard.alerts.switchedOn": "Arrival alerts switched on.",
  "dashboard.alerts.switchedOff": "Arrival alerts switched off.",
  "dashboard.alerts.failed": "Could not change your alert setting.",

  "dashboard.history.title": "Ticket History",
  "dashboard.history.filterLabel": "Filter ticket history",
  "dashboard.filter.all": "All",
  "dashboard.history.emptyAll": "No past journeys yet",
  "dashboard.history.emptyCompleted": "No completed tickets",
  "dashboard.history.emptyCancelled": "No cancelled tickets",

  "dashboard.cancel.failed":
    "That ticket could not be cancelled. It may have already departed.",
  "dashboard.cancel.done": "Ticket cancelled.",
  "dashboard.cancel.announced": "Your ticket has been cancelled.",


  /*
    The driver's screen.

    Route names and headlines in the picker are published data and stay as
    published, in both languages - only the label above the picker is ours.

    The interruption reasons name the ONE cause that can actually be observed,
    a backgrounded tab, and stay general about everything else. Translating
    them must not turn "we do not know why" into a guess that sounds specific.
  */
  /*
    What a reported position is worth, shown on /about, on the map, and in the
    operator's fleet table. Three surfaces, one table — /about exists to
    explain the words the map uses, so they cannot be allowed to drift.
  */
  /*
    /about - the page an operator reads first.

    Every figure on it is substituted rather than written into a sentence: the
    stop counts, the fare range, the staleness threshold and the operator's own
    published numbers all come from the data, so a translated sentence cannot
    end up quoting a figure the app no longer holds.

    The operator's published FACTS are not here at all. They are a quotation
    carrying a citation, and a quotation is not translated - the same rule that
    keeps stop names in their published form. See `domain/transit/operator`.

    A sentence containing a link is split into segments rather than
    concatenated around it, separators included: Hindi ends a sentence with a
    danda rather than a full stop, and "or" sits differently in a list.
  */
  "place.notFound.title": "We do not have a page for that place",
  "place.notFound.body": "It may have been renamed, or the link may be wrong.",
  "place.back": "Back to nearby places",
  "place.allNearby": "All nearby places",
  "place.operatorListing": "Operator listing",
  "place.gettingThere": "Getting there",
  "place.row.nearestStop": "Nearest stop",
  "place.registryStop":
    "The operator publishes no BRT access for this place. This stop comes from our own network registry.",
  "place.row.routes": "Routes calling there",
  "place.noRoutes": "No route in the published network calls at this stop.",
  "place.row.service": "Scheduled service",
  "place.scheduled":
    "This stop has published departures, so a journey can be planned to it.",
  "place.unserved":
    "This stop is on the published network but has no departures yet, so a journey cannot be planned to it.",
  "place.row.hours": "Opening hours",
  "place.row.phone": "Phone",
  "place.row.website": "Website",
  "place.about": "About this information",
  "place.row.location": "Location",
  "place.noMap": "We do not show this place on a map.",
  "place.uncheckedLead": "A published coordinate exists but",
  "place.uncheckedEmphasis": "nobody has checked it on the ground",
  "place.uncheckedRest": ", so it is not used for distances here.",
  "place.noCoordinate": "No source publishes a coordinate for this place.",
  "place.row.source": "Source",
  "place.row.lastChecked": "Last checked",
  "routes.intro":
    "Every route published in the official Tatpar BRTS network, the stops it serves, and where you can change buses.",
  "routes.cycle":
    "The published routes disagree about the order of a shared stop, so a single diagram cannot represent them. The stop list for each route below is unaffected.",
  "routes.noDepartures": "No scheduled departures yet",
  "routes.someDepartures":
    "{withDepartures} of {total} stops have scheduled departures",
  "routes.oneDeparture":
    "{withDepartures} of {total} stops has scheduled departures",
  "routes.planJourney": "Plan a journey",
  "routes.checkFares": "Check fares",
  "routes.timetable": "Timetable",
  "routes.stat.stops": "Stops",
  "routes.stat.interchanges": "Interchanges",
  "routes.stat.withDepartures": "With departures",
  "routes.stat.terminates": "Terminates",

  "routes.diagramMeaning":
    "A connection diagram, not a map. It shows which routes call at which stops and in what order — distances and directions on it mean nothing.",
  "routes.stopsOne": "{stops} stops · {count} interchange",
  "routes.stopsMany": "{stops} stops · {count} interchanges",
  "nav.openNavigation": "Open navigation menu",
  "nav.closeNavigation": "Close navigation menu",
  "routes.weeklyOne": "{stops} stops · {trips} departure a week",
  "routes.weeklyMany": "{stops} stops · {trips} departures a week",
  "routes.title": "Explore the network",
  "routes.places": "Places you can reach on these routes",
  "routes.today": "Services running today",
  "routes.viewTimetable": "View timetable",
  "routes.connections": "How the network connects",
  "routes.diagramNote":
    "A connection diagram, not a map. It shows which routes call at which stops, not where those stops are.",
  "routes.showSimulated": "Show simulated fleet",
  "routes.hideSimulated": "Hide simulated fleet",
  "routes.viewLabel": "Network view",
  "routes.diagram": "Diagram",
  "routes.table": "Table",
  "routes.legend": "Diagram legend",
  "routes.interchange": "Interchange",
  "routes.official": "Official network routes",
  "routes.find": "Find a route",
  "routes.searchPlaceholder": "Search by route or stop name",
  "routes.tryAnother": "Try a route name, a route id, or the name of a stop.",
  "routes.clearSearch": "Clear search",
  "routes.allScheduled": "All stops have scheduled departures",

  "network.caption":
    "Every stop in the network and the routes calling at it. Stops are listed in corridor order.",
  "network.col.stop": "Stop",
  "network.col.routes": "Routes calling here",
  "network.interchange": "Interchange",
  "outlook.next": "Next at {time}",
  "outlook.ended": "Nothing more today — last was {time}",
  "outlook.none": "No bus runs this way today",
  "outlook.title": "Your journeys",
  "outlook.body": "Kept on this device from what you have planned here.",
  "journeys.title": "Saved and recent journeys",
  "journeys.save": "Save {journey}",
  "journeys.remove": "Saved — remove {journey}",
  "journeys.full":
    "You already have {limit} saved journeys. Remove one before saving another.",
  "journeys.forget": "Forget {journey}",
  "journeys.clearRecent": "Clear recent journeys",
  "alerts.title": "Service announcements",
  "alerts.affectsJourney": "affects your journey",
  "alerts.affectsRoute": "affects this route",
  "alerts.severity.info": "Notice",
  "alerts.severity.warning": "Service change",
  "alerts.severity.critical": "Major disruption",
  "stopList.start": "Start",
  "stopList.end": "End",
  "stopList.interchange": "Interchange",
  "stopList.noDepartures": "No departures yet",

  "admin.welcome": "Welcome, {name}. Manage all users and their roles.",
  "admin.defaultName": "Admin",
  "admin.refresh": "Refresh",
  "admin.allowlist.lead": "Granting the driver role is not enough on its own.",
  "admin.allowlist.body":
    "A driver can only broadcast a position once their user ID is added to the",
  "admin.allowlist.rest":
    "in the Realtime Database. That node is closed to every client by design, so it has to be set from the Firebase console.",
  "admin.searchLabel": "Search users by name or email",
  "admin.searchPlaceholder": "Search by name or email…",
  "admin.shown": "{shown} of {total} users shown",
  "admin.noMatch": "No users match \"{query}\"",
  "admin.noUsers": "No users yet",
  "admin.clearSearch": "Clear search",
  "admin.roster": "Registered users and their roles",
  "admin.unknownUser": "Unknown",
  "admin.saving": "Saving…",
  "admin.save": "Save",
  "admin.edit": "Edit",
  "admin.truncated":
    "Only the first {limit} accounts were loaded. Counts and search cover this subset only.",
  "admin.audit.heading": "Administrative activity",
  "admin.audit.body":
    "The {limit} most recent role changes and published notices. Entries cannot be edited or removed, including by an administrator.",
  "admin.audit.none": "No administrative changes have been recorded yet.",
  "admin.audit.roleChanged": "Role changed",
  "admin.audit.noticePublished": "Notice published",
  "admin.role.selectFirst": "Please select a role",
  "admin.role.noPermission": "You do not have permission to change roles.",
  "admin.role.updated": "Role updated successfully!",
  "admin.role.user": "👤 User (Passenger)",
  "admin.role.driver": "🚌 Driver",
  "admin.role.admin": "👨‍💼 Admin",
  "notice.published": "Announcement published.",
  "notice.warning":
    "Anything published here is shown to every visitor, on every page. Write only what the operator has confirmed.",
  "notice.title": "Title",
  "notice.message": "Message",
  "notice.severity": "Severity",
  "notice.affects": "What this affects",
  "notice.affectsHint":
    "Add one affected thing at a time. Choosing a route and a stop together means that route at that stop; add a second row to cover another route or stop as well. Add nothing to tell every passenger.",
  "notice.route": "Route",
  "notice.stop": "Stop",
  "notice.add": "Add",
  "notice.when": "When it applies",
  "notice.starts": "Starts",
  "notice.ends": "Ends",
  "notice.publishing": "Publishing…",
  "notice.publish": "Publish announcement",
  "notice.none": "Nothing has been published yet. Passengers see no notices.",
  "notice.retire": "Retire",
  "notice.restore": "Restore",

  "map.title": "Live Bus Tracking",
  "map.pause": "Pause live updates",
  "map.resume": "Resume live updates",
  "map.announce.resumed": "Live updates resumed.",
  "map.announce.paused": "Live updates paused. Showing the corridor at {time}.",
  "map.pausedLead": "Paused. Showing the corridor as it stood at",
  "map.updating": "Updating automatically as buses report.",
  "map.show": "Show",
  "map.everyRoute": "Every route",
  "map.frameTitle": "Live bus locations",
  "map.unavailable":
    "Live tracking is unavailable right now. Please try again later.",
  "map.activeCount": "🚍 Active Buses: {count}",
  "map.activeHeading": "Active Buses",
  "map.loading": "Loading buses...",
  "map.none": "No buses active",
  "map.col.bus": "Bus",
  "map.col.route": "Route",
  "map.col.towards": "Towards",
  "map.col.status": "Status",
  "map.col.lastUpdate": "Last update",
  "map.simulated": "Simulated",
  "map.noNextStop":
    "Route and destination come from what the bus reports. We do not show which stop it reaches next: that needs surveyed stop positions, which the corridor does not have yet.",
  "nearby.title": "Nearby places",
  "nearby.intro":
    "Destinations across Nava Raipur and the nearest BRT stop for each. Plan a journey there, see the route, or check the fare.",
  "nearby.find": "Find a place",
  "nearby.searchPlaceholder": "Search by place name",
  "nearby.all": "All",
  "nearby.noMatch": "No places match your search",
  "nearby.tryAnother": "Try another name, or choose a different category.",
  "nearby.clearFilters": "Clear filters",
  "nearby.officialListing": "Official listing",
  "nearby.unserved":
    "This stop is on the published network but has no departures yet, so a journey cannot be planned to it.",
  "nearby.planJourney": "Plan journey",
  "nearby.route": "Route",
  "nearby.fare": "Fare",
  "nearby.nearestStop": "Nearest stop: {stop}",

  "contact.title": "Meet Our Team",
  "contact.intro":
    "Our dedicated team members are here to assist you. Reach out anytime for support, collaboration, or queries.",
  "notFound.title": "Page not found",
  "notFound.body":
    "We couldn't find the page you were looking for. It may have moved, or the link may be out of date.",
  "notFound.timetable": "View timetable",
  "search.intro": "Stops, routes and places on the corridor, in one place.",
  "search.placeholder": "Try {stop}, {route}, or {place}",
  "search.begin": "Type a stop, a route or a place to begin.",
  "search.nothing": "Nothing matches “{query}”",
  "search.onlyPublished":
    "Only names the corridor actually publishes are searched, and nothing is guessed at. Check the spelling, or",
  "search.browseRoutes": "browse every route",
  "search.resultsOne": "{count} result for “{query}”",
  "search.resultsMany": "{count} results for “{query}”",
  "search.announce.none": "No results for {query}",
  "search.announce.one": "{count} result for {query}",
  "search.announce.many": "{count} results for {query}",
  "search.kind.stop": "Stop",
  "search.kind.route": "Route",
  "search.kind.place": "Place",

  "help.title": "Passenger Help",
  "help.intro":
    "How this service works, what your ticket means, and what to do when something looks wrong.",
  "help.plan.heading": "Planning a journey",
  "help.plan.routes.q": "Which routes are running?",
  "help.plan.routes.a":
    "{count} routes carry passengers on this corridor: {names}. {express} is the express variant and skips two stops that {local} calls at.",
  "help.plan.routes.link": "Browse every route and the stops it serves",
  "help.plan.noDepartures.q": "Why does my stop show no departures?",
  "help.plan.noDepartures.a":
    "The published timetable covers {scheduled} of the {total} stops in the network. The rest appear on route maps and in fare lookups, but no departure times have been published for them yet, so nothing can be booked from them.",
  "help.plan.change.q": "Can I get everywhere with one bus?",
  "help.plan.change.a1":
    "Not everywhere. Some pairs of stops are not joined by any single published trip, and for those the planner shows a journey with one change: which bus to take, where to get off, how long the wait is, and which bus to take on.",
  "help.plan.change.a2":
    "The wait is the timetable's arithmetic and nothing more. No allowance is made for walking between platforms or for a bus running late, because the timetable does not say how long either takes. A journey with a change is also two tickets, so it cannot be booked here in one go.",
  "help.plan.times.q": "Where do the times come from?",
  "help.plan.times.a":
    "Departures come from the published weekday and weekend timetables. Weekday and weekend services differ, so a journey that exists on a Monday may not exist on a Sunday.",
  "help.fares.heading": "Fares",
  "help.fares.calc.q": "How is my fare calculated?",
  "help.fares.calc.a":
    "Fares come from the official BRTS fare chart, not from distance measured on the map. The same fare applies in both directions between any two stops.",
  "help.fares.unpriced.q": "Some pairs show no price. Why?",
  "help.fares.unpriced.a":
    "A fare is only shown when the official chart lists one for that pair. Nothing is estimated or filled in, so an unpriced pair is reported as unavailable rather than guessed.",
  "help.booking.heading": "Booking a ticket",
  "help.booking.refused.q": "What stops a booking from going through?",
  "help.booking.two.q": "Can I hold two tickets at once?",
  "help.booking.two.a":
    "Only if the journeys do not overlap in time. A second ticket covering the same window as one you already hold is refused.",
  "help.ticket.heading": "Your ticket",
  "help.ticket.states.q": "What do the ticket states mean?",
  "help.ticket.valid.q": "How long does my ticket stay valid?",
  "help.ticket.valid.a":
    "It remains valid for {minutes} minutes after the scheduled arrival, so a late-running bus does not leave you holding an expired ticket.",
  "help.ticket.offline.q": "Will my ticket work without a signal?",
  "help.ticket.offline.a1":
    "Yes, once you have opened it. After your first visit the app is kept on this device, so any page you have already opened — your ticket included — opens again with no connection at all.",
  "help.ticket.offline.a2":
    "A page you have never opened will not, because there is nothing stored to show. Booking a new ticket needs a connection either way.",
  "help.ticket.devices.q": "Can I see my tickets on another device?",
  "help.ticket.devices.a":
    "Yes. Sign in with the same account and your tickets and journey history follow you.",
  "help.live.heading": "Live tracking",
  "help.live.which.q": "Which buses appear on the live map?",
  "help.live.which.a":
    "Only buses whose driver is sharing their position. A bus that has not reported for {minutes} minutes is removed, because a position that old no longer tells you where it is.",
  "help.live.link": "Open the live map",
  "help.live.empty.q": "The map is empty. Is the service running?",
  "help.live.empty.a":
    "An empty map means no driver is currently sharing a position. It does not mean the service is suspended — check the timetable for scheduled departures.",
  "help.live.driver.q": "Is the driver identified?",
  "help.live.driver.a":
    "No. Each vehicle is shown under a short label such as BUS-4K2P. No driver name, email address or account is published.",
  "help.alerts.heading": "Arrival alerts",
  "help.alerts.when.q": "When am I told my bus is close?",
  "help.alerts.when.a":
    "When a bus that is reporting its position comes within {radius} km of your boarding stop in a straight line, and you are holding a live ticket for that journey.",
  "help.alerts.proximity":
    "This is a proximity alert, not an arrival time. It does not know which route that bus is running, which direction it is travelling, or how long the road between you takes, so it never tells you how many minutes away it is. For a time, use the scheduled departure on the timetable.",
  "help.alerts.off.q": "How do I turn alerts off?",
  "help.alerts.off.a":
    "Open your dashboard and switch Arrival Alerts off. Your browser may also ask for permission the first time you switch them on; refusing that only stops the desktop notification, not the in-app one.",
  "help.data.heading": "Your data",
  "help.data.stored.q": "What is stored about me?",
  "help.data.stored.a1":
    "Your name and email address, so your tickets can be shown to you and nobody else. Your tickets are stored with the journey, the fare and the time you booked.",
  "help.data.stored.a2":
    "Tickets are kept both on this device and on our servers, so losing one copy does not lose your ticket.",
  "help.data.location.q": "Is my location tracked?",
  "help.data.location.a":
    "No. Passengers are never located. A bus position comes from the driver's own device, and only while they have chosen to share it for their shift.",
  "help.data.others.q": "What can other people see?",
  "help.data.others.a1":
    "Live bus positions are public, because the map is a public page. Each vehicle appears under a short label such as BUS-4K2P — no driver name, email address or account is published with it.",
  "help.data.others.a2":
    "Your own tickets and journey history are visible only to you when signed in.",
  "help.data.delete.q": "Can I delete my account?",
  "help.data.delete.lead":
    "Not from inside the app. Accounts are removed on request — please",
  "help.data.delete.link": "contact the team",
  "help.account.heading": "Your account and support",
  "help.account.password.q": "I have forgotten my password.",
  "help.account.password.lead": "Use",
  "help.account.password.link": "Forgot password",
  "help.account.password.rest":
    "on the sign-in page. A reset link is sent to your email address. For your protection the same confirmation is shown whether or not an account exists for that address.",
  "help.account.wrong.q": "Something here looks wrong.",
  "help.account.wrong.lead":
    "Timetable, route and fare data follow the official published sources. If something does not match what you saw at the stop, please",
  "help.account.wrong.link": "tell the team",
  "help.account.wrong.rest": "so it can be checked.",

  "about.title": "About the BRT corridor",
  "about.intro":
    "What Bus Rapid Transit is, what runs in Nava Raipur, and what this site can and cannot tell you about it.",
  "about.brt.heading": "What Bus Rapid Transit is",
  "about.brt.1":
    "Bus Rapid Transit gives buses their own lane, so they are not held up by the traffic beside them. Passengers wait at fixed stations rather than at the roadside, board through a platform level with the bus floor, and travel to a published timetable.",
  "about.brt.2":
    "The point of it is that the service becomes predictable. A journey that takes twenty minutes today should take twenty minutes tomorrow, which is what makes a bus usable for getting to work.",
  "about.service.heading": "The Nava Raipur service",
  "about.service.intro":
    "The corridor is run by {operator} ({abbreviation}). The figures below are the operator’s own published numbers about their service, not ours.",
  "about.service.infrastructure": "Corridor infrastructure",
  "about.service.source":
    "Source: {publication}, {url}, read on {retrieved}. That page has been unreachable since {unreachable}, so these figures cannot currently be checked against it. They are reproduced as they were published and attributed to {abbreviation}, rather than presented as our own.",
  "about.stops.heading": "Stops: what is published, and what we list",
  "about.stops.intro":
    "The operator publishes its stopping places in three groups:",
  "about.stops.ours":
    "Our own stop registry holds {total} stops, of which {scheduled} have published departure times. Those numbers do not reconcile with the operator’s, and we have not deleted stops to force a match. Where the two disagree the operator is the authority on what exists; we are reporting only what we hold.",
  "about.stops.unserved":
    "A stop with no departure times still appears in route listings and fare lookups. Nothing can be booked from it, because no times have been published for it.",
  "about.network.heading": "Routes and the network",
  "about.network.body":
    "The network is a trunk corridor with feeder routes joining it. We list {routes} network routes and {interchanges} interchanges where you can change between them. The timetable publishes {workings} numbered workings, because one route is operated with more than one stopping pattern.",
  "about.network.link": "Browse the network diagram and every route",
  "about.fares.heading": "Fares",
  "about.fares.body":
    "Fares come from the official BRTS fare chart. They are not calculated from distance, and nothing is estimated: a pair the chart does not price is reported as unavailable rather than filled in. Published fares run from ₹{lowest} to ₹{highest}, and the same fare applies in both directions between any two stops.",
  "about.fares.link": "Check the fare between any two stops",
  "about.ride.heading": "How to ride",
  "about.ride.lead":
    "Find your stop, check when the next bus leaves, look up the fare, then board at the platform. Each step has its own page:",
  "about.ride.plan": "plan a journey",
  "about.ride.timetable": "read the timetable",
  "about.ride.nearby": "find places near the corridor",
  "about.ride.separator": ", ",
  "about.ride.or": ", or ",
  "about.sentenceEnd": ".",
  "about.live.heading": "Live tracking, and what it cannot tell you",
  "about.live.1":
    "Live positions are published by the driver’s own device while they are on duty. Coverage is therefore not guaranteed: a bus whose driver is not sharing a position is invisible to us even though it is running normally. An empty map means we are receiving no positions, not that no bus is coming.",
  "about.live.2":
    "A reported position is not simply on or off. Every bus we show carries one of these states:",
  "about.live.3":
    "Past about {minutes} minutes we stop showing the bus at all, because a position that old says more about where it was than where it is. We do not turn any of this into an arrival time: we know where a bus reported itself, not what the road ahead of it is doing.",
  "about.tickets.heading": "Digital tickets",
  "about.tickets.stored":
    "A ticket booked here is kept on your device and on our servers, and shown as a code when you open it.",
  "about.tickets.paid": "Payment is taken through {provider}.",
  "about.tickets.demo":
    "Booking is a demonstration: no money changes hands, and a ticket bought here is not accepted as a fare.",
  "about.tickets.offline":
    "After your first visit the app is kept on this device, so a ticket you have already opened will open again with no connection. A page you have never opened will not, and booking a new ticket still needs one.",
  "about.updates.heading": "Service updates",
  "about.updates.body":
    "When a disruption is published it appears at the top of every page here, not only on the home page, so a bookmark or a deep link cannot hide it. Updates come from whoever is authorised to post them. We do not write them ourselves, and we do not infer a disruption from buses being quiet.",
  "about.a11y.heading": "Accessibility",
  "about.a11y.1":
    "Every page can be reached and operated from the keyboard, with a visible focus outline and a skip link to the main content. Page changes are announced to screen readers, and the network is offered as a table as well as a diagram, so nothing here depends on reading a map.",
  "about.a11y.2":
    "Colour is never the only way a state is communicated, and animation is reduced automatically when your system asks for that. If something here is unusable for you, that is a defect worth reporting on the",
  "about.a11y.contactLink": "contact page",
  "about.next.heading": "What we are planning next",
  "about.next.intro":
    "These are intentions, not features. None of them exists yet:",
  "about.next.gtfs":
    "Publishing the corridor timetable as open transit data, so it can appear in other journey planners rather than only here. The feed is built; what it still needs is surveyed stop coordinates, which we do not have.",
  "about.who.heading": "Who we are",
  "about.who.body":
    "This is an independent, student-built project. It is not an official {abbreviation} product, it is not affiliated with the operator, and nothing here is endorsed by them. The service information is reproduced from published sources with attribution; the software is ours.",
  "about.who.link": "Who built this, and how to reach us",

  "fleet.filterLabel": "Filter drivers",
  "fleet.filter.all": "All drivers",
  "fleet.filter.reporting": "Reporting",
  "fleet.filter.attention": "Needs attention",
  "fleet.byState": "Vehicles by reporting state",
  "fleet.unreachable":
    "Live tracking is unreachable, so nobody shows as on shift. The driver list below is still accurate.",
  "fleet.noDrivers":
    "No accounts hold the driver role yet. Assign one below to let someone broadcast a bus position.",
  "fleet.roster": "Drivers and the vehicles they are running",
  "fleet.noShift": "No shift started",
  "fleet.state.live": "Live",
  "fleet.state.recent": "Recent",
  "fleet.state.stale": "Delayed report",
  "fleet.state.offline": "Not reporting",
  "fleet.state.unknown": "Unknown",

  "fleet.state.live.detail": "Reporting now.",
  "fleet.state.recent.detail": "Last reported within the last minute or two.",
  "fleet.state.stale.detail":
    "The last report is several minutes old, so the bus has moved since.",
  "fleet.state.offline.detail":
    "This bus has stopped reporting. It may still be running.",
  "fleet.state.unknown.detail":
    "This bus reported no usable time, so its position cannot be dated.",

  "fleet.sharing.idle": "Not sharing",
  "fleet.sharing.sharing": "Sharing your live location",
  "fleet.sharing.interrupted": "Your position is not reaching passengers",
  "fleet.interruption.background":
    "This tab was in the background, and browsers stop a background tab from reading its location. Keep this screen open and awake while you are on shift.",
  "fleet.interruption.signal":
    "The last update did not reach us. Check your signal.",

  "driver.title": "Driver Live Tracking",
  "driver.broadcastingAs": "Broadcasting as",
  "driver.checking": "Checking your assignment…",
  "driver.noAssignment.lead": "No bus is assigned to you right now.",
  "driver.noAssignment.body":
    "Sharing your position needs an assignment from the operator, and each one covers a single shift. Ask them to assign you a vehicle.",
  "driver.routeLabel": "Route you are running",
  "driver.stopToChange": "Stop sharing to change route.",
  "driver.sharingOn": " on {route}",
  "driver.interrupted.title": "Your position is not reaching passengers.",
  "driver.latitude": "Latitude",
  "driver.longitude": "Longitude",
  "driver.start": "Start Sharing",
  "driver.stop": "Stop Sharing",
  "driver.privacy":
    "Only your coordinates and this bus label are shared. Your name and email address are never published.",
  "driver.error.permission":
    "Location permission is required to broadcast your position.",
  "driver.error.readFailed": "Could not read your location. Please try again.",
  "driver.error.unavailable": "Live tracking is unavailable right now.",
  "driver.announce.interrupted":
    "Your position is not reaching passengers. {reason}",

  "driver.dashboard.noAssignment":
    "No bus is assigned to you right now, so nothing is being shared. The operator assigns one for each shift.",
  "driver.dashboard.role": "Driver",
  "driver.dashboard.title": "Share Live Location",
  "driver.dashboard.body":
    "Broadcasting runs on the live tracking page and stops when you leave it, so keep that page open while you are on shift.",
  "driver.dashboard.cta": "Open live tracking",

  "ticket.status.pending": "Pending",
  "ticket.status.active": "Active",
  "ticket.status.boardingSoon": "Boarding Soon",
  "ticket.status.inTransit": "In Transit",
  "ticket.status.completed": "Completed",
  "ticket.status.cancelled": "Cancelled",

  "login.signIn.title": "Sign in",
  "login.signUp.title": "Create account",
  "login.reset.title": "Reset password",

  "login.email": "Email",
  "login.password": "Password",
  "login.name": "Full name",
  "field.required": " (required)",

  "login.signIn.action": "Sign in",
  "login.signIn.pending": "Signing in…",
  "login.signUp.action": "Sign up",
  "login.signUp.pending": "Creating account…",
  "login.google": "Continue with Google",
  "login.forgot": "Forgot password?",
  "login.backToSignIn": "Back to sign in",
  "login.passwordHint": "At least 6 characters.",

  "login.reset.intro":
    "Enter your email and we will send you a link to set a new password.",
  /*
    Deliberately says "if". The reset flow must never confirm whether an
    address is registered, in any language.
  */
  "login.reset.sent":
    "If an account exists for {email}, a password reset link is on its way. Check your inbox and spam folder.",
  "login.reset.action": "Send reset link",
  "login.reset.pending": "Sending…",

  "login.haveAccount": "Already have an account?",
  "login.noAccount": "Don't have an account?",
  "login.showPassword": "Show password",
  "login.hidePassword": "Hide password",

  "login.aside.newTitle": "Hello, friend!",
  "login.aside.newBody":
    "Don't have an account? Sign up now to book bus tickets and enjoy seamless travel.",
  "login.aside.returningTitle": "Welcome back!",
  "login.aside.returningBody":
    "Already have an account? Sign in to continue booking your tickets.",

  "login.announce.signInProblem": "There is a problem with the sign-in form.",
  "login.announce.signUpProblem": "There is a problem with the sign-up form.",
  "login.announce.resetProblem": "There is a problem with the reset form.",
  "login.announce.signingIn": "Signing you in…",
  "login.announce.creating": "Creating your account…",
  "login.announce.resetSent":
    "If that email has an account, a reset link is on its way.",

  /*
    What is safe to show when something failed.

    Never a Firebase code, an index hint or a project id - those go to the
    console for whoever debugs them. A rules refusal is not a bug and reads as
    a plain refusal.
  */

  /*
    The screen shown when the app itself has failed, and the arrival popup.

    "Position only" is a truthfulness notice, not a caption: the app knows
    where a bus IS and never when it will arrive, and both languages have to
    say so with the same force.
  */
  "boundary.title": "Something went wrong",
  "boundary.body":
    "This page could not be displayed. Reloading usually fixes it, especially if the app was updated while this tab was open.",
  "boundary.offlineTitle": "This page needs a connection",
  "boundary.offlineBody":
    "You appear to be offline, and this page has not been opened on this device before. Pages you have already visited still work.",
  "boundary.reload": "Reload the page",
  "boundary.home": "Back to home",

  "notification.dismiss": "Dismiss notification",
  "notification.positionOnly": "Position only — not an arrival time",


  /*
    What a screen reader is told when a route changes.

    These name pages for a PERSON. The same table also fills `document.title`
    and the meta description, and those stay English on purpose: they are what
    a search engine indexes, and the descriptions beside them are long-form
    copy that belongs to the stage this one is not. Localising the tab title
    is a decision about search results, not about translation.
  */
  "route.loaded": "{page} page loaded",
  "page.placeNotFound": "Place not found",
  "page.unknown": "Page",
  "page.home": "Home",
  "page.plan": "Plan your journey",
  "page.routes": "Route explorer",
  "page.nearby": "Nearby places",
  "page.map": "Live bus tracking",
  "page.timetable": "Timetable",
  "page.fares": "Fares",
  "page.contact": "Contact",
  "page.help": "Passenger help",
  "page.about": "About the BRT corridor",
  "page.search": "Search",
  "page.login": "Sign in",
  "page.dashboard": "Dashboard",
  "page.driver": "Driver live tracking",

  /*
    The route guards. "Access denied" deliberately says nothing about what the
    page contains or which role would grant it - a refusal should not double
    as a map of the app, in any language.
  */
  /*
    Only the two blocks of /help that render shared registries. Keying those
    registries made the STATUS WORDS Hindi while the sentences beside them
    stayed English, and a half-Hindi line is worse than an English one - so
    the sentences beside them come too. The rest of /help is long-form copy
    and belongs to a later stage.

    The boarding window is a number substituted in, never translated.
  */
  "help.refusalsIntro": "These are the reasons a booking is refused:",
  "help.state.active":
    "— booked and waiting, more than {minutes} minutes before departure.",
  "help.state.boardingSoon": "— within {minutes} minutes of departure.",
  "help.state.inTransit": "— the scheduled journey is under way.",
  "help.state.completed": "— the bus has reached your destination.",
  "help.state.cancelled": "— you cancelled it. This cannot be undone.",
  "help.statesFollowClock":
    "States follow the clock, so a ticket moves through them on its own without you refreshing anything.",

  "guard.checking": "Checking your access…",
  "guard.deniedTitle": "Access denied",
  "guard.deniedBody": "You do not have permission to view this page.",

  "error.generic": "Something went wrong. Please try again.",
  "error.noPermission": "You do not have permission to perform this action.",
  "error.signInRequired": "Please sign in to continue.",
  "error.network":
    "Network unavailable. Please check your connection and try again.",
  "error.loadUsers": "Could not load users.",
  "error.updateRole": "Could not update that role.",
  "error.loadAnnouncements": "Could not load announcements.",
  "error.shareLocation": "Could not share your location.",

  "validation.generic": "Please check your details.",
  "validation.email.required": "Email is required",
  "validation.email.tooLong": "Email is too long",
  "validation.email.invalid": "Please enter a valid email address",
  "validation.password.tooShort": "Password must be at least 6 characters",
  "validation.password.tooLong": "Password must be at most 128 characters",
  "validation.name.required": "Name is required",
  "validation.name.tooLong": "Name is too long",
  "validation.name.invalid": "Name contains invalid characters",

  /*
    Sign-in failures.

    `auth.error.credentials` covers a wrong password, an unknown account, a
    malformed address and a rejected credential, and it must stay one string
    in every language. Splitting it - even into two Hindi sentences that read
    more naturally - turns the form into an account-enumeration oracle, where
    an attacker learns which addresses are registered by watching which
    message comes back.
  */
  "auth.error.credentials": "Incorrect email or password.",
  "auth.error.tooManyAttempts":
    "Too many attempts. Please wait a few minutes and try again.",
  "auth.error.disabled": "This account has been disabled.",
  "auth.error.emailInUse": "That email address cannot be used to register.",
  "auth.error.weakPassword": "Please choose a password of at least 6 characters.",
  "auth.error.cancelled": "Sign-in was cancelled.",
  "auth.error.popupBlocked":
    "Your browser blocked the sign-in popup. Please allow popups and retry.",
  "auth.error.network":
    "Network unavailable. Please check your connection and try again.",
  "auth.error.generic": "Sign-in failed. Please try again.",
  "auth.error.resetFailed": "Could not send the reset email. Please try again.",
} as const;

/**
 * Every key the interface can ask for.
 *
 * English is the source: a component names a key here first, and each other
 * language is typed against this, so adding a string without translating it
 * does not compile. A half-translated screen is worse than an untranslated
 * one, and a type error is the only reminder that arrives before a passenger
 * sees it.
 */
export type TranslationKey = keyof typeof en;

/** One language's complete copy. */
export type Catalogue = Readonly<Record<TranslationKey, string>>;
