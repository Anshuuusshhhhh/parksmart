"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

export function SplashAnimation() {
  const [isAnimationComplete, setIsAnimationComplete] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimationComplete(true)
    }, 2500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="w-full flex justify-center items-center py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center"
      >
        <motion.div
          className="inline-flex items-center"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <motion.svg
            viewBox="0 0 24 24"
            className="h-12 w-12 mr-3 fill-teal-600"
            xmlns="http://www.w3.org/2000/svg"
            initial={{ rotate: -10, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
          </motion.svg>
          <motion.h1
            className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-brand-700 to-teal-600 bg-clip-text text-transparent"
            initial={{ letterSpacing: "0.2em" }}
            animate={{ letterSpacing: "0.05em" }}
            transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
          >
            ParkSmart
          </motion.h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: isAnimationComplete ? 1 : 0,
            y: isAnimationComplete ? 0 : 10,
          }}
          transition={{ duration: 0.5 }}
          className="mt-4 text-gray-600 text-lg"
        >
          Smart parking solutions for modern cities
        </motion.p>
      </motion.div>
    </div>
  )
}

