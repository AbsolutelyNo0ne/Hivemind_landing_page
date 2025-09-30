import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.RECEIVER_EMAIL,
      subject: 'New Hivemind Prompt',
      text: `New prompt received:\n\n${prompt}\n\nSent at: ${new Date().toLocaleString()}`,
      html: `
        <h2>New Hivemind Prompt</h2>
        <p><strong>Prompt:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
          ${prompt.replace(/\n/g, '<br>')}
        </div>
        <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
      `,
    };

    // Verify transporter before sending
    await transporter.verify();
    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'Prompt sent successfully' });
  } catch (error) {
    console.error('Email error:', error.message, error.stack);
    res.status(500).json({ error: `Failed to send email: ${error.message}` });
  }
}