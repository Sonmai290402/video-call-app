import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// Access the users array from the auth library
// In a real app, this would be a database call
// Since we're using an in-memory array, we need to access it directly
import { users } from "@/app/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    if (users.find((user) => user.email === email)) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Create a new user
    const newUser = {
      id: `${users.length + 1}`,
      name,
      email,
      password: bcrypt.hashSync(password, 10),
    };

    // Add the new user to our in-memory array
    users.push(newUser);

    // Return success response (without the password)
    return NextResponse.json(
      {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
