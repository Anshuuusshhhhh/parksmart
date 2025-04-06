"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProfileDialog } from "./profile-dialog"
import { useState } from "react"

export function NavBar() {
  const pathname = usePathname()
  const [showProfileDialog, setShowProfileDialog] = useState(false)

  return (
    <nav className="w-full py-4 px-6 flex items-center justify-between bg-white shadow-sm sticky top-0 z-50">
      <div className="flex items-center">
        <Link href="/" className="text-xl font-bold text-brand-700 flex items-center">
          <svg viewBox="0 0 24 24" className="h-6 w-6 mr-2 fill-teal-600" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
          </svg>
          ParkSmart
        </Link>
      </div>

      <div className="flex items-center space-x-8">
        <Link
          href="/"
          className={`text-sm font-medium transition-colors duration-200 ${
            pathname === "/" ? "text-brand-700 border-b-2 border-teal-500" : "text-gray-600 hover:text-brand-600"
          }`}
        >
          Home
        </Link>
        <Link
          href="/find-parking"
          className={`text-sm font-medium transition-colors duration-200 ${
            pathname === "/find-parking"
              ? "text-brand-700 border-b-2 border-teal-500"
              : "text-gray-600 hover:text-brand-600"
          }`}
        >
          Find Parking
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowProfileDialog(true)}
          className="text-gray-600 hover:text-brand-600 transition-colors duration-200"
        >
          <User className="h-5 w-5" />
        </Button>
      </div>

      {showProfileDialog && <ProfileDialog onClose={() => setShowProfileDialog(false)} />}
    </nav>
  )
}

