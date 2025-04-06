"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MapPin, Clock, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NavBar } from "@/components/nav-bar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ParkingPreview } from "@/components/parking-preview"
import { motion, AnimatePresence } from "framer-motion"

// Sample parking data
const parkingSpaces = [
  {
    id: "1",
    name: "Little World Mall",
    availableSpaces: 15,
    totalSpaces: 50,
    address: "123 Main Street, Downtown",
  },
  {
    id: "2",
    name: "Central Park",
    availableSpaces: 8,
    totalSpaces: 30,
    address: "456 Park Avenue, Midtown",
  },
  {
    id: "3",
    name: "Riverside Plaza",
    availableSpaces: 22,
    totalSpaces: 75,
    address: "789 River Road, Westside",
  },
]

export default function FindParkingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [parkingId, setParkingId] = useState<string | null>(null)
  const [parkingName, setParkingName] = useState<string>("")
  const [parkingAddress, setParkingAddress] = useState<string>("")
  const [availableSpaces, setAvailableSpaces] = useState<number>(0)
  const [totalSpaces, setTotalSpaces] = useState<number>(0)
  const [duration, setDuration] = useState<string>("60")
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [remainingTime, setRemainingTime] = useState<number>(0)
  const [showParkingSelection, setShowParkingSelection] = useState(true)

  useEffect(() => {
    const id = searchParams.get("id")
    const name = searchParams.get("name")
    const address = searchParams.get("address")
    const availableSpaces = searchParams.get("availableSpaces")
    const totalSpaces = searchParams.get("totalSpaces")

    if (id && name && address) {
      setParkingId(id)
      setParkingName(name)
      setParkingAddress(address)
      setAvailableSpaces(availableSpaces ? Number.parseInt(availableSpaces) : 0)
      setTotalSpaces(totalSpaces ? Number.parseInt(totalSpaces) : 0)
      setShowParkingSelection(false)
    }
  }, [searchParams])

  const handleParkingSelect = (
    id: string,
    name: string,
    address: string,
    availableSpaces: number,
    totalSpaces: number,
  ) => {
    setParkingId(id)
    setParkingName(name)
    setParkingAddress(address)
    setAvailableSpaces(availableSpaces)
    setTotalSpaces(totalSpaces)
    setShowParkingSelection(false)
  }

  const handleCheckIn = () => {
    setIsCheckedIn(true)
    setRemainingTime(Number.parseInt(duration) * 60) // Convert minutes to seconds
  }

  const handleCheckOut = () => {
    router.push("/")
  }

  const handleBackToSelection = () => {
    setShowParkingSelection(true)
    setParkingId(null)
    setParkingName("")
    setParkingAddress("")
  }

  useEffect(() => {
    if (isCheckedIn && remainingTime > 0) {
      const timer = setInterval(() => {
        setRemainingTime((prev) => prev - 1)
      }, 1000)

      return () => clearInterval(timer)
    } else if (isCheckedIn && remainingTime === 0) {
      setIsCheckedIn(false)
    }
  }, [isCheckedIn, remainingTime])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Find Parking</h1>

        <AnimatePresence mode="wait">
          {showParkingSelection ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-8 text-center">
                <h2 className="text-xl text-gray-700 mb-6">Select a parking location</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {parkingSpaces.map((space) => (
                  <div
                    key={space.id}
                    onClick={() =>
                      handleParkingSelect(space.id, space.name, space.address, space.availableSpaces, space.totalSpaces)
                    }
                    className="cursor-pointer"
                  >
                    <ParkingPreview {...space} />
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                variant="ghost"
                className="mb-4 text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                onClick={handleBackToSelection}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to selection
              </Button>

              <Card className="max-w-2xl mx-auto">
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl font-semibold text-gray-800">{parkingName}</CardTitle>
                  <div className="mt-2 flex items-center text-gray-500">
                    <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                    <p>{parkingAddress}</p>
                  </div>

                  <div className="mt-4 flex items-center">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        availableSpaces > totalSpaces * 0.5
                          ? "bg-teal-100 text-teal-800"
                          : availableSpaces > totalSpaces * 0.2
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {availableSpaces} of {totalSpaces} spaces available
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6">
                  {isCheckedIn ? (
                    <div className="space-y-6">
                      <div className="p-6 bg-brand-50 rounded-lg border border-brand-200">
                        <h3 className="text-lg font-medium text-brand-800 mb-4 text-center">You're checked in!</h3>
                        <div className="flex flex-col items-center">
                          <Clock className="h-8 w-8 text-brand-600 mb-2" />
                          <p className="text-brand-600 mb-1">Remaining time:</p>
                          <p className="font-mono font-bold text-3xl text-brand-800">{formatTime(remainingTime)}</p>
                        </div>
                      </div>

                      <Button onClick={handleCheckOut} className="w-full bg-red-600 hover:bg-red-700 text-white">
                        Check Out
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="duration" className="text-gray-700">
                          Parking Duration
                        </Label>
                        <Select value={duration} onValueChange={setDuration}>
                          <SelectTrigger
                            id="duration"
                            className="border-gray-300 focus:border-brand-500 focus:ring-brand-500"
                          >
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                            <SelectItem value="180">3 hours</SelectItem>
                            <SelectItem value="240">4 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Button onClick={handleCheckIn} className="bg-teal-600 hover:bg-teal-700 text-white">
                          Check In
                        </Button>
                        <Button
                          onClick={handleCheckOut}
                          variant="outline"
                          className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Check Out
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}

