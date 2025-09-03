// Seed fx_rates from local ARS CSV and ECB (Frankfurter) for USD
// Usage: node scripts/seed-fx-rates.js
require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_INVAPPSUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase env. Check NEXT_PUBLIC_INVAPPSUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function upsertRate(rateDate, currency, rate, source) {
  const { error } = await supabase
    .from('fx_rates')
    .upsert({ rate_date: rateDate, base_currency: 'EUR', currency, rate, source }, { onConflict: 'rate_date,base_currency,currency' })
  if (error) throw error
}

function parseSpanishCsvNumber(s) {
  // Replace dot thousand separators and comma decimal separators
  const cleaned = String(s).trim().replace(/\./g, '').replace(',', '.')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

async function seedARSFromCsv() {
  const csvPath = path.join(process.cwd(), 'public', 'Datos históricos ARS_EUR.csv')
  if (!fs.existsSync(csvPath)) {
    console.warn('ARS CSV not found at', csvPath)
    return
  }
  const content = fs.readFileSync(csvPath, 'utf8')
  const lines = content.split(/\r?\n/).filter(Boolean)
  // Skip header
  const yearBuckets = new Map()
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const cols = line.split(',').map(c => c.replace(/^\"|\"$/g, ''))
    // Expect: Fecha, Último, Apertura, ...
    const fecha = cols[0] // dd.mm.yyyy
    const ultimo = cols[1]
    if (!fecha || !ultimo) continue
    const [dd, mm, yyyy] = fecha.split('.')
    const year = Number.parseInt(yyyy, 10)
    if (!Number.isInteger(year)) continue
    const valueEurPerArs = parseSpanishCsvNumber(ultimo)
    if (valueEurPerArs == null) continue
    if (!yearBuckets.has(year)) yearBuckets.set(year, [])
    yearBuckets.get(year).push(valueEurPerArs)
  }
  for (const [year, arr] of yearBuckets.entries()) {
    if (year < 1999) continue
    const avgEurPerArs = arr.reduce((a, b) => a + b, 0) / arr.length
    // store as ARS per 1 EUR (base EUR expected by app)
    const arsPerEur = 1 / avgEurPerArs
    const rateDate = `${year}-01-15`
    console.log('Upserting ARS', { year, arsPerEur })
    await upsertRate(rateDate, 'ARS', Number(arsPerEur.toFixed(6)), 'csv:ARS_EUR')
  }
}

async function seedUSDFromFrankfurter() {
  const currentYear = new Date().getFullYear()
  for (let year = 1999; year <= currentYear; year++) {
    const from = `${year}-01-01`
    const to = `${year}-12-31`
    const url = `https://api.frankfurter.app/${from}..${to}?from=EUR&to=USD`
    console.log('Fetching USD rates for', year)
    const res = await fetch(url)
    if (!res.ok) {
      console.warn('Frankfurter fetch failed', year)
      continue
    }
    const data = await res.json()
    const rates = Object.values(data.rates || {}).map(obj => obj.USD).filter(v => typeof v === 'number' && Number.isFinite(v))
    if (rates.length === 0) continue
    const avgUsdPerEur = rates.reduce((a, b) => a + b, 0) / rates.length
    const rateDate = `${year}-01-15`
    console.log('Upserting USD', { year, avgUsdPerEur })
    await upsertRate(rateDate, 'USD', Number(avgUsdPerEur.toFixed(6)), 'frankfurter')
  }
}

async function main() {
  try {
    await seedARSFromCsv()
    await seedUSDFromFrankfurter()
    console.log('✅ Seeding completed')
  } catch (e) {
    console.error('Seeding error:', e)
    process.exit(1)
  }
}

main()

