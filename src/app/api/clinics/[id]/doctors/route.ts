import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { id } = params
  const doctors = await prisma.doctor.findMany({ where: { clinicId: id }, orderBy: { createdAt: "desc" } })
  return NextResponse.json(doctors)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { id } = params
  const body = await req.json()

  const doctor = await prisma.doctor.create({
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      age: Number(body.age ?? 0),
      specialty: body.specialty,
      phone: body.phone,
      email: body.email,
      clinicId: id,
    },
  })

  return NextResponse.json(doctor)
}
