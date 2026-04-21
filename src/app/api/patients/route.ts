import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const patient = await prisma.patient.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        email: body.email,
        appointmentDate: new Date(body.appointmentDate),
        doctorId: body.doctorId,
      },
    })

    return NextResponse.json(patient)
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({ orderBy: { createdAt: "desc" }, include: { doctor: true } })
    return NextResponse.json(patients ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 })
  }
}
