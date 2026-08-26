import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "nicolas@email.com"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { plan } = await request.json()

    if (plan !== "pro" && plan !== "lifetime") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, plan: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Log the purchase intent
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "purchase_intent",
        entity: "user",
        details: JSON.stringify({
          plan,
          email: user.email,
          name: user.name,
          timestamp: new Date().toISOString(),
        }),
      },
    })

    // Send email notification to admin
    if (resend) {
      const amount = plan === "pro" ? "$4.99/mo" : "$79 one-time"
      const planName = plan === "pro" ? "Pro" : "Lifetime"

      const { data, error } = await resend.emails.send({
        from: "LifeOS <onboarding@resend.dev>",
        to: ADMIN_EMAIL,
        subject: `🎉 New ${planName} Purchase - ${user.name || user.email}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a; border-bottom: 2px solid #10b981; padding-bottom: 10px;">
              🎉 New Purchase Notification
            </h2>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #10b981;">${planName} Plan Upgrade</h3>
              <p style="margin: 5px 0; color: #64748b;"><strong>Amount:</strong> ${amount}</p>
              <p style="margin: 5px 0; color: #64748b;"><strong>User:</strong> ${user.name || "No name"}</p>
              <p style="margin: 5px 0; color: #64748b;"><strong>Email:</strong> ${user.email}</p>
              <p style="margin: 5px 0; color: #64748b;"><strong>User ID:</strong> ${user.id}</p>
              <p style="margin: 5px 0; color: #64748b;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #059669;">✅ How to Activate</h4>
              <p style="margin: 5px 0; color: #374151;">1. Verify payment received in PayPal</p>
              <p style="margin: 5px 0; color: #374151;">2. Run this command to activate:</p>
              <code style="display: block; background: #1a1a1a; color: #10b981; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 14px;">
                npx prisma db execute --stdin &lt;&lt;&lt; "UPDATE User SET plan = '${plan}' WHERE email = '${user.email}';"
              </code>
              <p style="margin: 5px 0; color: #374151;">3. User can now refresh LifeOS to see Pro features</p>
            </div>

            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #d97706;">⚠️ Important</h4>
              <p style="margin: 5px 0; color: #92400e;">Only activate after verifying payment in PayPal!</p>
            </div>

            <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">
              This is an automated notification from LifeOS.
            </p>
          </div>
        `,
      })

      if (error) {
        console.error("Email send error:", error)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Purchase recorded. Check your email for activation instructions.",
    })
  } catch (error: any) {
    console.error("Notify purchase error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process" },
      { status: 500 }
    )
  }
}
