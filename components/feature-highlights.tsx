"use client"

import { motion } from "framer-motion"
import { Clock, CreditCard, MapPin, Calendar, Signal } from "lucide-react"

const features = [
  {
    icon: <Signal className="h-6 w-6" />,
    title: "Real-time Availability",
    description: "Get up-to-date information on available parking spaces",
  },
  {
    icon: <Calendar className="h-6 w-6" />,
    title: "Easy Reservation",
    description: "Book your parking spot in advance with just a few clicks",
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: "Time-Based Parking",
    description: "Choose your parking duration and pay only for what you need",
  },
  {
    icon: <CreditCard className="h-6 w-6" />,
    title: "Secure Payment",
    description: "Pay safely and securely through our encrypted platform",
  },
  {
    icon: <MapPin className="h-6 w-6" />,
    title: "Navigation Assistance",
    description: "Get directions to your parking spot with ease",
  },
]

export function FeatureHighlights() {
  return (
    <section className="py-12 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <motion.h2
          className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Why Choose ParkSmart?
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

