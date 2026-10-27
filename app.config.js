// Παίρνει το app.json όπως είναι και προσθέτει μόνο το plugin του react-native-maps (χάρτης συντεταγμένων στη φόρμα αποστολής).
//
// Android: ο χάρτης είναι πάντα Google Maps και σε build (APK / store) θέλει κλειδί «Maps SDK for Android», περιορισμένο στο
// package com.skincgr.FortioMobile + SHA-1 του πιστοποιητικού υπογραφής. Είναι ξεχωριστό κλειδί από τα δύο του Fortio
// (browser key με referrer, server key με API/IP) — κανένα από εκείνα δεν δουλεύει σε εφαρμογή Android.
// Δίνεται με τη μεταβλητή GOOGLE_MAPS_ANDROID_API_KEY (π.χ. `eas env:create`), ώστε να μη μπαίνει στο git.
// Στο Expo Go ο χάρτης δουλεύει χωρίς κλειδί. iOS: Apple Maps, χωρίς κλειδί.
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-maps', process.env.GOOGLE_MAPS_ANDROID_API_KEY ? { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY } : {}],
  ],
})
