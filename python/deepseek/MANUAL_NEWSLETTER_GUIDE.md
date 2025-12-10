# Manual Newsletter Guide

## 📧 Email Provider Setup

The `manual_newsletter.py` script now supports **two email providers**:

### Option 1: Gmail SMTP (Default - Free)
Currently active. Uses your Gmail account to send emails.

**Required .env variables:**
```bash
EMAIL_PROVIDER=gmail
EMAIL_ADDRESS=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-16-digit-app-password
EMAIL_FROM_NAME=EHCO  # Optional: Display name in emails
BASE_URL=https://yoursite.com
```

### Option 2: SendGrid (For Future Use)
Ready to use when you upgrade to a paid SendGrid plan.

**Required .env variables:**
```bash
EMAIL_PROVIDER=sendgrid
EMAIL_ADDRESS=noreply@yoursite.com
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM_NAME=EHCO  # Optional
BASE_URL=https://yoursite.com
```

### Switching Between Providers
Simply change the `EMAIL_PROVIDER` variable in your `.env` file:
- `EMAIL_PROVIDER=gmail` → Uses Gmail SMTP (current)
- `EMAIL_PROVIDER=sendgrid` → Uses SendGrid API (future)

---

## 👥 How Recipients Are Selected

The script uses the `--recipients` argument to determine who receives emails:

### 1. `newsletter-enabled` (DEFAULT - Recommended)
```bash
--recipients newsletter-enabled
```

**Who gets the email:**
- Users who have newsletters **enabled** in their preferences
- Respects user opt-out choices
- Best for regular announcements

**Selection logic:**
1. Fetches ALL users from `users` collection
2. For each user, checks `user-preferences/{userId}` document
3. Looks at `notifications.newsletter` field
4. Only includes users where `newsletter: true`

**Example Firestore structure:**
```
users/
  user123/
    email: "user@example.com"
    displayName: "John Doe"

user-preferences/
  user123/
    notifications:
      newsletter: true  ← This user WILL receive emails
      newsletter_frequency: "weekly"
```

### 2. `all` (Use with Caution)
```bash
--recipients all
```

**Who gets the email:**
- **EVERYONE** in the users collection
- Even users who disabled newsletters
- Use ONLY for critical announcements (security updates, service changes, etc.)

**Selection logic:**
1. Fetches ALL users from `users` collection
2. Sends to everyone with a valid email address
3. Ignores newsletter preferences

---

## 📊 Recipient Count Examples

**Scenario 1: Normal announcement**
```bash
# Only sends to users who opted in
python manual_newsletter.py \
  --subject "New Features Available" \
  --content-file announcement.html \
  --recipients newsletter-enabled \
  --preview

# Output: Found 150 recipients (newsletter-enabled)
```

**Scenario 2: Critical security update**
```bash
# Sends to ALL users
python manual_newsletter.py \
  --subject "Security Update Required" \
  --content "Please update your password..." \
  --recipients all \
  --preview

# Output: Found 500 recipients (all)
```

---

## 🔍 Understanding the Selection Process

### Step-by-step breakdown:

1. **Fetch users collection**
   ```javascript
   users_ref = db.collection('users')
   users = users_ref.stream()
   ```

2. **For each user, check email exists**
   ```javascript
   email = user_data.get('email')
   if not email:
       continue  // Skip this user
   ```

3. **If `--recipients newsletter-enabled`, check preferences**
   ```javascript
   prefs_ref = db.collection('user-preferences').document(user_id)
   prefs_doc = prefs_ref.get()

   if prefs_doc.exists:
       newsletter_enabled = prefs.get('notifications', {}).get('newsletter', True)
       if not newsletter_enabled:
           continue  // Skip this user
   ```

4. **Add to recipient list**
   ```javascript
   recipients.append({
       'user_id': user_id,
       'email': email,
       'name': displayName or 'there'
   })
   ```

---

## 🛡️ Safety Features

### 1. Preview Mode
Always preview before sending to see recipient count:
```bash
python manual_newsletter.py \
  --subject "Test" \
  --content "Hello" \
  --preview
```

Output shows:
- Subject line
- Template type
- **Recipient count** ← Check this!
- HTML preview

