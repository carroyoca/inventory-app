import { NextRequest, NextResponse } from 'next/server'

type Currency = 'USD' | 'EUR' | 'ARS'

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

    const date = `${year}-01-15`
    const url = `https://api.exchangerate.host/${date}?base=EUR&symbols=${currency}`

    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } }) // cache 1 day
    if (!res.ok) {
      return NextResponse.json({ error: 'Rate provider error' }, { status: 502 })
    }
    const data: any = await res.json()
    const rate = data?.rates?.[currency]
    if (!rate || !Number.isFinite(rate)) {
      return NextResponse.json({ error: 'Invalid rate data' }, { status: 502 })
    }

    const eur = amount / rate
    return NextResponse.json({ eur: Math.round(eur * 100) / 100, rate })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

