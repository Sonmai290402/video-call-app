import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
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

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Find user in our "database"
        const user = users.find((user) => user.email === credentials.email);

        if (!user || !bcrypt.compareSync(credentials.password, user.password)) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "a-very-secret-key",
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };
