"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function ClinicDetailPage() {
  const params = useParams()
  const id = params?.id
  const [doctors, setDoctors] = useState<any[]>([])
  const [clinicName, setClinicName] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    fetch(`/api/clinics/${id}/doctors`)
      .then((r) => r.json())
      .then((data) => setDoctors(data || []))

    // fetch clinic details (simple)
    fetch(`/api/clinics`)
      .then((r) => r.json())
      .then((list) => {
        const match = Array.isArray(list) ? list.find((c) => c.id === id) : null
        setClinicName(match?.name ?? null)
      })
  }, [id])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{clinicName ?? "Clinic"}</h1>

      <h2 className="text-lg font-semibold mb-2">Doctors</h2>
      <table className="w-full border">
        <thead>
          <tr>
            <th className="text-left p-2">First</th>
            <th className="text-left p-2">Last</th>
            <th className="text-left p-2">Age</th>
            <th className="text-left p-2">Specialty</th>
          </tr>
        </thead>
        <tbody>
          {doctors.map((d) => (
            <tr key={d.id} className="border-t">
              <td className="p-2">{d.firstName}</td>
              <td className="p-2">{d.lastName}</td>
              <td className="p-2">{d.age}</td>
              <td className="p-2">{d.specialty}</td>
            </tr>
          ))}
          {doctors.length === 0 && (
            <tr>
              <td className="p-2" colSpan={4}>
                No doctors found for this clinic.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
