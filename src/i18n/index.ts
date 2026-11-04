import { readonly, ref } from 'vue'
import messages from './my.json'

export type Locale = 'en' | 'my'
const storageKey = 'shwe-petit.locale'
function readLocale(): Locale {
  try {
    return localStorage.getItem(storageKey) === 'my' ? 'my' : 'en'
  } catch {
    return 'en'
  }
}
const currentLocale = ref<Locale>(readLocale())
export const locale = readonly(currentLocale)
function updateDocument() {
  if (typeof document !== 'undefined') document.documentElement.lang = currentLocale.value
}
export function setLocale(value: Locale) {
  if (value !== 'en' && value !== 'my') return
  currentLocale.value = value
  updateDocument()
  try {
    localStorage.setItem(storageKey, value)
  } catch {
    /* The switch still works in memory. */
  }
}
updateDocument()
if (typeof window !== 'undefined')
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey || event.key === null) {
      currentLocale.value = readLocale()
      updateDocument()
    }
  })

const catalog: Record<string, string> = messages
function dynamicMessage(source: string): string | undefined {
  const patterns: [RegExp, (label: string) => string][] = [
    [/^(.+) is required\.$/i, (label) => `${label} လိုအပ်သည်။`],
    [/^(.+) must be a number\.$/i, (label) => `${label} သည် ကိန်းဂဏန်းဖြစ်ရမည်။`],
    [/^(.+) must be finite\.$/i, (label) => `${label} သည် အကန့်အသတ်ရှိသောကိန်း ဖြစ်ရမည်။`],
    [/^(.+) cannot be negative\.$/i, (label) => `${label} သည် အနုတ်မဖြစ်ရပါ။`],
    [/^Choose (?:a |an |the )?(.+)\.$/i, (label) => `${label} ရွေးပါ။`],
    [/^Loading (.+?)(?:\.\.\.|…)$/i, (label) => `${label} ရယူနေသည်…`],
  ]
  for (const [pattern, format] of patterns) {
    const match = source.match(pattern)
    const label = match && catalog[match[1]!.toLowerCase()]
    if (label) return format(label)
  }
}
/** Translate interface messages only. Names, notes, codes and API values stay untouched. */
export function t(message: unknown, parameters: readonly unknown[] = []): string {
  if (message == null) return ''
  const source = String(message)
  const key = source.replace(/\s+/g, ' ').trim().toLowerCase()
  const translated =
    currentLocale.value === 'my'
      ? (catalog[key] ?? catalog[key.replaceAll('_', ' ')] ?? dynamicMessage(source) ?? source)
      : source
  return translated.replace(/\{(\d+)\}/g, (match, index: string) =>
    Number(index) < parameters.length ? String(parameters[Number(index)] ?? '') : match,
  )
}

/** Enum labels are presentation only; never replace select values or payload fields. */
export function enumLabel(value: unknown): string {
  if (value == null) return '—'
  return t(
    String(value)
      .replaceAll('_', ' ')
      .replace(/^./, (letter) => letter.toUpperCase()),
  )
}
export function dateLabel(date: Date, options: Intl.DateTimeFormatOptions): string {
  // Some Windows Edge builds omit Burmese ICU data and silently return English.
  if (currentLocale.value === 'my' && !Intl.DateTimeFormat.supportedLocalesOf('my-MM').length) {
    const months = [
      'ဇန်နဝါရီ',
      'ဖေဖော်ဝါရီ',
      'မတ်',
      'ဧပြီ',
      'မေ',
      'ဇွန်',
      'ဇူလိုင်',
      'ဩဂုတ်',
      'စက်တင်ဘာ',
      'အောက်တိုဘာ',
      'နိုဝင်ဘာ',
      'ဒီဇင်ဘာ',
    ]
    const shortMonths = [
      'ဇန်',
      'ဖေ',
      'မတ်',
      'ဧ',
      'မေ',
      'ဇွန်',
      'ဇူ',
      'ဩ',
      'စက်',
      'အောက်',
      'နို',
      'ဒီ',
    ]
    const weekdays = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ']
    const digits = (value: number) =>
      String(value).replace(/\d/g, (digit) => '၀၁၂၃၄၅၆၇၈၉'[Number(digit)]!)
    return [
      options.year ? digits(date.getFullYear()) : '',
      options.month ? (options.month === 'short' ? shortMonths : months)[date.getMonth()] : '',
      options.day ? digits(date.getDate()) : '',
      options.weekday ? weekdays[date.getDay()] : '',
    ]
      .filter(Boolean)
      .join(' ')
  }
  return new Intl.DateTimeFormat(currentLocale.value === 'my' ? 'my-MM' : 'en-US', options).format(
    date,
  )
}
