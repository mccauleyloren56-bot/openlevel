# Business Follow-Up Proof of Concept

## Purpose

Prove that OpenLevel can serve as the CRM foundation for a general business appointment and follow-up product before creating a Chrome extension, storefront, subscription plan, or AppSumo listing.

## First Internal Use Case

Use Loren's website-development operation as the first test business.

A prospective customer should be able to:

1. Submit a consultation appointment.
2. Become a contact in OpenLevel.
3. Create an appointment record.
4. Receive an immediate confirmation email.
5. Receive a short-delay test reminder.
6. Appear in a simple owner dashboard.
7. Be marked completed, cancelled, rescheduled, or no-show.
8. Receive the correct follow-up after completion.

## POC Scope

### Included

- One test business account
- Contacts
- Appointments
- Appointment statuses
- Immediate confirmation email
- Five-minute test reminder
- Completion follow-up
- Delivery and error logging
- Duplicate-submission protection
- Timezone-safe scheduling
- Basic tenant-isolation test

### Excluded Until the Core Loop Passes

- Chrome Web Store packaging
- AppSumo redemption
- Stripe subscriptions
- SMS
- AI chatbot
- Public multi-product storefront
- Full visual workflow builder
- Multiple industry templates

## Required Test Loop

```text
Booking submitted
  -> contact created or updated
  -> appointment created
  -> confirmation queued
  -> confirmation delivered
  -> reminder queued
  -> reminder delivered
  -> appointment status updated
  -> follow-up delivered
  -> complete activity history visible
```

## Test Timing

Development timing is intentionally compressed:

- Confirmation: immediately
- Reminder: five minutes after booking
- Follow-up: five minutes after appointment completion

Production timing will only be enabled after the compressed flow passes.

## Pass Criteria

The POC is considered technically viable only when all conditions below pass:

- The repository installs, type-checks, tests, and builds in CI.
- A booking creates exactly one contact and one appointment.
- Repeated booking submissions do not create duplicate reminders.
- Confirmation and reminder jobs run with Chrome closed.
- Cancelling an appointment prevents pending reminders.
- Rescheduling replaces the old reminder time.
- Failed email delivery is logged and retryable.
- Two test businesses cannot access each other's records.
- A database backup can be restored successfully.
- No API keys or customer secrets are stored in the repository.

## Architecture Under Test

```text
Public test booking form
        -> OpenLevel API and CRM
        -> server-side job queue
        -> email provider
        -> activity and delivery logs
        -> later Chrome side-panel client
```

## Automation Strategy

n8n may be used as a temporary workflow prototype. The product must not expose or resell n8n without the appropriate commercial license. Fixed appointment workflows may instead be implemented directly in the OpenLevel backend using its PostgreSQL job-queue foundation.

## Security Rules

- All secrets must be environment variables.
- Every API request must be scoped to the authenticated business.
- Appointment creation must be idempotent.
- Email links must not expose internal record identifiers without signed tokens.
- Logs must not contain API keys or full sensitive payloads.

## Next Milestone

After the baseline CI passes, inspect the current contact, calendar, automation, API, authentication, and database implementation. Then add the smallest end-to-end appointment test without redesigning the application.
