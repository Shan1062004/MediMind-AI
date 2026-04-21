"use client"

import { useEffect, useState } from "react"

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/doctors")
      .then((res) => res.json())
      .then(setDoctors)
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Doctors</h1>

      <table className="w-full border">
        <thead>
          <tr>
            <th className="text-left p-2">First Name</th>
            <th className="text-left p-2">Last Name</th>
            <th className="text-left p-2">Age</th>
            <th className="text-left p-2">Specialty</th>
          </tr>
        </thead>
        <tbody>
          {doctors.map((doc) => (
            <tr key={doc.id} className="border-t">
              <td className="p-2">{doc.firstName}</td>
              <td className="p-2">{doc.lastName}</td>
              <td className="p-2">{doc.age}</td>
              <td className="p-2">{doc.specialty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
