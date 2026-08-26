import { NextRequest, NextResponse } from 'next/server'
import { loginUser, createToken } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    const user = await loginUser(email, password)
    const token = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    })

    const response = NextResponse.json({ user, token })
    const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '')
    const isSecure = proto === 'https'
    response.cookies.set('lifeos-token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0] || error.format()?._errors?.[0]
      return NextResponse.json({ error: firstError?.message || 'Validation error' }, { status: 400 })
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
