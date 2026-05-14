export function getFlagImageUrl(code: string, size: '24x18' | '32x24' | '48x36' = '24x18'): string {
  if (!code || code.length < 2) return ''
  return `https://flagcdn.com/${size}/${code.toLowerCase()}.png`
}

export function getCountryFlag(code: string): string {
  return getFlagImageUrl(code)
}

export function formatCountry(code: string, name: string): string {
  return `${code} — ${name}`
}

export function formatCountryWithFlag(code: string, name: string): string {
  return `${code} — ${name}`
}

export function formatCurrency(symbol: string, code: string): string {
  return `${symbol} ${code}`
}
