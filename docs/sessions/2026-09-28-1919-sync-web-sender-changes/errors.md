# Errors

## French i18n strings with apostrophes

- **What went wrong:** the script that appended the new i18n keys wrote French values like `'Annuler l'envoi'` inside single quotes (syntax error); a follow-up fix then re-quoted every value containing an apostrophe, which also turned existing escaped strings like `'Voir l\'offre'` into `"Voir l\\'offre"` (would display a stray backslash).
- **Why:** the fix matched any value containing `'`, not only the newly added unescaped ones.
- **Resolution:** reverted the mangled existing lines back to their original `\'` form; only the new keys use double quotes. Verified with `git diff` (additions only) and `npx tsc --noEmit`.
