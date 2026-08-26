import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "nicolas@email.com"

export async function POST(request: NextRequest) {
  try {
    // Verify this is called by an admin or cron job
    // For now, allow any request (in production, add authentication)

    // Find all Pro users with upcoming renewals (within 3 days)
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    // Get all Pro users (they renew monthly)
    const proUsers = await prisma.user.findMany({
      where: {
        plan: "pro",
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    let remindersSent = 0

    for (const user of proUsers) {
      // Calculate when their next renewal is based on signup date
      const now = new Date()
      const daysInMonth = 30
      const daysSinceSignup = Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      const daysUntilRenewal = daysInMonth - (daysSinceSignup % daysInMonth)

      // Send reminder if renewal is within 3 days
      if (daysUntilRenewal <= 3 && daysUntilRenewal > 0) {
        if (resend) {
          await resend.emails.send({
            from: "LifeOS <onboarding@resend.dev>",
            to: ADMIN_EMAIL,
            subject: `📧 [FORWARD TO ${user.email}] LifeOS Pro Renews in ${daysUntilRenewal} Day${daysUntilRenewal > 1 ? 's' : ''}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #3b82f6; margin: 0;">🔄 Subscription Renewal Reminder</h1>
                  <p style="color: #64748b; margin-top: 10px;">Your LifeOS Pro subscription renews soon</p>
                </div>
                
                <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 12px; padding: 25px; margin: 20px 0;">
                  <h2 style="margin: 0 0 15px 0; color: #1d4ed8;">📅 Renewal Details</h2>
                  <p style="margin: 8px 0; color: #374151;"><strong>Plan:</strong> LifeOS Pro</p>
                  <p style="margin: 8px 0; color: #374151;"><strong>Amount:</strong> $4.99</p>
                  <p style="margin: 8px 0; color: #374151;"><strong>Renews:</strong> ${daysUntilRenewal} day${daysUntilRenewal > 1 ? 's' : ''} from now</p>
                  <p style="margin: 8px 0; color: #374151;"><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Active ✓</span></p>
                </div>

                <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin: 20px 0;">
                  <h3 style="margin: 0 0 15px 0; color: #1a1a1a;">📊 Your LifeOS Stats This Month</h3>
                  <p style="margin: 8px 0; color: #64748b;">Continue tracking your expenses and finding savings opportunities. Your Pro plan gives you access to all premium features.</p>
                </div>

                <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <h4 style="margin: 0 0 10px 0; color: #059669;">💡 Did You Know?</h4>
                  <p style="margin: 5px 0; color: #374151;">LifeOS Pro users save an average of $420/year by identifying unused subscriptions. Keep using LifeOS to maximize your savings!</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/dashboard" 
                     style="display: inline-block; background: #3b82f6; color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                    View Your Dashboard →
                  </a>
                </div>

                <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <h4 style="margin: 0 0 10px 0; color: #1a1a1a;">📋 Manage Your Subscription</h4>
                  <p style="margin: 5px 0; color: #64748b; font-size: 14px;">
                    You can manage your subscription from Settings → Plan & Billing. Cancel anytime before renewal.
                  </p>
                </div>

                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #94a3b8; font-size: 13px;">
                    Questions? Reply to this email or contact support@lifeos.app
                  </p>
                  <p style="color: #94a3b8; font-size: 12px; margin-top: 10px;">
                    © ${new Date().getFullYear()} LifeOS. All rights reserved.
                  </p>
                </div>
              </div>
            `,
          })
          remindersSent++
        }
      }
    }

    // Also check for Lifetime users who might need engagement
    // (Send a monthly tips email to keep them engaged)
    const lifetimeUsers = await prisma.user.findMany({
      where: {
        plan: "lifetime",
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    for (const user of lifetimeUsers) {
      const now = new Date()
      const daysSinceSignup = Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      
      // Send monthly tips every 30 days
      if (daysSinceSignup > 0 && daysSinceSignup % 30 === 0) {
        if (resend) {
          await resend.emails.send({
            from: "LifeOS <onboarding@resend.dev>",
            to: ADMIN_EMAIL,
            subject: `📧 [FORWARD TO ${user.email}] LifeOS Monthly Tips - Maximize Your Savings`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #10b981; margin: 0;">💡 Monthly Savings Tips</h1>
                  <p style="color: #64748b; margin-top: 10px;">Ideas to help you save more money</p>
                </div>
                
                <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 12px; padding: 25px; margin: 20px 0;">
                  <h2 style="margin: 0 0 15px 0; color: #059669;">🎯 This Month's Challenge</h2>
                  <p style="margin: 8px 0; color: #374151;">Review your expenses and mark any you haven't used in the past week as "Rarely Used" or "Don't Use". This helps LifeOS find more savings opportunities for you.</p>
                </div>

                <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin: 20px 0;">
                  <h3 style="margin: 0 0 15px 0; color: #1a1a1a;">💡 Pro Tips</h3>
                  <ul style="margin: 0; padding-left: 20px; color: #374151;">
                    <li style="margin: 8px 0;"><strong>Check the Radar</strong> — See if any alerts need your attention</li>
                    <li style="margin: 8px 0;"><strong>Review price changes</strong> — Has anything increased recently?</li>
                    <li style="margin: 8px 0;"><strong>Update renewal dates</strong> — Keep your calendar accurate</li>
                    <li style="margin: 8px 0;"><strong>Use the Simulator</strong> — See how much you could save</li>
                  </ul>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/dashboard" 
                     style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                    Open LifeOS →
                  </a>
                </div>

                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #94a3b8; font-size: 13px;">
                    You're a Lifetime member — thank you for your support! ❤️
                  </p>
                </div>
              </div>
            `,
          })
          remindersSent++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${remindersSent} reminder emails.`,
      remindersSent,
    })
  } catch (error: any) {
    console.error("Send reminder error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send reminders" },
      { status: 500 }
    )
  }
}
