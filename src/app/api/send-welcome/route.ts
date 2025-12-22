import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    const data = await resend.emails.send({
      // ✅ UPDATED: Uses your verified domain
      from: 'Mukando Capital <hello@mukandocapital.com>', 
      to: [email], 
      subject: 'Welcome to Mukando Capital!',
      html: `
        <div style="font-family: sans-serif; color: #122932; padding: 20px;">
          <h1 style="color: #2C514C;">Welcome, ${name}!</h1>
          <p>Thank you for joining Mukando Capital.</p>
          <p>You can now create groups, track savings, and manage contributions.</p>
          <br />
          <a href="https://mukandocapital.com/dashboard" style="background-color: #2C514C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
        </div>
      `,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Email Error:", error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}