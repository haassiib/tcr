// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBookingConfirmation(email: string, booking: any) {
  try {
    await resend.emails.send({
      from: 'Tours <hello@yourdomain.com>',
      to: email,
      subject: `Booking Confirmation - ${booking.tour.name}`,
      html: `
        <div>
          <h1>Booking Confirmed!</h1>
          <p>Thank you for booking ${booking.tour.name}</p>
          <p><strong>Date:</strong> ${booking.date}</p>
          <p><strong>Participants:</strong> ${booking.participants}</p>
          <p><strong>Total:</strong> €${booking.totalAmount}</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}