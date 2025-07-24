export type RequestType = 
  | "CREATE_DASHBOARD" 
  | "READ_DASHBOARD" 
  | "READ_DATA" 
  | "UPDATE_DASHBOARD" 
  | "DELETE_DASHBOARD" 
  | "CLARIFICATION"
  | "OTHER"

export interface SemanticClassification {
  type: RequestType
  confidence: number
  extractedInfo?: {
    dashboardName?: string
    chartType?: string
    dataSource?: string
    analysisType?: string
    filters?: string[]
    dashboardIds?: string[]
    queryIntent?: string
  }
  generatedCode?: {
    componentCode: string
    dataFunction: string
    title: string
    description: string
    previewCode: string
    dashboardId?: string
  }
  dataQueryFunction?: {
    functionCode: string
    dataSource: string
    queryDescription: string
  }
  directResponse?: string // Added for direct responses
  clarificationResponse?: string // Added for clarification questions
}

export class GeminiSemanticAgent {
  private static instance: GeminiSemanticAgent

  static getInstance(): GeminiSemanticAgent {
    if (!GeminiSemanticAgent.instance) {
      GeminiSemanticAgent.instance = new GeminiSemanticAgent()
    }
    return GeminiSemanticAgent.instance
  }

  async classifyRequest(userInput: string, chatHistory?: string): Promise<SemanticClassification> {
    try {
      console.log("🔍 GeminiSemanticAgent: Classifying input:", userInput)
      console.log("🔍 GeminiSemanticAgent: Chat history received:", chatHistory ? "Yes" : "No")
      console.log("🔍 GeminiSemanticAgent: Chat history length:", chatHistory?.length || 0)
      if (chatHistory) {
        console.log("🔍 GeminiSemanticAgent: Chat history content:", chatHistory)
      }
      
      // Execute the data query function
      const classification = await this.getGeminiClassification(userInput, chatHistory)
      console.log("🔍 GeminiSemanticAgent: Classification result:", classification)
      
      return classification
    } catch (error) {
      console.error("Gemini semantic classification error:", error)
      // Always return a valid result
      return {
        type: "OTHER",
        confidence: 0.70,
        directResponse: "I'm sorry, I encountered an error processing your request. Please try again."
      }
    }
  }

