import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '')
  const isSecure = proto === 'https'
  response.cookies.set('lifeos-token', '', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
