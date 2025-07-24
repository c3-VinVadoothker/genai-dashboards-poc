import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir, readFile } from "fs/promises"
import { join } from "path"

export async function POST(request: NextRequest) {
  try {
    const thread = await request.json()

    // Ensure data/chat-threads directory exists
    const chatThreadsDir = join(process.cwd(), "data", "chat-threads")
    try {
      await mkdir(chatThreadsDir, { recursive: true })
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Load existing threads
    const threadsFilePath = join(chatThreadsDir, "threads.json")
    let threads = []
    
    try {
      const fileContent = await readFile(threadsFilePath, "utf-8")
      threads = JSON.parse(fileContent)
    } catch (error) {
      // File doesn't exist yet, start with empty array
    }

    // Update or add the thread
    const existingIndex = threads.findIndex((t: any) => t.id === thread.id)
    if (existingIndex >= 0) {
      threads[existingIndex] = thread
    } else {
      threads.push(thread)
    }

    // Save updated threads
    await writeFile(threadsFilePath, JSON.stringify(threads, null, 2))

    return NextResponse.json({ success: true, message: "Chat thread saved successfully" })
  } catch (error) {
    console.error("Error saving chat thread:", error)
    return NextResponse.json({ success: false, error: "Failed to save chat thread" }, { status: 500 })
  }
} 