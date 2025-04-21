import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";

// For simplicity, we're using an in-memory users array
// In a real application, you would use a database
export const users = [
  {
    id: "1",
    name: "User1",
    email: "user1@example.com",
    password: bcrypt.hashSync("password", 10),
  },
  {
    id: "2",
    name: "User2",
    email: "user2@example.com",
    password: bcrypt.hashSync("password", 10),
  },
];

// Function to get the current session on the server side
export async function getSession() {
  return await getServerSession();
}

// Function to check if a user is authenticated on the server side
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}
