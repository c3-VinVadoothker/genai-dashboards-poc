import { NextResponse } from "next/server"
import { readFile, mkdir } from "fs/promises"
import { join } from "path"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId parameter is required" }, { status: 400 })
    }

    // Ensure data/chat-threads directory exists
    const chatThreadsDir = join(process.cwd(), "data", "chat-threads")
    try {
      await mkdir(chatThreadsDir, { recursive: true })
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Load threads from JSON file
    const threadsFilePath = join(chatThreadsDir, "threads.json")
    
    try {
      const fileContent = await readFile(threadsFilePath, "utf-8")
      const threads = JSON.parse(fileContent)
      
      // Filter by userId and convert date strings back to Date objects
      const userThreads = threads
        .filter((thread: any) => thread.userId === userId)
        .map((thread: any) => ({
          ...thread,
          createdAt: new Date(thread.createdAt),
          updatedAt: new Date(thread.updatedAt),
          messages: thread.messages.map((message: any) => ({
            ...message,
            timestamp: new Date(message.timestamp)
          }))
        }))
      
      return NextResponse.json(userThreads)
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        // File doesn't exist yet, return empty array
        return NextResponse.json([])
      }
      throw error
    }
  } catch (error) {
    console.error("Error loading chat threads:", error)
    return NextResponse.json({ error: "Failed to load chat threads" }, { status: 500 })
  }
} 