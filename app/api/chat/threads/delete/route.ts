import { NextRequest, NextResponse } from "next/server"
import { readFile, writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get("threadId")

    if (!threadId) {
      return NextResponse.json({ error: "threadId parameter is required" }, { status: 400 })
    }

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
      if ((error as any).code === "ENOENT") {
        // File doesn't exist, nothing to delete
        return NextResponse.json({ success: true, message: "Chat thread deleted successfully" })
      }
      throw error
    }

    // Remove the thread
    const filteredThreads = threads.filter((thread: any) => thread.id !== threadId)
    
    // Save updated threads
    await writeFile(threadsFilePath, JSON.stringify(filteredThreads, null, 2))

    return NextResponse.json({ success: true, message: "Chat thread deleted successfully" })
  } catch (error) {
    console.error("Error deleting chat thread:", error)
    return NextResponse.json({ error: "Failed to delete chat thread" }, { status: 500 })
  }
} 