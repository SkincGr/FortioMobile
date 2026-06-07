# Changes

## Files Modified

- `lib/api.ts` — `authApi.login` δέχεται `identifier` αντί `email`. Εάν περιέχει `@` στέλνει ως `email`, αλλιώς ως `username`.
- `lib/auth.tsx` — signature `login(identifier, password)` αντί `login(email, password)`.
- `app/(auth)/login.tsx` — state `identifier` αντί `email`, label `auth.identifier`, `keyboardType="default"`, placeholder `email ή username`.
- `lib/i18n.tsx` — νέο key `auth.identifier` (el: "Email ή Username", en: "Email or Username").

## Logic Flow

Ο web server (`/api/auth/mobile/login`) δέχεται `{ email?, username?, password }` και κάνει `identifier = email || username`.
Το mobile τώρα ανιχνεύει αν το input περιέχει `@`:
- Αν ναι → στέλνει `{ email: identifier, password }`
- Αν όχι → στέλνει `{ username: identifier, password }`

Το API contract δεν άλλαξε — δεν χρειάζεται τροποποίηση στο Fortio.
