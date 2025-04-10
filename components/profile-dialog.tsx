"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion"

const AUTH_SERVICE_URL = 'http://localhost:5001'; // As defined in docker-compose.yml ports
const SIGNUP_SERVICE_URL = 'http://localhost:5002'; // As defined in docker-compose.yml ports

interface ProfileDialogProps {
  onClose: () => void
}

export function ProfileDialog({ onClose }: ProfileDialogProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("login")
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null); // To display errors
  const [isLoading, setIsLoading] = useState(false); // To disable button during request

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); // Clear previous errors

    try {
      const response = await fetch(`${AUTH_SERVICE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json(); // Always try to parse JSON, even for errors

      if (!response.ok) {
        // Handle HTTP errors (e.g., 401 Unauthorized, 400 Bad Request, 500 Internal Server Error)
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      // --- Login Successful ---
      console.log('Login successful:', data.message);
      // Optional: Store user info (e.g., email) in local storage or state management
      localStorage.setItem('userEmail', data.user.email);

      onClose(); // Close the modal/form
      router.push('/'); // Navigate to the home page or dashboard

    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || 'An unexpected error occurred during login.');
    }
    
    // onClose()
    // router.push("/")
  };

  const handleSignUp = async (e: React.FormEvent) => {

    e.preventDefault()
    setError(null); // Clear previous errors

    // Basic frontend validation (optional, complement backend validation)
    if (password.length < 4) {
       setError("Password must be at least 6 characters long.");
       setIsLoading(false);
       return;
    }
     if (!email.includes('@')) {
       setError("Please enter a valid email address.");
       setIsLoading(false);
       return;
    }

    try {
      const response = await fetch(`${SIGNUP_SERVICE_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json(); // Try to parse JSON

      if (!response.ok) {
        // Handle HTTP errors (e.g., 409 Conflict, 400 Bad Request, 500)
        // The backend sends specific error messages in the 'error' field
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      // --- Signup Successful ---
      console.log('Signup successful:', data.message);
      // Decide what to do next:
      // Option 1: Show a success message and close the form, prompting manual login
      alert("Signup successful! Please log in with your new account."); // Simple alert, replace with better UI

      // onClose(); // Close the signup form/modal

      // router.push("/");


    } catch (err: any) {
      console.error("Signup failed:", err);
      setError(err.message || 'An unexpected error occurred during sign up.');
    }
    
    // onClose()
    // router.push("/")
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Welcome to ParkSmart</h2>
            <p className="text-gray-500 text-sm mt-1">Manage your account</p>
          </div>

          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-brand-100 data-[state=active]:text-brand-800"
              >
                Log In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="data-[state=active]:bg-brand-100 data-[state=active]:text-brand-800"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Email</Label>
                  <Input
                    id="login-username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your Email"
                    className="border-gray-300 focus:border-brand-500 focus:ring-brand-500"
                    required
                    />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="border-gray-300 focus:border-brand-500 focus:ring-brand-500"
                    required
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600">
                      Remember me
                    </label>
                  </div>
                  <div className="text-sm">
                    <a href="#" className="text-brand-600 hover:text-brand-500">
                      Forgot password?
                    </a>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white">
                  Log In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Name</Label>
                  <Input
                    id="signup-name"
                    placeholder="Enter your name"
                    className="border-gray-300 focus:border-brand-500 focus:ring-brand-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="border-gray-300 focus:border-brand-500 focus:ring-brand-500"
                    required
                    />
                </div>
                {/* <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                  id="signup-username"
                  placeholder="Choose a username"
                  className="border-gray-300 focus:border-brand-500 focus:ring-brand-500"
                  required
                  />
                  </div> */}
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="border-gray-300 focus:border-brand-500 focus:ring-brand-500"
                    required
                    />
                </div>
                <Button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white">
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

