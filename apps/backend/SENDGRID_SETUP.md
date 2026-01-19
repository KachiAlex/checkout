# SendGrid Email Integration Setup

This guide explains how to configure SendGrid for sending demo request emails.

## Prerequisites

1. A SendGrid account (sign up at https://sendgrid.com)
2. A verified sender email address or domain

## Configuration Steps

### 1. Get Your SendGrid API Key

1. Log in to your SendGrid account
2. Go to Settings → API Keys
3. Click "Create API Key"
4. Give it a name (e.g., "Checkout POS Production")
5. Select "Full Access" or "Restricted Access" with Mail Send permissions
6. Click "Create & View"
7. **Copy the API key immediately** - you won't be able to see it again!

**Note:** SendGrid API keys start with `SG.` and are about 70 characters long.

### 2. Add Environment Variables

Add these variables to your backend `.env` file:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.your_actual_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

**Important Notes:**

- Replace `SG.your_actual_api_key_here` with your actual SendGrid API key
- Replace `noreply@yourdomain.com` with a verified sender email address
- The sender email must be verified in SendGrid (see step 3)

### 3. Verify Your Sender Email

SendGrid requires you to verify the email address you'll send from:

#### Option A: Single Sender Verification (Quick & Easy)

1. Go to Settings → Sender Authentication → Single Sender Verification
2. Click "Create New Sender"
3. Fill in your details (use `akoma@kreatixtech.com` or your domain)
4. Check your email for verification link
5. Click the verification link

#### Option B: Domain Authentication (Recommended for Production)

1. Go to Settings → Sender Authentication → Domain Authentication
2. Follow the wizard to add DNS records to your domain
3. This allows you to send from any email address on your domain

### 4. Deploy to Render

Add the environment variables to your Render backend service:

1. Go to your Render dashboard
2. Select your backend service
3. Go to Environment tab
4. Add the variables:
   - Key: `SENDGRID_API_KEY`, Value: `SG.your_actual_key...`
   - Key: `SENDGRID_FROM_EMAIL`, Value: `noreply@yourdomain.com`
5. Save changes and redeploy

### 5. Test the Integration

1. Visit https://checkout-77d99.web.app
2. Click "Book a Demo"
3. Fill out the form
4. Submit the form
5. Check that:
   - The email arrives at `akoma@kreatixtech.com`
   - The reply-to is set to the requester's email
   - The email looks professional with the HTML template

## Email Template Features

The demo request email includes:

- ✅ Professional HTML design with gradient header
- ✅ All form fields beautifully formatted
- ✅ Reply-to set to requester's email (easy to respond)
- ✅ Mobile-responsive design
- ✅ Industry badge styling
- ✅ Plain text fallback

## Troubleshooting

### Emails Not Sending

1. **Check API Key:**

   ```bash
   # In Render logs, you should see:
   ✅ SendGrid configured successfully
   ```

2. **Verify Sender Email:**
   - Make sure the sender email is verified in SendGrid
   - Check SendGrid dashboard → Activity for failed sends

3. **Check Logs:**
   - Check Render logs for error messages
   - Look for SendGrid error responses

4. **API Key Format:**
   - API key should start with `SG.`
   - Should be about 70 characters long
   - Example: `SG.abcdefghijklmnopqrstuvwxyz1234567890...`

### Emails Going to Spam

1. Complete domain authentication in SendGrid
2. Add SPF and DKIM records to your DNS
3. Use a professional sender email (not @gmail.com)
4. Avoid spam trigger words in subject lines

## API Key Provided

You mentioned the API key ID: `qjYBneBERf2sPMIbWS-gcg`

**Note:** This appears to be an API Key ID (used internally by SendGrid), not the full API key.

You need the **full API key** that:

- Starts with `SG.`
- Is about 70 characters long
- Was shown when you created the key

If you don't have the full API key:

1. You cannot retrieve it (SendGrid doesn't store it)
2. You'll need to create a new API key in SendGrid
3. Follow the steps in "Get Your SendGrid API Key" above

## Support

For SendGrid-specific issues:

- SendGrid Docs: https://docs.sendgrid.com
- SendGrid Support: https://support.sendgrid.com

For Checkout POS integration issues:

- Contact: akoma@kreatixtech.com
