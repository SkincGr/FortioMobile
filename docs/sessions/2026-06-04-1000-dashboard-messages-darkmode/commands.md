# Εντολές Session — 2026-06-04

1. Dashboard tab [Αποστολές] → μετονομασία σε [Αποστολές προς Διεκπεραίωση]
2. Dashboard — αφαίρεση κουμπιού [Μηνύματα] από κάρτες αποστολών
3. Web matches page — προσθήκη κουμπιού [Μηνύματα] δίπλα στο [Αίτημα Προσφοράς]
4. Mobile matches page — προσθήκη κουμπιού [Μηνύματα] με badge (0→popup, >0→messages center)
5. Διόρθωση λανθασμένου count μηνυμάτων (μετράγαμε offer=null)
6. CLAUDE.md — κανόνας: Fortio είναι read-only, όλες οι αλλαγές μόνο στο FortioMobile
7. Σχεδιασμός systematic page sync: web Fortio sender → mobile (mapping όλων των σελίδων)
8. Dashboard Tab 2 (Αιτήμ. Προσφορών) — προσθήκη κουμπιού "Δείτε Αίτημα →"
9. Dashboard — ολοκλήρωση όλων tabs: AWAITING statuses, Προβολή Προσφοράς modal, Μηνύματα σε tabs 4+5
10. Dashboard header — αφαίρεση badge "X αδιάβαστα"
11. Dashboard Tab 1 — fix count "Προσφορές" (PENDING + AWAITING_SENDER + AWAITING_CARRIER)
12. Matches page — διόρθωση count μηνυμάτων (Ηλεκτρονικά 0 αντί 4) — Fortio API fix
13. Dashboard Tab "Προσφορές Μεταφορέων" — πλήρες redesign layout (icon, carrier, price, status, route, stops, message, conditions, buttons)
14. Dashboard — μεταφορά ίδιου layout στο tab "Πρός Μεταφορά"
15. Dashboard — μεταφορά layout στο tab "Μεταφέρονται" (+ Μηνύματα button)
16. Κέντρο Μηνυμάτων — πλήρης rewrite index.tsx + [offerId].tsx ώστε να ταιριάζει με web
17. Messages center — αφαίρεση "Όλα" chip, auto-select πρώτης αποστολής
18. Messages center — fix κουμπί "Νέο" (amber bg + black text + focus subject + scroll chips)
19. Dashboard — dark mode με χρώματα Fortio web (#0a0a0a, amber, rgba)
20. Profile — προσθήκη [Προσωπικά Στοιχεία] και [Αλλαγή Password] + νέες σελίδες
21. Profile personal — debug αποτυχίας φόρτωσης (Fortio API δεν είχε mobile JWT auth)
22. Σχεδιασμός CLAUDE.md session docs με ώρα + αρχείο commands.md
23. Dark mode σε ΌΛΕΣ τις σελίδες (shipments, announcements, notifications, profile, auth, components)
