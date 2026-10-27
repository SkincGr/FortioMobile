import { useCallback } from 'react'
import { useI18n } from './i18n'
import { formText } from './formStrings'

/** Συνάρτηση κειμένων με κλειδιά ίδια με του web (π.χ. 'moveCard.floor_1'), όπως τη δέχονται τα lib/shared/* */
export type FormT = (key: string) => string

export function useFormT(): FormT {
  const { language } = useI18n()
  return useCallback((key: string) => formText(language, key), [language])
}
