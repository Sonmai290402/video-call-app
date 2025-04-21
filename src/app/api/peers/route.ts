import { NextResponse } from "next/server";

// In-memory store for peer IDs (in a real app, use a database)
const peerMap = new Map<string, string>();

// Register a peer ID for a username
export async function POST(request: Request) {
  try {
    const { username, peerId } = await request.json();

    if (!username || !peerId) {
      return NextResponse.json(
        { error: "Username and peerId are required" },
        { status: 400 }
      );
    }

    peerMap.set(username, peerId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error registering peer:", error);
    return NextResponse.json(
      { error: "Failed to register peer" },
      { status: 500 }
    );
  }
}

// Look up a peer ID by username
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "Username parameter is required" },
        { status: 400 }
      );
    }

    const peerId = peerMap.get(username);

    if (!peerId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ username, peerId });
  } catch (error) {
    console.error("Error looking up peer:", error);
    return NextResponse.json(
      { error: "Failed to look up peer ID" },
      { status: 500 }
    );
  }
}
