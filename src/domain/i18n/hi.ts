/**
 * The interface in Hindi.
 *
 * Loaded on demand rather than bundled: see `strings.ts`. Nothing here is a
 * published transit name - stop names, route names and headlines stay in the
 * form the operator publishes them in, in both languages, because their
 * official Devanagari forms are the operator's to supply and a transliteration
 * reads as wrong to somebody who lives on the corridor.
 *
 * Typed as a `Catalogue`, so a key added in English and forgotten here is a
 * compile error rather than a screen that silently falls back.
 *
 * THIS HAS NOT BEEN REVIEWED BY A NATIVE SPEAKER. It uses the plain civic
 * register Indian transit signage uses, and it should be read by somebody
 * from Raipur before it is put in front of passengers. That is recorded as a
 * founder action rather than assumed away.
 */

import type { Catalogue } from "./en";

export const hi: Catalogue = {
  "nav.home": "होम",
  "nav.plan": "यात्रा योजना",
  "nav.routes": "मार्ग",
  "nav.nearby": "आसपास",
  "nav.nearbyPlaces": "आसपास की जगहें",
  "nav.map": "लाइव मैप",
  "nav.timetable": "समय सारणी",
  "nav.fares": "किराया",
  "nav.contact": "संपर्क",
  "nav.help": "सहायता",
  "nav.search": "खोज",
  "nav.about": "परिचय",
  "nav.dashboard": "डैशबोर्ड",
  /*
    One word, not two. "लॉग इन" wraps inside the fixed-width login button and
    spills out of the header - a break that only appears once it is rendered,
    which is why the header was measured in a browser rather than trusted to
    jsdom. "लॉगिन" is the ordinary spelling anyway.
  */
  "nav.login": "लॉगिन",
  "nav.logout": "लॉगआउट",
  "nav.menu": "मेन्यू",
  "nav.openMenu": "मेन्यू खोलें",
  "nav.closeMenu": "मेन्यू बंद करें",
  "nav.primary": "मुख्य",

  "brand.tagline": "आपकी यात्रा, हमारी प्राथमिकता",
  "nav.homeAria": "{brand}, होम पेज पर जाइए",
  "footer.quickLinks": "मुख्य लिंक",
  "footer.blurb":
    "भरोसेमंद और आरामदायक बस सेवा के लिए आपका विश्वसनीय साथी।",
  "footer.location": "स्थान",
  "footer.explore": "और देखें",
  "footer.rights": "© BRT Bus Services. सर्वाधिकार सुरक्षित।",

  "language.label": "भाषा",
  "language.change": "भाषा बदलें",

  "state.loading": "लोड हो रहा है…",
  "state.retry": "फिर कोशिश करें",
  "state.none": "अभी दिखाने के लिए कुछ नहीं है।",
  "state.offline": "आप ऑफ़लाइन लग रहे हैं।",

  "action.search": "खोजें",
  "action.cancel": "रद्द करें",
  "action.close": "बंद करें",
  "action.back": "वापस",

  "skip.toContent": "मुख्य सामग्री पर जाएँ",

  "home.headline.1": "बेहतरीन BRT सेवा का अनुभव करें",
  "home.headline.2": "अपनी यात्रा आसानी से बनाएँ",
  "home.headline.3": "मार्ग और किराए की जानकारी पाएँ",
  "home.headline.4": "बस ट्रैकर में आपका स्वागत है",
  "home.strapline": "आपकी यात्रा, हमारी प्राथमिकता — तेज़, सुरक्षित और भरोसेमंद",
  "home.search.label": "स्टॉप, मार्ग और जगहें खोजें",
  "home.search.placeholder": "स्टॉप, मार्ग या जगह खोजें",

  "home.why": "हमारे साथ क्यों चलें",
  "home.feature.timetable.title": "प्रकाशित समय सारणी",
  "home.feature.timetable.body":
    "प्रस्थान संचालक की प्रकाशित समय सारणी से आते हैं, और आज की सेवा के लिए दिखाए जाते हैं।",
  "home.feature.live.title": "साझा होने पर लाइव",
  "home.feature.live.body":
    "बस मानचित्र पर तभी दिखती है जब उसका चालक अपनी स्थिति साझा कर रहा हो। कोई अनुमान नहीं लगाया जाता।",
  "home.feature.fares.title": "आधिकारिक किराया",
  "home.feature.fares.body":
    "किराया आधिकारिक BRTS किराया सूची से आता है, मानचित्र पर मापी गई दूरी से कभी नहीं।",
  "home.feature.plan.title": "योजना एक ही जगह",
  "home.feature.plan.body":
    "दो स्टॉप चुनिए और प्रस्थान, किराया तथा यात्रा का समय एक साथ देखिए।",

  "home.places.title": "देखने लायक जगहें",
  "home.places.body":
    "नवा रायपुर के परिसर, अस्पताल, सरकारी कार्यालय और दर्शनीय स्थल — हर एक के पास का BRT स्टॉप साथ में।",
  "home.places.cta": "आसपास की जगहें देखें",

  "home.next.title": "आज अभी बाकी",
  "home.next.finished": "आज की सेवा समाप्त हो चुकी है।",
  "home.next.checkTimetable": "समय सारणी देखें",
  "home.next.forWhenItStarts": "कि यह दोबारा कब शुरू होगी।",

  "fares.title": "आधिकारिक किराया जानकारी",
  "fares.intro":
    "आधिकारिक BRTS किराया संरचना के साथ निश्चिंत होकर यात्रा कीजिए। किन्हीं दो स्टॉप के बीच का किराया देखिए, या पूरी सूची पढ़िए।",
  "fares.sameStop": "दो अलग-अलग स्टॉप चुनिए।",
  "fares.findDepartures": "प्रस्थान देखें और बुक करें",
  "fares.noFare":
    "आधिकारिक सूची में इस यात्रा के लिए कोई किराया प्रकाशित नहीं है, इसलिए इसे अभी बुक नहीं किया जा सकता।",
  "fares.popular": "लोकप्रिय यात्राएँ",
  "fares.chart": "आधिकारिक किराया सूची",
  "fares.openFullScreen": "पूरी स्क्रीन पर खोलें",
  "fares.cannotDisplay": "आपका ब्राउज़र किराया सूची यहीं नहीं दिखा सकता।",
  "fares.openNewTab": "इसे नए टैब में खोलें",
  "fares.notes": "किराए की जानकारी",
  "fares.note.1":
    "किराया Nava Raipur Atal Nagar के लिए आधिकारिक Tatpar BRTS किराया सूची के अनुसार है।",
  "fares.note.2":
    "किराया इस पर निर्भर करता है कि आप किस स्टॉप से चढ़े और किस स्टॉप पर उतरे, बस में तय की गई दूरी पर नहीं।",
  "fares.note.3": "किन्हीं दो स्टॉप के बीच दोनों दिशाओं में एक ही किराया लगता है।",
  "fares.note.4":
    "जिस जोड़ी के लिए आधिकारिक सूची में किराया प्रकाशित नहीं है, वह यात्रा बुक नहीं की जा सकती।",

  "timetable.source": "{publisher} द्वारा प्रकाशित समय, {date} को पढ़े गए।",
  "about.timetable.heading": "समय सारणी कहाँ से आई",
  "about.timetable.body":
    "इस साइट का हर प्रस्थान एक ही दस्तावेज़ से पढ़ा गया है: {title}, जिसे {publisher} ने {document} के रूप में प्रकाशित किया। इसे {date} को पढ़ा गया था, और उसके बाद इसमें कुछ जोड़ा नहीं गया है।",
  "about.timetable.stale":
    "अगर संचालक ने इसे दोबारा छापा है, तो हम पीछे हो सकते हैं। स्टॉप पर लगी छपी समय सारणी संचालक की है; यह उसी की एक प्रति है, तारीख़ के साथ।",

  "timetable.title": "बस समय सारणी",
  "timetable.nextFrom": "{stop} से अगली बस",
  "timetable.scheduled": "निर्धारित · मार्ग {route}",
  "timetable.then": "फिर",
  "timetable.finished": "आज की सेवा समाप्त हो चुकी है",
  "timetable.resumes": "{weekday} को फिर शुरू —",
  "timetable.onThe": "({service})।",
  "timetable.showing":
    "{shown} दिखाई जा रही है। बुकिंग आज की {today} पर ही रहेगी।",

  "service.weekdays": "सप्ताह के दिन",
  "service.weekends": "सप्ताहांत",
  "timetable.notToday":
    "यह सेवा आज नहीं चलती, इसलिए इसे बुक नहीं किया जा सकता। समय केवल जानकारी के लिए दिए गए हैं।",
  "timetable.departs": "प्रस्थान",
  "timetable.next": "अगली",
  "timetable.serviceDay": "सेवा का दिन",
  "timetable.caption": "BRT सेवा - {direction} ({service})",
  "booking.book": "बुक",
  "booking.bookTrip": "मार्ग {route}, प्रस्थान {time}",
  "service.weekday": "सप्ताह के दिनों की सेवा",
  "service.weekend": "सप्ताहांत की सेवा",
  "service.weekday.short": "सप्ताह के दिन",
  "service.weekend.short": "सप्ताहांत",
  "timetable.today": " (आज)",
  "timetable.towards": "{terminus} की ओर",
  "timetable.fromStop": "{stop} से · ",
  "timetable.alsoToday": " · आज",
  "timetable.now": "अभी {time}",
  "timetable.noneForDirection":
    "इस दिशा के लिए {service} पर कोई सेवा प्रकाशित नहीं है।",

  "plan.officialFare": "आधिकारिक किराया",
  "plan.bookTicket": "टिकट बुक करें",
  "plan.todayOnly":
    "टिकट आज की यात्रा के लिए ही जारी होते हैं, इसलिए बुकिंग केवल आज के प्रस्थानों पर उपलब्ध है।",
  "plan.noTrip":
    "चुने हुए दिन {time} के बाद {from} से {to} तक कोई प्रकाशित यात्रा नहीं चलती। दोनों दिशाएँ खोजी जाती हैं; कोई पहले का समय आज़माइए, या समय सारणी में देखिए कि यह यात्रा किन दिनों चलती है।",
  "home.busAlt": "रायपुर से नया रायपुर कॉरिडोर पर एक BRT बस",
  "home.places.short":
    "नवा रायपुर के परिसर, अस्पताल, सरकारी कार्यालय और दर्शनीय स्थल — हर एक के पास का BRT स्टॉप साथ में।",
  "fares.from": "कहाँ से",
  "fares.notPublished": "प्रकाशित नहीं",
  "fares.download": "डाउनलोड",
  "fares.chartTitle": "आधिकारिक Tatpar BRTS किराया सूची",
  "action.dismiss": "हटाएँ",

  "plan.change.title": "सीधी बस नहीं है, पर एक बार बदलकर पहुँचा जा सकता है",
  "plan.change.intro":
    "समय प्रकाशित समय सारणी के हैं। प्लेटफ़ॉर्म तक चलने या बस के देर होने के लिए कोई छूट नहीं जोड़ी गई है, क्योंकि समय सारणी यह नहीं बताती कि उनमें कितना समय लगता है।",
  "plan.change.route": "मार्ग {route}",
  "plan.change.changeAt": "{stop} पर बदलिए",
  "plan.change.wait": "{minutes} मिनट प्रतीक्षा",
  "plan.change.noWait": "प्रतीक्षा नहीं",
  "plan.change.cannotBook":
    "बदलाव वाली यात्रा यहाँ बुक नहीं की जा सकती। हर हिस्से का टिकट अलग होता है, इसलिए उन्हें समय सारणी से बुक कीजिए।",
  "plan.change.arrives": "{time} पर पहुँचती है",
  "plan.departureOne": "{count} प्रस्थान",
  "plan.departureMany": "{count} प्रस्थान",

  "plan.title": "अपनी यात्रा की योजना बनाइए",
  "plan.intro":
    "चुनिए कि आप कहाँ से चढ़ेंगे और कहाँ जाना है। किराया आधिकारिक BRTS किराया सूची से आता है।",
  "plan.browseNearby": "तय नहीं कि कहाँ जाएँ? आसपास की जगहें देखिए",
  "plan.from": "कहाँ से",
  "plan.to": "कहाँ तक",
  "plan.date": "यात्रा की तारीख",
  "plan.leavingAfter": "इसके बाद निकलना है",
  "plan.search": "यात्राएँ खोजें",
  "plan.swap": "अदला-बदली",
  "plan.sameStop": "दो अलग-अलग स्टॉप चुनिए।",
  "plan.unresolved":
    "दोनों स्टॉप सुझावों में से चुनिए, तभी किराया बताया जा सकता है।",
  "plan.notPublished": "प्रकाशित नहीं",
  "plan.noFare":
    "आधिकारिक किराया सूची में इस यात्रा का किराया नहीं है, इसलिए इसे अभी बुक नहीं किया जा सकता।",
  "plan.noService": "इस यात्रा के लिए कोई निर्धारित सेवा नहीं है",
  "plan.unservedStop":
    "{stop} प्रकाशित नेटवर्क में है, पर वहाँ से अभी कोई प्रस्थान नहीं है। समय सारणी किन स्टॉप को कवर करती है, यह देखने के लिए मार्ग देखिए।",
  "stopField.placeholder": "स्टॉप खोजने के लिए लिखिए",



  "booking.title": "अपना टिकट बुक कीजिए",
  "booking.description":
    "मार्ग {route}, प्रस्थान {time}। चुनिए कि आप कहाँ से चढ़ेंगे और कहाँ तक जाएँगे।",
  "booking.fromStop": "किस स्टॉप से",
  "booking.toStop": "किस स्टॉप तक",
  "booking.selectDestination": "गंतव्य चुनिए",
  "journey.from": "कहाँ से",
  "journey.to": "कहाँ तक",
  "journey.departure": "प्रस्थान",
  "journey.arrival": "आगमन",
  "booking.fare": "किराया",
  "booking.departed": "यह बस जा चुकी है। कृपया बाद की कोई सेवा चुनिए।",
  "booking.unpriced":
    "इस यात्रा के लिए अभी कोई किराया प्रकाशित नहीं है, इसलिए इसे बुक नहीं किया जा सकता। कृपया कोई दूसरा गंतव्य चुनिए।",
  "booking.conflict":
    "आपके पास पहले से {from} से {to} तक का टिकट है, जो इस यात्रा से टकराता है।",
  "booking.proceed": "भुगतान के लिए आगे बढ़ें",


  "booking.failure.notAuthenticated": "टिकट बुक करने के लिए साइन इन कीजिए।",
  "booking.failure.alreadyDeparted":
    "यह सेवा जा चुकी है। कृपया बाद की कोई बस चुनिए।",
  "booking.failure.overlapping":
    "आपके पास पहले से एक ऐसी यात्रा का टिकट है जो इससे टकराती है।",
  "booking.failure.invalidJourney":
    "यह यात्रा मान्य नहीं है। कृपया अपने स्टॉप दोबारा चुनिए।",
  "booking.failure.storageFailed":
    "आपका टिकट सहेजा नहीं जा सका। आपके डिवाइस की मेमोरी भरी हो सकती है।",

  "payment.failure.declined":
    "भुगतान अस्वीकार कर दिया गया। आपके खाते से कोई राशि नहीं गई है।",
  "payment.failure.unavailable":
    "अभी भुगतान उपलब्ध नहीं है। कृपया थोड़ी देर बाद कोशिश कीजिए।",

  "payment.title": "भुगतान",
  "payment.description":
    "अपनी यात्रा देख लीजिए, फिर पुष्टि कीजिए और वर्चुअल टिकट पाइए।",
  "payment.srTo": "से",
  "payment.srUntil": "तक",

  /* Must stay as plain as the English. Softening it would mislead. */
  "payment.noMoney.title": "कोई भुगतान नहीं लिया जाएगा",
  "payment.noMoney.body":
    "यह सेवा किसी भुगतान प्रदाता से जुड़ी नहीं है। पुष्टि करने पर केवल एक प्रदर्शन टिकट बनता है और कोई राशि नहीं जाती। किराया हमेशा की तरह बस में कंडक्टर को दीजिए।",

  "payment.pay": "₹{fare} का भुगतान करें",
  "payment.payDemo": "₹{fare} का प्रदर्शन टिकट बनाएँ",

  "payment.processing.title": "भुगतान हो रहा है",
  "payment.processing.description":
    "इसमें बस एक पल लगेगा। कृपया यह विंडो बंद न कीजिए।",
  "payment.processing.status": "भुगतान हो रहा है…",

  "payment.success.title": "भुगतान सफल",
  "payment.success.description": "{from} से {to} तक का आपका टिकट पक्का हो गया है।",
  "payment.success.demo": "प्रदर्शन टिकट। कोई भुगतान नहीं लिया गया।",
  "payment.success.notSaved":
    "आपका टिकट इस डिवाइस पर सहेजा नहीं जा सका, इसलिए बाद में यह यहाँ न मिले।",
  "payment.viewTicket": "मेरा टिकट देखें",

  "payment.failed.title": "भुगतान असफल",
  "payment.failed.generic": "भुगतान करते समय कुछ गड़बड़ हो गई।",
  "payment.error.signedOut": "यह भुगतान पूरा करने के लिए साइन इन करना ज़रूरी है।",
  "payment.error.unknown":
    "आपका भुगतान पूरा नहीं हो सका। कृपया फिर कोशिश कीजिए।",

  "payment.announce.signedOut": "भुगतान असफल। साइन इन करना ज़रूरी है।",
  "payment.announce.bookingFailed": "बुकिंग असफल। {reason}",
  "payment.announce.processing": "आपका भुगतान हो रहा है, कृपया प्रतीक्षा कीजिए।",
  "payment.announce.paymentFailed": "भुगतान असफल। {reason}",
  "payment.announce.success":
    "भुगतान सफल। {from} से {to} तक का आपका टिकट पक्का हो गया है।",
  "payment.announce.retry": "भुगतान असफल। कृपया फिर कोशिश कीजिए।",



  "ticket.expired": "समाप्त",
  "ticket.heading": "मार्ग {route} · {from} से {to}",
  "ticket.statusPrefix": "टिकट की स्थिति: ",
  "ticket.farePaid": "चुकाया किराया",
  "ticket.validFor": "इतनी देर मान्य",
  "ticket.qrLabel": "बुकिंग {id} के लिए बोर्डिंग QR कोड",
  "ticket.qrLabelExpired": "बुकिंग {id} के लिए समाप्त हो चुका बोर्डिंग QR कोड",
  "ticket.copied": "बुकिंग संदर्भ कॉपी हो गया",
  "ticket.copy": "बुकिंग संदर्भ {id} कॉपी करें",
  "ticket.saveQr": "QR सहेजें",
  "ticket.cancel": "टिकट रद्द करें",
  "ticket.cancelFor": " {from} से {to} के लिए",

  /* Hindi does not inflect "मिनट" for number, so both read the same. */
  "ticket.announce.validForOne": "आपका टिकट लगभग {minutes} मिनट और मान्य है।",
  "ticket.announce.validForMany": "आपका टिकट लगभग {minutes} मिनट और मान्य है।",
  "ticket.announce.copied": "बुकिंग संदर्भ क्लिपबोर्ड पर कॉपी हो गया।",
  "ticket.announce.copyFailed": "बुकिंग संदर्भ कॉपी नहीं हो सका।",
  "ticket.announce.qrFailed": "QR कोड डाउनलोड के लिए तैयार नहीं हो सका।",
  "ticket.announce.qrDownloaded": "QR कोड डाउनलोड हो गया।",


  "dashboard.avatarAlt": "उपयोगकर्ता",
  "dashboard.passenger": "यात्री",
  "dashboard.tripsCompleted": "पूरी हुई यात्राएँ",
  "dashboard.totalSpent": "कुल ख़र्च",
  "dashboard.favouriteRoute": "पसंदीदा मार्ग",

  "dashboard.yourTicket": "आपका टिकट",
  "dashboard.noActiveTickets": "कोई चालू टिकट नहीं",
  "dashboard.bookPrompt":
    "समय सारणी से सीट बुक कीजिए, आपका टिकट यहाँ दिखने लगेगा।",
  "dashboard.bookCta": "टिकट बुक करें",

  "dashboard.alerts.title": "आगमन सूचनाएँ",
  "dashboard.alerts.body":
    "आपकी बस जब आपके चढ़ने वाले स्टॉप के पास पहुँचती है, तब बताती हैं।",
  "dashboard.alerts.on": "चालू",
  "dashboard.alerts.off": "बंद",
  "dashboard.alerts.suffix": " — आगमन सूचनाएँ",
  "dashboard.alerts.switchedOn": "आगमन सूचनाएँ चालू कर दी गईं।",
  "dashboard.alerts.switchedOff": "आगमन सूचनाएँ बंद कर दी गईं।",
  "dashboard.alerts.failed": "आपकी सूचना सेटिंग नहीं बदली जा सकी।",

  "dashboard.history.title": "टिकट इतिहास",
  "dashboard.history.filterLabel": "टिकट इतिहास छाँटें",
  "dashboard.filter.all": "सभी",
  "dashboard.history.emptyAll": "अभी तक कोई पिछली यात्रा नहीं",
  "dashboard.history.emptyCompleted": "कोई पूरी हुई यात्रा का टिकट नहीं",
  "dashboard.history.emptyCancelled": "कोई रद्द किया गया टिकट नहीं",

  "dashboard.cancel.failed":
    "यह टिकट रद्द नहीं हो सका। हो सकता है बस जा चुकी हो।",
  "dashboard.cancel.done": "टिकट रद्द हो गया।",
  "dashboard.cancel.announced": "आपका टिकट रद्द कर दिया गया है।",


  "place.notFound.title": "उस जगह के लिए हमारे पास कोई पेज नहीं है",
  "place.notFound.body": "हो सकता है उसका नाम बदल गया हो, या लिंक ग़लत हो।",
  "place.back": "आसपास की जगहों पर वापस",
  "place.allNearby": "आसपास की सभी जगहें",
  "place.operatorListing": "संचालक की सूची",
  "place.gettingThere": "वहाँ कैसे पहुँचें",
  "place.row.nearestStop": "सबसे पास का स्टॉप",
  "place.registryStop":
    "इस जगह के लिए संचालक कोई BRT पहुँच प्रकाशित नहीं करता। यह स्टॉप हमारी अपनी नेटवर्क सूची से आया है।",
  "place.row.routes": "वहाँ रुकने वाले मार्ग",
  "place.noRoutes": "प्रकाशित नेटवर्क का कोई मार्ग इस स्टॉप पर नहीं रुकता।",
  "place.row.service": "निर्धारित सेवा",
  "place.scheduled":
    "इस स्टॉप के प्रस्थान प्रकाशित हैं, इसलिए वहाँ तक की यात्रा की योजना बनाई जा सकती है।",
  "place.unserved":
    "यह स्टॉप प्रकाशित नेटवर्क में है, पर वहाँ से अभी कोई प्रस्थान नहीं है, इसलिए वहाँ तक की यात्रा की योजना नहीं बनाई जा सकती।",
  "place.row.hours": "खुलने का समय",
  "place.row.phone": "फ़ोन",
  "place.row.website": "वेबसाइट",
  "place.about": "इस जानकारी के बारे में",
  "place.row.location": "स्थान",
  "place.noMap": "हम इस जगह को मानचित्र पर नहीं दिखाते।",
  "place.uncheckedLead": "एक प्रकाशित निर्देशांक मौजूद है, पर",
  "place.uncheckedEmphasis": "उसे मौक़े पर किसी ने जाँचा नहीं है",
  "place.uncheckedRest": ", इसलिए यहाँ दूरियों के लिए उसका इस्तेमाल नहीं होता।",
  "place.noCoordinate":
    "इस जगह के लिए कोई स्रोत निर्देशांक प्रकाशित नहीं करता।",
  "place.row.source": "स्रोत",
  "place.row.lastChecked": "आख़िरी बार जाँचा गया",
  "routes.intro":
    "आधिकारिक Tatpar BRTS नेटवर्क में प्रकाशित हर मार्ग, वह किन स्टॉप पर रुकता है, और आप कहाँ बस बदल सकते हैं।",
  "routes.cycle":
    "प्रकाशित मार्ग किसी साझा स्टॉप के क्रम पर एकमत नहीं हैं, इसलिए एक ही आरेख उन्हें नहीं दिखा सकता। नीचे हर मार्ग की स्टॉप सूची इससे प्रभावित नहीं है।",
  "routes.noDepartures": "अभी कोई निर्धारित प्रस्थान नहीं",
  "routes.someDepartures":
    "{total} में से {withDepartures} स्टॉप के प्रस्थान निर्धारित हैं",
  "routes.oneDeparture":
    "{total} में से {withDepartures} स्टॉप का प्रस्थान निर्धारित है",
  "routes.planJourney": "यात्रा की योजना बनाइए",
  "routes.checkFares": "किराया देखिए",
  "routes.timetable": "समय सारणी",
  "routes.stat.stops": "स्टॉप",
  "routes.stat.interchanges": "इंटरचेंज",
  "routes.stat.withDepartures": "प्रस्थान वाले",
  "routes.stat.terminates": "अंतिम स्टॉप",

  "routes.diagramMeaning":
    "यह जुड़ाव का आरेख है, मानचित्र नहीं। यह दिखाता है कि कौन से मार्ग किन स्टॉप पर और किस क्रम में रुकते हैं — इस पर दूरियों और दिशाओं का कोई मतलब नहीं है।",
  "routes.stopsOne": "{stops} स्टॉप · {count} इंटरचेंज",
  "routes.stopsMany": "{stops} स्टॉप · {count} इंटरचेंज",
  "nav.openNavigation": "नेविगेशन मेन्यू खोलें",
  "nav.closeNavigation": "नेविगेशन मेन्यू बंद करें",
  "routes.weeklyOne": "{stops} स्टॉप · सप्ताह में {trips} प्रस्थान",
  "routes.weeklyMany": "{stops} स्टॉप · सप्ताह में {trips} प्रस्थान",
  "routes.title": "नेटवर्क देखिए",
  "routes.places": "इन मार्गों से जिन जगहों तक पहुँचा जा सकता है",
  "routes.today": "आज चल रही सेवाएँ",
  "routes.viewTimetable": "समय सारणी देखिए",
  "routes.connections": "नेटवर्क कैसे जुड़ता है",
  "routes.diagramNote":
    "यह जुड़ाव का आरेख है, मानचित्र नहीं। यह दिखाता है कि कौन से मार्ग किन स्टॉप पर रुकते हैं, यह नहीं कि वे स्टॉप कहाँ हैं।",
  "routes.showSimulated": "नक़ली फ़्लीट दिखाएँ",
  "routes.hideSimulated": "नक़ली फ़्लीट छिपाएँ",
  "routes.viewLabel": "नेटवर्क दृश्य",
  "routes.diagram": "आरेख",
  "routes.table": "तालिका",
  "routes.legend": "आरेख की कुंजी",
  "routes.interchange": "इंटरचेंज",
  "routes.official": "आधिकारिक नेटवर्क मार्ग",
  "routes.find": "कोई मार्ग ढूँढिए",
  "routes.searchPlaceholder": "मार्ग या स्टॉप के नाम से खोजिए",
  "routes.tryAnother":
    "कोई मार्ग नाम, मार्ग क्रमांक, या किसी स्टॉप का नाम आज़माइए।",
  "routes.clearSearch": "खोज हटाएँ",
  "routes.allScheduled": "सभी स्टॉप के प्रस्थान निर्धारित हैं",

  "network.caption":
    "नेटवर्क का हर स्टॉप और वहाँ रुकने वाले मार्ग। स्टॉप उसी क्रम में दिए गए हैं जिस क्रम में मार्ग उन पर रुकते हैं।",
  "network.col.stop": "स्टॉप",
  "network.col.routes": "यहाँ रुकने वाले मार्ग",
  "network.interchange": "इंटरचेंज",
  "outlook.next": "अगली {time} पर",
  "outlook.ended": "आज और कुछ नहीं — आख़िरी {time} पर थी",
  "outlook.none": "आज इस दिशा में कोई बस नहीं चलती",
  "outlook.title": "आपकी यात्राएँ",
  "outlook.body": "आपने यहाँ जो योजना बनाई, उसी से इस डिवाइस पर रखी गई हैं।",
  "journeys.title": "सहेजी और हाल की यात्राएँ",
  "journeys.save": "{journey} सहेजें",
  "journeys.remove": "सहेजी गई — {journey} हटाएँ",
  "journeys.full":
    "आपके पास पहले से {limit} सहेजी यात्राएँ हैं। नई सहेजने से पहले कोई एक हटाइए।",
  "journeys.forget": "{journey} हटाएँ",
  "journeys.clearRecent": "हाल की यात्राएँ हटाएँ",
  "alerts.title": "सेवा संबंधी घोषणाएँ",
  "alerts.affectsJourney": "आपकी यात्रा पर असर",
  "alerts.affectsRoute": "इस मार्ग पर असर",
  "alerts.severity.info": "सूचना",
  "alerts.severity.warning": "सेवा में बदलाव",
  "alerts.severity.critical": "बड़ा व्यवधान",
  "stopList.start": "शुरुआत",
  "stopList.end": "अंत",
  "stopList.interchange": "इंटरचेंज",
  "stopList.noDepartures": "अभी कोई प्रस्थान नहीं",

  "admin.welcome":
    "स्वागत है, {name}। सभी उपयोगकर्ता और उनकी भूमिकाएँ यहाँ से देखिए।",
  "admin.defaultName": "प्रशासक",
  "admin.refresh": "फिर से लोड करें",
  "admin.allowlist.lead": "केवल चालक की भूमिका देना काफ़ी नहीं है।",
  "admin.allowlist.body":
    "कोई चालक अपनी स्थिति तभी भेज सकता है जब उसकी उपयोगकर्ता आईडी Realtime Database के",
  "admin.allowlist.rest":
    "में जोड़ी जाए। वह नोड हर क्लाइंट के लिए जान-बूझकर बंद है, इसलिए उसे Firebase कंसोल से ही सेट करना पड़ता है।",
  "admin.searchLabel": "नाम या ईमेल से उपयोगकर्ता खोजिए",
  "admin.searchPlaceholder": "नाम या ईमेल से खोजिए…",
  "admin.shown": "{total} में से {shown} उपयोगकर्ता दिख रहे हैं",
  "admin.noMatch": "\"{query}\" से कोई उपयोगकर्ता मेल नहीं खाता",
  "admin.noUsers": "अभी कोई उपयोगकर्ता नहीं",
  "admin.clearSearch": "खोज हटाएँ",
  "admin.roster": "पंजीकृत उपयोगकर्ता और उनकी भूमिकाएँ",
  "admin.unknownUser": "अज्ञात",
  "admin.saving": "सहेजा जा रहा है…",
  "admin.save": "सहेजें",
  "admin.edit": "बदलें",
  "admin.truncated":
    "केवल पहले {limit} खाते लोड हुए हैं। गिनती और खोज इसी हिस्से पर लागू होती है।",
  "admin.audit.heading": "प्रशासनिक गतिविधि",
  "admin.audit.body":
    "हाल के {limit} भूमिका परिवर्तन और प्रकाशित सूचनाएँ। इन प्रविष्टियों को कोई भी, प्रशासक भी, बदल या हटा नहीं सकता।",
  "admin.audit.none": "अभी तक कोई प्रशासनिक बदलाव दर्ज नहीं हुआ है।",
  "admin.audit.roleChanged": "भूमिका बदली गई",
  "admin.audit.noticePublished": "सूचना प्रकाशित हुई",
  "admin.role.selectFirst": "कृपया कोई भूमिका चुनिए",
  "admin.role.noPermission": "आपको भूमिकाएँ बदलने की अनुमति नहीं है।",
  "admin.role.updated": "भूमिका बदल दी गई!",
  "admin.role.user": "👤 उपयोगकर्ता (यात्री)",
  "admin.role.driver": "🚌 चालक",
  "admin.role.admin": "👨‍💼 प्रशासक",
  "notice.published": "घोषणा प्रकाशित हो गई।",
  "notice.warning":
    "यहाँ जो कुछ प्रकाशित होता है वह हर पेज पर, हर आगंतुक को दिखता है। केवल वही लिखिए जिसकी संचालक ने पुष्टि की हो।",
  "notice.title": "शीर्षक",
  "notice.message": "संदेश",
  "notice.severity": "गंभीरता",
  "notice.affects": "यह किस पर लागू है",
  "notice.affectsHint":
    "एक बार में एक ही चीज़ जोड़िए। मार्ग और स्टॉप दोनों चुनने का मतलब है उसी स्टॉप पर वही मार्ग; किसी और मार्ग या स्टॉप को शामिल करने के लिए दूसरी पंक्ति जोड़िए। कुछ न जोड़िए तो सूचना हर यात्री के लिए होगी।",
  "notice.route": "मार्ग",
  "notice.stop": "स्टॉप",
  "notice.add": "जोड़ें",
  "notice.when": "कब लागू है",
  "notice.starts": "शुरू",
  "notice.ends": "समाप्त",
  "notice.publishing": "प्रकाशित हो रहा है…",
  "notice.publish": "घोषणा प्रकाशित करें",
  "notice.none":
    "अभी तक कुछ प्रकाशित नहीं हुआ है। यात्रियों को कोई सूचना नहीं दिख रही।",
  "notice.retire": "हटाएँ",
  "notice.restore": "वापस लाएँ",

  "map.title": "लाइव बस ट्रैकिंग",
  "map.pause": "लाइव अपडेट रोकें",
  "map.resume": "लाइव अपडेट फिर शुरू करें",
  "map.announce.resumed": "लाइव अपडेट फिर शुरू हो गए।",
  "map.announce.paused":
    "लाइव अपडेट रोक दिए गए। कॉरिडोर {time} की स्थिति में दिखाया जा रहा है।",
  "map.pausedLead": "रुका हुआ। कॉरिडोर इस समय की स्थिति में दिखाया जा रहा है —",
  "map.updating": "बसों की सूचना आते ही अपने आप अपडेट हो रहा है।",
  "map.show": "दिखाएँ",
  "map.everyRoute": "सभी मार्ग",
  "map.frameTitle": "लाइव बस स्थितियाँ",
  "map.unavailable":
    "लाइव ट्रैकिंग अभी उपलब्ध नहीं है। कृपया बाद में कोशिश कीजिए।",
  "map.activeCount": "🚍 चालू बसें: {count}",
  "map.activeHeading": "चालू बसें",
  "map.loading": "बसें लोड हो रही हैं...",
  "map.none": "कोई बस चालू नहीं",
  "map.col.bus": "बस",
  "map.col.route": "मार्ग",
  "map.col.towards": "किस ओर",
  "map.col.status": "स्थिति",
  "map.col.lastUpdate": "पिछली सूचना",
  "map.simulated": "नक़ली",
  "map.noNextStop":
    "मार्ग और गंतव्य वही हैं जो बस बताती है। हम यह नहीं दिखाते कि वह अगला किस स्टॉप पर पहुँचेगी: उसके लिए सर्वे किए गए स्टॉप निर्देशांक चाहिए, जो इस कॉरिडोर के पास अभी नहीं हैं।",
  "nearby.title": "आसपास की जगहें",
  "nearby.intro":
    "नवा रायपुर की जगहें और हर एक का सबसे पास का BRT स्टॉप। वहाँ की यात्रा की योजना बनाइए, मार्ग देखिए, या किराया जाँचिए।",
  "nearby.find": "कोई जगह ढूँढिए",
  "nearby.searchPlaceholder": "जगह के नाम से खोजिए",
  "nearby.all": "सभी",
  "nearby.noMatch": "आपकी खोज से कोई जगह मेल नहीं खाती",
  "nearby.tryAnother": "कोई दूसरा नाम आज़माइए, या कोई और श्रेणी चुनिए।",
  "nearby.clearFilters": "फ़िल्टर हटाएँ",
  "nearby.officialListing": "आधिकारिक सूची",
  "nearby.unserved":
    "यह स्टॉप प्रकाशित नेटवर्क में है, पर वहाँ से अभी कोई प्रस्थान नहीं है, इसलिए वहाँ तक की यात्रा की योजना नहीं बनाई जा सकती।",
  "nearby.planJourney": "यात्रा की योजना",
  "nearby.route": "मार्ग",
  "nearby.fare": "किराया",
  "nearby.nearestStop": "सबसे पास का स्टॉप: {stop}",

  "contact.title": "हमारी टीम से मिलिए",
  "contact.intro":
    "हमारी टीम के सदस्य आपकी मदद के लिए हैं। सहायता, सहयोग या किसी सवाल के लिए कभी भी संपर्क कीजिए।",
  "notFound.title": "पेज नहीं मिला",
  "notFound.body":
    "आप जो पेज खोज रहे थे वह हमें नहीं मिला। हो सकता है वह हटा दिया गया हो, या लिंक पुराना हो।",
  "notFound.timetable": "समय सारणी देखिए",
  "search.intro": "कॉरिडोर के स्टॉप, मार्ग और जगहें — सब एक जगह।",
  "search.placeholder": "जैसे {stop}, {route}, या {place}",
  "search.begin": "शुरू करने के लिए कोई स्टॉप, मार्ग या जगह लिखिए।",
  "search.nothing": "“{query}” से कुछ मेल नहीं खाता",
  "search.onlyPublished":
    "केवल वही नाम खोजे जाते हैं जो कॉरिडोर वाक़ई प्रकाशित करता है, और कुछ भी अंदाज़े से नहीं जोड़ा जाता। वर्तनी जाँचिए, या",
  "search.browseRoutes": "हर मार्ग देखिए",
  "search.resultsOne": "“{query}” के लिए {count} परिणाम",
  "search.resultsMany": "“{query}” के लिए {count} परिणाम",
  "search.announce.none": "{query} के लिए कोई परिणाम नहीं",
  "search.announce.one": "{query} के लिए {count} परिणाम",
  "search.announce.many": "{query} के लिए {count} परिणाम",
  "search.kind.stop": "स्टॉप",
  "search.kind.route": "मार्ग",
  "search.kind.place": "जगह",

  "help.title": "यात्री सहायता",
  "help.intro":
    "यह सेवा कैसे चलती है, आपके टिकट का क्या मतलब है, और कुछ ग़लत लगे तो क्या कीजिए।",
  "help.plan.heading": "यात्रा की योजना",
  "help.plan.routes.q": "कौन से मार्ग चल रहे हैं?",
  "help.plan.routes.a":
    "इस कॉरिडोर पर {count} मार्ग यात्री ले जाते हैं: {names}। {express} एक्सप्रेस रूप है और दो ऐसे स्टॉप छोड़ देता है जहाँ {local} रुकती है।",
  "help.plan.routes.link": "हर मार्ग और उसके स्टॉप देखिए",
  "help.plan.noDepartures.q": "मेरे स्टॉप पर कोई प्रस्थान क्यों नहीं दिखता?",
  "help.plan.noDepartures.a":
    "प्रकाशित समय सारणी नेटवर्क के {total} में से {scheduled} स्टॉप को कवर करती है। बाक़ी मार्ग मानचित्र और किराया खोज में दिखते हैं, पर उनके लिए अभी कोई प्रस्थान समय प्रकाशित नहीं हुआ है, इसलिए वहाँ से कुछ बुक नहीं हो सकता।",
  "help.plan.change.q": "क्या हर जगह एक ही बस से पहुँचा जा सकता है?",
  "help.plan.change.a1":
    "हर जगह नहीं। कुछ स्टॉप जोड़ियों को कोई एक प्रकाशित यात्रा नहीं जोड़ती, और उनके लिए योजना पेज एक बार बदलाव वाली यात्रा दिखाता है: कौन सी बस लेनी है, कहाँ उतरना है, कितनी प्रतीक्षा है, और आगे कौन सी बस लेनी है।",
  "help.plan.change.a2":
    "प्रतीक्षा का समय केवल समय सारणी की गणना है। प्लेटफ़ॉर्म तक चलने या बस के देर होने के लिए कोई छूट नहीं जोड़ी गई, क्योंकि समय सारणी यह नहीं बताती कि उनमें कितना समय लगता है। बदलाव वाली यात्रा के दो टिकट होते हैं, इसलिए उसे यहाँ एक साथ बुक नहीं किया जा सकता।",
  "help.plan.times.q": "समय कहाँ से आते हैं?",
  "help.plan.times.a":
    "प्रस्थान सप्ताह के दिनों और सप्ताहांत की प्रकाशित समय सारणियों से आते हैं। दोनों की सेवाएँ अलग हैं, इसलिए जो यात्रा सोमवार को होती है वह रविवार को न हो।",
  "help.fares.heading": "किराया",
  "help.fares.calc.q": "मेरा किराया कैसे तय होता है?",
  "help.fares.calc.a":
    "किराया आधिकारिक BRTS किराया सूची से आता है, मानचित्र पर मापी गई दूरी से नहीं। किन्हीं दो स्टॉप के बीच दोनों दिशाओं में एक ही किराया लगता है।",
  "help.fares.unpriced.q": "कुछ जोड़ियों का कोई दाम नहीं दिखता। क्यों?",
  "help.fares.unpriced.a":
    "किराया तभी दिखाया जाता है जब आधिकारिक सूची में उस जोड़ी के लिए वह दर्ज हो। कुछ भी अनुमान से नहीं भरा जाता, इसलिए जिस जोड़ी का दाम नहीं है उसे अंदाज़े से बताने के बजाय अनुपलब्ध बताया जाता है।",
  "help.booking.heading": "टिकट बुक करना",
  "help.booking.refused.q": "बुकिंग किन कारणों से रुक जाती है?",
  "help.booking.two.q": "क्या मैं एक साथ दो टिकट रख सकता हूँ?",
  "help.booking.two.a":
    "तभी, जब दोनों यात्राओं का समय आपस में न टकराए। जो दूसरा टिकट उसी समय को कवर करता है जिसका टिकट आपके पास पहले से है, वह अस्वीकार कर दिया जाता है।",
  "help.ticket.heading": "आपका टिकट",
  "help.ticket.states.q": "टिकट की स्थितियों का क्या मतलब है?",
  "help.ticket.valid.q": "मेरा टिकट कब तक मान्य रहता है?",
  "help.ticket.valid.a":
    "निर्धारित आगमन के बाद {minutes} मिनट तक यह मान्य रहता है, ताकि देर से चल रही बस के कारण आपका टिकट बेकार न हो जाए।",
  "help.ticket.offline.q": "क्या बिना सिग्नल के मेरा टिकट काम करेगा?",
  "help.ticket.offline.a1":
    "हाँ, एक बार खोल लेने के बाद। पहली बार आने के बाद ऐप इस डिवाइस पर रह जाता है, इसलिए जो भी पेज आप पहले खोल चुके हैं — आपका टिकट भी — बिना किसी कनेक्शन के फिर खुल जाता है।",
  "help.ticket.offline.a2":
    "जो पेज आपने कभी नहीं खोला वह नहीं खुलेगा, क्योंकि दिखाने के लिए कुछ सहेजा ही नहीं गया। नया टिकट बुक करने के लिए कनेक्शन दोनों ही हाल में ज़रूरी है।",
  "help.ticket.devices.q": "क्या मैं अपने टिकट दूसरे डिवाइस पर देख सकता हूँ?",
  "help.ticket.devices.a":
    "हाँ। उसी खाते से साइन इन कीजिए, आपके टिकट और यात्रा इतिहास आपके साथ चले आते हैं।",
  "help.live.heading": "लाइव ट्रैकिंग",
  "help.live.which.q": "लाइव मानचित्र पर कौन सी बसें दिखती हैं?",
  "help.live.which.a":
    "केवल वे बसें जिनका चालक अपनी स्थिति साझा कर रहा है। जिस बस से {minutes} मिनट से कोई सूचना नहीं आई, उसे हटा दिया जाता है, क्योंकि इतनी पुरानी स्थिति यह नहीं बताती कि वह अब कहाँ है।",
  "help.live.link": "लाइव मानचित्र खोलिए",
  "help.live.empty.q": "मानचित्र ख़ाली है। क्या सेवा चल रही है?",
  "help.live.empty.a":
    "ख़ाली मानचित्र का मतलब है कि अभी कोई चालक अपनी स्थिति साझा नहीं कर रहा। इसका मतलब यह नहीं कि सेवा बंद है — निर्धारित प्रस्थान के लिए समय सारणी देखिए।",
  "help.live.driver.q": "क्या चालक की पहचान बताई जाती है?",
  "help.live.driver.a":
    "नहीं। हर वाहन एक छोटे लेबल से दिखाया जाता है, जैसे BUS-4K2P। चालक का नाम, ईमेल पता या खाता प्रकाशित नहीं होता।",
  "help.alerts.heading": "आगमन सूचनाएँ",
  "help.alerts.when.q": "मुझे कब बताया जाता है कि बस पास है?",
  "help.alerts.when.a":
    "जब अपनी स्थिति भेज रही कोई बस सीधी रेखा में आपके चढ़ने वाले स्टॉप से {radius} किमी के भीतर आ जाती है, और उस यात्रा का चालू टिकट आपके पास होता है।",
  "help.alerts.proximity":
    "यह नज़दीकी की सूचना है, आगमन का समय नहीं। इसे यह नहीं पता कि वह बस कौन सा मार्ग चला रही है, किस दिशा में जा रही है, या बीच की सड़क में कितना समय लगेगा — इसलिए यह कभी नहीं बताती कि बस कितने मिनट दूर है। समय के लिए समय सारणी में दिया निर्धारित प्रस्थान देखिए।",
  "help.alerts.off.q": "सूचनाएँ बंद कैसे करूँ?",
  "help.alerts.off.a":
    "अपना डैशबोर्ड खोलिए और आगमन सूचनाएँ बंद कर दीजिए। पहली बार चालू करने पर आपका ब्राउज़र अनुमति भी माँग सकता है; उसे मना करने से केवल डेस्कटॉप सूचना रुकती है, ऐप के भीतर वाली नहीं।",
  "help.data.heading": "आपका डेटा",
  "help.data.stored.q": "मेरे बारे में क्या सहेजा जाता है?",
  "help.data.stored.a1":
    "आपका नाम और ईमेल पता, ताकि आपके टिकट आपको ही दिखें और किसी और को नहीं। आपके टिकट यात्रा, किराए और बुकिंग के समय के साथ सहेजे जाते हैं।",
  "help.data.stored.a2":
    "टिकट इस डिवाइस पर और हमारे सर्वर पर, दोनों जगह रखे जाते हैं, इसलिए एक प्रति खोने से आपका टिकट नहीं खोता।",
  "help.data.location.q": "क्या मेरी लोकेशन ट्रैक की जाती है?",
  "help.data.location.a":
    "नहीं। यात्रियों की स्थिति कभी नहीं ली जाती। बस की स्थिति चालक के अपने डिवाइस से आती है, और केवल तब जब उन्होंने अपनी शिफ़्ट के लिए उसे साझा करना चुना हो।",
  "help.data.others.q": "दूसरे लोग क्या देख सकते हैं?",
  "help.data.others.a1":
    "लाइव बस स्थितियाँ सार्वजनिक हैं, क्योंकि मानचित्र एक सार्वजनिक पेज है। हर वाहन एक छोटे लेबल से दिखता है, जैसे BUS-4K2P — उसके साथ चालक का नाम, ईमेल पता या खाता प्रकाशित नहीं होता।",
  "help.data.others.a2":
    "आपके अपने टिकट और यात्रा इतिहास साइन इन करने पर केवल आपको दिखते हैं।",
  "help.data.delete.q": "क्या मैं अपना खाता हटा सकता हूँ?",
  "help.data.delete.lead":
    "ऐप के भीतर से नहीं। कहने पर खाते हटा दिए जाते हैं — कृपया",
  "help.data.delete.link": "टीम से संपर्क कीजिए",
  "help.account.heading": "आपका खाता और सहायता",
  "help.account.password.q": "मैं अपना पासवर्ड भूल गया हूँ।",
  "help.account.password.lead": "साइन इन पेज पर",
  "help.account.password.link": "पासवर्ड भूल गए",
  "help.account.password.rest":
    "का इस्तेमाल कीजिए। रीसेट लिंक आपके ईमेल पते पर भेजा जाता है। आपकी सुरक्षा के लिए वही पुष्टि दिखाई जाती है, चाहे उस पते पर खाता हो या न हो।",
  "help.account.wrong.q": "यहाँ कुछ ग़लत लग रहा है।",
  "help.account.wrong.lead":
    "समय सारणी, मार्ग और किराए की जानकारी आधिकारिक प्रकाशित स्रोतों के अनुसार है। अगर कुछ उससे मेल नहीं खाता जो आपने स्टॉप पर देखा, तो कृपया",
  "help.account.wrong.link": "टीम को बताइए",
  "help.account.wrong.rest": "ताकि उसे जाँचा जा सके।",

  "about.title": "BRT कॉरिडोर के बारे में",
  "about.intro":
    "बस रैपिड ट्रांज़िट क्या है, नवा रायपुर में क्या चलता है, और यह साइट उसके बारे में क्या बता सकती है और क्या नहीं।",
  "about.brt.heading": "बस रैपिड ट्रांज़िट क्या है",
  "about.brt.1":
    "बस रैपिड ट्रांज़िट में बसों की अपनी अलग लेन होती है, इसलिए वे बग़ल के ट्रैफ़िक में नहीं फँसतीं। यात्री सड़क किनारे नहीं, बने हुए स्टेशनों पर प्रतीक्षा करते हैं, बस के फ़र्श के बराबर ऊँचाई वाले प्लेटफ़ॉर्म से चढ़ते हैं, और प्रकाशित समय सारणी के अनुसार यात्रा करते हैं।",
  "about.brt.2":
    "इसका असली मक़सद यह है कि सेवा भरोसेमंद हो जाए। जो यात्रा आज बीस मिनट लेती है, कल भी बीस मिनट लेनी चाहिए — यही बात बस को काम पर जाने लायक़ बनाती है।",
  "about.service.heading": "नवा रायपुर की सेवा",
  "about.service.intro":
    "यह कॉरिडोर {operator} ({abbreviation}) चलाता है। नीचे दिए आँकड़े उनकी अपनी सेवा के बारे में उनके प्रकाशित आँकड़े हैं, हमारे नहीं।",
  "about.service.infrastructure": "कॉरिडोर का ढाँचा",
  "about.service.source":
    "स्रोत: {publication}, {url}, {retrieved} को पढ़ा गया। वह पेज {unreachable} से नहीं खुल रहा, इसलिए इन आँकड़ों को अभी उससे मिलाकर जाँचा नहीं जा सकता। इन्हें जैसे प्रकाशित हुए थे वैसे ही, {abbreviation} के नाम के साथ दिया गया है — अपने आँकड़ों के रूप में नहीं।",
  "about.stops.heading": "स्टॉप: क्या प्रकाशित है, और हम क्या दिखाते हैं",
  "about.stops.intro": "संचालक अपने ठहराव तीन समूहों में प्रकाशित करता है:",
  "about.stops.ours":
    "हमारी अपनी स्टॉप सूची में {total} स्टॉप हैं, जिनमें से {scheduled} के प्रस्थान समय प्रकाशित हैं। ये संख्याएँ संचालक की संख्याओं से मेल नहीं खातीं, और हमने मेल बिठाने के लिए कोई स्टॉप हटाया नहीं है। जहाँ दोनों में अंतर है, वहाँ क्या मौजूद है यह बताने का अधिकार संचालक का है; हम केवल यह बता रहे हैं कि हमारे पास क्या है।",
  "about.stops.unserved":
    "जिस स्टॉप के प्रस्थान समय नहीं हैं, वह भी मार्ग सूची और किराया खोज में दिखता है। वहाँ से कुछ बुक नहीं हो सकता, क्योंकि उसके लिए कोई समय प्रकाशित नहीं हुआ है।",
  "about.network.heading": "मार्ग और नेटवर्क",
  "about.network.body":
    "नेटवर्क एक मुख्य कॉरिडोर है जिससे फ़ीडर मार्ग जुड़ते हैं। हम {routes} नेटवर्क मार्ग और {interchanges} इंटरचेंज दिखाते हैं, जहाँ आप एक से दूसरे में बदल सकते हैं। समय सारणी में {workings} क्रमांकित संचालन प्रकाशित हैं, क्योंकि एक मार्ग एक से अधिक ठहराव-क्रम के साथ चलाया जाता है।",
  "about.network.link": "नेटवर्क आरेख और हर मार्ग देखिए",
  "about.fares.heading": "किराया",
  "about.fares.body":
    "किराया आधिकारिक BRTS किराया सूची से आता है। यह दूरी से नहीं निकाला जाता, और कुछ भी अनुमान से नहीं भरा जाता: जिस जोड़ी का किराया सूची में नहीं है, उसे भरने के बजाय अनुपलब्ध बताया जाता है। प्रकाशित किराया ₹{lowest} से ₹{highest} तक है, और किन्हीं दो स्टॉप के बीच दोनों दिशाओं में एक ही किराया लगता है।",
  "about.fares.link": "किन्हीं दो स्टॉप के बीच का किराया देखिए",
  "about.ride.heading": "यात्रा कैसे करें",
  "about.ride.lead":
    "अपना स्टॉप ढूँढिए, देखिए अगली बस कब निकलती है, किराया देखिए, फिर प्लेटफ़ॉर्म से चढ़िए। हर चरण का अपना पेज है:",
  "about.ride.plan": "यात्रा की योजना बनाइए",
  "about.ride.timetable": "समय सारणी पढ़िए",
  "about.ride.nearby": "कॉरिडोर के पास की जगहें देखिए",
  "about.ride.separator": ", ",
  "about.ride.or": ", या ",
  "about.sentenceEnd": "।",
  "about.live.heading": "लाइव ट्रैकिंग, और यह क्या नहीं बता सकती",
  "about.live.1":
    "लाइव स्थिति चालक के अपने डिवाइस से तब प्रकाशित होती है जब वे ड्यूटी पर होते हैं। इसलिए हर बस का दिखना तय नहीं है: जिस बस का चालक अपनी स्थिति साझा नहीं कर रहा, वह सामान्य रूप से चलते हुए भी हमें नहीं दिखती। ख़ाली मानचित्र का मतलब है कि हमें कोई स्थिति नहीं मिल रही, यह नहीं कि कोई बस नहीं आ रही।",
  "about.live.2":
    "मिली हुई स्थिति केवल चालू या बंद नहीं होती। हम जो भी बस दिखाते हैं, वह इनमें से किसी एक स्थिति में होती है:",
  "about.live.3":
    "लगभग {minutes} मिनट के बाद हम बस दिखाना बंद कर देते हैं, क्योंकि इतनी पुरानी स्थिति यह बताती है कि बस कहाँ थी, कहाँ है यह नहीं। हम इसमें से आगमन का समय नहीं निकालते: हमें पता है कि बस ने अपनी स्थिति कहाँ बताई, यह नहीं कि आगे सड़क पर क्या हो रहा है।",
  "about.tickets.heading": "डिजिटल टिकट",
  "about.tickets.stored":
    "यहाँ बुक किया गया टिकट आपके डिवाइस और हमारे सर्वर दोनों पर रहता है, और खोलने पर कोड के रूप में दिखता है।",
  "about.tickets.paid": "भुगतान {provider} के ज़रिए लिया जाता है।",
  "about.tickets.demo":
    "बुकिंग केवल प्रदर्शन है: कोई पैसा नहीं जाता, और यहाँ ख़रीदा गया टिकट किराए के रूप में मान्य नहीं है।",
  "about.tickets.offline":
    "पहली बार आने के बाद ऐप इस डिवाइस पर रह जाता है, इसलिए जो टिकट आप पहले खोल चुके हैं वह बिना कनेक्शन के भी खुल जाएगा। जो पेज आपने कभी नहीं खोला वह नहीं खुलेगा, और नया टिकट बुक करने के लिए कनेक्शन अब भी ज़रूरी है।",
  "about.updates.heading": "सेवा संबंधी सूचनाएँ",
  "about.updates.body":
    "कोई व्यवधान प्रकाशित होने पर वह यहाँ हर पेज के ऊपर दिखता है, केवल होम पेज पर नहीं, ताकि कोई बुकमार्क या सीधा लिंक उसे छिपा न सके। सूचनाएँ वही देते हैं जिन्हें इसका अधिकार है। हम उन्हें ख़ुद नहीं लिखते, और बसों के शांत रहने से व्यवधान का अनुमान नहीं लगाते।",
  "about.a11y.heading": "सुगम्यता",
  "about.a11y.1":
    "हर पेज कीबोर्ड से खोला और चलाया जा सकता है, फ़ोकस की दिखने वाली रेखा और मुख्य सामग्री पर जाने के लिंक के साथ। पेज बदलने की सूचना स्क्रीन रीडर को दी जाती है, और नेटवर्क आरेख के साथ-साथ तालिका के रूप में भी दिया जाता है, ताकि यहाँ कुछ भी मानचित्र पढ़ने पर निर्भर न रहे।",
  "about.a11y.2":
    "रंग कभी किसी स्थिति को बताने का अकेला तरीक़ा नहीं होता, और जब आपका सिस्टम कहता है तब एनिमेशन अपने आप कम कर दिया जाता है। अगर यहाँ कुछ आपके लिए इस्तेमाल लायक़ नहीं है, तो वह एक ख़ामी है और उसे बताना चाहिए —",
  "about.a11y.contactLink": "संपर्क पेज पर",
  "about.next.heading": "आगे क्या करने का इरादा है",
  "about.next.intro":
    "ये इरादे हैं, सुविधाएँ नहीं। इनमें से कुछ भी अभी मौजूद नहीं है:",
  "about.next.gtfs":
    "कॉरिडोर की समय सारणी को खुले ट्रांज़िट डेटा के रूप में प्रकाशित करना, ताकि वह केवल यहीं नहीं बल्कि दूसरे यात्रा प्लानरों में भी दिखे। फ़ीड बन चुकी है; अब उसे सर्वे किए गए स्टॉप निर्देशांक चाहिए, जो हमारे पास नहीं हैं।",
  "about.who.heading": "हम कौन हैं",
  "about.who.body":
    "यह एक स्वतंत्र, विद्यार्थी द्वारा बनाई गई परियोजना है। यह {abbreviation} का आधिकारिक उत्पाद नहीं है, संचालक से इसका कोई संबंध नहीं है, और यहाँ कुछ भी उनके द्वारा अनुमोदित नहीं है। सेवा की जानकारी प्रकाशित स्रोतों से, स्रोत बताते हुए दी गई है; सॉफ़्टवेयर हमारा है।",
  "about.who.link": "इसे किसने बनाया, और हम तक कैसे पहुँचें",

  "fleet.filterLabel": "चालक छाँटें",
  "fleet.filter.all": "सभी चालक",
  "fleet.filter.reporting": "सूचना भेज रहे",
  "fleet.filter.attention": "ध्यान चाहिए",
  "fleet.byState": "सूचना की स्थिति के अनुसार वाहन",
  "fleet.unreachable":
    "लाइव ट्रैकिंग तक पहुँच नहीं है, इसलिए कोई भी ड्यूटी पर नहीं दिख रहा। नीचे दी चालक सूची फिर भी सही है।",
  "fleet.noDrivers":
    "अभी किसी खाते के पास चालक की भूमिका नहीं है। किसी को बस की स्थिति भेजने देने के लिए नीचे भूमिका दीजिए।",
  "fleet.roster": "चालक और वे जो वाहन चला रहे हैं",
  "fleet.noShift": "शिफ़्ट शुरू नहीं हुई",
  "fleet.state.live": "लाइव",
  "fleet.state.recent": "हाल ही में",
  "fleet.state.stale": "पुरानी सूचना",
  "fleet.state.offline": "सूचना नहीं आ रही",
  "fleet.state.unknown": "पता नहीं",

  "fleet.state.live.detail": "अभी सूचना आ रही है।",
  "fleet.state.recent.detail": "पिछली सूचना एक-दो मिनट के भीतर आई थी।",
  "fleet.state.stale.detail":
    "पिछली सूचना कई मिनट पुरानी है, इसलिए बस तब से आगे बढ़ चुकी है।",
  "fleet.state.offline.detail":
    "इस बस से सूचना आना बंद हो गया है। हो सकता है यह अब भी चल रही हो।",
  "fleet.state.unknown.detail":
    "इस बस ने कोई काम का समय नहीं भेजा, इसलिए इसकी स्थिति का समय तय नहीं हो सकता।",

  "fleet.sharing.idle": "साझा नहीं हो रहा",
  "fleet.sharing.sharing": "आपकी लाइव स्थिति साझा हो रही है",
  "fleet.sharing.interrupted": "आपकी स्थिति यात्रियों तक नहीं पहुँच रही",
  /* Names only the cause that can be observed; stays general otherwise. */
  "fleet.interruption.background":
    "यह टैब पीछे चला गया था, और ब्राउज़र पीछे चल रहे टैब को स्थिति पढ़ने नहीं देते। शिफ़्ट के दौरान यह स्क्रीन खुली और जागती रखिए।",
  "fleet.interruption.signal":
    "पिछला अपडेट हम तक नहीं पहुँचा। अपना सिग्नल जाँचिए।",

  "driver.title": "चालक लाइव ट्रैकिंग",
  "driver.broadcastingAs": "इस रूप में प्रसारित",
  "driver.checking": "आपकी ड्यूटी देखी जा रही है…",
  "driver.noAssignment.lead": "अभी आपको कोई बस नहीं सौंपी गई है।",
  "driver.noAssignment.body":
    "स्थिति साझा करने के लिए संचालक की ओर से ड्यूटी मिलनी ज़रूरी है, और हर ड्यूटी एक शिफ़्ट के लिए होती है। उनसे बस सौंपने को कहिए।",
  "driver.routeLabel": "आप कौन सा मार्ग चला रहे हैं",
  "driver.stopToChange": "मार्ग बदलने के लिए साझा करना रोकिए।",
  "driver.sharingOn": " — {route}",
  "driver.interrupted.title": "आपकी स्थिति यात्रियों तक नहीं पहुँच रही।",
  "driver.latitude": "अक्षांश",
  "driver.longitude": "देशांतर",
  "driver.start": "साझा करना शुरू करें",
  "driver.stop": "साझा करना रोकें",
  "driver.privacy":
    "केवल आपके निर्देशांक और यह बस लेबल साझा होते हैं। आपका नाम और ईमेल पता कभी प्रकाशित नहीं होता।",
  "driver.error.permission":
    "अपनी स्थिति प्रसारित करने के लिए लोकेशन की अनुमति ज़रूरी है।",
  "driver.error.readFailed":
    "आपकी स्थिति पढ़ी नहीं जा सकी। कृपया फिर कोशिश कीजिए।",
  "driver.error.unavailable": "लाइव ट्रैकिंग अभी उपलब्ध नहीं है।",
  "driver.announce.interrupted":
    "आपकी स्थिति यात्रियों तक नहीं पहुँच रही। {reason}",

  "driver.dashboard.noAssignment":
    "अभी आपको कोई बस नहीं सौंपी गई है, इसलिए कुछ भी साझा नहीं हो रहा। संचालक हर शिफ़्ट के लिए बस सौंपते हैं।",
  "driver.dashboard.role": "चालक",
  "driver.dashboard.title": "लाइव स्थिति साझा करें",
  "driver.dashboard.body":
    "प्रसारण लाइव ट्रैकिंग पेज पर चलता है और आपके वहाँ से हटते ही रुक जाता है, इसलिए शिफ़्ट के दौरान वह पेज खुला रखिए।",
  "driver.dashboard.cta": "लाइव ट्रैकिंग खोलें",

  "ticket.status.pending": "बाकी",
  "ticket.status.active": "चालू",
  "ticket.status.boardingSoon": "चढ़ने का समय",
  "ticket.status.inTransit": "यात्रा में",
  "ticket.status.completed": "पूरी हुई",
  "ticket.status.cancelled": "रद्द",

  "login.signIn.title": "साइन इन करें",
  "login.signUp.title": "खाता बनाएँ",
  "login.reset.title": "पासवर्ड रीसेट करें",

  "login.email": "ईमेल",
  "login.password": "पासवर्ड",
  "login.name": "पूरा नाम",
  "field.required": " (ज़रूरी)",

  "login.signIn.action": "साइन इन",
  "login.signIn.pending": "साइन इन हो रहा है…",
  "login.signUp.action": "साइन अप",
  "login.signUp.pending": "खाता बनाया जा रहा है…",
  "login.google": "Google से जारी रखें",
  "login.forgot": "पासवर्ड भूल गए?",
  "login.backToSignIn": "साइन इन पर वापस",
  "login.passwordHint": "कम से कम 6 अक्षर।",

  "login.reset.intro":
    "अपना ईमेल भरिए, हम आपको नया पासवर्ड बनाने का लिंक भेजेंगे।",
  /* "अगर", not "जब" - the sentence must not confirm that the account exists. */
  "login.reset.sent":
    "अगर {email} के लिए कोई खाता है, तो पासवर्ड रीसेट लिंक भेजा जा रहा है। अपना इनबॉक्स और स्पैम फ़ोल्डर देखिए।",
  "login.reset.action": "रीसेट लिंक भेजें",
  "login.reset.pending": "भेजा जा रहा है…",

  "login.haveAccount": "पहले से खाता है?",
  "login.noAccount": "खाता नहीं है?",
  "login.showPassword": "पासवर्ड दिखाएँ",
  "login.hidePassword": "पासवर्ड छिपाएँ",

  "login.aside.newTitle": "नमस्ते!",
  "login.aside.newBody":
    "खाता नहीं है? अभी साइन अप कीजिए और बस टिकट बुक करके आसान यात्रा कीजिए।",
  "login.aside.returningTitle": "फिर से स्वागत है!",
  "login.aside.returningBody":
    "पहले से खाता है? टिकट बुक करना जारी रखने के लिए साइन इन कीजिए।",

  "login.announce.signInProblem": "साइन इन फ़ॉर्म में कोई समस्या है।",
  "login.announce.signUpProblem": "साइन अप फ़ॉर्म में कोई समस्या है।",
  "login.announce.resetProblem": "रीसेट फ़ॉर्म में कोई समस्या है।",
  "login.announce.signingIn": "आपको साइन इन किया जा रहा है…",
  "login.announce.creating": "आपका खाता बनाया जा रहा है…",
  "login.announce.resetSent":
    "अगर उस ईमेल पर खाता है, तो रीसेट लिंक भेजा जा रहा है।",


  "boundary.title": "कुछ गड़बड़ हो गई",
  "boundary.body":
    "यह पेज दिखाया नहीं जा सका। दोबारा लोड करने से आमतौर पर ठीक हो जाता है, ख़ासकर तब जब यह टैब खुला रहते हुए ऐप अपडेट हुआ हो।",
  "boundary.offlineTitle": "इस पेज के लिए कनेक्शन चाहिए",
  "boundary.offlineBody":
    "आप ऑफ़लाइन लग रहे हैं, और यह पेज इस डिवाइस पर पहले कभी नहीं खोला गया। जो पेज आप पहले देख चुके हैं, वे अब भी चलते हैं।",
  "boundary.reload": "पेज दोबारा लोड करें",
  "boundary.home": "होम पर वापस",

  "notification.dismiss": "सूचना हटाएँ",
  /* Must carry the same force: the app never claims an arrival time. */
  "notification.positionOnly": "केवल स्थिति — आगमन का समय नहीं",


  "route.loaded": "{page} पेज खुला",
  "page.placeNotFound": "जगह नहीं मिली",
  "page.unknown": "पेज",
  "page.home": "होम",
  "page.plan": "अपनी यात्रा की योजना",
  "page.routes": "मार्ग सूची",
  "page.nearby": "आसपास की जगहें",
  "page.map": "लाइव बस ट्रैकिंग",
  "page.timetable": "समय सारणी",
  "page.fares": "किराया",
  "page.contact": "संपर्क",
  "page.help": "यात्री सहायता",
  "page.about": "BRT कॉरिडोर के बारे में",
  "page.search": "खोज",
  "page.login": "साइन इन",
  "page.dashboard": "डैशबोर्ड",
  "page.driver": "चालक लाइव ट्रैकिंग",

  /* Says no more than the English does about what lies behind the refusal. */
  "help.refusalsIntro": "इन कारणों से बुकिंग अस्वीकार होती है:",
  "help.state.active":
    "— बुक है और प्रतीक्षा में, प्रस्थान से {minutes} मिनट से ज़्यादा पहले।",
  "help.state.boardingSoon": "— प्रस्थान से {minutes} मिनट के भीतर।",
  "help.state.inTransit": "— निर्धारित यात्रा चल रही है।",
  "help.state.completed": "— बस आपके गंतव्य तक पहुँच चुकी है।",
  "help.state.cancelled": "— आपने इसे रद्द किया। इसे वापस नहीं लिया जा सकता।",
  "help.statesFollowClock":
    "स्थितियाँ घड़ी के हिसाब से बदलती हैं, इसलिए टिकट अपने आप एक से दूसरी में जाता है, आपको कुछ रीफ़्रेश नहीं करना पड़ता।",

  "guard.checking": "आपकी पहुँच जाँची जा रही है…",
  "guard.deniedTitle": "पहुँच नहीं है",
  "guard.deniedBody": "आपको यह पेज देखने की अनुमति नहीं है।",

  "error.generic": "कुछ गड़बड़ हो गई। कृपया फिर कोशिश कीजिए।",
  "error.noPermission": "आपके पास यह काम करने की अनुमति नहीं है।",
  "error.signInRequired": "जारी रखने के लिए साइन इन कीजिए।",
  "error.network":
    "नेटवर्क उपलब्ध नहीं है। अपना कनेक्शन जाँचकर फिर कोशिश कीजिए।",
  "error.loadUsers": "उपयोगकर्ता लोड नहीं हो सके।",
  "error.updateRole": "वह भूमिका नहीं बदली जा सकी।",
  "error.loadAnnouncements": "घोषणाएँ लोड नहीं हो सकीं।",
  "error.shareLocation": "आपकी स्थिति साझा नहीं की जा सकी।",

  "validation.generic": "कृपया अपनी जानकारी जाँचिए।",
  "validation.email.required": "ईमेल भरना ज़रूरी है",
  "validation.email.tooLong": "ईमेल बहुत लंबा है",
  "validation.email.invalid": "कृपया सही ईमेल पता भरिए",
  "validation.password.tooShort": "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए",
  "validation.password.tooLong": "पासवर्ड 128 अक्षरों से ज़्यादा नहीं हो सकता",
  "validation.name.required": "नाम भरना ज़रूरी है",
  "validation.name.tooLong": "नाम बहुत लंबा है",
  "validation.name.invalid": "नाम में अमान्य अक्षर हैं",

  /*
    One string for every credential failure, exactly as in English. A more
    natural Hindi rendering that distinguished "यह खाता मौजूद नहीं है" from
    "पासवर्ड ग़लत है" would be better prose and a security defect.
  */
  "auth.error.credentials": "ईमेल या पासवर्ड ग़लत है।",
  "auth.error.tooManyAttempts":
    "बहुत बार कोशिश हो चुकी है। कुछ मिनट रुककर फिर कोशिश कीजिए।",
  "auth.error.disabled": "यह खाता बंद कर दिया गया है।",
  "auth.error.emailInUse": "इस ईमेल पते से पंजीकरण नहीं हो सकता।",
  "auth.error.weakPassword": "कम से कम 6 अक्षरों का पासवर्ड चुनिए।",
  "auth.error.cancelled": "साइन इन रद्द कर दिया गया।",
  "auth.error.popupBlocked":
    "आपके ब्राउज़र ने साइन इन विंडो रोक दी। कृपया पॉपअप की अनुमति देकर फिर कोशिश कीजिए।",
  "auth.error.network":
    "नेटवर्क उपलब्ध नहीं है। अपना कनेक्शन जाँचकर फिर कोशिश कीजिए।",
  "auth.error.generic": "साइन इन नहीं हो सका। कृपया फिर कोशिश कीजिए।",
  "auth.error.resetFailed":
    "रीसेट ईमेल नहीं भेजा जा सका। कृपया फिर कोशिश कीजिए।",
};
