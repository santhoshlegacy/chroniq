import { describe, it, expect } from 'vitest'
import {
  isValidE164PhoneNumber,
  TELEPHONY_METADATA,
} from '@/lib/voiceReminderClient'

describe('Voice & Telephony Client Architecture', () => {
  it('validates standard E.164 international phone number format', () => {
    // Valid numbers
    expect(isValidE164PhoneNumber('+14155552671')).toBe(true)
    expect(isValidE164PhoneNumber('+919876543210')).toBe(true)
    expect(isValidE164PhoneNumber('+442071838750')).toBe(true)

    // Invalid numbers
    expect(isValidE164PhoneNumber('4155552671')).toBe(false)
    expect(isValidE164PhoneNumber('1-415-555-2671')).toBe(false)
    expect(isValidE164PhoneNumber('+012345')).toBe(false)
    expect(isValidE164PhoneNumber('')).toBe(false)
    expect(isValidE164PhoneNumber('not-a-number')).toBe(false)
  })

  it('verifies telephony provider pricing metadata is present and accurate', () => {
    expect(TELEPHONY_METADATA.twilio.outboundPerMinuteUsd).toBeGreaterThan(0)
    expect(TELEPHONY_METADATA.twilio.monthlyNumberRentUsd).toBeGreaterThan(0)
    expect(TELEPHONY_METADATA.twilio.requiresServerSecrets).toContain('TWILIO_AUTH_TOKEN')

    expect(TELEPHONY_METADATA.vonage.outboundPerMinuteUsd).toBeGreaterThan(0)
    expect(TELEPHONY_METADATA.vonage.requiresServerSecrets).toContain('VONAGE_API_SECRET')
  })
})

