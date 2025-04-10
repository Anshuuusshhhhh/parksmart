"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MapPin, Clock, ArrowLeft, Loader2 } from "lucide-react" // Added Loader2 for visual feedback
import { Button } from "@/components/ui/button"
import { NavBar } from "@/components/nav-bar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ParkingPreview } from "@/components/parking-preview"
import { motion, AnimatePresence } from "framer-motion"

// --- Configuration ---
const PARKING_SERVICE_URL = 'http://localhost:5003'; // Your parking service endpoint
const POLLING_INTERVAL_MS = 3000; // Check status every 3 seconds
const POLLING_TIMEOUT_MS = 30000; // Give up polling after 30 seconds

// --- Updated Sample Data (using backend IDs) ---
const parkingSpaces = [
  {
    id: "lot_a", // Match backend location_id
    name: "Little World Mall (Lot A)",
    availableSpaces: 15, // Ideally, fetch this live from backend later
    totalSpaces: 50,
    address: "123 Main Street, Downtown",
  },
  {
    id: "lot_b", // Match backend location_id
    name: "Central Park (Lot B)",
    availableSpaces: 8,
    totalSpaces: 30,
    address: "456 Park Avenue, Midtown",
  },
  {
    id: "lot_c", // Match backend location_id
    name: "Riverside Plaza (Lot C)",
    availableSpaces: 22,
    totalSpaces: 75,
    address: "789 River Road, Westside",
  },
];

// --- Helper Type for Booking Status ---
type BookingStatus = "booked" | "not_booked" | "pending" | "error";

