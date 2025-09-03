import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type Currency = 'USD' | 'EUR' | 'ARS'

async function getRateFromExchangerateHost(year: number, currency: 'USD'|'EUR'|'ARS') {
  const date = `${year}-01-15`
  const url = `https://api.exchangerate.host/${date}?base=EUR&symbols=${currency}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  const data: any = await res.json()
  const rate = data?.rates?.[currency]
  return (typeof rate === 'number' && Number.isFinite(rate)) ? rate : null
}

async function getRateFromFrankfurter(year: number, currency: 'USD'|'EUR'|'ARS') {
  // Frankfurter reliably supports USD; ARS may not be available.
  if (currency === 'ARS') return null
  const date = `${year}-01-15`
  const url = `https://api.frankfurter.app/${date}?from=EUR&to=${currency}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  const data: any = await res.json()
  const rate = data?.rates?.[currency]
  return (typeof rate === 'number' && Number.isFinite(rate)) ? rate : null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const currency = body?.currency as Currency | undefined
    const amount = typeof body?.amount === 'number' ? body.amount : Number.parseFloat(String(body?.amount ?? 'NaN'))
    const year = typeof body?.year === 'number' ? body.year : Number.parseInt(String(body?.year ?? 'NaN'), 10)

    if (!currency || !['USD','EUR','ARS'].includes(currency)) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
    }
    if (!Number.isFinite(amount)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
    if (!Number.isInteger(year)) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }
    if (year < 1999) {
      return NextResponse.json({ error: 'Not supported before 1999' }, { status: 422 })
    }

    if (currency === 'EUR') {
      return NextResponse.json({ eur: Math.round(amount * 100) / 100, rate: 1 })
    }

    // Try providers with fallbacks
    let rate: number | null = null
    if (currency === 'USD') {
      rate = await getRateFromFrankfurter(year, currency)
      if (rate == null) rate = await getRateFromExchangerateHost(year, currency)
    } else if (currency === 'ARS') {
      rate = await getRateFromExchangerateHost(year, currency)
      if (rate == null) rate = await getRateFromFrankfurter(year, currency)
    } else {
      rate = await getRateFromExchangerateHost(year, currency)
      if (rate == null) rate = await getRateFromFrankfurter(year, currency)
    }

    if (rate == null) {
      return NextResponse.json({ error: 'Rate provider error' }, { status: 502 })
    }

    const eur = amount / rate
    return NextResponse.json({ eur: Math.round(eur * 100) / 100, rate })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
