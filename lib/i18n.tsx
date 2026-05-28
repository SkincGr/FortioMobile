import React, { createContext, useContext, useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'

const LANG_KEY = 'fortio_language'

export type Language = 'el' | 'en'

const el = {
  // Auth
  'auth.welcome':        'Καλωσόρισες',
  'auth.sign_in_sub':    'Σύνδεσε τον λογαριασμό σου',
  'auth.email':          'Email',
  'auth.password':       'Κωδικός',
  'auth.forgot':         'Ξέχασες τον κωδικό;',
  'auth.sign_in':        'Σύνδεση',
  'auth.no_account':     'Δεν έχεις λογαριασμό;',
  'auth.register':       'Εγγραφή',
  'auth.forgot_title':   'Επαναφορά Κωδικού',
  'auth.forgot_sub':     'Δώσε το email σου και θα σου στείλουμε οδηγίες.',
  'auth.send':           'Αποστολή',
  'auth.sent_ok':        'Email εστάλη! ✓',
  'auth.sent_check':     'Έλεγξε τα εισερχόμενά σου.',
  'auth.back':           '← Πίσω',
  // Dashboard
  'dash.welcome':        'Καλωσόρισες,',
  'dash.sender':         'Αποστολέας',
  'dash.active':         'Ενεργές',
  'dash.transit':        'Μεταφορά',
  'dash.completed':      'Ολοκλ.',
  'dash.new_shipment':   'Νέα Αποστολή',
  'dash.no_shipments':   'Δεν υπάρχουν αποστολές',
  'dash.create_now':     'Δημιούργησε τώρα →',
  'dash.sort_new':       'Νεότερα πρώτα',
  'dash.sort_old':       'Παλαιότερα πρώτα',
  'dash.sort_offers':    'Περισσότερες προσφορές',
  'dash.unread':         'αδιάβαστα',
  'dash.announcements':  'ανακοινώσεις',
  // Messages
  'msg.management':      'Διαχείρηση Μηνυμάτων',
  'msg.messages':        'Μηνύματα',
  'msg.offers':          'Προσφορές',
  'msg.unread':          'Αδιάβαστα',
  'msg.reply':           'Απάντηση',
  'msg.placeholder':     'Γράψε απάντηση...',
  'msg.empty':           'Δεν υπάρχουν μηνύματα',
  'msg.unread_dot':      'Αδιάβαστο',
  // Profile
  'profile.account':     'Στοιχεία Λογαριασμού',
  'profile.change_pass': 'Αλλαγή Κωδικού',
  'profile.forgot_pass': 'Επαναφορά Κωδικού',
  'profile.notifications':'Ειδοποιήσεις',
  'profile.language':    'Γλώσσα',
  'profile.theme':       'Εμφάνιση',
  'profile.dark_mode':   'Σκούρο θέμα',
  'profile.light_mode':  'Ανοιχτό θέμα',
  'profile.help':        'Βοήθεια & Υποστήριξη',
  'profile.about':       'Σχετικά με το Fortio',
  'profile.logout':      'Αποσύνδεση',
  'profile.logout_q':    'Θέλεις σίγουρα να αποσυνδεθείς;',
  'profile.cancel':      'Ακύρωση',
  'profile.sender':      'Αποστολέας',
  // Shipments
  'ship.new':            'Νέα Αποστολή',
  'ship.edit':           'Επεξεργασία Αποστολής',
  'ship.cancel':         '✕ Ακύρωση',
  'ship.category':       'Κατηγορία',
  'ship.route':          'Διαδρομή',
  'ship.details':        'Στοιχεία',
  'ship.next':           'Συνέχεια →',
  'ship.back':           '← Πίσω',
  'ship.publish':        'Δημοσίευση 🚀',
  'ship.save':           'Αποθήκευση ✓',
  'ship.publishing':     'Δημοσίευση...',
  'ship.saving':         'Αποθήκευση...',
  // Common
  'common.loading':      'Φόρτωση...',
  'common.error':        'Σφάλμα',
  'common.retry':        'Δοκίμασε ξανά',
  'common.back':         'Επιστροφή',
  'common.delete':       'Διαγραφή',
  'common.edit':         'Διόρθωση',
  'common.save':         'Αποθήκευση',
} as const

const en: Record<keyof typeof el, string> = {
  'auth.welcome':        'Welcome back',
  'auth.sign_in_sub':    'Sign in to your account',
  'auth.email':          'Email',
  'auth.password':       'Password',
  'auth.forgot':         'Forgot password?',
  'auth.sign_in':        'Sign In',
  'auth.no_account':     "Don't have an account?",
  'auth.register':       'Register',
  'auth.forgot_title':   'Password Reset',
  'auth.forgot_sub':     'Enter your email and we will send you instructions.',
  'auth.send':           'Send',
  'auth.sent_ok':        'Email sent! ✓',
  'auth.sent_check':     'Check your inbox.',
  'auth.back':           '← Back',
  'dash.welcome':        'Welcome,',
  'dash.sender':         'Sender',
  'dash.active':         'Active',
  'dash.transit':        'In Transit',
  'dash.completed':      'Done',
  'dash.new_shipment':   'New Shipment',
  'dash.no_shipments':   'No shipments',
  'dash.create_now':     'Create now →',
  'dash.sort_new':       'Newest first',
  'dash.sort_old':       'Oldest first',
  'dash.sort_offers':    'Most offers',
  'dash.unread':         'unread',
  'dash.announcements':  'announcements',
  'msg.management':      'Message Management',
  'msg.messages':        'Messages',
  'msg.offers':          'Offers',
  'msg.unread':          'Unread',
  'msg.reply':           'Reply',
  'msg.placeholder':     'Write a reply...',
  'msg.empty':           'No messages',
  'msg.unread_dot':      'Unread',
  'profile.account':     'Account Details',
  'profile.change_pass': 'Change Password',
  'profile.forgot_pass': 'Reset Password',
  'profile.notifications':'Notifications',
  'profile.language':    'Language',
  'profile.theme':       'Appearance',
  'profile.dark_mode':   'Dark mode',
  'profile.light_mode':  'Light mode',
  'profile.help':        'Help & Support',
  'profile.about':       'About Fortio',
  'profile.logout':      'Sign Out',
  'profile.logout_q':    'Are you sure you want to sign out?',
  'profile.cancel':      'Cancel',
  'profile.sender':      'Sender',
  'ship.new':            'New Shipment',
  'ship.edit':           'Edit Shipment',
  'ship.cancel':         '✕ Cancel',
  'ship.category':       'Category',
  'ship.route':          'Route',
  'ship.details':        'Details',
  'ship.next':           'Continue →',
  'ship.back':           '← Back',
  'ship.publish':        'Publish 🚀',
  'ship.save':           'Save ✓',
  'ship.publishing':     'Publishing...',
  'ship.saving':         'Saving...',
  'common.loading':      'Loading...',
  'common.error':        'Error',
  'common.retry':        'Try again',
  'common.back':         'Back',
  'common.delete':       'Delete',
  'common.edit':         'Edit',
  'common.save':         'Save',
}

const translations: Record<Language, Record<string, string>> = { el, en }

type I18nContextType = {
  language: Language
  setLanguage: (l: Language) => void
  t: (key: keyof typeof el) => string
}

const I18nContext = createContext<I18nContextType>({
  language: 'el',
  setLanguage: () => {},
  t: (key) => el[key],
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>('el')

  useEffect(() => {
    SecureStore.getItemAsync(LANG_KEY).then(v => {
      if (v === 'el' || v === 'en') setLang(v)
    })
  }, [])

  function setLanguage(l: Language) {
    setLang(l)
    SecureStore.setItemAsync(LANG_KEY, l)
  }

  function t(key: keyof typeof el): string {
    return translations[language][key] ?? el[key]
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
