import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, email, name, role } = body

    if (!id || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Upsert user into Prisma
    const user = await prisma.user.upsert({
      where: { id },
      update: {
        email,
        name: name || 'Student',
        role: role || 'STUDENT',
      },
      create: {
        id,
        email,
        name: name || 'Student',
        role: role || 'STUDENT',
        county: 'Nairobi',
      }
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
