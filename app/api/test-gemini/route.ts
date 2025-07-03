import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function GET() {
  try {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const result = await model.generateContent(['Say hello'])
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ 
      success: true, 
      message: text,
      keyStatus: 'API key is working' 
    })

  } catch (error) {
    console.error('Gemini API test error:', error)
    return NextResponse.json({
      error: 'Gemini API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
