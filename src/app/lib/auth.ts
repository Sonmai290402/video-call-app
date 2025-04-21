import { getServerSession } from "next-auth";

// Function to get the current session on the server side
export async function getSession() {
  return await getServerSession();
}

// Function to check if a user is authenticated on the server side
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}
