import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const clinics = await prisma.clinic.findMany({ orderBy: { createdAt: "desc" } })
    return NextResponse.json(clinics)
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const body = await req.json()

  const clinic = await prisma.clinic.create({
    data: {
      name: body.name,
      address: body.address,
    },
  })

  return NextResponse.json(clinic)
}
