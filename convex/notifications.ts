import { v } from "convex/values"
import { mutation, query, action } from "./_generated/server"
import { api } from "./_generated/api"

// Email notification service using our API endpoint
const sendEmail = async (to: string, subject: string, content: string) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'email',
        email: to,
        subject,
        content,
      }),
    })

    const result = await response.json()
    if (result.success && result.results?.length > 0) {
      return result.results.find((r: any) => r.type === 'email') || { success: false, error: 'No email result found' }
    }
    return { success: false, error: result.error || 'No response from email service' }
  } catch (error) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email error'
    }
  }
}

// SMS notification service using our API endpoint
const sendSMS = async (to: string, message: string) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'sms',
        phone: to,
        message,
      }),
    })

    const result = await response.json()
    if (result.success && result.results?.length > 0) {
      return result.results.find((r: any) => r.type === 'sms') || { success: false, error: 'No SMS result found' }
    }
    return { success: false, error: result.error || 'No response from SMS service' }
  } catch (error) {
    console.error('SMS sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown SMS error'
    }
  }
}

// Send assignment reminder notification
export const sendAssignmentReminder = mutation({
  args: {
    userId: v.string(),
    assignmentId: v.string(),
    assignmentName: v.string(),
    dueDate: v.string(),
    className: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    if (!user || !user.notifications) {
      return { success: false, error: "User not found or notifications not configured" }
    }

    const { assignmentReminders, emailNotifications, smsNotifications } = user.notifications

    if (!assignmentReminders) {
      return { success: false, error: "Assignment reminders are disabled" }
    }

    const results = []

    // Send email notification if enabled
    if (emailNotifications && user.email) {
      const subject = `Assignment Reminder: ${args.assignmentName}`
      const content = `
        Hi ${user.firstName},
        
        This is a reminder that your assignment "${args.assignmentName}" 
        for ${args.className} is due on ${args.dueDate}.
        
        Make sure to submit it on time!
        
        Best regards,
        Atlas Student
      `
      
      try {
        const emailResult = await sendEmail(user.email, subject, content)
        results.push({ type: "email", ...emailResult })
      } catch (error) {
        results.push({ type: "email", success: false, error: error instanceof Error ? error.message : "Unknown error" })
      }
    }

    // Send SMS notification if enabled
    if (smsNotifications && user.phone) {
      const message = `Atlas Student: Assignment "${args.assignmentName}" for ${args.className} is due on ${args.dueDate}. Don't forget to submit!`
      
      try {
        const smsResult = await sendSMS(user.phone, message)
        results.push({ type: "sms", ...smsResult })
      } catch (error) {
        results.push({ type: "sms", success: false, error: error instanceof Error ? error.message : "Unknown error" })
      }
    }

    return { success: true, results }
  },
})

// Send deadline alert notification
export const sendDeadlineAlert = mutation({
  args: {
    userId: v.string(),
    assignmentId: v.string(),
    assignmentName: v.string(),
    dueDate: v.string(),
    className: v.string(),
    hoursUntilDue: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    if (!user || !user.notifications) {
      return { success: false, error: "User not found or notifications not configured" }
    }

    const { deadlineAlerts, emailNotifications, smsNotifications } = user.notifications

    if (!deadlineAlerts) {
      return { success: false, error: "Deadline alerts are disabled" }
    }

    const results = []
    const urgencyText = args.hoursUntilDue <= 24 ? "URGENT" : ""

    // Send email notification if enabled
    if (emailNotifications && user.email) {
      const subject = `${urgencyText} Deadline Alert: ${args.assignmentName}`
      const content = `
        Hi ${user.firstName},
        
        ${urgencyText ? "URGENT: " : ""}Your assignment "${args.assignmentName}" 
        for ${args.className} is due in ${args.hoursUntilDue} hours (${args.dueDate}).
        
        ${args.hoursUntilDue <= 24 ? "Time is running out! Submit as soon as possible." : "Make sure you're on track to complete it on time."}
        
        Best regards,
        Atlas Student
      `
      
      try {
        const emailResult = await sendEmail(user.email, subject, content)
        results.push({ type: "email", ...emailResult })
      } catch (error) {
        results.push({ type: "email", success: false, error: error instanceof Error ? error.message : "Unknown error" })
      }
    }

    // Send SMS notification if enabled
    if (smsNotifications && user.phone) {
      const message = `${urgencyText ? "URGENT - " : ""}Atlas Student: "${args.assignmentName}" for ${args.className} due in ${args.hoursUntilDue}h (${args.dueDate})`
      
      try {
        const smsResult = await sendSMS(user.phone, message)
        results.push({ type: "sms", ...smsResult })
      } catch (error) {
        results.push({ type: "sms", success: false, error: error instanceof Error ? error.message : "Unknown error" })
      }
    }

    return { success: true, results }
  },
})

// Query to get users who need reminder notifications
export const getUsersForReminders = query({
  args: {},
  handler: async (ctx) => {
    // This would typically be called by a scheduled job
    // to find assignments that need reminders sent
    const users = await ctx.db
      .query("users")
      .filter((q) => 
        q.and(
          q.neq(q.field("notifications"), undefined),
          q.eq(q.field("notifications.assignmentReminders"), true)
        )
      )
      .collect()

    return users.map(user => ({
      userId: user.userId,
      email: user.email,
      phone: user.phone,
      emailNotifications: user.notifications?.emailNotifications || false,
      smsNotifications: user.notifications?.smsNotifications || false,
    }))
  },
})

// Test notification function for development - using action for HTTP calls
export const testNotification = action({
  args: {
    userId: v.string(),
    type: v.union(v.literal("email"), v.literal("sms"), v.literal("both")),
  },
  handler: async (ctx, args) => {
    // Get user data from the database
    const user = await ctx.runQuery(api.users.getUserProfile, { userId: args.userId })

    if (!user) {
      return { success: false, error: "User not found" }
    }

    const results = []

    if ((args.type === "email" || args.type === "both") && user.email) {
      try {
        const emailResult = await sendEmail(
          user.email,
          "Test Notification from Atlas Student",
          `Hi ${user.firstName || 'there'}, this is a test email notification to verify your settings are working correctly.`
        )
        results.push({ type: "email", ...emailResult })
      } catch (error) {
        results.push({ type: "email", success: false, error: error instanceof Error ? error.message : "Unknown error" })
      }
    }

    if ((args.type === "sms" || args.type === "both") && user.phone) {
      try {
        const smsResult = await sendSMS(
          user.phone,
          `Hi ${user.firstName || 'there'}, this is a test SMS from Atlas Student to verify your notification settings.`
        )
        results.push({ type: "sms", ...smsResult })
      } catch (error) {
        results.push({ type: "sms", success: false, error: error instanceof Error ? error.message : "Unknown error" })
      }
    }

    return { success: true, results }
  },
})
