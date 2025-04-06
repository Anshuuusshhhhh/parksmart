import Link from "next/link"
import { Button } from "@/components/ui/button"
import { NavBar } from "@/components/nav-bar"
import { SplashAnimation } from "@/components/splash-animation"
import { FeatureHighlights } from "@/components/feature-highlights"
import { ParkingPreview } from "@/components/parking-preview"
import { ChevronRight } from "lucide-react"

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

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <NavBar />

      <div className="container mx-auto px-4">
        <SplashAnimation />

        <div className="mt-4 flex justify-center">
          <Link href="/find-parking">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 text-lg rounded-lg shadow-md transition-all duration-200 hover:shadow-lg group">
              Find Your Parking
              <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        <FeatureHighlights />

        <div className="my-16 border-t border-gray-200 pt-16">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Popular Parking Locations</h2>
            <Link
              href="/find-parking"
              className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center"
            >
              View all locations
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parkingSpaces.map((space) => (
              <ParkingPreview key={space.id} {...space} />
            ))}
          </div>
        </div>
      </div>

      <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <svg viewBox="0 0 24 24" className="h-6 w-6 mr-2 fill-teal-600" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
              </svg>
              <span className="text-xl font-bold text-brand-700">ParkSmart</span>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-600 hover:text-brand-600">
                About
              </a>
              <a href="#" className="text-gray-600 hover:text-brand-600">
                Contact
              </a>
              <a href="#" className="text-gray-600 hover:text-brand-600">
                Privacy
              </a>
              <a href="#" className="text-gray-600 hover:text-brand-600">
                Terms
              </a>
            </div>
          </div>
          <div className="mt-4 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} ParkSmart. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  )
}

