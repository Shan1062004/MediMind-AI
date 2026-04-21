import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const doctors = await prisma.doctor.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(doctors)
}

export async function POST(req: Request) {
  const body = await req.json()

  let clinicId = body.clinicId

  if (!clinicId) {
    const clinic = await prisma.clinic.findFirst()
    if (!clinic) {
      return NextResponse.json({ error: "No clinic found. Create a clinic first." }, { status: 400 })
    }
    clinicId = clinic.id
  }

  const doctor = await prisma.doctor.create({
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      age: Number(body.age ?? 0),
      specialty: body.specialty,
      phone: body.phone,
      email: body.email,
      clinicId,
    },
  })

  return NextResponse.json(doctor)
}
