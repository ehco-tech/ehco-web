# Newsletter Email Setup Guide

This guide explains how to configure the newsletter service to use Gmail SMTP or SendGrid.

## Gmail SMTP Setup (Free - Recommended)

### Step 1: Generate Gmail App Password

1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable if not already enabled)
3. Scroll down to **App passwords**
4. Click **App passwords** → Select **Mail** → Select **Other (Custom name)**
5. Enter a name like "EHCO Newsletter"
6. Click **Generate**
7. Copy the 16-character password (it will look like: `xxxx xxxx xxxx xxxx`)

### Step 2: Set Environment Variables

Add these to your `.env` file:

```bash
EMAIL_PROVIDER=gmail
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_FROM_NAME=EHCO  # Display name shown as sender (e.g., "EHCO" instead of "info")
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  # The app password from Step 1
BASE_URL=https://your-website.com
```

### Step 3: Set GitHub Secrets

In your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:
   - `EMAIL_ADDRESS`: Your Gmail address
   - `GMAIL_APP_PASSWORD`: The 16-character app password from Step 1
   - `BASE_URL`: Your website URL

### Limitations
- **Daily limit**: 500 emails/day for regular Gmail accounts
- **Daily limit**: 2,000 emails/day for Google Workspace accounts

---

## SendGrid Setup (Paid - For High Volume)

If you need to send more than 500 emails per day, you can switch to SendGrid.

### Step 1: Get SendGrid API Key

1. Sign up at https://sendgrid.com/
2. Go to **Settings** → **API Keys**
3. Create a new API key with **Full Access** or **Mail Send** permissions
4. Copy the API key

### Step 2: Set Environment Variables

Update your `.env` file:

```bash
EMAIL_PROVIDER=sendgrid
EMAIL_ADDRESS=your-email@example.com
EMAIL_FROM_NAME=EHCO  # Display name shown as sender
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
BASE_URL=https://your-website.com
```

### Step 3: Set GitHub Secrets

Add these secrets in GitHub:
- `SENDGRID_API_KEY`: Your SendGrid API key
- Uncomment the SendGrid line in `.github/workflows/auto-update.yml`
- Change `EMAIL_PROVIDER=gmail` to `EMAIL_PROVIDER=sendgrid`

---

## Testing the Newsletter

### Test Locally

```bash
# Preview the newsletter HTML (doesn't send)
python python/deepseek/newsletter_service.py --action test --test-email your-email@gmail.com

# Actually send a test email
python python/deepseek/newsletter_service.py --action test --test-email your-email@gmail.com --send-test
```

### Process Newsletter Queue

```bash
python python/deepseek/newsletter_service.py --action process
```

---

## Switching Between Providers

Simply change the `EMAIL_PROVIDER` environment variable:

- **Gmail**: `EMAIL_PROVIDER=gmail`
- **SendGrid**: `EMAIL_PROVIDER=sendgrid`

Both SendGrid and Gmail code are preserved in the system, so you can switch anytime!

---

## Troubleshooting

### Gmail SMTP Issues

**"Username and Password not accepted"**
- Make sure you're using an **App Password**, not your regular Gmail password
- Ensure 2-Step Verification is enabled on your Google account

**"SMTPAuthenticationError"**
- Double-check the app password (no spaces)
- Verify `EMAIL_ADDRESS` matches the Gmail account that generated the app password

### SendGrid Issues

**"The provided authorization grant is invalid"**
- Verify your SendGrid API key is correct
- Check that the API key has proper permissions (Mail Send)

**Rate limits**
- Free tier: 100 emails/day
- Paid plans: Check your SendGrid plan limits
