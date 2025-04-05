import { db } from '../../src/firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId, email, status, message } = req.body;

  if (!userId || !email || !status) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Get user details from Firestore for personalized email
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.exists() ? userDoc.data() : {};
    const userName = userData.displayName || 'Astrologer';

    // Create email transporter
    const transporter = nodemailer.createTransport({
      // Configure your email service here
      // For example with Gmail:
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Create email subject and body based on verification status
    let subject, htmlBody;

    if (status === 'verified') {
      subject = 'Your Astrologer Account Has Been Approved!';
      htmlBody = `
        <h1>Congratulations, ${userName}!</h1>
        <p>Your astrologer account has been approved. You can now start providing readings to clients.</p>
        ${message ? `<p><strong>Additional information:</strong> ${message}</p>` : ''}
        <p>Thank you for joining our platform!</p>
      `;
    } else if (status === 'rejected') {
      subject = 'Your Astrologer Application Status';
      htmlBody = `
        <h1>Hello ${userName},</h1>
        <p>We've reviewed your astrologer application and unfortunately, we are unable to approve it at this time.</p>
        <p><strong>Reason:</strong> ${message}</p>
        <p>If you'd like to address these issues and reapply, please update your profile and documents.</p>
        <p>If you have any questions, please contact our support team.</p>
      `;
    } else {
      subject = 'Your Astrologer Application Update';
      htmlBody = `
        <h1>Hello ${userName},</h1>
        <p>Your astrologer application is currently under review. We'll notify you once a decision has been made.</p>
        ${message ? `<p><strong>Additional information:</strong> ${message}</p>` : ''}
        <p>Thank you for your patience.</p>
      `;
    }

    // Send the email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: htmlBody,
    });

    return res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending verification email:', error);
    return res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
} 