  private async getGeminiClassification(userInput: string, chatHistory?: string): Promise<SemanticClassification> {
    try {
      // Get data schema and sample data
      const dataContext = await this.getDataContext()
      
      // Get available dashboards for READ_DASHBOARD classification
      const availableDashboards = await this.getAvailableDashboards()
      const dashboardsList = availableDashboards.map(d => `- ID: ${d.id}, Name: "${d.name}", Description: "${d.description}"`).join('\n')
      
      const prompt = `You are a semantic classification and dashboard matching system. Classify this request and handle dashboard matching in one response.

CATEGORIES:
- CREATE_DASHBOARD: User wants to create a new dashboard, chart, or visualization
- READ_DASHBOARD: User wants to view existing dashboards (only if dashboards exist)
- READ_DATA: User wants to analyze, view, or query raw data (when no dashboards exist)
- UPDATE_DASHBOARD: User wants to modify existing dashboards
- DELETE_DASHBOARD: User wants to remove dashboards
- CLARIFICATION: User is asking for clarification about a previous request or statement
- OTHER: General conversation, questions, or unclear requests

AVAILABLE DATA SCHEMA:
${dataContext.schema}

SAMPLE DATA (25 random rows):
${dataContext.sampleData}

AVAILABLE DASHBOARDS:
${dashboardsList}

${chatHistory ? `CHAT HISTORY CONTEXT:
${chatHistory}

` : ''}REQUEST: "${userInput}"

MATCHING RULES FOR READ_DASHBOARD:
1. Exact name matches (case-insensitive)
2. Partial name matches (e.g., "turbine status" matches "Turbine Status by Location")
3. Semantic relevance to the query

FOR UPDATE_DASHBOARD REQUESTS:
If you identify an UPDATE_DASHBOARD query, extract the dashboard ID(s) that need to be updated based on:
1. Explicit mentions of dashboard names or IDs
2. Semantic matching to existing dashboard names
3. Context from chat history about which dashboards were previously discussed

FOR DELETE_DASHBOARD REQUESTS:
If you identify a DELETE_DASHBOARD query, extract the dashboard ID(s) that need to be deleted based on:
1. Explicit mentions of dashboard names or IDs
2. Semantic matching to existing dashboard names
3. Context from chat history about which dashboards were previously discussed
4. Keywords like "delete", "remove", "get rid of", "eliminate"

FOR CLARIFICATION REQUESTS:
If you identify a CLARIFICATION query, generate clarifying questions to better understand the user's intent. Look for:
1. Questions asking "what do you mean?"
2. Requests for clarification about previous responses
3. Confusion about system capabilities
4. Need for more specific information
5. Ambiguous requests that need clarification

FOR CREATE_DASHBOARD REQUESTS:
If you identify a CREATE_DASHBOARD query, extract information about what the user wants to create. Look for:
1. Keywords like "create", "make", "build", "generate", "show me a dashboard"
2. Chart types mentioned (bar, line, scatter, pie, etc.)
3. Data sources and metrics to visualize
4. Analysis types (correlation, comparison, trends, etc.)

IMPORTANT: CREATE_DASHBOARD should take priority over READ_DASHBOARD when the user uses creation keywords like "make me a dashboard", "create a dashboard", "build a dashboard", etc., even if there are existing dashboards with similar names.

Return ONLY a JSON object with this EXACT structure:
{
  "type": "CREATE_DASHBOARD",
  "confidence": 0.95,
  "extractedInfo": {
    "dashboardName": "extracted name if any",
    "dataSource": "extracted data source (turbine, telemetry, etc.)",
    "analysisType": "correlation/comparison/trends/patterns",
    "filters": ["location", "model", "wind_speed", "status", "timestamp"],
    "dashboardIds": [],
    "queryIntent": "what the user wants to visualize"
  }
}

FOR READ_DASHBOARD REQUESTS:
If you identify a READ_DASHBOARD query, extract the dashboard ID(s) that need to be viewed based on:
1. Exact name matches (case-insensitive)
2. Partial name matches (e.g., "turbine status" matches "Turbine Status by Location")
3. Semantic relevance to the query

IMPORTANT: READ_DASHBOARD should only be used when the user wants to VIEW existing dashboards, NOT when they want to CREATE new ones. If the user uses creation keywords like "make", "create", "build", "generate", etc., use CREATE_DASHBOARD instead.

Return ONLY a JSON object with this EXACT structure:
{
  "type": "READ_DASHBOARD",
  "confidence": 0.95,
  "extractedInfo": {
    "dashboardName": "extracted name if any",
    "dataSource": "extracted data source (turbine, telemetry, etc.)",
    "analysisType": "view/display",
    "filters": [],
    "dashboardIds": ["dashboard_id_1", "dashboard_id_2"],
    "queryIntent": "what the user wants to view"
  }
}

FOR UPDATE_DASHBOARD REQUESTS:
If you identify an UPDATE_DASHBOARD query, extract the dashboard ID(s) that need to be updated based on:
1. Explicit mentions of dashboard names or IDs
2. Semantic matching to existing dashboard names
3. Context from chat history about which dashboards were previously discussed

Return ONLY a JSON object with this EXACT structure:
{
  "type": "UPDATE_DASHBOARD",
  "confidence": 0.95,
  "extractedInfo": {
    "dashboardName": "extracted name if any",
    "dataSource": "extracted data source (turbine, telemetry, etc.)",
    "analysisType": "modify/update",
    "filters": [],
    "dashboardIds": ["dashboard_id_1", "dashboard_id_2"],
    "queryIntent": "what the user wants to modify"
  }
}

FOR DELETE_DASHBOARD REQUESTS:
If you identify a DELETE_DASHBOARD query, extract the dashboard ID(s) that need to be deleted based on:
1. Explicit mentions of dashboard names or IDs
2. Semantic matching to existing dashboard names
3. Context from chat history about which dashboards were previously discussed
4. Keywords like "delete", "remove", "get rid of", "eliminate"

Return ONLY a JSON object with this EXACT structure:
{
  "type": "DELETE_DASHBOARD",
  "confidence": 0.95,
  "extractedInfo": {
    "dashboardName": "extracted name if any",
    "dataSource": "extracted data source (turbine, telemetry, etc.)",
    "analysisType": "delete/remove",
    "filters": [],
    "dashboardIds": ["dashboard_id_1", "dashboard_id_2"],
    "queryIntent": "what the user wants to delete"
  }
}

FOR OTHER REQUESTS:
If you identify an OTHER query, generate a direct, helpful response to the user's question or request. Provide:
1. Relevant information based on available data and dashboards
2. Clear explanations of system capabilities
3. Helpful guidance for using the system
4. Friendly and informative responses

FOR READ_DATA REQUESTS:
If you identify a READ_DATA query, generate a data query function that will fetch and process the relevant data to answer the user's question. 

CRITICAL REQUIREMENTS FOR READ_DATA FUNCTIONS:
1. Function MUST be named "queryData" (exactly)
2. Function MUST be async
3. Function MUST use fetch() to call API endpoints
4. Function MUST return the processed data
5. Function MUST include proper error handling
6. Function MUST be complete and executable

AVAILABLE API ENDPOINTS:
- /api/data/turbines - Returns array of turbine objects
- /api/data/telemetry - Returns array of telemetry objects

EXAMPLE FUNCTION STRUCTURE:
async function queryData() {
  try {
    const response = await fetch('/api/data/turbines');
    if (!response.ok) {
      throw new Error('HTTP error! status: ' + response.status);
    }
    const data = await response.json();
    
    // Process data here
    const processedData = data.filter(item => /* your filter logic */);
    
    return processedData;
  } catch (error) {
    console.error("Error querying data:", error);
    return [];
  }
}

Return ONLY a JSON object with this EXACT structure:
{
  "type": "READ_DATA",
  "confidence": 0.95,
  "extractedInfo": {
    "dashboardName": "extracted name if any",
    "dataSource": "extracted data source (turbine, telemetry, etc.)",
    "analysisType": "analysis/comparison/pattern/impact",
    "filters": ["location", "model", "wind_speed", "status", "timestamp"],
    "dashboardIds": [],
    "queryIntent": "what the user is asking about the dashboard data"
  },
  "dataQueryFunction": {
    "functionCode": "async function queryData() { /* complete function code */ }",
    "dataSource": "wind_turbines",
    "queryDescription": "Description of what this function does"
  }
}

For OTHER requests, return this structure:
{
  "type": "OTHER",
  "confidence": 0.95,
  "directResponse": "Your direct, helpful response to the user's query"
}

For CLARIFICATION requests, return this structure:
{
  "type": "CLARIFICATION", 
  "confidence": 0.95,
  "clarificationResponse": "Your clarifying questions to better understand the user's intent"
}`

      console.log("🔍 GeminiSemanticAgent: Sending to Gemini:")
      console.log("🔍 GeminiSemanticAgent: Chat history in prompt:", chatHistory ? "Yes" : "No")
      console.log("📝 Prompt:", prompt)

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          context: "Semantic classification for dashboard system with data context"
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      const geminiResponse = data.response

      console.log("🔍 GeminiSemanticAgent: Raw Gemini response:", geminiResponse)

      // Parse the JSON response from Gemini
      let classification: SemanticClassification
      try {
        // Extract JSON from the response (handle cases where Gemini adds extra text)
        const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          classification = JSON.parse(jsonMatch[0])
          console.log("🔍 GeminiSemanticAgent: Parsed classification:", classification)
        } else {
          throw new Error("No JSON found in response")
        }
      } catch (parseError) {
        console.error("Failed to parse Gemini response:", parseError)
        throw new Error("Invalid JSON response from Gemini")
      }

      // Validate the classification
      if (!classification.type || !classification.confidence) {
        throw new Error("Invalid classification structure")
      }

      // Ensure confidence is a number
      classification.confidence = Number(classification.confidence)

      // Check if dashboards exist for READ_DASHBOARD vs READ_DATA
      if (classification.type === "READ_DASHBOARD") {
        const dashboardsExist = await this.checkDashboardsExist()
        if (!dashboardsExist) {
          console.log("🔍 GeminiSemanticAgent: No dashboards exist, changing READ_DASHBOARD to READ_DATA")
          classification.type = "READ_DATA"
        } else {
          // Dashboard matching is now handled in the main prompt
          console.log("🔍 GeminiSemanticAgent: READ_DASHBOARD classification with dashboard IDs:", classification.extractedInfo?.dashboardIds)
        }
      }

      // Generate code for CREATE_DASHBOARD requests
      if (classification.type === "CREATE_DASHBOARD") {
        console.log("🔍 GeminiSemanticAgent: Generating dashboard code for CREATE_DASHBOARD request")
        const generatedCode = await this.generateDashboardCode(userInput, classification.extractedInfo)
        classification.generatedCode = generatedCode
        
        // Automatically save the dashboard to data/dashboards
        try {
          console.log("🔍 GeminiSemanticAgent: Auto-saving dashboard to data/dashboards")
          const saveResponse = await fetch('/api/dashboards', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: generatedCode.title,
              description: generatedCode.description,
              tags: [],
              chartType: "custom",
              componentCode: generatedCode.componentCode,
              dataFunction: generatedCode.dataFunction,
              query: userInput
            })
          })
          