### 2. Test Email
Send to yourself first:
```bash
python manual_newsletter.py \
  --subject "Test Newsletter" \
  --content-file announcement.html \
  --test-email your@email.com
```

### 3. Confirmation Prompt
Before sending to everyone, you must type 'yes':
```
⚠️  WARNING: About to send newsletter to 150 users
Subject: Platform Updates
Recipients: newsletter-enabled

Type 'yes' to confirm and send: yes
```

### 4. Requires --send Flag
Prevents accidental sends:
```bash
# This WON'T send (just shows warning):
python manual_newsletter.py --subject "Test" --content "Hello"

# This WILL send (after confirmation):
python manual_newsletter.py --subject "Test" --content "Hello" --send
```

---

## 📝 Complete Example Workflow

```bash
cd python/deepseek

# 1. Create your content
nano my_announcement.html

# 2. Preview it (see recipient count)
python manual_newsletter.py \
  --subject "Platform Updates - December 2024" \
  --content-file my_announcement.html \
  --template update \
  --recipients newsletter-enabled \
  --preview

# 3. Send test to yourself
python manual_newsletter.py \
  --subject "Platform Updates - December 2024" \
  --content-file my_announcement.html \
  --template update \
  --test-email your@email.com

# 4. Check your email, verify it looks good

# 5. Send to all newsletter-enabled users
python manual_newsletter.py \
  --subject "Platform Updates - December 2024" \
  --content-file my_announcement.html \
  --template update \
  --recipients newsletter-enabled \
  --send

# 6. Confirm by typing 'yes'
```

---

## 📈 Tracking & Logs

All sends are logged to Firestore:

**Collection:** `newsletter-logs`

**Document structure:**
```javascript
{
  subject: "Platform Updates - December 2024",
  template: "update",
  type: "manual",
  sentAt: Timestamp,
  stats: {
    total: 150,
    successful: 148,
    failed: 2
  },
  errors: [
    "user@example.com: SMTP error...",
    "another@example.com: Invalid address..."
  ]
}
```

You can query these logs to see:
- How many newsletters you've sent
- Success/failure rates
- Any errors that occurred

---

## ⚙️ Advanced Options

### Batch Size
Control sending rate (default: 50 emails per batch):
```bash
python manual_newsletter.py \
  --subject "Update" \
  --content-file announcement.html \
  --batch-size 25 \
  --send
```

Lower batch size = slower but safer for rate limits

### Templates
Choose different visual styles:
- `announcement` - 📢 General announcements (default)
- `update` - 🎉 Platform updates
- `maintenance` - 🔧 Maintenance notices
- `custom` - Plain template

```bash
--template maintenance
```

---

## 🚨 When to Use `--recipients all`

**DO use for:**
- ✅ Critical security updates
- ✅ Service termination notices
- ✅ Legal/policy changes users MUST know about
- ✅ Data breach notifications

**DON'T use for:**
- ❌ Regular feature announcements
- ❌ Marketing/promotional content
- ❌ Non-critical updates
- ❌ Newsletter-type content

**Remember:** Users who disabled newsletters did so for a reason. Respect their choice except for truly critical matters.

---

## 🔧 Troubleshooting

### "Found 0 recipients"
**Cause:** No users have newsletters enabled (or no users at all)

**Check:**
```javascript
// In Firestore
user-preferences/{userId}/notifications/newsletter
```

### "GMAIL_APP_PASSWORD not found"
**Cause:** Missing environment variable

**Fix:** Add to `.env`:
```bash
GMAIL_APP_PASSWORD=your-16-digit-app-password
```

### Emails not sending
**Check:**
1. `.env` has correct `EMAIL_PROVIDER=gmail`
2. Gmail app password is valid
3. Email addresses in Firestore are valid
4. Check error messages in output

---

## 📚 Quick Reference

```bash
# Preview
python manual_newsletter.py --subject "..." --content-file file.html --preview

# Test email
python manual_newsletter.py --subject "..." --content-file file.html --test-email you@email.com

# Send to newsletter users
python manual_newsletter.py --subject "..." --content-file file.html --send

# Send to ALL users (critical only!)
python manual_newsletter.py --subject "..." --content-file file.html --recipients all --send
```
