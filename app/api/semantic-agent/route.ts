import { NextRequest, NextResponse } from 'next/server'
import { GeminiSemanticAgent } from '@/lib/agents/gemini-semantic-agent'

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    console.log("=== SEMANTIC AGENT REQUEST ===")
    console.log("Message:", message)

    const agent = GeminiSemanticAgent.getInstance()
    const classification = await agent.classifyRequest(message)

    console.log("=== SEMANTIC AGENT RESPONSE ===")
    console.log("Classification:", classification)
    console.log("=== END RESPONSE ===")

    return NextResponse.json({
      classification,
      message: `Classified as: ${classification.type} (confidence: ${classification.confidence})`
    })
  } catch (error) {
    console.error("=== SEMANTIC AGENT ERROR ===")
    console.error("Error:", error)
    console.error("=== END ERROR ===")
    return NextResponse.json(
      { error: "Failed to classify request" },
      { status: 500 }
    )
  }
} 