          if (saveResponse.ok) {
            const saveResult = await saveResponse.json()
            console.log("🔍 GeminiSemanticAgent: Dashboard auto-saved successfully:", saveResult.dashboard.id)
            // Include the dashboard ID in the generated code
            generatedCode.dashboardId = saveResult.dashboard.id
          } else {
            console.error("🔍 GeminiSemanticAgent: Failed to auto-save dashboard")
          }
        } catch (error) {
          console.error("🔍 GeminiSemanticAgent: Error auto-saving dashboard:", error)
        }
      }

      return classification

    } catch (error) {
      console.error("Gemini classification failed:", error)
      throw error
    }
  }

  private async getDataContext(): Promise<{ schema: string; sampleData: string; apiEndpoints: string }> {
    try {
      // Dynamically discover available data sources
      const dataSources = await this.discoverDataSources()
      
      let schema = "AVAILABLE DATA SOURCES:\n\n"
      let sampleData = "SAMPLE DATA:\n\n"
      let apiEndpoints = "AVAILABLE API ENDPOINTS:\n\n"
      
      for (const source of dataSources) {
        schema += `${source.name}:\n`
        schema += source.schema
        schema += "\n\n"
        
        sampleData += `${source.name.toUpperCase()} (${source.sampleData.length} sample rows):\n`
        sampleData += JSON.stringify(source.sampleData, null, 2)
        sampleData += "\n\n"
        
        // Add API endpoint information
        apiEndpoints += `${source.apiEndpoint}\n\n`
      }

      return { schema, sampleData, apiEndpoints }
    } catch (error) {
      console.error("Error getting data context:", error)
      return {
        schema: "Data schema unavailable",
        sampleData: "Sample data unavailable",
        apiEndpoints: "API endpoints unavailable"
      }
    }
  }

  private async discoverDataSources(): Promise<Array<{
    name: string
    schema: string
    sampleData: any[]
    apiEndpoint: string
  }>> {
    const dataSources = []

    try {
      // Fetch metadata from the new metadata endpoint
      const metadataResponse = await fetch('/api/data/metadata')
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json()
        
        for (const endpoint of metadata.endpoints) {
          if (endpoint.available && endpoint.sampleData) {
            // Build schema from the endpoint metadata
            const schemaEntries = Object.entries(endpoint.schema || {})
              .map(([key, field]: [string, any]) => `  - ${key} (${field.type}): ${field.description}`)
              .join('\n')
            
            const schema = `${endpoint.name}:\n${schemaEntries}`
            
            // Build API endpoint documentation
            const queryParams = endpoint.queryParams?.length > 0 
              ? endpoint.queryParams.map((param: any) => `     - ${param.name} (${param.type}): ${param.description}`).join('\n')
              : 'None'
            
            const apiEndpoint = `${endpoint.name}:\n   - Method: ${endpoint.method}\n   - Path: ${endpoint.path}\n   - Description: ${endpoint.description}\n   - Query Parameters:\n${queryParams}\n   - Sample: ${JSON.stringify(endpoint.sampleData[0], null, 2)}`
            
            dataSources.push({
              name: endpoint.name,
              schema,
              sampleData: endpoint.sampleData,
              apiEndpoint
            })
          }
        }
        
        // Add relationships if available
        if (metadata.relationships && metadata.relationships.length > 0) {
          const relationshipText = metadata.relationships
            .map((rel: any) => `- ${rel.from}.${rel.field} → ${rel.to}.${rel.field} (${rel.type})`)
            .join('\n')
          
          if (dataSources.length > 0) {
            dataSources[0].schema += "\n\nRELATIONSHIPS:\n"
            dataSources[0].schema += relationshipText
          }
        }
      }
    } catch (error) {
      console.error("Error fetching metadata:", error)
      // Fallback to direct API calls if metadata endpoint fails
      return this.fallbackDataDiscovery()
    }

    return dataSources
  }

  private async fallbackDataDiscovery(): Promise<Array<{
    name: string
    schema: string
    sampleData: any[]
    apiEndpoint: string
  }>> {
    const dataSources = []

    try {
      // Check for wind turbines data
      const turbinesResponse = await fetch('/api/data/turbines')
      if (turbinesResponse.ok) {
        const turbines = await turbinesResponse.json()
        if (turbines && turbines.length > 0) {
          // Infer schema from first record
          const sampleTurbine = turbines[0]
          const turbineSchema = Object.entries(sampleTurbine)
            .map(([key, value]) => `  - ${key} (${typeof value}): ${this.getFieldDescription(key, value)}`)
            .join('\n')

          dataSources.push({
            name: 'wind_turbines',
            schema: `wind_turbines:\n${turbineSchema}`,
            sampleData: turbines.slice(0, 5), // First 5 turbines
            apiEndpoint: `1. /api/data/turbines
   - Method: GET
   - Input: None
   - Output: Array of turbine objects
   - Sample: ${JSON.stringify(turbines[0], null, 2)}`
          })
        }
      }
    } catch (error) {
      console.error("Error fetching turbines:", error)
    }

    try {
      // Check for telemetry data
      const telemetryResponse = await fetch('/api/data/telemetry?limit=100')
      if (telemetryResponse.ok) {
        let telemetry = await telemetryResponse.json()
        if (telemetry && telemetry.length > 0) {
          // Get 25 random samples
          if (telemetry.length > 25) {
            telemetry = telemetry.sort(() => Math.random() - 0.5).slice(0, 25)
          }

          // Infer schema from first record
          const sampleTelemetry = telemetry[0]
          const telemetrySchema = Object.entries(sampleTelemetry)
            .map(([key, value]) => `  - ${key} (${typeof value}): ${this.getFieldDescription(key, value)}`)
            .join('\n')

          dataSources.push({
            name: 'turbine_telemetry',
            schema: `turbine_telemetry:\n${telemetrySchema}`,
            sampleData: telemetry,
            apiEndpoint: `2. /api/data/telemetry
   - Method: GET
   - Input: Query parameters (optional)
     - turbine_id: string (filter by specific turbine)
     - limit: number (limit number of records)
   - Output: Array of telemetry objects
   - Sample: ${JSON.stringify(telemetry[0], null, 2)}`
          })
        }
      }
    } catch (error) {
      console.error("Error fetching telemetry:", error)
    }

    // Add relationships if both sources exist
    if (dataSources.length > 1) {
      dataSources[0].schema += "\n\nRELATIONSHIPS:\n"
      dataSources[0].schema += "- wind_turbines.turbine_id → turbine_telemetry.turbine_id (one-to-many)"
    }

    return dataSources
  }

  private getFieldDescription(key: string, value: any): string {
    const descriptions: Record<string, string> = {
      turbine_id: 'Unique identifier for each turbine',
      model: 'Turbine model name',
      location: 'Geographic location/farm name',
      commission_date: 'Date when turbine was commissioned',
      latitude: 'GPS latitude coordinate',
      longitude: 'GPS longitude coordinate',
      status: 'Turbine status: "Active", "Warning", or "Offline"',
      timestamp: 'ISO datetime of the reading',
      power_output_kw: 'Power output in kilowatts',
      wind_speed_mph: 'Wind speed in miles per hour',
      rotor_rpm: 'Rotor speed in RPM',
      gearbox_temp_c: 'Gearbox temperature in Celsius'
    }

    return descriptions[key] || `${key} field`
  }

  private async generateDashboardCode(userInput: string, extractedInfo?: any): Promise<{
    componentCode: string
    dataFunction: string
    title: string
    description: string
    previewCode: string
    dashboardId?: string
  }> {
    try {
      const dataContext = await this.getDataContext()
      
      const prompt = `Generate a React dashboard component preview based on this request. Follow this EXACT structure and format.

IMPORTANT: DO NOT INCLUDE ANY IMPORT STATEMENTS IN YOUR CODE. The following dependencies are already available and will be provided to your component:

AVAILABLE DEPENDENCIES (DO NOT IMPORT THESE):
- React, useState, useEffect
- Card, CardContent, CardHeader, CardTitle (from @/components/ui/card)
- LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend (from recharts)
- PieChart, Pie, Cell (from recharts)
- ScatterChart, Scatter (from recharts)
- AreaChart, Area (from recharts)
- BarChart, Bar (from recharts)

${dataContext.apiEndpoints}

DATA FUNCTION REQUIREMENTS:
- The dataFunction should be a complete, self-contained function that fetches and processes data
- For functions that take parameters, use: const functionName = (turbines) => { ... }
- For functions that fetch their own data, use: const functionName = async () => { ... }
- ALWAYS return the processed data at the end of the function
- Include proper error handling with try/catch
- Return empty array [] on error

REQUEST: "${userInput}"

EXTRACTED INFO: ${JSON.stringify(extractedInfo || {}, null, 2)}

AVAILABLE DATA SCHEMA:
${dataContext.schema}

SAMPLE DATA:
${dataContext.sampleData}

EXAMPLES OF CORRECT STRUCTURE (NO IMPORTS):

EXAMPLE 1 - Power Output Chart with Professional Formatting:
\`\`\`jsx
function PowerOutputChart() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPowerData()
  }, [])

  const fetchPowerData = async () => {
    try {
      const response = await fetch('/api/data/telemetry?limit=50')
      const telemetry = await response.json()
      const chartData = telemetry.map(item => ({
        time: new Date(item.timestamp).toLocaleTimeString(),
        power: item.power_output_kw
      }))
      setData(chartData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Card><CardContent className="flex items-center justify-center h-64"><div className="text-foreground">Loading...</div></CardContent></Card>

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-card-foreground">Power Output Monitoring</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              label={{ value: 'Time', position: 'insideBottom', offset: -10, style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              label={{ value: 'Power Output (kW)', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--card-foreground))',
                fontSize: '12px'
              }}
              labelStyle={{ fontWeight: 'bold' }}
            />
            <Legend 
              verticalAlign="top" 
              height={36}
              wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}
            />
            <Line 
              type="monotone" 
              dataKey="power" 
              name="Power Output"
              stroke="hsl(var(--chart-1))" 
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--chart-1))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: 'hsl(var(--chart-1))', strokeWidth: 2, fill: 'hsl(var(--chart-1))' }}
            />
            {/* For specific color requests, use: stroke="#ef4444" for red, stroke="#3b82f6" for blue, etc. */}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
\`\`\`

EXAMPLE 2 - Turbine Status Overview with Professional Formatting:
\`\`\`jsx
function TurbineStatusOverview() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTurbineData()
  }, [])

  const fetchTurbineData = async () => {
    try {
      const response = await fetch('/api/data/turbines')
      const turbines = await response.json()
      const statusCounts = turbines.reduce((acc, turbine) => {
        acc[turbine.status] = (acc[turbine.status] || 0) + 1
        return acc
      }, {})
      const chartData = Object.entries(statusCounts).map(([status, count]) => ({
        name: status,
        value: count
      }))
      setData(chartData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))']

  if (loading) return <Card><CardContent className="flex items-center justify-center h-64"><div className="text-foreground">Loading...</div></CardContent></Card>

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-card-foreground">Turbine Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <Pie 
              data={data} 
              cx="50%" 
              cy="50%" 
              outerRadius={120}
              innerRadius={60}
              dataKey="value"
              label={({ name, percent }) => \`\${name} (\${(percent * 100).toFixed(0)}%)\`}
              labelLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={index} 
                  fill={COLORS[index % COLORS.length]} 
                  stroke="hsl(var(--border))"
                  strokeWidth={2}
                />
              ))}
              {/* For specific color requests, use: fill="#ef4444" for red, fill="#3b82f6" for blue, etc. */}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--card-foreground))',
                fontSize: '12px'
              }}
              formatter={(value, name) => [value, name]}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
\`\`\`

EXAMPLE 3 - Wind Speed vs Power with Professional Formatting:
\`\`\`jsx
function WindSpeedPowerChart() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWindData()
  }, [])

  const fetchWindData = async () => {
    try {
      const response = await fetch('/api/data/telemetry?limit=100')
      const telemetry = await response.json()
      const chartData = telemetry.map(item => ({
        windSpeed: item.wind_speed_mph,
        power: item.power_output_kw
      }))
      setData(chartData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Card><CardContent className="flex items-center justify-center h-64"><div className="text-foreground">Loading...</div></CardContent></Card>

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-card-foreground">Wind Speed vs Power Output Correlation</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis 
              dataKey="windSpeed" 
              name="Wind Speed"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              label={{ value: 'Wind Speed (mph)', position: 'insideBottom', offset: -10, style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } }}
            />
            <YAxis 
              dataKey="power" 
              name="Power Output"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              label={{ value: 'Power Output (kW)', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } }}
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3', stroke: 'hsl(var(--border))' }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--card-foreground))',
                fontSize: '12px'
              }}
              formatter={(value, name) => [value, name]}
              labelFormatter={(label) => \`Wind Speed: \${label} mph\`}
            />
            <Legend 
              verticalAlign="top" 
              height={36}
              wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}
            />
            <Scatter 
              dataKey="power" 
              name="Power Output"
              fill="hsl(var(--chart-1))" 
              stroke="hsl(var(--chart-1))"
              strokeWidth={1}
            />
            {/* For specific color requests, use: fill="#ef4444" stroke="#ef4444" for red, etc. */}
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
\`\`\`

EXAMPLE 4 - Temperature Monitoring with Professional Formatting:
\`\`\`jsx
function TemperatureMonitoring() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemperatureData()
  }, [])

  const fetchTemperatureData = async () => {
    try {
      const response = await fetch('/api/data/telemetry?limit=50')
      const telemetry = await response.json()
      const chartData = telemetry.map(item => ({
        time: new Date(item.timestamp).toLocaleTimeString(),
        temperature: item.gearbox_temp_c
      }))
      setData(chartData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Card><CardContent className="flex items-center justify-center h-64"><div className="text-foreground">Loading...</div></CardContent></Card>

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-card-foreground">Gearbox Temperature Monitoring</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              label={{ value: 'Time', position: 'insideBottom', offset: -10, style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--card-foreground))',
                fontSize: '12px'
              }}
              labelStyle={{ fontWeight: 'bold' }}
            />
            <Legend 
              verticalAlign="top" 
              height={36}
              wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}
            />
            <Area 
              type="monotone" 
              dataKey="temperature" 
              name="Temperature"
              stroke="hsl(var(--chart-1))" 
              fill="hsl(var(--chart-1))" 
              fillOpacity={0.3}
              strokeWidth={2}
            />
            {/* For specific color requests, use: fill="#ef4444" stroke="#ef4444" for red, etc. */}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
\`\`\`

EXAMPLE 5 - RPM Monitoring with Professional Formatting:
\`\`\`jsx
function RPMMonitoring() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRPMData()
  }, [])

  const fetchRPMData = async () => {
    try {
      const response = await fetch('/api/data/telemetry?limit=30')
      const telemetry = await response.json()
      const chartData = telemetry.map(item => ({
        time: new Date(item.timestamp).toLocaleTimeString(),
        rpm: item.rotor_rpm
      }))
      setData(chartData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Card><CardContent className="flex items-center justify-center h-64"><div className="text-foreground">Loading...</div></CardContent></Card>

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-card-foreground">Rotor RPM Monitoring</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              label={{ value: 'Time', position: 'insideBottom', offset: -10, style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              label={{ value: 'RPM', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--card-foreground))',
                fontSize: '12px'
              }}
              labelStyle={{ fontWeight: 'bold' }}
            />
            <Legend 
              verticalAlign="top" 
              height={36}
              wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}
            />
            <Bar 
              dataKey="rpm" 
              name="Rotor RPM"
              fill="hsl(var(--chart-1))" 
              stroke="hsl(var(--chart-1))"
              strokeWidth={1}
              radius={[4, 4, 0, 0]}
            />
            {/* For specific color requests, use: fill="#ef4444" for red, fill="#3b82f6" for blue, etc. */}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
\`\`\`

EXAMPLE 6 - Multi-Color Chart with Specific Color Requests:
\`\`\`jsx
function MultiColorChart() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/data/telemetry?limit=50')
      const telemetry = await response.json()
      const chartData = telemetry.map(item => ({
        time: new Date(item.timestamp).toLocaleTimeString(),
        power: item.power_output_kw,
        rpm: item.rotor_rpm,
        temperature: item.gearbox_temp_c
      }))
      setData(chartData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Card><CardContent className="flex items-center justify-center h-64"><div className="text-foreground">Loading...</div></CardContent></Card>

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-card-foreground">Multi-Metric Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--card-foreground))',
                fontSize: '12px'
              }}
            />
            <Legend 
              verticalAlign="top" 
              height={36}
              wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}
            />
            {/* Example of specific color requests */}
            <Line 
              type="monotone" 
              dataKey="power" 
              name="Power Output"
              stroke="#ef4444" // Red as requested
              strokeWidth={3}
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="rpm" 
              name="Rotor RPM"
              stroke="#3b82f6" // Blue as requested
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="temperature" 
              name="Temperature"
              stroke="#10b981" // Green as requested
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
\`\`\`

EXAMPLE 7 - Dashboard with Advanced Filtering:
\`\`\`jsx
function FilteredDashboard() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    dateRange: { start: null, end: null },
    locations: [],
    statuses: [],
    correlationRange: { min: 0, max: 100 },
    turbines: []
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/data/telemetry?limit=100')
      const telemetry = await response.json()
      setData(telemetry)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = (rawData) => {
    let filteredData = [...rawData]
    
    // Apply date range filter
    if (filters.dateRange.start && filters.dateRange.end) {
      filteredData = filteredData.filter(item => {
        const itemDate = new Date(item.timestamp)
        return itemDate >= filters.dateRange.start && itemDate <= filters.dateRange.end
      })
    }
    
    // Apply location filter
    if (filters.locations.length > 0) {
      filteredData = filteredData.filter(item => 
        filters.locations.includes(item.location)
      )
    }
    
    // Apply status filter
    if (filters.statuses.length > 0) {
      filteredData = filteredData.filter(item => 
        filters.statuses.includes(item.status)
      )
    }
    
    // Apply turbine filter
    if (filters.turbines.length > 0) {
      filteredData = filteredData.filter(item => 
        filters.turbines.includes(item.turbine_id)
      )
    }
    
    return filteredData
  }

  const resetFilters = () => {
    setFilters({
      dateRange: { start: null, end: null },
      locations: [],
      statuses: [],
      correlationRange: { min: 0, max: 100 },
      turbines: []
    })
  }

  const activeFilterCount = Object.values(filters).filter(f => 
    Array.isArray(f) ? f.length > 0 : 
    typeof f === 'object' && f.start && f.end
  ).length

  if (loading) return <Card><CardContent className="flex items-center justify-center h-64"><div className="text-foreground">Loading...</div></CardContent></Card>

  const filteredData = applyFilters(data)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-card-foreground">Filtered Dashboard</CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Active filters: {activeFilterCount}</span>
          {activeFilterCount > 0 && (
            <button onClick={resetFilters} className="text-blue-500 hover:underline">
              Reset filters
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter UI would go here */}
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis 
              dataKey="wind_speed_mph" 
              name="Wind Speed"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              label={{ value: 'Wind Speed (mph)', position: 'insideBottom', offset: -10, style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } }}
            />
            <YAxis 
              dataKey="power_output_kw" 
              name="Power Output"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              label={{ value: 'Power Output (kW)', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 14 } }}
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3', stroke: 'hsl(var(--border))' }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--card-foreground))',
                fontSize: '12px'
              }}
            />
            <Scatter 
              dataKey="power_output_kw" 
              name="Power Output"
              fill="hsl(var(--chart-1))" 
              stroke="hsl(var(--chart-1))"
              strokeWidth={1}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
\`\`\`

REQUIREMENTS:
1. Use EXACTLY the same structure as examples above
2. DO NOT include any import statements - all dependencies are already provided
3. Include useState, useEffect, and proper error handling
4. Use recharts for visualizations with professional formatting
5. Support both dark and light themes using CSS variables:
   - Use 'hsl(var(--chart-1))', 'hsl(var(--chart-2))', etc. for chart colors

COLOR HANDLING:
- When users request specific colors, use appropriate hex color codes:
  - Red: "#ef4444" or "#dc2626"
  - Blue: "#3b82f6" or "#2563eb"
  - Green: "#10b981" or "#059669"
  - Yellow: "#f59e0b" or "#d97706"
  - Purple: "#8b5cf6" or "#7c3aed"
  - Orange: "#f97316" or "#ea580c"
  - Pink: "#ec4899" or "#db2777"
  - Indigo: "#6366f1" or "#4f46e5"
  - Teal: "#14b8a6" or "#0d9488"
  - Cyan: "#06b6d4" or "#0891b2"
  - Lime: "#84cc16" or "#65a30d"
  - Emerald: "#10b981" or "#059669"
  - Rose: "#f43f5e" or "#e11d48"
  - Violet: "#8b5cf6" or "#7c3aed"
  - Fuchsia: "#d946ef" or "#c026d3"
  - Sky: "#0ea5e9" or "#0284c7"
  - Slate: "#64748b" or "#475569"
  - Gray: "#6b7280" or "#4b5563"
  - Zinc: "#71717a" or "#52525b"
  - Neutral: "#737373" or "#525252"
  - Stone: "#78716c" or "#57534e"
  - Amber: "#f59e0b" or "#d97706"
  - Brown: "#a16207" or "#92400e"
  - Maroon: "#be123c" or "#9f1239"
  - Navy: "#1e3a8a" or "#1e40af"
  - Olive: "#3f6212" or "#365314"
  - Coral: "#f97316" or "#ea580c"
  - Lavender: "#a855f7" or "#9333ea"
  - Mint: "#10b981" or "#059669"
  - Peach: "#fb7185" or "#f43f5e"
  - Turquoise: "#06b6d4" or "#0891b2"
  - Gold: "#fbbf24" or "#f59e0b"
  - Silver: "#9ca3af" or "#6b7280"
  - Bronze: "#cd7f32" or "#b8860b"
- For ALL chart types, ensure proper color properties:
  - Scatter plots: Include both fill and stroke properties with the same color value
    Example: <Scatter fill="#ef4444" stroke="#ef4444" strokeWidth={1} />
  - Line charts: Use stroke for the line color
    Example: <Line stroke="#ef4444" strokeWidth={3} />
  - Bar charts: Use fill for bar color
    Example: <Bar fill="#ef4444" />
  - Pie charts: Use fill for each Cell
    Example: <Cell fill="#ef4444" />
  - Area charts: Use both fill and stroke
    Example: <Area fill="#ef4444" stroke="#ef4444" fillOpacity={0.3} />
- When no specific color is requested, use theme variables: 'hsl(var(--chart-1))', 'hsl(var(--chart-2))', etc.

FILTERING CAPABILITIES:
- ALWAYS include filtering capabilities in dashboard components based on the data structure:
  - Date/Time filtering: If data contains timestamps, include date range pickers
  - Location filtering: If data contains location fields, include location dropdowns
  - Status filtering: If data contains status fields, include status checkboxes
  - Correlation filtering: If data contains multiple metrics, include correlation range sliders
  - Turbine filtering: If data contains turbine IDs, include turbine selection dropdowns
- Filter state should be managed with useState and applied to the data before rendering
- Include filter reset functionality
- Show active filter count in the UI
- Example filter structure:
  const [filters, setFilters] = useState({
    dateRange: { start: null, end: null },
    locations: [],
    statuses: [],
    correlationRange: { min: 0, max: 100 },
    turbines: []
  })
   - Use 'hsl(var(--border))' for grid and axis lines
   - Use 'hsl(var(--muted-foreground))' for axis tick labels
   - Use 'hsl(var(--card))' and 'hsl(var(--card-foreground))' for tooltips
   - Use 'text-card-foreground' for text colors
   - Use 'text-foreground' for loading text
6. Include professional chart formatting:
   - Axis labels with proper positioning and styling
   - Legends with consistent styling
   - Tooltips with professional formatting
   - Proper margins for all charts
   - Enhanced dots and active dots for line charts
   - Rounded corners for bar charts
   - Inner radius for pie charts
   - Professional color schemes
7. Make it responsive with ResponsiveContainer
8. Include loading states with proper theming
9. Use real data from API endpoints
10. Keep it simple and focused on one visualization type
11. Use appropriate chart type based on the request
12. Return ONLY the component code, no explanations
13. REMEMBER: Start your code with "function ComponentName()" - NO EXPORT, NO IMPORTS

DATA FUNCTION EXAMPLES:

Example 1 - Function that takes turbines as parameter:
\`\`\`javascript
const processTurbineData = (turbines) => {
  try {
    const locationStatusCounts = turbines.reduce((acc, turbine) => {
      const location = turbine.location
      const status = turbine.status
      if (!acc[location]) {
        acc[location] = {}
      }
      acc[location][status] = (acc[location][status] || 0) + 1
      return acc
    }, {})
    
    const chartData = Object.entries(locationStatusCounts).map(([location, statuses]) => ({
      location,
      Active: statuses.Active || 0,
      Warning: statuses.Warning || 0,
      Offline: statuses.Offline || 0
    }))
    
    return chartData
  } catch (error) {
    console.error('Error processing turbine data:', error)
    return []
  }
}
\`\`\`

Example 2 - Async function that fetches its own data:
\`\`\`javascript
const fetchTelemetryData = async () => {
  try {
    const response = await fetch('/api/data/telemetry?limit=100')
    const telemetry = await response.json()
    
    const chartData = telemetry.map(item => ({
      time: new Date(item.timestamp).toLocaleTimeString(),
      power: item.power_output_kw,
      windSpeed: item.wind_speed_mph
    }))
    
    return chartData
  } catch (error) {
    console.error('Error fetching telemetry data:', error)
    return []
  }
}
\`\`\`

Return ONLY a JSON object with this structure:
{
  "title": "Dashboard Title",
  "description": "Brief description of what this dashboard shows",
  "componentCode": "Complete React component code following the exact structure above",
  "dataFunction": "JavaScript function to fetch and process data (use examples above as templates)",
  "previewCode": "Same component code for preview display"
}`

      console.log("🔍 GeminiSemanticAgent: Generating dashboard code...")

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          context: "Dashboard code generation with strict structure and examples"
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      const geminiResponse = data.response

      console.log("🔍 GeminiSemanticAgent: Raw code generation response:", geminiResponse)

      // Parse the JSON response from Gemini
      let generatedCode: any
      try {
        // Extract JSON from the response
        const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          generatedCode = JSON.parse(jsonMatch[0])
        } else {
          throw new Error("No JSON found in response")
        }
      } catch (parseError) {
        console.error("Failed to parse code generation response:", parseError)
        throw new Error("Invalid JSON response from Gemini")
      }

      // Validate the generated code
      if (!generatedCode.title || !generatedCode.componentCode) {
        throw new Error("Invalid code generation structure")
      }

      return {
        title: generatedCode.title,
        description: generatedCode.description || "Dynamic dashboard component",
        componentCode: generatedCode.componentCode,
        dataFunction: generatedCode.dataFunction || "async function fetchData() { return [] }",
        previewCode: generatedCode.previewCode || generatedCode.componentCode
      }

    } catch (error) {
      console.error("Dashboard code generation failed:", error)
      // Return a fallback component
      return {
        title: "Dynamic Dashboard",
        description: "Generated dashboard component",
        componentCode: `function DynamicDashboard() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/data/telemetry?limit=20')
      const telemetry = await response.json()
      const chartData = telemetry.map(item => ({
        time: new Date(item.timestamp).toLocaleTimeString(),
        value: item.power_output_kw
      }))
      setData(chartData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Card><CardContent className="flex items-center justify-center h-64"><div className="text-foreground">Loading...</div></CardContent></Card>

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-card-foreground">Dynamic Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--card-foreground))'
              }}
            />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}`,
        dataFunction: `async function fetchData() {
  try {
    const response = await fetch('/api/data/telemetry?limit=20')
    return await response.json()
  } catch (error) {
    console.error('Error fetching data:', error)
    return []
  }
}`,
        previewCode: `function DynamicDashboard() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/data/telemetry?limit=20')
      const telemetry = await response.json()
      const chartData = telemetry.map(item => ({
        time: new Date(item.timestamp).toLocaleTimeString(),
        value: item.power_output_kw
      }))
      setData(chartData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Card><CardContent className="flex items-center justify-center h-64"><div className="text-foreground">Loading...</div></CardContent></Card>

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-card-foreground">Dynamic Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--card-foreground))'
              }}
            />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}`
      }
    }
  }

  private async checkDashboardsExist(): Promise<boolean> {
    try {
      // Check for saved dashboards (which is what we actually use)
      const savedDashboardsResponse = await fetch('/api/saved-dashboards')
      if (savedDashboardsResponse.ok) {
        const savedDashboards = await savedDashboardsResponse.json()
        if (savedDashboards && savedDashboards.length > 0) {
          console.log("🔍 GeminiSemanticAgent: Found saved dashboards:", savedDashboards.length)
          return true
        }
      }

      // Fallback: Check for simple dashboards
      const simpleDashboardsResponse = await fetch('/api/simple-dashboards/load')
      if (simpleDashboardsResponse.ok) {
        const simpleDashboards = await simpleDashboardsResponse.json()
        if (simpleDashboards && simpleDashboards.length > 0) {
          console.log("🔍 GeminiSemanticAgent: Found simple dashboards:", simpleDashboards.length)
          return true
        }
      }

      console.log("🔍 GeminiSemanticAgent: No dashboards found")
      return false
    } catch (error) {
      console.error("Error checking if dashboards exist:", error)
      return false
    }
  }

  private async getAvailableDashboards(): Promise<Array<{id: string, name: string, description: string}>> {
    try {
      // Get saved dashboards instead of regular dashboards
      const savedDashboardsResponse = await fetch('/api/saved-dashboards')
      if (savedDashboardsResponse.ok) {
        const savedDashboards = await savedDashboardsResponse.json()
        return savedDashboards.map((d: any) => ({
          id: d.dashboardId, // Use dashboardId from saved dashboards
          name: d.name,
          description: `Saved dashboard: ${d.name}`
        }))
      }
      return []
    } catch (error) {
      console.error("Error fetching available dashboards:", error)
      return []
    }
  }

} 