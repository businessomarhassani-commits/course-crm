import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Invite system removed. Users register at /signup.' }, { status: 410 })
}
