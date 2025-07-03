import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import twilio from 'twilio'

const resend = new Resend(process.env.RESEND_API_KEY || 'fake_key_for_build')

// Only initialize Twilio if credentials are available
let twilioClient: any = null
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && 
    process.env.TWILIO_ACCOUNT_SID !== 'your_twilio_account_sid_here' &&
    process.env.TWILIO_AUTH_TOKEN !== 'your_twilio_auth_token_here') {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
}

export async function POST(request: NextRequest) {
  try {
    const { type, email, phone, subject, content, message } = await request.json()
    console.log('Notification request:', { type, email: email ? '***@***' : null, phone: phone ? '***' : null, subject })

    const results = []

    // Handle email sending
    if ((type === 'email' || type === 'both') && email) {
      if (process.env.RESEND_API_KEY) {
        try {
          const { data, error } = await resend.emails.send({
            from: 'Atlas Student <onboarding@resend.dev>',
            to: [email],
            subject: subject || 'Atlas Student Notification',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Atlas Student</h2>
                <div style="white-space: pre-line; line-height: 1.6;">
                  ${content || message || 'This is a test notification from Atlas Student.'}
                </div>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 14px; color: #6b7280;">
                  This is an automated message from Atlas Student. To manage your notification preferences, 
                  visit your settings page.
                </p>
              </div>
            `,
          })

          if (error) {
            console.error('Resend error:', error)
            results.push({ type: 'email', success: false, error: error.message })
          } else {
            console.log('Email sent successfully:', data?.id)
            results.push({ type: 'email', success: true, messageId: data?.id })
          }
        } catch (error) {
          console.error('Email sending error:', error)
          results.push({ 
            type: 'email', 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown email error' 
          })
        }
      } else {
        // Simulation mode for email
        console.log(`[SIMULATION] Email would be sent to ${email}: ${subject || 'Test notification'}`)
        console.log(`[SIMULATION] Content: ${content || message || 'Test notification content'}`)
        results.push({ 
          type: 'email', 
          success: true, 
          messageId: `sim_email_${Date.now()}`,
          note: 'Simulated - configure RESEND_API_KEY for real emails'
        })
      }
    }

    // Handle SMS sending
    if ((type === 'sms' || type === 'both') && phone) {
      if (twilioClient && process.env.TWILIO_PHONE_NUMBER && 
          process.env.TWILIO_PHONE_NUMBER !== 'your_twilio_phone_number_here') {
        try {
          const twilioMessage = await twilioClient.messages.create({
            body: message || content || 'This is a test notification from Atlas Student.',
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone,
          })

          console.log('SMS sent successfully:', twilioMessage.sid)
          results.push({ 
            type: 'sms', 
            success: true, 
            messageId: twilioMessage.sid 
          })
        } catch (error) {
          console.error('SMS sending error:', error)
          results.push({ 
            type: 'sms', 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown SMS error' 
          })
        }
      } else {
        // Simulation mode for SMS
        console.log(`[SIMULATION] SMS would be sent to ${phone}: ${message || content || 'Test notification'}`)
        results.push({ 
          type: 'sms', 
          success: true, 
          messageId: `sim_sms_${Date.now()}`,
          note: 'Simulated - configure Twilio credentials for real SMS'
        })
      }
    }

    console.log('Final notification results:', results)
    return NextResponse.json({ success: true, results })

  } catch (error) {
    console.error('Notification API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
