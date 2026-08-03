# OpenLevel to n8n Proof of Concept

## Purpose

Prove that OpenLevel can create a real appointment event and hand it to an authenticated n8n workflow before creating a Chrome extension, storefront, subscription plan, or AppSumo listing.

## Scope

This proof of concept tests only:

1. A public booking creates or updates one contact.
2. The booking creates one appointment.
3. OpenLevel emits an `appointment_booked` event containing the appointment id and schedule details.
4. The event is sent to an n8n Webhook node using header authentication.
5. n8n returns a successful acknowledgment.
6. The same event id can be used by n8n to prevent duplicate processing.

## Excluded Until This Passes

- Email delivery
- SMS delivery
- Chrome extension packaging
- AppSumo redemption
- Stripe subscriptions
- AI chatbot behavior
- Public product storefront
- Multiple industry templates

## Event Shape

```json
{
  "source": "openlevel",
  "version": 1,
  "sentAt": "2026-08-03T22:00:00.000Z",
  "event": {
    "eventId": "appointment_booked:appt_123",
    "locationId": "loc_123",
    "triggerType": "appointment_booked",
    "contactId": "contact_123",
    "resource": {
      "type": "appointment",
      "id": "appt_123"
    },
    "data": {
      "calendarId": "cal_123",
      "calendarName": "Consultations",
      "bookingSlug": "consultations",
      "startsAt": "2026-08-04T16:00:00.000Z",
      "endsAt": "2026-08-04T16:30:00.000Z"
    }
  }
}
```

## Authentication

OpenLevel sends the shared secret in this request header:

```text
X-OpenLevel-Key: <secret>
```

The secret must be stored outside source control. The n8n Webhook node must use Header Auth with the same header name and value.

## Pass Criteria

The connection is considered proven only when:

- The repository installs, type-checks, tests, and builds in CI.
- The n8n adapter unit tests pass.
- The public booking test confirms the appointment event includes the appointment id and dates.
- A manual GitHub Actions smoke test receives HTTP 2xx from the real n8n production webhook.
- The n8n execution displays the same `eventId` sent by OpenLevel.
- No API keys or webhook secrets appear in source control or logs.

## Current Architecture Under Test

```text
Public booking request
        -> OpenLevel contact + appointment
        -> appointment_booked event
        -> authenticated n8n webhook
        -> n8n acknowledgment
```

## Next Milestone

After the real webhook test passes, connect the n8n workflow to one harmless test action and then write the result back to a deployed OpenLevel callback endpoint. No communication provider is selected during this connection proof.
