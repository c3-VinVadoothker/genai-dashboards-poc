import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: savedDashboardId } = await params
    console.log(`📊 API - Fetching data for saved dashboard: ${savedDashboardId}`)

    // Load saved dashboards data
    const savedDashboardsPath = join(process.cwd(), 'data', 'dashboards', 'saved-dashboards.json')
    let savedDashboardsData: any[] = []
    
    try {
      savedDashboardsData = JSON.parse(readFileSync(savedDashboardsPath, 'utf8'))
    } catch (error) {
      console.log(`⚠️ API - Could not load saved dashboards:`, error)
      return NextResponse.json({ error: 'No saved dashboards found' }, { status: 404 })
    }
    
    const savedDashboard = savedDashboardsData.find((d: any) => d.id === savedDashboardId)
    if (!savedDashboard) {
      console.log(`❌ API - Saved dashboard not found: ${savedDashboardId}`)
      return NextResponse.json({ error: 'Saved dashboard not found' }, { status: 404 })
    }

    console.log(`✅ API - Found saved dashboard: ${savedDashboard.name}`)
    console.log(`🔗 API - Original dashboard ID: ${savedDashboard.dashboardId}`)

    // Load original dashboards data
    const dashboardsPath = join(process.cwd(), 'data', 'dashboards', 'dashboards.json')
    let dashboardsData: any[] = []
    
    try {
      dashboardsData = JSON.parse(readFileSync(dashboardsPath, 'utf8'))
    } catch (error) {
      console.log(`⚠️ API - Could not load dashboards:`, error)
      return NextResponse.json({ error: 'No dashboards found' }, { status: 404 })
    }
    
    const originalDashboard = dashboardsData.find((d: any) => d.id === savedDashboard.dashboardId)
    if (!originalDashboard) {
      console.log(`❌ API - Original dashboard not found: ${savedDashboard.dashboardId}`)
      return NextResponse.json({ error: 'Original dashboard not found' }, { status: 404 })
    }

    console.log(`✅ API - Found original dashboard: ${originalDashboard.name}`)

    // Execute the data function
    let data: any = null
    let error: string | null = null

    try {
      console.log(`🔧 API - Data function to execute:`, originalDashboard.dataFunction.substring(0, 100) + '...')
      
      // Create a safe execution environment
      const functionBody = originalDashboard.dataFunction
      
      // Extract function name if it's a const declaration
      let functionName = null
      const functionNameMatch = functionBody.match(/const\s+(\w+)\s*=/)
      if (functionNameMatch) {
        functionName = functionNameMatch[1]
        console.log(`🔧 API - Found function name: ${functionName}`)
      }
      
      // Create execution context with the function and call it
      const baseUrl = request.nextUrl.origin
      console.log(`🔧 API - Base URL: ${baseUrl}`)
      
      const executionCode = `
        const fetch = (url) => {
          const fullUrl = url.startsWith('http') ? url : '${baseUrl}' + url;
          return globalThis.fetch(fullUrl);
        };
        ${functionBody}
        return (async () => {
          ${functionName ? `return await ${functionName}();` : 'return null;'}
        })();
      `
      
      console.log(`🔧 API - Execution code:`, executionCode.substring(0, 200) + '...')
      
      const dataFunction = new Function(executionCode)
      data = await dataFunction()
      
      console.log(`✅ API - Successfully executed data function for ${originalDashboard.name}`)
      console.log(`📊 API - Raw data type:`, typeof data)
      console.log(`📊 API - Raw data:`, data)
      console.log(`📊 API - Is array:`, Array.isArray(data))
      console.log(`📊 API - Is object:`, typeof data === 'object' && data !== null)
      if (Array.isArray(data)) {
        console.log(`📊 API - Array length:`, data.length)
        if (data.length > 0) {
          console.log(`📊 API - First item:`, data[0])
        }
      } else if (typeof data === 'object' && data !== null) {
        console.log(`📊 API - Object keys:`, Object.keys(data))
      }
    } catch (execError) {
      error = execError instanceof Error ? execError.message : String(execError)
      console.log(`❌ API - Error executing data function:`, error)
    }

    // Analyze the data structure
    let metadata: {
      columns: string[]
      dataTypes: Record<string, string>
      rowCount: number
      sampleData: any[]
    } = {
      columns: [],
      dataTypes: {},
      rowCount: 0,
      sampleData: []
    }

    if (data && !error) {
      try {
        console.log(`🔍 API - Starting data analysis...`)
        
        // Handle different data structures
        let dataArray: any[] = []
        
        if (Array.isArray(data)) {
          console.log(`📊 API - Data is an array with ${data.length} items`)
          dataArray = data
        } else if (typeof data === 'object' && data !== null) {
          console.log(`📊 API - Data is an object with keys:`, Object.keys(data))
          // For scatter charts or other object structures, convert to array
          if (Object.keys(data).length > 0) {
            // If it's an object with location keys, flatten it
            const firstKey = Object.keys(data)[0]
            if (Array.isArray(data[firstKey])) {
              console.log(`📊 API - Flattening object array from key: ${firstKey}`)
              dataArray = data[firstKey]
            } else {
              console.log(`📊 API - Converting single object to array`)
              dataArray = [data]
            }
          }
        } else {
          console.log(`📊 API - Data is primitive type:`, typeof data)
          dataArray = [data]
        }

        console.log(`📊 API - Final dataArray length:`, dataArray.length)

        if (dataArray.length > 0) {
          const firstItem = dataArray[0]
          console.log(`📊 API - First item:`, firstItem)
          console.log(`📊 API - First item type:`, typeof firstItem)
          
          if (typeof firstItem === 'object' && firstItem !== null) {
            metadata.columns = Object.keys(firstItem)
            metadata.rowCount = dataArray.length
            metadata.sampleData = dataArray.slice(0, 3) // First 3 items as sample

            // Determine data types
            metadata.dataTypes = {}
            metadata.columns.forEach(column => {
              const sampleValue = firstItem[column]
              if (typeof sampleValue === 'number') {
                metadata.dataTypes[column] = 'number'
              } else if (typeof sampleValue === 'string') {
                metadata.dataTypes[column] = 'string'
              } else if (typeof sampleValue === 'boolean') {
                metadata.dataTypes[column] = 'boolean'
              } else if (sampleValue instanceof Date) {
                metadata.dataTypes[column] = 'date'
              } else {
                metadata.dataTypes[column] = 'unknown'
              }
            })
            
            console.log(`📊 API - Data analysis complete:`, {
              columns: metadata.columns,
              rowCount: metadata.rowCount,
              dataTypes: metadata.dataTypes,
              sampleData: metadata.sampleData
            })
          } else {
            console.log(`⚠️ API - First item is not an object, cannot analyze structure`)
          }
        } else {
          console.log(`⚠️ API - No data items to analyze`)
        }

      } catch (analysisError) {
        console.log(`⚠️ API - Error analyzing data structure:`, analysisError)
      }
    } else {
      console.log(`⚠️ API - No data or error present for analysis`)
    }

    const response = {
      dashboard: {
        id: savedDashboard.id,
        name: savedDashboard.name,
        originalDashboardId: savedDashboard.dashboardId,
        originalName: originalDashboard.name
      },
      data: data,
      metadata: metadata,
      error: error
    }

    console.log(`✅ API - Returning data for ${savedDashboard.name}`)
    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ API - Error in saved dashboard data endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 