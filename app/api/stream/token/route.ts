import { NextRequest, NextResponse } from 'next/server';
import { StreamChat } from 'stream-chat';
import { connect } from 'getstream';

export async function POST(request: NextRequest) {
  console.log("[Stream Token API] Received POST request for stream token");
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;
  
  try {
    const body = await request.json();
    const { userId, userName } = body;
    
    console.log(`[Stream Token API] POST request - userId: ${userId}, userName: ${userName}`);
    
    if (!apiKey) {
      console.error("[Stream Token API] Error: NEXT_PUBLIC_STREAM_API_KEY is not set");
      return NextResponse.json({ error: "Stream API key is not configured." }, { status: 500 });
    }
    if (!apiSecret) {
      console.error("[Stream Token API] Error: STREAM_API_SECRET is not set");
      return NextResponse.json({ error: "Stream API secret is not configured." }, { status: 500 });
    }
    
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    
    // Use StreamChat for video tokens
    console.log("[Stream Token API] Generating video token using StreamChat client");
    const serverClient = StreamChat.getInstance(apiKey, apiSecret);
    const exp = Math.round(new Date().getTime() / 1000) + 60 * 60 * 24; // Token expires in 24 hours
    const issuedAt = Math.floor(Date.now() / 1000) - 60; // Token issued 60 seconds in the past to allow for clock skew
    const token = serverClient.createToken(userId, exp, issuedAt);
    
    console.log(`[Stream Token API] Successfully generated token for userId: ${userId}`);
    return NextResponse.json({ token });
    
  } catch (error) {
    console.error("[Stream Token API] Error in POST handler:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Stream Token API] Detailed error: ${errorMessage}`);
    return NextResponse.json(
      { error: "Failed to generate stream token due to an internal error." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log("[Stream Token API] Received GET request for stream token");
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;
  const userIdParam = request.nextUrl.searchParams.get("userId");
  const serviceParam = request.nextUrl.searchParams.get("service"); // Optional: 'chat', 'feeds', or 'video'

  console.log(`[Stream Token API] userIdParam from request: ${userIdParam}`);
  console.log(`[Stream Token API] serviceParam from request: ${serviceParam}`);

  if (!apiKey) {
    console.error("[Stream Token API] Error: NEXT_PUBLIC_STREAM_API_KEY is not set");
    return NextResponse.json({ error: "Stream API key is not configured." }, { status: 500 });
  }
  if (!apiSecret) {
    console.error("[Stream Token API] Error: STREAM_API_SECRET is not set");
    return NextResponse.json({ error: "Stream API secret is not configured." }, { status: 500 });
  }

  // Use the demo user if no userId provided
  const demoUserId = process.env.DEMO_USER_ID || 'demo_user';
  let userId = userIdParam || demoUserId;

  console.log(`[Stream Token API] Generating token for userId: ${userId}`);
  try {
    let token: string;

    if (serviceParam === 'feeds') {
      // Use getstream client for Activity Feeds
      console.log("[Stream Token API] Using getstream client for Activity Feeds");
      const client = connect(apiKey, apiSecret);
      
      // Make sure user exists before creating token
      try {
        await client.user(userId).get();
        console.log(`[Stream Token API] User ${userId} exists`);
      } catch (userError) {
        console.log(`[Stream Token API] User ${userId} doesn't exist, creating it`);
        await client.user(userId).create({
          id: userId,
          name: userId,
          role: 'user',
          data: {
            avatar: ''
          }
        });
      }
      
      token = client.createUserToken(userId);
    } else if (serviceParam === 'video') {
      // For video calls, we use StreamChat client which handles both chat and video
      console.log("[Stream Token API] Using StreamChat client for Video");
      const serverClient = StreamChat.getInstance(apiKey, apiSecret);
      const exp = Math.round(new Date().getTime() / 1000) + 60 * 60 * 24; // Token expires in 24 hours for video
      const issuedAt = Math.floor(Date.now() / 1000) - 60; // Token issued 60 seconds in the past to allow for clock skew
      token = serverClient.createToken(userId, exp, issuedAt);
    } else {
      // Default to StreamChat for backward compatibility
      console.log("[Stream Token API] Using StreamChat client for Chat");
      const serverClient = StreamChat.getInstance(apiKey, apiSecret);
      const exp = Math.round(new Date().getTime() / 1000) + 60 * 60; // Token expires in 1 hour
      const issuedAt = Math.floor(Date.now() / 1000) - 60; // Token issued 60 seconds in the past to allow for clock skew
      token = serverClient.createToken(userId, exp, issuedAt);
    }

    console.log(`[Stream Token API] Successfully generated token for userId: ${userId}`);
    return NextResponse.json({ token });
  } catch (error) {
    console.error("[Stream Token API] Error generating token:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Stream Token API] Detailed error: ${errorMessage}`);
    return NextResponse.json(
      { error: "Failed to generate stream token due to an internal error." },
      { status: 500 }
    );
  }
}