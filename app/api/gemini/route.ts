import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from "@google/generative-ai"

// Server-side API key access
const apiKey = process.env.GEMINI_KEY
if (!apiKey) {
  console.error("GEMINI_KEY environment variable is not set!")
}

const genAI = new GoogleGenerativeAI(apiKey!)

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json()
    
    // Log what's being sent to Gemini
    console.log("=== GEMINI REQUEST ===")
    console.log("Message:", message)
    console.log("Context:", context)
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" })

    const systemPrompt = `You are a data visualization expert. Your job is to help create charts and dashboards.

When asked to generate data:
- Create realistic, meaningful data that matches the request
- Return ONLY a JSON array of objects
- Include 20-50 data points
- Use appropriate field names and realistic values
- No explanations, just the JSON data

When asked to choose chart types:
- Pick the best visualization for the data and analysis goal
- Consider the available data structure and fields when choosing
- Return ONLY the chart type name (e.g., "bar", "line", "scatter")

When asked to create React components:
- Use recharts library
- Make it responsive and professional
- Include hover effects and tooltips
- Use the real data structure provided in context
- Map the actual data fields to chart properties
- Return ONLY the React component code

When asked to create data functions:
- Use the real data structure and methods provided in context
- Transform real data into the format needed for visualization
- Use actual field names from the real data structure
- Include proper error handling
- Return ONLY the JavaScript function code

When generating titles or summaries:
- Keep titles under 10 words maximum
- Make summaries concise and focused
- Use clear, descriptive language
- Avoid technical jargon unless necessary

Be direct and focused. No explanations unless specifically asked.

${context ? `CONTEXT: ${context}` : ""}

User message: ${message}`

    console.log("=== FULL PROMPT SENT TO GEMINI ===")
    console.log(systemPrompt)
    console.log("=== END PROMPT ===")

    const result = await model.generateContent(systemPrompt)
    const response = await result.response.text()
    
    // Log what's received from Gemini
    console.log("=== GEMINI RESPONSE ===")
    console.log("Response length:", response.length)
    console.log("Response preview (first 500 chars):", response.substring(0, 500))
    if (response.length > 500) {
      console.log("Response preview (last 500 chars):", response.substring(response.length - 500))
    }
    console.log("=== END RESPONSE ===")
    
    return NextResponse.json({ response })
  } catch (error) {
    console.error("=== GEMINI API ERROR ===")
    console.error("Error:", error)
    console.error("Error message:", error instanceof Error ? error.message : String(error))
    console.error("=== END ERROR ===")
    return NextResponse.json(
      { error: "I apologize, but I'm having trouble connecting to my dashboard analysis systems right now. Please try again in a moment." },
      { status: 500 }
    )
  }
} 