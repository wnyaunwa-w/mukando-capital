import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      toEmail, 
      userName, 
      amount, 
      groupName, 
      date, 
      transactionId, 
      paymentType // 'contribution' or 'subscription'
    } = body;

    // Validate
    if (!toEmail || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // CUSTOMIZE TEXT BASED ON TYPE
    const isSubscription = paymentType === 'subscription';
    
    const emailSubject = isSubscription 
      ? `Receipt: Mukando Platform Subscription`
      : `Receipt: Contribution to ${groupName}`;

    const titleText = isSubscription
      ? `Platform Fee Received`
      : `Contribution Received`;

    const descriptionText = isSubscription
      ? `This confirms your monthly platform subscription payment. Your access to ${groupName} is active.`
      : `This confirms your contribution payment to ${groupName}. The Group Admin has received the funds.`;

    const recipientLabel = isSubscription ? "Mukando Capital" : groupName;

    // SEND EMAIL
    const { data, error } = await resend.emails.send({
      from: 'Mukando App <onboarding@resend.dev>',
      to: [toEmail], 
      subject: emailSubject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #15803d; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${titleText}</h1>
          </div>
          
          <div style="padding: 24px;">
            <p style="font-size: 16px; color: #374151;">Hi <strong>${userName}</strong>,</p>
            <p style="font-size: 16px; color: #374151; line-height: 1.5;">${descriptionText}</p>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #e5e7eb;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount Paid</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 18px; color: #111827;">${amount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Paid To</td>
                  <td style="padding: 8px 0; text-align: right; color: #111827;">${recipientLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td>
                  <td style="padding: 8px 0; text-align: right; color: #111827;">${date}</td>
                </tr>
                 <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Reference ID</td>
                  <td style="padding: 8px 0; text-align: right; font-family: monospace; color: #111827;">${transactionId}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px; text-align: center;">
              Thank you for being part of our community.<br/>
              - The Mukando Team
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend Error:", error);
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ message: 'Email sent successfully', data });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}