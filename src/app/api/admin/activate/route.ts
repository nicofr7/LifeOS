import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "lifeos-admin-key-2024"

export async function POST(request: NextRequest) {
  try {
    // Verify admin API key
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${ADMIN_API_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId, plan } = await request.json()

    if (!userId || (plan !== "pro" && plan !== "lifetime")) {
      return NextResponse.json(
        { error: "Invalid request. Provide userId and plan (pro or lifetime)." },
        { status: 400 }
      )
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, plan: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update the user's plan
    await prisma.user.update({
      where: { id: userId },
      data: { plan } as any,
    })

    // Log the confirmation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "purchase_confirmed",
        entity: "user",
        details: JSON.stringify({
          email: user.email,
          plan,
          confirmedAt: new Date().toISOString(),
          confirmedBy: "admin_dashboard",
        }),
      },
    })

    // Send confirmation email to customer (forwarded to admin since free Resend plan)
    if (resend) {
      const planName = plan === "pro" ? "Pro" : "Lifetime"
      const amount = plan === "pro" ? "$4.99/month" : "$79 one-time"
      const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "nicolas.frescorodriguez@gmail.com"

      await resend.emails.send({
        from: "LifeOS <onboarding@resend.dev>",
        to: ADMIN_EMAIL,
        subject: `📧 [FORWARD TO ${user.email}] Welcome to LifeOS ${planName}! Your account is now active`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #10b981; margin: 0;">🎉 Welcome to LifeOS ${planName}!</h1>
              <p style="color: #64748b; margin-top: 10px;">Your account has been upgraded and is now active</p>
            </div>
            
            <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 12px; padding: 25px; margin: 20px 0;">
              <h2 style="margin: 0 0 15px 0; color: #059669;">✅ Your ${planName} Plan is Active</h2>
              <p style="margin: 8px 0; color: #374151;"><strong>Plan:</strong> LifeOS ${planName}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Amount:</strong> ${amount}</p>
              <p style="margin: 8px 0; color: #374151;"><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Active ✓</span></p>
            </div>

            <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #1a1a1a;">🚀 What You Now Have Access To</h3>
              <ul style="margin: 0; padding-left: 20px; color: #374151;">
                <li style="margin: 8px 0;"><strong>Unlimited expenses</strong> — Track all your recurring costs</li>
                <li style="margin: 8px 0;"><strong>AI-powered analysis</strong> — Get personalized savings recommendations</li>
                <li style="margin: 8px 0;"><strong>Savings simulator</strong> — See how much you could save</li>
                <li style="margin: 8px 0;"><strong>Price change tracking</strong> — Know when prices increase</li>
                <li style="margin: 8px 0;"><strong>Expense DNA</strong> — Understand your spending patterns</li>
                <li style="margin: 8px 0;"><strong>Bill negotiation scripts</strong> — Save money on every call</li>
                <li style="margin: 8px 0;"><strong>Advanced reports</strong> — Monthly insights and trends</li>
                <li style="margin: 8px 0;"><strong>Unlimited savings goals</strong> — Track progress toward your targets</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080'}/dashboard" 
                 style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                Start Using LifeOS ${planName} →
              </a>
            </div>

            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #d97706;">💡 Quick Tip</h4>
              <p style="margin: 5px 0; color: #92400e;">Add your first 5 recurring expenses and LifeOS will show you where you're wasting money. Most users find their first savings opportunity within 10 minutes!</p>
            </div>

            <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #1a1a1a;">📋 Your Subscription Details</h4>
              <p style="margin: 5px 0; color: #64748b; font-size: 14px;">
                ${plan === "pro" 
                  ? "Your Pro subscription renews monthly. You can cancel anytime from Settings → Plan & Billing."
                  : "You have lifetime access to LifeOS Pro. No recurring charges, ever."}
              </p>
              ${plan === "pro" ? `
              <p style="margin: 5px 0; color: #64748b; font-size: 14px;">
                We'll send you a reminder email 3 days before each renewal so you're never surprised.
              </p>
              ` : ''}
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
    }

    return NextResponse.json({
      success: true,
      message: `User ${user.email} upgraded to ${plan}. Welcome email sent.`,
    })
  } catch (error: any) {
    console.error("Admin activate error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to activate user" },
      { status: 500 }
    )
  }
}
