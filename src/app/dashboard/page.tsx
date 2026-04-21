"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function DashboardPage() {
  const [clinicCount, setClinicCount] = useState<number | null>(null)
  const [doctorCount, setDoctorCount] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/clinics")
      .then((r) => r.json())
      .then((data) => setClinicCount(Array.isArray(data) ? data.length : 0))

    fetch("/api/doctors")
      .then((r) => r.json())
      .then((data) => setDoctorCount(Array.isArray(data) ? data.length : 0))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/dashboard/clinics" className="p-6 border rounded hover:shadow">
          <div className="text-sm text-gray-500">Clinics</div>
          <div className="text-3xl font-bold">{clinicCount ?? "—"}</div>
        </Link>

        <Link href="/dashboard/doctors" className="p-6 border rounded hover:shadow">
          <div className="text-sm text-gray-500">Doctors</div>
          <div className="text-3xl font-bold">{doctorCount ?? "—"}</div>
        </Link>
      </div>
    </div>
  )
}
