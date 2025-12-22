import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  // 1. Log that the request started
  console.log("📨 API: Welcome email triggered...");

  // 2. Check for API Key
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("❌ API ERROR: Missing RESEND_API_KEY in environment variables.");
    return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });
  }

  const resend = new Resend(apiKey);

  try {
    const body = await request.json();
    const { email, name } = body;
    console.log(`👤 Attempting to send to: ${email}`);

    // 3. Attempt Send
    const data = await resend.emails.send({
      from: 'Mukando Capital <hello@mukandocapital.com>', // ⚠️ MUST MATCH YOUR VERIFIED DOMAIN
      to: [email], 
      subject: 'Welcome to Mukando Capital!',
      html: `<h1>Welcome ${name}</h1><p>This is a test email.</p>`,
    });

    if (data.error) {
      console.error("❌ RESEND ERROR:", data.error);
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    console.log("✅ API: Email sent successfully!", data);
    return NextResponse.json(data);

  } catch (error) {
    console.error("❌ CRITICAL SERVER ERROR:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}