import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('Debug API called')
  
  try {
    const body = await request.json()
    console.log('Request body received:', Object.keys(body))
    
    return NextResponse.json({ 
      success: true, 
      message: 'Debug endpoint working',
      receivedKeys: Object.keys(body),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({
      error: 'Debug API failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
