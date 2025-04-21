"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Peer, { MediaConnection } from "peerjs";
import CallButton from "@/components/CallButton";

// Loading component to show while the Call content is loading
function CallLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="mb-4 text-xl font-bold text-white">
          Loading call interface...
        </div>
        <div className="animate-pulse text-gray-400">Please wait</div>
      </div>
    </div>
  );
}

// The actual call component
function CallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [, setPeerId] = useState("");
  const [callStatus, setCallStatus] = useState("initializing");
  const [targetUser, setTargetUser] = useState("");
  const [error, setError] = useState("");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const callRef = useRef<MediaConnection | null>(null);

  useEffect(() => {
    // Get the target username from URL query params
    const target = searchParams?.get("target");
    if (target) {
      setTargetUser(target);
    } else {
      setError("No username specified to call");
      return;
    }

    // Copy the ref value at the start of the effect
    const initialLocalVideo = localVideoRef.current;

    // Initialize PeerJS
    const initializePeer = async () => {
      try {
        const userId = `${session?.user?.name}-${Math.random()
          .toString(36)
          .substring(2, 9)}`;
        const newPeer = new Peer(userId);

        peerRef.current = newPeer;

        newPeer.on("open", async (id) => {
          setPeerId(id);
          setCallStatus("ready");

          // Register this peer ID with the server
          if (session?.user?.name) {
            await registerPeerId(session.user.name, id);
          }
        });

        // Handle incoming calls
        newPeer.on("call", (call) => {
          callRef.current = call;
          setCallStatus("incoming");

          // Answer the call automatically if we have video stream
          if (localVideoRef.current && localVideoRef.current.srcObject) {
            call.answer(localVideoRef.current.srcObject as MediaStream);

            call.on("stream", (remoteStream) => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
                setCallStatus("connected");
              }
            });
          }
        });

        newPeer.on("error", (err) => {
          console.error("PeerJS error:", err);
          setError(`Connection error: ${err.message}`);
          setCallStatus("error");
        });

        // Get local video stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true; // Mute local video to prevent echo
        }
      } catch (err: unknown) {
        console.error("Error initializing peer:", err);
        if (err instanceof Error) {
          setError(`Could not access camera/microphone: ${err.message}`);
        } else {
          setError("Could not access camera/microphone: Unknown error");
        }
        setCallStatus("error");
      }
    };

    initializePeer();

    // Cleanup on unmount
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }

      if (initialLocalVideo && initialLocalVideo.srcObject) {
        const tracks = (initialLocalVideo.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [searchParams, session]);

  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  // Register peer ID with the server
  const registerPeerId = async (username: string, peerIdToRegister: string) => {
    try {
      const response = await fetch("/api/peers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, peerId: peerIdToRegister }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Failed to register peer ID:", data.error);
      }
    } catch (err) {
      console.error("Error registering peer ID:", err);
    }
  };

  // Look up a peer ID by username
  const lookupPeerId = async (username: string): Promise<string | null> => {
    try {
      const response = await fetch(
        `/api/peers?username=${encodeURIComponent(username)}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          setError(`User ${username} is not online or not found`);
          return null;
        }
        const data = await response.json();
        setError(`Error looking up peer ID: ${data.error}`);
        return null;
      }

      const data = await response.json();
      return data.peerId;
    } catch (err) {
      setError(`Error looking up peer ID: ${err}`);
      return null;
    }
  };

  const startCall = async () => {
    if (
      !peerRef.current ||
      !localVideoRef.current ||
      !localVideoRef.current.srcObject
    ) {
      setError("Video not initialized yet");
      return;
    }

    try {
      // Look up the peer ID for the target user
      setCallStatus("looking-up"); // New status to show we're looking up the ID
      const targetPeerId = await lookupPeerId(targetUser);

      if (!targetPeerId) {
        setError(
          `Could not connect to peer ${targetUser}: User not found or not online`
        );
        setCallStatus("error");
        return;
      }

      const call = peerRef.current.call(
        targetPeerId,
        localVideoRef.current.srcObject as MediaStream
      );

      callRef.current = call;
      setCallStatus("calling");

      call.on("stream", (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          setCallStatus("connected");
        }
      });

      call.on("close", () => {
        setCallStatus("ended");
      });

      call.on("error", (err) => {
        setError(`Call error: ${err}`);
        setCallStatus("error");
      });
    } catch (err: unknown) {
      console.error("Error making call:", err);
      if (err instanceof Error) {
        setError(`Call failed: ${err.message}`);
      } else {
        setError("Call failed: Unknown error");
      }
      setCallStatus("error");
    }
  };

  const endCall = () => {
    if (callRef.current) {
      callRef.current.close();
    }
    setCallStatus("ended");
  };

  const returnToHome = () => {
    router.push("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-900">
      <header className="bg-gray-800 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            Video Call with {targetUser}
          </h1>
          <div>
            <button
              onClick={returnToHome}
              className="rounded-md bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600"
            >
              Return Home
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-8">
        {error && (
          <div className="mb-4 w-full max-w-3xl rounded-md bg-red-500 p-3 text-white">
            {error}
          </div>
        )}

        <div className="w-full max-w-3xl">
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Local video */}
            <div className="relative">
              <div className="aspect-video overflow-hidden rounded-lg bg-black">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="absolute bottom-2 left-2 rounded-md bg-black bg-opacity-50 px-2 py-1 text-xs text-white">
                You ({session?.user?.name})
              </span>
            </div>

            {/* Remote video */}
            <div className="relative">
              <div className="aspect-video overflow-hidden rounded-lg bg-black">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
                {callStatus !== "connected" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-lg font-medium text-white">
                      {callStatus === "initializing" && "Initializing..."}
                      {callStatus === "ready" && "Ready to call"}
                      {callStatus === "looking-up" && "Looking up user..."}
                      {callStatus === "calling" && "Calling..."}
                      {callStatus === "incoming" && "Incoming call..."}
                      {callStatus === "ended" && "Call ended"}
                      {callStatus === "error" && "Call failed"}
                    </p>
                  </div>
                )}
              </div>
              <span className="absolute bottom-2 left-2 rounded-md bg-black bg-opacity-50 px-2 py-1 text-xs text-white">
                {targetUser}
              </span>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            {callStatus === "ready" && (
              <CallButton onClick={startCall} color="green">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                  />
                </svg>
              </CallButton>
            )}

            {(callStatus === "connected" || callStatus === "calling") && (
              <CallButton onClick={endCall} color="red">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 3.75 18 6m0 0 2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m1.5 13.5c-8.284 0-15-6.716-15-15V4.5A2.25 2.25 0 0 1 4.5 2.25h1.372c.516 0 .966.351 1.091.852l1.106 4.423c.11.44-.054.902-.417 1.173l-1.293.97a1.062 1.062 0 0 0-.38 1.21 12.035 12.035 0 0 0 7.143 7.143c.441.162.928-.004 1.21-.38l.97-1.293c.271-.363.735-.527 1.174-.417l4.423 1.106c.5.125.852.575.852 1.091V19.5a2.25 2.25 0 0 1-2.25 2.25h-2.25Z"
                  />
                </svg>
              </CallButton>
            )}

            {callStatus === "ended" && (
              <CallButton onClick={returnToHome} color="blue">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                  />
                </svg>
              </CallButton>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Default export with Suspense
export default function CallPage() {
  return (
    <Suspense fallback={<CallLoading />}>
      <CallContent />
    </Suspense>
  );
}
