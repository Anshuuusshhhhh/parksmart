"use client"

import { useRouter } from "next/navigation"
import { MapPin, Car } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { motion } from "framer-motion"

export interface ParkingSpaceProps {
  id: string
  name: string
  availableSpaces: number
  totalSpaces: number
  address: string
}

export function ParkingPreview({ id, name, availableSpaces, totalSpaces, address }: ParkingSpaceProps) {
  const router = useRouter()
  const availabilityPercentage = (availableSpaces / totalSpaces) * 100

  const handleReserveSpot = () => {
    router.push(
      `/find-parking?id=${id}&name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}&availableSpaces=${availableSpaces}&totalSpaces=${totalSpaces}`,
    )
  }

  return (
    <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
      <Card className="w-full overflow-hidden transition-all duration-200 hover:shadow-lg border-gray-200">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold text-gray-800">{name}</h3>
            <div className="bg-brand-100 text-brand-800 text-xs font-medium px-2.5 py-1 rounded-full">
              <Car className="h-3 w-3 inline-block mr-1" />
              {availableSpaces} available
            </div>
          </div>

          <div className="flex items-center text-gray-500 mb-4">
            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
            <p className="text-sm">{address}</p>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
            <div
              className={`h-2.5 rounded-full ${
                availabilityPercentage > 50
                  ? "bg-teal-500"
                  : availabilityPercentage > 20
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${availabilityPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>0</span>
            <span>{totalSpaces}</span>
          </div>
        </CardContent>
        <CardFooter className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <Button
            onClick={handleReserveSpot}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white transition-colors duration-200"
          >
            Reserve Spot
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

