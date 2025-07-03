import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
  console.log('Extract assignments API called')
  
  try {
    // Check authentication
    console.log('Checking request headers...')
    const authHeader = request.headers.get('authorization')
    console.log('Auth header present:', !!authHeader)
    
    const { file } = await request.json()
    console.log('File received:', { mimeType: file?.mimeType, hasData: !!file?.data, dataLength: file?.data?.length })

    if (!file || !file.data) {
      console.log('No file data provided')
      return NextResponse.json({ error: 'No file data provided' }, { status: 400 })
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      console.log('Gemini API key not found in environment')
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    console.log('Gemini API key found, length:', process.env.GOOGLE_GEMINI_API_KEY.length)
    console.log('Initializing Gemini model...')
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
      You are an AI assistant that extracts assignment information from course documents.
      
      Analyze the provided document (could be a syllabus, assignment list, or course schedule) and extract all assignments, projects, exams, quizzes, and other graded work mentioned.
      
      For each assignment you find, provide the following information in JSON format:
      - title: The name or title of the assignment
      - description: A brief description of what the assignment entails
      - dueDate: The due date in YYYY-MM-DD format (if not specified, estimate based on context or use current semester timeline)
      - type: The type of assignment (e.g., "homework", "quiz", "exam", "project", "essay", "lab", "presentation")
      - points: The point value or percentage weight (as a number, if specified)
      - confidence: Your confidence level in the extraction accuracy (0.0 to 1.0)
      
      If dates are relative (like "Week 3" or "Every Friday"), convert them to actual dates assuming:
      - The semester starts in late August/early September for Fall terms
      - The semester starts in late January for Spring terms
      - Summer terms start in May/June
      
      Return the result as a JSON object with an "assignments" array.
      
      Example output:
      {
        "assignments": [
          {
            "title": "Homework 1: Introduction to Algorithms",
            "description": "Complete problems 1-10 from Chapter 1",
            "dueDate": "2024-09-15",
            "type": "homework",
            "points": 20,
            "confidence": 0.95
          }
        ]
      }
      
      Only extract clear, specific assignments. Don't include general course information or policies.
    `

    const imagePart = {
      inlineData: {
        data: file.data,
        mimeType: file.mimeType
      }
    }

    console.log('Sending request to Gemini...')
    const result = await model.generateContent([prompt, imagePart])
    const response = await result.response
    const text = response.text()
    console.log('Gemini response received, length:', text.length)

    // Try to extract JSON from the response
    let jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      // If no JSON found, try to parse the entire response
      jsonMatch = [text]
    }

    try {
      const extractedData = JSON.parse(jsonMatch[0])
      
      // Validate and clean the extracted data
      const assignments = extractedData.assignments || []
      const validAssignments = assignments.filter((assignment: any) => 
        assignment.title && 
        assignment.dueDate && 
        assignment.type
      ).map((assignment: any) => ({
        title: assignment.title,
        description: assignment.description || '',
        dueDate: assignment.dueDate,
        type: assignment.type,
        points: assignment.points || null,
        confidence: Math.min(Math.max(assignment.confidence || 0.5, 0), 1)
      }))

      console.log('Successfully extracted assignments:', validAssignments.length)
      return NextResponse.json({ 
        assignments: validAssignments,
        rawResponse: text,
        success: true 
      })

    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError)
      
      // Fallback: try to extract assignments with regex if JSON parsing fails
      const fallbackAssignments = extractAssignmentsWithRegex(text)
      
      return NextResponse.json({
        assignments: fallbackAssignments,
        rawResponse: text,
        success: true,
        note: 'Used fallback extraction method'
      })
    }

  } catch (error) {
    console.error('Error processing file with Gemini:', error)
    return NextResponse.json(
      { error: 'Failed to process file with AI', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Fallback function to extract assignments using regex patterns
function extractAssignmentsWithRegex(text: string): Array<{
  title: string
  description: string
  dueDate: string
  type: string
  points: number | null
  confidence: number
}> {
  const assignments: Array<{
    title: string
    description: string
    dueDate: string
    type: string
    points: number | null
    confidence: number
  }> = []
  
  // Simple patterns to detect assignment-like content
  const assignmentPatterns = [
    /(?:assignment|homework|quiz|exam|project|essay|lab|presentation)[:\s]*([^\n]+)/gi,
    /due[:\s]*([^\n]+)/gi,
    /(\d+\/\d+\/\d+|\d{4}-\d{2}-\d{2})/g
  ]
  
  // This is a very basic fallback - in a real implementation you'd want more sophisticated parsing
  const matches = text.match(assignmentPatterns[0]) || []
  
  matches.slice(0, 5).forEach((match, index) => {
    assignments.push({
      title: match.trim(),
      description: 'Extracted from document',
      dueDate: new Date(Date.now() + (index + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Week intervals
      type: 'assignment',
      points: null,
      confidence: 0.3
    })
  })
  
  return assignments
}
