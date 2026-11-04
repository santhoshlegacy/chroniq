import { describe, it, expect } from 'vitest'
import {
  sanitizeDiagnostic,
  validatePushSubscription,
  verifyVapidKeypair,
  importVapidCryptoKeyPair,
  classifyPushException,
  aggregateSubscriptionResults,
  evaluateEventPersistence,
  evaluateSubscriptionTimestampUpdate,
  evaluatePushDispatchOutcome,
  evaluatePushDispatchError,
  type SingleSubscriptionResult,
} from '@/lib/pushDelivery'

describe('Web Push Delivery & Diagnostics', () => {
  // ─── 1. Diagnostic Sanitizer Tests ──────────────────────────────────────────

  describe('sanitizeDiagnostic', () => {
    it('redacts sensitive endpoint URLs completely', () => {
      const raw =
        'Error at https://fcm.googleapis.com/fcm/send/eX4pL3-random-device-token-1234567890 when posting notification'
      const sanitized = sanitizeDiagnostic(raw)

      expect(sanitized).not.toContain('fcm.googleapis.com')
      expect(sanitized).toContain('[URL_REDACTED]')
    })

    it('redacts long base64/base64url key strings without truncating message intent', () => {
      const raw = 'Invalid key parameter BBtBMTd53AMO7QATrsoJmmkon8JwdF9hc-QMc8Ru6Z96zi2Pn7EcvzFpIoiW67Nhh1WjhM42vHYI88TYbJKlUMw'
      const sanitized = sanitizeDiagnostic(raw)

      expect(sanitized).not.toContain('BBtBMTd53AMO7QATrsoJmmkon8JwdF9hc-QMc8Ru6Z96zi2Pn7EcvzFpIoiW67Nhh1WjhM42vHYI88TYbJKlUMw')
      expect(sanitized).toContain('[KEY_REDACTED]')
    })

    it('redacts Bearer tokens and authorization headers', () => {
      const raw = 'Authorization failed: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtYWlsdG86In0'
      const sanitized = sanitizeDiagnostic(raw)

      expect(sanitized).not.toContain('eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9')
      expect(sanitized).toContain('Bearer [TOKEN_REDACTED]')
    })

    it('redacts email addresses', () => {
      const raw = 'VAPID subject admin.user@example.com is invalid'
      const sanitized = sanitizeDiagnostic(raw)

      expect(sanitized).not.toContain('admin.user@example.com')
      expect(sanitized).toContain('[EMAIL_REDACTED]')
    })
  })

  // ─── 2. Subscription Validation Tests ───────────────────────────────────────

  describe('validatePushSubscription', () => {
    const validSub = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/d123456789',
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4Ywf_0qUWyLgUM4N2oStc0Cs2ET056HPFsQBvnFoh2PV0UMiK62QUYn8',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    }

    it('accepts a well-formed RFC 8291 subscription', () => {
      const res = validatePushSubscription(validSub)
      expect(res.valid).toBe(true)
      expect(res.reason).toBeUndefined()
    })

    it('rejects missing or empty endpoint', () => {
      expect(validatePushSubscription({ ...validSub, endpoint: '' }).valid).toBe(false)
      expect(validatePushSubscription({ ...validSub, endpoint: '   ' }).reason).toBe('missing_endpoint')
    })

    it('rejects non-HTTP/HTTPS protocols in endpoint', () => {
      const res = validatePushSubscription({ ...validSub, endpoint: 'javascript:alert(1)' })
      expect(res.valid).toBe(false)
      expect(res.reason).toBe('invalid_endpoint_protocol')
    })

    it('rejects malformed endpoint URLs', () => {
      const res = validatePushSubscription({ ...validSub, endpoint: 'not-a-valid-url' })
      expect(res.valid).toBe(false)
      expect(res.reason).toBe('invalid_endpoint_url')
    })

    it('rejects missing or corrupted p256dh key', () => {
      expect(validatePushSubscription({ ...validSub, p256dh: '' }).reason).toBe('missing_p256dh')
      expect(validatePushSubscription({ ...validSub, p256dh: 'too-short' }).reason).toBe('invalid_p256dh_length')
      expect(validatePushSubscription({ ...validSub, p256dh: 'not-base64-url!@#$%^&*()_+{}:"<>?' }).reason).toBe(
        'invalid_p256dh_encoding'
      )
    })

    it('rejects missing or corrupted auth secret', () => {
      expect(validatePushSubscription({ ...validSub, auth: '' }).reason).toBe('missing_auth')
      expect(validatePushSubscription({ ...validSub, auth: 'short' }).reason).toBe('invalid_auth_length')
      expect(validatePushSubscription({ ...validSub, auth: 'auth with spaces!!' }).reason).toBe('invalid_auth_encoding')
    })
  })

  // ─── 3. VAPID Keypair Verification Tests ─────────────────────────────────────

  describe('verifyVapidKeypair', () => {
    it('returns unable_to_verify when keys are missing or undefined', async () => {
      const res = await verifyVapidKeypair(undefined, undefined)
      expect(res.status).toBe('unable_to_verify')
      expect(res.reason).toBe('missing_keys')
    })

    it('returns invalid when keys contain non-base64url characters', async () => {
      const res = await verifyVapidKeypair('invalid+key/with=padding', 'invalid+key/with=padding')
      expect(res.status).toBe('invalid')
      expect(res.reason).toBe('encoding_not_base64url')
    })

    it('verifies a valid cryptographically generated P-256 pair without printing secrets', async () => {
      // Generate a legitimate P-256 keypair via Web Crypto
      const pair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      )
      const pubJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
      const privJwk = await crypto.subtle.exportKey('jwk', pair.privateKey)

      // Convert to uncompressed raw 65-byte base64url string
      const xBytes = atob(pubJwk.x!.replace(/-/g, '+').replace(/_/g, '/'))
      const yBytes = atob(pubJwk.y!.replace(/-/g, '+').replace(/_/g, '/'))
      const uncompressed = new Uint8Array(65)
      uncompressed[0] = 0x04
      for (let i = 0; i < 32; i++) {
        uncompressed[1 + i] = xBytes.charCodeAt(i)
        uncompressed[33 + i] = yBytes.charCodeAt(i)
      }
      let bin = ''
      for (let i = 0; i < 65; i++) bin += String.fromCharCode(uncompressed[i])
      const pubB64Url = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const privB64Url = privJwk.d!

      const res = await verifyVapidKeypair(pubB64Url, privB64Url)
      expect(res.status).toBe('valid')
      expect(res.publicKeyLength).toBe(pubB64Url.length)
      expect(res.privateKeyLength).toBe(privB64Url.length)
    })

    it('cryptographically verifies the generated production VAPID keypair', async () => {
      const pubKey = 'BIlT_Kg9FG5iAz6B0sgyeSWYsydSRFYj5Gw0uy5p_gi00TTWayr77evwKM3IuCQpXztH6Q7b_1MkAESJGkqG0gY'
      const privKey = 'CC9Pi-AvpWiraFbwxXRLEPmUg-jCLmbeDsT_yfgdFUQ'

      const res = await verifyVapidKeypair(pubKey, privKey)
      expect(res.status).toBe('valid')
      expect(res.publicKeyLength).toBe(87)
      expect(res.privateKeyLength).toBe(43)

      const pair = await importVapidCryptoKeyPair(pubKey, privKey)
      expect(pair.publicKey).toBeInstanceOf(CryptoKey)
      expect(pair.privateKey).toBeInstanceOf(CryptoKey)
      expect(pair.privateKey.usages).toContain('sign')
      expect(pair.publicKey.usages).toContain('verify')
    })

    it('handles and sanitizes keys surrounded by quotes or whitespace', async () => {
      const pubKey = '  "BIlT_Kg9FG5iAz6B0sgyeSWYsydSRFYj5Gw0uy5p_gi00TTWayr77evwKM3IuCQpXztH6Q7b_1MkAESJGkqG0gY"\n'
      const privKey = '\t\'CC9Pi-AvpWiraFbwxXRLEPmUg-jCLmbeDsT_yfgdFUQ\'  '

      const pair = await importVapidCryptoKeyPair(pubKey, privKey)
      expect(pair.publicKey).toBeDefined()
      expect(pair.privateKey).toBeDefined()
    })

    it('rejects mismatched P-256 keypair', async () => {
      const pair1 = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
      const pair2 = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])

      const pubJwk = await crypto.subtle.exportKey('jwk', pair1.publicKey)
      const privJwk2 = await crypto.subtle.exportKey('jwk', pair2.privateKey)

      const xBytes = atob(pubJwk.x!.replace(/-/g, '+').replace(/_/g, '/'))
      const yBytes = atob(pubJwk.y!.replace(/-/g, '+').replace(/_/g, '/'))
      const uncompressed = new Uint8Array(65)
      uncompressed[0] = 0x04
      for (let i = 0; i < 32; i++) {
        uncompressed[1 + i] = xBytes.charCodeAt(i)
        uncompressed[33 + i] = yBytes.charCodeAt(i)
      }
      let bin = ''
      for (let i = 0; i < 65; i++) bin += String.fromCharCode(uncompressed[i])
      const pubB64Url = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      const res = await verifyVapidKeypair(pubB64Url, privJwk2.d!)
      expect(res.status).toBe('invalid')
    })
  })

  // ─── 4. Exception Classification Tests ──────────────────────────────────────

  describe('classifyPushException', () => {
    it('classifies VAPID signing & JWT creation errors as vapid_signing', () => {
      const err = new TypeError("Failed to execute 'sign' on 'SubtleCrypto': Argument 2 is not of type CryptoKey")
      const classified = classifyPushException(err)

      expect(classified.stage).toBe('vapid_signing')
      expect(classified.category).toBe('vapid_signing_exception')
      expect(classified.sanitizedName).toBe('TypeError')
    })

    it('classifies forgeJwt / forgeVapidToken stack traces as vapid_signing', () => {
      const err = new Error('JWT signature failed')
      err.stack = 'Error: JWT signature failed\n    at forgeJwt (webpush.js:10:15)\n    at PushSubscriber.forgeVapidToken (subscriber.js:25:9)'
      const classified = classifyPushException(err)

      expect(classified.stage).toBe('vapid_signing')
      expect(classified.category).toBe('vapid_signing_exception')
    })

    it('classifies Web Crypto encryption errors as payload_encryption', () => {
      const err = new TypeError("Failed to execute 'encrypt' on 'SubtleCrypto': parameter 3 is not of type 'ArrayBuffer'")
      const classified = classifyPushException(err)

      expect(classified.stage).toBe('payload_encryption')
      expect(classified.category).toBe('encryption_exception')
      expect(classified.sanitizedName).toBe('TypeError')
    })

    it('classifies network / fetch failures as push_http_request', () => {
      const err = new TypeError('fetch failed: getaddrinfo ENOTFOUND fcm.googleapis.com')
      const classified = classifyPushException(err)

      expect(classified.stage).toBe('push_http_request')
      expect(classified.category).toBe('network_exception')
      expect(classified.sanitizedMessage).not.toContain('fcm.googleapis.com')
    })

    it('classifies unknown exceptions safely', () => {
      const err = new Error('Unexpected internal error')
      const classified = classifyPushException(err)

      expect(classified.stage).toBe('push_dispatch')
      expect(classified.category).toBe('push_exception')
    })
  })

  // ─── 5. Multi-Subscription Aggregation Tests ────────────────────────────────

  describe('aggregateSubscriptionResults', () => {
    it('returns sent with status null when subscriptions succeed with void resolution (no HTTP response object)', () => {
      const results: SingleSubscriptionResult[] = [
        { subscriptionId: 'sub-1', success: true, statusCode: null, errorCategory: null },
        { subscriptionId: 'sub-2', success: true, statusCode: null, errorCategory: null },
      ]

      const outcome = aggregateSubscriptionResults(results, true)
      expect(outcome.finalResult).toBe('sent')
      expect(outcome.finalStatusCode).toBeNull()
      expect(outcome.finalErrorCategory).toBeNull()
      expect(outcome.successCount).toBe(2)
      expect(outcome.failureCount).toBe(0)
    })

    it('returns sent with status 200 when one succeeds with void resolution and another returns Response 200', () => {
      const results: SingleSubscriptionResult[] = [
        { subscriptionId: 'sub-1', success: true, statusCode: null, errorCategory: null },
        { subscriptionId: 'sub-2', success: true, statusCode: 200, errorCategory: null },
      ]

      const outcome = aggregateSubscriptionResults(results, true)
      expect(outcome.finalResult).toBe('sent')
      expect(outcome.finalStatusCode).toBe(200)
    })

    it('returns sent with status 201 when all subscriptions succeed', () => {
      const results: SingleSubscriptionResult[] = [
        { subscriptionId: 'sub-1', success: true, statusCode: 201, errorCategory: null },
        { subscriptionId: 'sub-2', success: true, statusCode: 201, errorCategory: null },
      ]

      const outcome = aggregateSubscriptionResults(results, true)
      expect(outcome.finalResult).toBe('sent')
      expect(outcome.finalStatusCode).toBe(201)
      expect(outcome.finalErrorCategory).toBeNull()
      expect(outcome.successCount).toBe(2)
      expect(outcome.failureCount).toBe(0)
    })

    it('returns sent with status 201 when one subscription succeeds and another fails (mixed outcomes)', () => {
      const results: SingleSubscriptionResult[] = [
        { subscriptionId: 'sub-desktop', success: true, statusCode: 201, errorCategory: null },
        { subscriptionId: 'sub-mobile-expired', success: false, statusCode: 410, errorCategory: 'expired_sub' },
      ]

      const outcome = aggregateSubscriptionResults(results, true)
      expect(outcome.finalResult).toBe('sent')
      expect(outcome.finalStatusCode).toBe(201)
      expect(outcome.finalErrorCategory).toBeNull()
      expect(outcome.successCount).toBe(1)
      expect(outcome.failureCount).toBe(1)
    })

    it('returns sent with status 201 when first subscription throws network error and second succeeds', () => {
      const results: SingleSubscriptionResult[] = [
        { subscriptionId: 'sub-1', success: false, statusCode: null, errorCategory: 'network_exception' },
        { subscriptionId: 'sub-2', success: true, statusCode: 201, errorCategory: null },
      ]

      const outcome = aggregateSubscriptionResults(results, true)
      expect(outcome.finalResult).toBe('sent')
      expect(outcome.finalStatusCode).toBe(201)
      expect(outcome.finalErrorCategory).toBeNull()
    })

    it('returns expired_sub when all subscriptions return HTTP 410 / 404', () => {
      const results: SingleSubscriptionResult[] = [
        { subscriptionId: 'sub-1', success: false, statusCode: 410, errorCategory: 'expired_sub' },
        { subscriptionId: 'sub-2', success: false, statusCode: 404, errorCategory: 'expired_sub' },
      ]

      const outcome = aggregateSubscriptionResults(results, true)
      expect(outcome.finalResult).toBe('expired_sub')
      expect(outcome.finalStatusCode).toBe(410)
      expect(outcome.finalErrorCategory).toBe('expired_sub')
    })

    it('preserves HTTP error status code when push service returns HTTP error (e.g. 500)', () => {
      const results: SingleSubscriptionResult[] = [
        { subscriptionId: 'sub-1', success: false, statusCode: 500, errorCategory: 'push_http_500' },
      ]

      const outcome = aggregateSubscriptionResults(results, true)
      expect(outcome.finalResult).toBe('failed')
      expect(outcome.finalStatusCode).toBe(500)
      expect(outcome.finalErrorCategory).toBe('push_http_500')
    })

    it('keeps push_status_code NULL when all subscriptions fail before HTTP response (encryption / network)', () => {
      const results: SingleSubscriptionResult[] = [
        { subscriptionId: 'sub-1', success: false, statusCode: null, errorCategory: 'encryption_exception' },
        { subscriptionId: 'sub-2', success: false, statusCode: null, errorCategory: 'network_exception' },
      ]

      const outcome = aggregateSubscriptionResults(results, true)
      expect(outcome.finalResult).toBe('failed')
      expect(outcome.finalStatusCode).toBeNull()
      expect(outcome.finalErrorCategory).toBe('network_exception')
    })

    it('returns no_tasks with null status when user has no active subscriptions', () => {
      const outcome = aggregateSubscriptionResults([], false)
      expect(outcome.finalResult).toBe('no_tasks')
      expect(outcome.finalStatusCode).toBeNull()
      expect(outcome.finalErrorCategory).toBeNull()
    })

    // ─── HTTP 2xx Range & Preservation Tests ──────────────────────────────────

    it('accepts and preserves HTTP 200 OK as a successful outcome', () => {
      const results: SingleSubscriptionResult[] = [
        { subscriptionId: 'sub-1', success: true, statusCode: 200, errorCategory: null },
      ]
      const outcome = aggregateSubscriptionResults(results, true)
      expect(outcome.finalResult).toBe('sent')
      expect(outcome.finalStatusCode).toBe(200)
      expect(outcome.finalErrorCategory).toBeNull()
    })

    it('accepts and preserves HTTP 201 Created as a successful outcome', () => {
      const results: SingleSubscriptionResult[] = [
        { subscriptionId: 'sub-1', success: true, statusCode: 201, errorCategory: null },
      ]
      const outcome = aggregateSubscriptionResults(results, true)
      expect(outcome.finalResult).toBe('sent')
      expect(outcome.finalStatusCode).toBe(201)
      expect(outcome.finalErrorCategory).toBeNull()
    })

    it('accepts and preserves HTTP 202 Accepted as a successful outcome', () => {
      const results: SingleSubscriptionResult[] = [
        { subscriptionId: 'sub-1', success: true, statusCode: 202, errorCategory: null },
      ]
      const outcome = aggregateSubscriptionResults(results, true)
      expect(outcome.finalResult).toBe('sent')
      expect(outcome.finalStatusCode).toBe(202)
      expect(outcome.finalErrorCategory).toBeNull()
    })

    it('accepts and preserves HTTP 204 No Content as a successful outcome', () => {
      const results: SingleSubscriptionResult[] = [
        { subscriptionId: 'sub-1', success: true, statusCode: 204, errorCategory: null },
      ]
      const outcome = aggregateSubscriptionResults(results, true)
      expect(outcome.finalResult).toBe('sent')
      expect(outcome.finalStatusCode).toBe(204)
      expect(outcome.finalErrorCategory).toBeNull()
    })

    it('preserves the actual first successful status when multiple subscriptions succeed with different 2xx codes', () => {
      const results: SingleSubscriptionResult[] = [
        { subscriptionId: 'sub-1', success: true, statusCode: 202, errorCategory: null },
        { subscriptionId: 'sub-2', success: true, statusCode: 200, errorCategory: null },
      ]
      const outcome = aggregateSubscriptionResults(results, true)
      expect(outcome.finalResult).toBe('sent')
      expect(outcome.finalStatusCode).toBe(202)
    })
  })

  // ─── 6. Event Persistence Evaluation Tests ─────────────────────────────────

  describe('evaluateEventPersistence', () => {
    it('increments sent counter when event update succeeds after successful push', () => {
      const decision = evaluateEventPersistence('sent', null)
      expect(decision.status).toBe('persisted')
      expect(decision.incrementCounter).toBe('sent')
      expect(decision.sanitizedErrorMessage).toBeUndefined()
    })

    it('increments errors counter when database update fails after successful push', () => {
      const dbError = { message: 'Connection timeout to postgres://db.internal at https://supabase.internal/db' }
      const decision = evaluateEventPersistence('sent', dbError)

      expect(decision.status).toBe('persistence_failed')
      expect(decision.incrementCounter).toBe('errors')
      expect(decision.sanitizedErrorMessage).not.toContain('https://supabase.internal/db')
      expect(decision.sanitizedErrorMessage).toContain('[URL_REDACTED]')
    })

    it('increments errors counter when database update fails after failed push', () => {
      const dbError = { message: 'Database constraint violation' }
      const decision = evaluateEventPersistence('failed', dbError)

      expect(decision.status).toBe('persistence_failed')
      expect(decision.incrementCounter).toBe('errors')
    })

    it('never increments sent counter when event update returns an error', () => {
      const dbError = { message: 'Deadlock detected' }
      const decision = evaluateEventPersistence('sent', dbError)

      expect(decision.incrementCounter).not.toBe('sent')
      expect(decision.incrementCounter).toBe('errors')
    })

    it('increments errors counter when database update succeeds after failed push', () => {
      const decision = evaluateEventPersistence('failed', null)
      expect(decision.status).toBe('persisted')
      expect(decision.incrementCounter).toBe('errors')
    })
  })

  // ─── 7. Subscription Timestamp Update Evaluation Tests ─────────────────────

  describe('evaluateSubscriptionTimestampUpdate', () => {
    it('reports success when timestamp update succeeds', () => {
      const decision = evaluateSubscriptionTimestampUpdate(null)
      expect(decision.success).toBe(true)
      expect(decision.sanitizedErrorMessage).toBeUndefined()
    })

    it('reports failure and sanitizes error message without modifying delivery outcome', () => {
      const rawError = { message: 'Database connection failed at https://db.internal:5432/postgres' }
      const decision = evaluateSubscriptionTimestampUpdate(rawError)

      expect(decision.success).toBe(false)
      expect(decision.sanitizedErrorMessage).not.toContain('https://db.internal:5432/postgres')
      expect(decision.sanitizedErrorMessage).toContain('[URL_REDACTED]')
    })
  })

  // ─── 8. VAPID CryptoKey & PushMessage Response Handling Regression Tests ───

  describe('VAPID CryptoKey & PushMessage Response Contract', () => {
    it('1. Valid JWK VAPID import returns a valid CryptoKeyPair', async () => {
      const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
      const pubJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
      const privJwk = await crypto.subtle.exportKey('jwk', pair.privateKey)

      const xBytes = atob(pubJwk.x!.replace(/-/g, '+').replace(/_/g, '/'))
      const yBytes = atob(pubJwk.y!.replace(/-/g, '+').replace(/_/g, '/'))
      const uncompressed = new Uint8Array(65)
      uncompressed[0] = 0x04
      for (let i = 0; i < 32; i++) {
        uncompressed[1 + i] = xBytes.charCodeAt(i)
        uncompressed[33 + i] = yBytes.charCodeAt(i)
      }
      let bin = ''
      for (let i = 0; i < 65; i++) bin += String.fromCharCode(uncompressed[i])
      const pubB64Url = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const privB64Url = privJwk.d!

      const cryptoKeyPair = await importVapidCryptoKeyPair(pubB64Url, privB64Url)
      expect(cryptoKeyPair).toBeDefined()
      expect(cryptoKeyPair.publicKey).toBeDefined()
      expect(cryptoKeyPair.privateKey).toBeDefined()
    })

    it('2. Valid CryptoKeyPair has both keys as real CryptoKey instances', async () => {
      const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
      const pubJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
      const privJwk = await crypto.subtle.exportKey('jwk', pair.privateKey)

      const xBytes = atob(pubJwk.x!.replace(/-/g, '+').replace(/_/g, '/'))
      const yBytes = atob(pubJwk.y!.replace(/-/g, '+').replace(/_/g, '/'))
      const uncompressed = new Uint8Array(65)
      uncompressed[0] = 0x04
      for (let i = 0; i < 32; i++) {
        uncompressed[1 + i] = xBytes.charCodeAt(i)
        uncompressed[33 + i] = yBytes.charCodeAt(i)
      }
      let bin = ''
      for (let i = 0; i < 65; i++) bin += String.fromCharCode(uncompressed[i])
      const pubB64Url = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const privB64Url = privJwk.d!

      const cryptoKeyPair = await importVapidCryptoKeyPair(pubB64Url, privB64Url)
      expect(cryptoKeyPair.publicKey).toBeInstanceOf(CryptoKey)
      expect(cryptoKeyPair.privateKey).toBeInstanceOf(CryptoKey)
      expect(cryptoKeyPair.publicKey.type).toBe('public')
      expect(cryptoKeyPair.privateKey.type).toBe('private')
    })

    it('3. Mismatched VAPID keys are rejected during import', async () => {
      const pair1 = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
      const pair2 = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])

      const pubJwk = await crypto.subtle.exportKey('jwk', pair1.publicKey)
      const privJwk2 = await crypto.subtle.exportKey('jwk', pair2.privateKey)

      const xBytes = atob(pubJwk.x!.replace(/-/g, '+').replace(/_/g, '/'))
      const yBytes = atob(pubJwk.y!.replace(/-/g, '+').replace(/_/g, '/'))
      const uncompressed = new Uint8Array(65)
      uncompressed[0] = 0x04
      for (let i = 0; i < 32; i++) {
        uncompressed[1 + i] = xBytes.charCodeAt(i)
        uncompressed[33 + i] = yBytes.charCodeAt(i)
      }
      let bin = ''
      for (let i = 0; i < 65; i++) bin += String.fromCharCode(uncompressed[i])
      const pubB64Url = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      await expect(importVapidCryptoKeyPair(pubB64Url, privJwk2.d!)).rejects.toThrow()
    })

    it('4. Private key is a CryptoKey with signing usage for forgeJwt', async () => {
      const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
      const pubJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
      const privJwk = await crypto.subtle.exportKey('jwk', pair.privateKey)

      const xBytes = atob(pubJwk.x!.replace(/-/g, '+').replace(/_/g, '/'))
      const yBytes = atob(pubJwk.y!.replace(/-/g, '+').replace(/_/g, '/'))
      const uncompressed = new Uint8Array(65)
      uncompressed[0] = 0x04
      for (let i = 0; i < 32; i++) {
        uncompressed[1 + i] = xBytes.charCodeAt(i)
        uncompressed[33 + i] = yBytes.charCodeAt(i)
      }
      let bin = ''
      for (let i = 0; i < 65; i++) bin += String.fromCharCode(uncompressed[i])
      const pubB64Url = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      const cryptoKeyPair = await importVapidCryptoKeyPair(pubB64Url, privJwk.d!)
      expect(cryptoKeyPair.privateKey.usages).toContain('sign')

      // Verify that crypto.subtle.sign accepts it directly without throwing TypeError
      const tokenHeader = new TextEncoder().encode('{"typ":"JWT","alg":"ES256"}.{"aud":"test"}')
      const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cryptoKeyPair.privateKey, tokenHeader)
      expect(signature.byteLength).toBe(64)
    })

    it('5. Successful pushTextMessage resolution returns null statusCode when resolving with void (never fabricates 201)', () => {
      // Handles both Promise<void> (undefined return) and Promise<Response>
      const voidResult = evaluatePushDispatchOutcome(undefined)
      expect(voidResult.success).toBe(true)
      expect(voidResult.statusCode).toBeNull()
      expect(voidResult.errorCategory).toBeNull()

      const responseResult = evaluatePushDispatchOutcome({ status: 200 })
      expect(responseResult.success).toBe(true)
      expect(responseResult.statusCode).toBe(200)

      const response201Result = evaluatePushDispatchOutcome({ status: 201 })
      expect(response201Result.success).toBe(true)
      expect(response201Result.statusCode).toBe(201)
    })

    it('6. PushMessageError with HTTP 410 marks subscription as expired_sub', () => {
      const err = { response: { status: 410 }, message: 'Subscription has expired' }
      const res = evaluatePushDispatchError(err)

      expect(res.success).toBe(false)
      expect(res.statusCode).toBe(410)
      expect(res.errorCategory).toBe('expired_sub')
      expect(res.stage).toBe('response_processing')
    })

    it('7. PushMessageError with HTTP 500 preserves status code', () => {
      const err = { response: { status: 500 }, message: 'Push service internal server error' }
      const res = evaluatePushDispatchError(err)

      expect(res.success).toBe(false)
      expect(res.statusCode).toBe(500)
      expect(res.errorCategory).toBe('push_http_500')
      expect(res.stage).toBe('response_processing')
    })

    it('8. Pre-HTTP SubtleCrypto sign TypeError is classified as vapid_signing with NULL status code', () => {
      const err = new TypeError("Failed to execute 'sign' on 'SubtleCrypto': Argument 2 is not of type CryptoKey")
      const res = evaluatePushDispatchError(err)

      expect(res.success).toBe(false)
      expect(res.statusCode).toBeNull()
      expect(res.errorCategory).toBe('vapid_signing_exception')
      expect(res.stage).toBe('vapid_signing')
    })

    it('9. Pre-HTTP SubtleCrypto encrypt TypeError is classified as payload_encryption with NULL status code', () => {
      const err = new TypeError("Failed to execute 'encrypt' on 'SubtleCrypto': parameter 3 is not of type 'ArrayBuffer'")
      const res = evaluatePushDispatchError(err)

      expect(res.success).toBe(false)
      expect(res.statusCode).toBeNull()
      expect(res.errorCategory).toBe('encryption_exception')
      expect(res.stage).toBe('payload_encryption')
    })

    it('10. Diagnostics sanitize credentials and endpoint URLs on error', () => {
      const rawError = new Error(
        'Failed to sign VAPID token for endpoint https://fcm.googleapis.com/fcm/send/xyz with key BBtBMTd53AMO7QATrsoJmmkon8JwdF9hc-QMc8Ru6Z96zi2Pn7EcvzFpIoiW67Nhh1WjhM42vHYI88TYbJKlUMw'
      )
      const res = evaluatePushDispatchError(rawError)

      expect(res.classifiedError).toBeDefined()
      expect(res.classifiedError!.sanitizedMessage).not.toContain('https://fcm.googleapis.com')
      expect(res.classifiedError!.sanitizedMessage).toContain('[URL_REDACTED]')
      expect(res.classifiedError!.sanitizedMessage).not.toContain('BBtBMTd53AMO7QATrsoJmmkon8JwdF9hc-QMc8Ru6Z96zi2Pn7EcvzFpIoiW67Nhh1WjhM42vHYI88TYbJKlUMw')
      expect(res.classifiedError!.sanitizedMessage).toContain('[KEY_REDACTED]')
    })
  })
})