export default function FindParkingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Component State
  const [parkingId, setParkingId] = useState<string | null>(null); // Stores "lot_a", "lot_b", etc.
  const [parkingName, setParkingName] = useState<string>("");
  const [parkingAddress, setParkingAddress] = useState<string>("");
  const [availableSpaces, setAvailableSpaces] = useState<number>(0);
  const [totalSpaces, setTotalSpaces] = useState<number>(0);
  const [duration, setDuration] = useState<string>("60"); // Local timer duration
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showParkingSelection, setShowParkingSelection] = useState(true);

  // Booking & Timer State
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>("not_booked");
  const [remainingTime, setRemainingTime] = useState<number>(0); // Local timer
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for polling interval to clear it properly
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Effects ---

  // Get user email on component mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail'); // Assuming email is stored here after login
    if (storedEmail) {
      setUserEmail(storedEmail);
    } else {
      console.error("User email not found. Please log in.");
      setError("User email not found. Please log in.");
      // Optionally redirect to login
      // router.push('/login');
    }
  }, [router]);

  // Initialize state from URL params (if any)
  useEffect(() => {
    const id = searchParams.get("id"); // Expecting "lot_a", etc.
    const name = searchParams.get("name");
    const address = searchParams.get("address");
    const available = searchParams.get("availableSpaces");
    const total = searchParams.get("totalSpaces");

    if (id && name && address) {
      setParkingId(id);
      setParkingName(name);
      setParkingAddress(address);
      setAvailableSpaces(available ? Number.parseInt(available) : 0);
      setTotalSpaces(total ? Number.parseInt(total) : 0);
      setShowParkingSelection(false);
      // Check initial booking status when loading details directly
      if (userEmail) {
        checkInitialBookingStatus(userEmail);
      }
    }
  }, [searchParams, userEmail]); // Add userEmail dependency

  // Local Timer Logic
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (bookingStatus === "booked" && remainingTime > 0) {
      timer = setInterval(() => {
        setRemainingTime((prev) => Math.max(0, prev - 1)); // Ensure it doesn't go below 0
      }, 1000);
    } else if (bookingStatus === "booked" && remainingTime === 0) {
      // Timer expired, but backend doesn't auto-checkout yet.
      // Keep status as booked, maybe show "Time Expired" message?
      console.log("Parking time expired.");
      // You might want to trigger a forced checkout call here in a real scenario
      // handleCheckOut(); // Uncomment if you want auto-checkout trigger
    }

    // Cleanup interval timer
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [bookingStatus, remainingTime]);

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, []);


  // --- Polling Logic ---

  const clearPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  };

  const pollBookingStatus = useCallback((expectedStatus: "booked" | "not_booked") => {
    clearPolling(); // Clear any existing polling first
    setError(null); // Clear previous errors

    if (!userEmail) {
      setError("Cannot check status: User email not found.");
      setBookingStatus("error");
      return;
    }

    console.log(`Polling for status: ${expectedStatus}`);
    setBookingStatus("pending"); // Indicate polling is active

    const fetchStatus = async () => {
      try {
        const response = await fetch(`${PARKING_SERVICE_URL}/booking_status/${userEmail}`);
        if (response.ok) {
          const data = await response.json();
          console.log("Polling response:", data);
          if (data.status === expectedStatus) {
            console.log(`Polling successful: Status is now ${expectedStatus}.`);
            clearPolling();
            setBookingStatus(expectedStatus);
            if (expectedStatus === "booked") {
              // Start the local timer only when booking is confirmed
              setRemainingTime(Number.parseInt(duration) * 60);
            } else {
              setRemainingTime(0); // Reset timer on checkout confirmation
            }
          } else if (response.status === 404 && expectedStatus === "not_booked") {
            // Handle 404 as confirmation for 'not_booked' status
            console.log(`Polling successful: Status is now not_booked (404 received).`);
            clearPolling();
            setBookingStatus("not_booked");
            setRemainingTime(0);
          } else {
             console.log(`Polling: Status is currently ${data.status || 'not_booked'}, waiting for ${expectedStatus}.`);
             // Continue polling...
          }
        } else if (response.status === 404 && expectedStatus === "not_booked") {
           // Handle 404 immediately if we expect not_booked
           console.log(`Polling successful: Status is now not_booked (404 received).`);
           clearPolling();
           setBookingStatus("not_booked");
           setRemainingTime(0);
        } else {
          // Handle other non-OK responses during polling
          console.error(`Polling error: HTTP status ${response.status}`);
          // Keep polling for now, maybe add retry limit for HTTP errors
        }
      } catch (err) {
        console.error("Polling fetch error:", err);
        // Keep polling, maybe add retry limit for network errors
      }
    };

    // Start polling immediately and then set interval
    fetchStatus();
    pollingIntervalRef.current = setInterval(fetchStatus, POLLING_INTERVAL_MS);

    // Set a timeout to stop polling
    pollingTimeoutRef.current = setTimeout(() => {
      console.warn(`Polling timed out after ${POLLING_TIMEOUT_MS / 1000}s waiting for status: ${expectedStatus}.`);
      clearPolling();
      if (bookingStatus === "pending") { // Only set error if still pending
         setError(`Could not confirm ${expectedStatus === 'booked' ? 'check-in' : 'check-out'} status. Please try again or check manually.`);
         setBookingStatus("error"); // Set specific error status
      }
    }, POLLING_TIMEOUT_MS);

  }, [userEmail, duration, bookingStatus]); // Include bookingStatus to potentially reset timeout if status changes externally

   // Function to check status when page loads with parameters
   const checkInitialBookingStatus = useCallback(async (email: string) => {
        console.log("Checking initial booking status for:", email);
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${PARKING_SERVICE_URL}/booking_status/${email}`);
            if (response.ok) {
                const data = await response.json();
                setBookingStatus(data.status); // Should be "booked"
                 if(data.status === "booked"){
                    // If already booked, maybe try to get remaining time? (Not supported by backend yet)
                    // For now, just start a default timer or show booked status without timer
                     console.warn("User already checked in. Local timer duration may not be accurate.");
                     setRemainingTime(Number.parseInt(duration) * 60); // Start timer anyway for demo
                 }
            } else if (response.status === 404) {
                setBookingStatus("not_booked");
            } else {
                 throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (err: any) {
            console.error("Failed to check initial booking status:", err);
            setError("Could not fetch initial booking status.");
            setBookingStatus("error");
        } finally {
            setIsLoading(false);
        }
    }, [duration]); // Include duration if needed for timer initialization

  // --- Event Handlers ---

  const handleParkingSelect = (
    id: string,
    name: string,
    address: string,
    available: number,
    total: number,
  ) => {
    setParkingId(id);
    setParkingName(name);
    setParkingAddress(address);
    setAvailableSpaces(available);
    setTotalSpaces(total);
    setShowParkingSelection(false);
    setError(null);
    setBookingStatus("not_booked"); // Reset status when selecting a new lot
    clearPolling(); // Stop any previous polling
     // Check status in case user was already booked here
     if(userEmail){
        checkInitialBookingStatus(userEmail);
     }
  };

  const handleBackToSelection = () => {
    setShowParkingSelection(true);
    setParkingId(null);
    setParkingName("");
    setParkingAddress("");
    setError(null);
    setBookingStatus("not_booked"); // Reset status
    clearPolling(); // Stop polling
  };

  const handleCheckIn = async () => {
    if (!userEmail || !parkingId) {
      setError("User email or Parking ID is missing.");
      return;
    }
    setIsLoading(true);
    setError(null);
    clearPolling(); // Clear previous polling

    console.log(`Attempting check-in for ${userEmail} at ${parkingId}`);

    try {
      const response = await fetch(`${PARKING_SERVICE_URL}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, location_id: parkingId }),
      });

      const data = await response.json();

      if (response.status !== 202) { // Expect 202 Accepted from the backend
        throw new Error(data.error || `Check-in request failed with status: ${response.status}`);
      }

      console.log("Check-in request accepted by server. Starting status polling...");
      // Request accepted, start polling for "booked" status
      pollBookingStatus("booked");

    } catch (err: any) {
      console.error("Check-in failed:", err);
      setError(err.message || 'An unexpected error occurred during check-in request.');
      setBookingStatus("error"); // Set error status
    } finally {
      setIsLoading(false); // Stop loading indicator *after* request is sent
    }
  };

  const handleCheckOut = async () => {
    if (!userEmail) {
      setError("User email is missing.");
      return;
    }
    setIsLoading(true);
    setError(null);
    clearPolling(); // Clear previous polling

    console.log(`Attempting check-out for ${userEmail}`);

    try {
      const response = await fetch(`${PARKING_SERVICE_URL}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail }),
      });

      const data = await response.json();

      if (response.status !== 202) { // Expect 202 Accepted
        throw new Error(data.error || `Check-out request failed with status: ${response.status}`);
      }

       console.log("Check-out request accepted by server. Starting status polling...");
       // Request accepted, start polling for "not_booked" status
       pollBookingStatus("not_booked");

      // Optional: Navigate immediately for faster perceived UX,
      // but polling confirmation is safer.
      // router.push("/");

    } catch (err: any) {
      console.error("Check-out failed:", err);
      setError(err.message || 'An unexpected error occurred during check-out request.');
       setBookingStatus("error"); // Set error status
    } finally {
      setIsLoading(false); // Stop loading indicator *after* request is sent
       // Navigate home ONLY after polling confirms checkout in pollBookingStatus function or if desired immediately
       // if (!error) router.push("/"); // Navigate immediately if no error sending request
    }
  };


  // --- Time Formatting ---
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // --- Render Logic ---
  const renderParkingDetails = () => {
     if (!parkingId) return null; // Should not happen if showParkingSelection is false

     return (
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
                disabled={isLoading || bookingStatus === 'pending'} // Disable while loading/polling
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to selection
            </Button>

             {error && <p className="text-red-600 text-center mb-4">{error}</p>}

            <Card className="max-w-2xl mx-auto">
                <CardHeader className="pb-2">
                    {/* ... Parking Name, Address, Spaces ... */}
                     <CardTitle className="text-2xl font-semibold text-gray-800">{parkingName}</CardTitle>
                     <div className="mt-2 flex items-center text-gray-500">
                         <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                         <p>{parkingAddress}</p>
                     </div>
                     {/* ... Available spaces indicator ... */}
                </CardHeader>

                <CardContent className="pt-6">
                    {bookingStatus === 'pending' && (
                        <div className="flex flex-col items-center justify-center p-6 bg-gray-100 rounded-lg border">
                             <Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-3" />
                             <p className="text-gray-600">Processing request...</p>
                             <p className="text-sm text-gray-500">(Checking booking status)</p>
                        </div>
                    )}

                    {bookingStatus === 'booked' && (
                        <div className="space-y-6">
                            {/* ... Checked-in state with timer ... */}
                            <div className="p-6 bg-brand-50 rounded-lg border border-brand-200">
                                <h3 className="text-lg font-medium text-brand-800 mb-4 text-center">You're checked in!</h3>
                                <div className="flex flex-col items-center">
                                <Clock className="h-8 w-8 text-brand-600 mb-2" />
                                <p className="text-brand-600 mb-1">Remaining time:</p>
                                <p className="font-mono font-bold text-3xl text-brand-800">{formatTime(remainingTime)}</p>
                                {remainingTime === 0 && <p className="text-sm text-yellow-600 mt-2">Time expired</p>}
                                </div>
                            </div>
                            <Button
                                onClick={handleCheckOut}
                                className="w-full bg-red-600 hover:bg-red-700 text-white"
                                disabled={isLoading} // Disable while processing checkout request
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Check Out
                            </Button>
                        </div>
                    )}

                     {(bookingStatus === 'not_booked' || bookingStatus === 'error') && bookingStatus !== 'pending' && (
                        <div className="space-y-6">
                             {bookingStatus === 'error' && !error && <p className="text-red-600 text-center">An error occurred. Please try again.</p> }
                             {/* ... Duration selection ... */}
                              <div className="space-y-2">
                                 <Label htmlFor="duration" className="text-gray-700">Parking Duration</Label>
                                 <Select value={duration} onValueChange={setDuration}>
                                     <SelectTrigger id="duration" className="border-gray-300 focus:border-brand-500 focus:ring-brand-500">
                                         <SelectValue placeholder="Select duration" />
                                     </SelectTrigger>
                                     <SelectContent>
                                         <SelectItem value="30">30 minutes</SelectItem>
                                         <SelectItem value="60">1 hour</SelectItem>
                                         <SelectItem value="120">2 hours</SelectItem>
                                         {/* ... more items ... */}
                                     </SelectContent>
                                 </Select>
                             </div>
                             {/* ... Check In/Out buttons ... */}
                             <div className="grid grid-cols-2 gap-4">
                                <Button
                                    onClick={handleCheckIn}
                                    className="bg-teal-600 hover:bg-teal-700 text-white"
                                    disabled={isLoading || !userEmail} // Disable if loading or no email
                                >
                                     {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                     Check In
                                 </Button>
                                 <Button
                                     onClick={handleCheckOut} // This button might be redundant if not checked in, but keep for now
                                     variant="outline"
                                     className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                     disabled={isLoading || !userEmail} // Should ideally be disabled if not checked in
                                 >
                                     {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                     Check Out
                                 </Button>
                             </div>
                         </div>
                     )}
                </CardContent>
            </Card>
        </motion.div>
     );
  };


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
                 {/* ... Parking selection list ... */}
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
            renderParkingDetails()
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}