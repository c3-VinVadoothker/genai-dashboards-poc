export interface DataQueryResult {
  dataSource: string
  rawData: any[]
  processedData: any
  error?: string
}

export interface DataQueryAnswer {
  answer: string
  queryResult: DataQueryResult
  queryIntent: string
}

export class DataQueryAgent {
  private static instance: DataQueryAgent

  static getInstance(): DataQueryAgent {
    if (!DataQueryAgent.instance) {
      DataQueryAgent.instance = new DataQueryAgent()
    }
    return DataQueryAgent.instance
  }

  async processDataQuery(
    userQuery: string,
    functionCode: string,
    dataSource: string,
    queryDescription: string,
    chatHistory?: string
  ): Promise<DataQueryAnswer> {
    try {
      console.log("🔍 DataQueryAgent: Processing data query for:", dataSource)
      console.log("🔍 DataQueryAgent: Function code:", functionCode)
      console.log("🔍 DataQueryAgent: Chat history received:", chatHistory ? "Yes" : "No")
      console.log("🔍 DataQueryAgent: Chat history length:", chatHistory?.length || 0)
      if (chatHistory) {
        console.log("🔍 DataQueryAgent: Chat history content:", chatHistory)
      }
      
      // Execute the data query function
      const queryResult = await this.executeDataQueryFunction(functionCode, dataSource)
      
      // Generate answer using Gemini
      const answer = await this.generateAnswer(userQuery, queryResult, queryDescription, chatHistory)
      
      return {
        answer,
        queryResult,
        queryIntent: userQuery
      }
    } catch (error) {
      console.error("DataQueryAgent error:", error)
      return {
        answer: "I encountered an error while processing your data query. Please try again.",
        queryResult: {
          dataSource,
          rawData: [],
          processedData: null,
          error: error instanceof Error ? error.message : String(error)
        },
        queryIntent: userQuery
      }
    }
  }

  private async executeDataQueryFunction(functionCode: string, dataSource: string): Promise<DataQueryResult> {
    try {
      console.log("🔍 DataQueryAgent: Executing data query function")
      console.log("🔍 DataQueryAgent: Function code to execute:", functionCode)
      
      // Fetch the raw data
      console.log("🔍 DataQueryAgent: Fetching data from /api/data/turbines")
      const response = await fetch('/api/data/turbines')
      const rawData = await response.json()
      
      // Execute the data function directly
      console.log("🔍 DataQueryAgent: Executing dataFunction...")
      
      // Extract function name from the dataFunction
      const functionNameMatch = functionCode.match(/async\s+function\s+(\w+)\s*\(/)
      const functionName = functionNameMatch ? functionNameMatch[1] : null
      console.log("🔍 DataQueryAgent: Extracted function name:", functionName)
      
      if (!functionName) {
        throw new Error('Could not extract function name from dataFunction')
      }
      
      // Create and execute the function with the raw data
      const executeFunction = new Function(`
        ${functionCode}
        return ${functionName}();
      `)
      const result = await executeFunction()
      
      // If the function returns a promise, await it
      let processedData
      if (result && typeof result.then === 'function') {
        processedData = await result
      } else {
        processedData = result
      }
      
      console.log("🔍 DataQueryAgent: Query function executed successfully")
      
      return {
        dataSource,
        rawData: Array.isArray(processedData) ? processedData : [processedData],
        processedData: processedData,
        error: undefined
      }
    } catch (error) {
      console.error("Error executing data query function:", error)
      return {
        dataSource,
        rawData: [],
        processedData: null,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async generateAnswer(
    userQuery: string,
    queryResult: DataQueryResult,
    queryDescription: string,
    chatHistory?: string
  ): Promise<string> {
    try {
      const prompt = `You are a helpful AI assistant that analyzes data and answers user questions.

USER QUERY: "${userQuery}"

QUERY DESCRIPTION: "${queryDescription}"

DATA SOURCE: ${queryResult.dataSource}

${queryResult.error ? `ERROR: ${queryResult.error}` : `QUERY RESULTS:
${JSON.stringify(queryResult.processedData, null, 2)}

RAW DATA COUNT: ${queryResult.rawData.length} records`}

${chatHistory ? `CHAT HISTORY:
${chatHistory}

` : ''}

Based on the data above, provide a comprehensive answer to the user's query. 

REQUIREMENTS:
1. Answer the specific question asked
2. Use the actual data from the query results
3. Provide insights and analysis based on the data
4. Format your response in Markdown
5. Be conversational and helpful
6. If there are errors, explain what went wrong but still try to help
7. If no relevant data is available, explain what you can and cannot answer

Return ONLY the markdown answer, no additional formatting or explanations.`

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          context: "Data analysis and query answering"
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      return data.response

    } catch (error) {
      console.error("Error generating answer:", error)
      return "I encountered an error while generating an answer. Please try again."
    }
  }
} 