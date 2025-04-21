"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function Home() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError("Please enter a username to call");
      return;
    }

    // Navigate to call page with the username as query parameter
    router.push(`/call?target=${encodeURIComponent(username)}`);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-blue-100">
      <header className="bg-white p-4 shadow">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">Video Call App</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Hello, {session?.user?.name || "User"}
            </span>
            <button
              onClick={handleSignOut}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
          <h2 className="mb-6 text-center text-2xl font-semibold text-gray-800">
            Start a Video Call
          </h2>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                Who do you want to call?
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Enter username"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 py-2 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Start Call
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
