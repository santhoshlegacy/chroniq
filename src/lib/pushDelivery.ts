/**
 * Web Push delivery utilities, validators, sanitizers, and result aggregators.
 *
 * Implements strict RFC 8291 / RFC 8292 Web Push protocol checks,
 * zero-credential diagnostic logging sanitization, cryptographic VAPID pair verification,
 * and robust multi-subscription outcome aggregation.
 */

// ─── Diagnostic Sanitizer ─────────────────────────────────────────────────────

/**
 * Redacts sensitive values (endpoint URLs, tokens, keys, authorization headers)
 * from log messages and stack traces to ensure zero credential leakage.
 */
export function sanitizeDiagnostic(text: string): string {
  if (!text) return ''
  return text
    // Redact URLs (e.g. push endpoints https://fcm.googleapis.com/...)
    .replace(/https?:\/\/[^\s"'`<>]+/gi, '[URL_REDACTED]')
    // Redact push service domains and hostnames (e.g. fcm.googleapis.com, web.push.apple.com)
    .replace(/\b([a-z0-9-]+\.)+(googleapis\.com|mozilla\.com|apple\.com|push\.services|windows\.com)\b/gi, '[HOST_REDACTED]')
    // Redact base64 / base64url strings of 20+ chars (keys, auth secrets, tokens)
    .replace(/\b[A-Za-z0-9_-]{20,}\b/g, '[KEY_REDACTED]')
    // Redact Authorization headers or Bearer tokens
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [TOKEN_REDACTED]')
    // Redact emails
    .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[EMAIL_REDACTED]')
}

// ─── Subscription Validation ──────────────────────────────────────────────────

export interface PushSubscriptionFields {
  id?: string
  endpoint?: string
  p256dh?: string
  auth?: string
}

export interface SubscriptionValidationResult {
  valid: boolean
  reason?: string
}

export function validatePushSubscription(sub: PushSubscriptionFields): SubscriptionValidationResult {
  if (!sub || typeof sub !== 'object') {
    return { valid: false, reason: 'missing_subscription_object' }
  }

  // 1. Endpoint URL
  if (!sub.endpoint || typeof sub.endpoint !== 'string' || sub.endpoint.trim().length === 0) {
    return { valid: false, reason: 'missing_endpoint' }
  }

  try {
    const url = new URL(sub.endpoint)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { valid: false, reason: 'invalid_endpoint_protocol' }
    }
  } catch {
    return { valid: false, reason: 'invalid_endpoint_url' }
  }

  // 2. p256dh key (uncompressed P-256 public key, 65 bytes raw -> 87 or 88 base64url chars)
  if (!sub.p256dh || typeof sub.p256dh !== 'string' || sub.p256dh.trim().length === 0) {
    return { valid: false, reason: 'missing_p256dh' }
  }

  const base64UrlPattern = /^[A-Za-z0-9_-]+$/
  if (!base64UrlPattern.test(sub.p256dh.trim())) {
    return { valid: false, reason: 'invalid_p256dh_encoding' }
  }

  const p256dhLen = sub.p256dh.trim().length
  if (p256dhLen < 80 || p256dhLen > 90) {
    return { valid: false, reason: 'invalid_p256dh_length' }
  }

  // 3. auth secret (RFC 8291 requires 16 bytes raw -> 21 to 26 base64url chars)
  if (!sub.auth || typeof sub.auth !== 'string' || sub.auth.trim().length === 0) {
    return { valid: false, reason: 'missing_auth' }
  }

  if (!base64UrlPattern.test(sub.auth.trim())) {
    return { valid: false, reason: 'invalid_auth_encoding' }
  }

  const authLen = sub.auth.trim().length
  if (authLen < 20 || authLen > 30) {
    return { valid: false, reason: 'invalid_auth_length' }
  }

  return { valid: true }
}

// ─── VAPID Keypair Verification ───────────────────────────────────────────────

function base64UrlToUint8Array(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4 !== 0) b64 += '='
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export interface VapidVerificationResult {
  status: 'valid' | 'invalid' | 'unable_to_verify'
  reason?: string
  publicKeyLength?: number
  privateKeyLength?: number
}

export async function importVapidCryptoKeyPair(
  rawPubB64Url: string,
  rawPrivB64Url: string
): Promise<CryptoKeyPair> {
  const cleanPub = rawPubB64Url.trim().replace(/^["']|["']$/g, '').trim()
  const cleanPriv = rawPrivB64Url.trim().replace(/^["']|["']$/g, '').trim()

  const b64urlRegex = /^[A-Za-z0-9_-]+$/
  if (!b64urlRegex.test(cleanPub) || !b64urlRegex.test(cleanPriv)) {
    throw new Error('VAPID keys must be valid base64url encoded strings')
  }

  const pubBytes = base64UrlToUint8Array(cleanPub)
  const privBytes = base64UrlToUint8Array(cleanPriv)

  if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) {
    throw new Error(`Invalid public key: expected 65-byte uncompressed P-256 (got ${pubBytes.length} bytes)`)
  }

  if (privBytes.length !== 32) {
    throw new Error(`Invalid private key: expected 32-byte scalar (got ${privBytes.length} bytes)`)
  }

  const x = uint8ArrayToBase64Url(pubBytes.subarray(1, 33))
  const y = uint8ArrayToBase64Url(pubBytes.subarray(33, 65))
  const d = cleanPriv

  const pubJwk: JsonWebKey = { kty: 'EC', crv: 'P-256', x, y, ext: true }
  const privJwk: JsonWebKey = { kty: 'EC', crv: 'P-256', x, y, d, ext: true }

  const publicKey = await crypto.subtle.importKey(
    'jwk',
    pubJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify']
  )

  const privateKey = await crypto.subtle.importKey(
    'jwk',
    privJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign']
  )

  // Verify pair cryptographically via sign & verify probe
  const probe = new TextEncoder().encode('chroniq-vapid-verification-probe')
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    probe
  )

  const isValid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    signature,
    probe
  )

  if (!isValid) {
    throw new Error('VAPID keypair verification failed: signature does not match public key')
  }

  return { publicKey, privateKey }
}

export async function verifyVapidKeypair(
  publicKey: string | undefined,
  privateKey: string | undefined
): Promise<VapidVerificationResult> {
  if (!publicKey || !privateKey) {
    return { status: 'unable_to_verify', reason: 'missing_keys' }
  }

  try {
    await importVapidCryptoKeyPair(publicKey, privateKey)
    return {
      status: 'valid',
      publicKeyLength: publicKey.trim().length,
      privateKeyLength: privateKey.trim().length,
    }
  } catch (err: unknown) {
    const errName = err instanceof Error ? err.name : 'UnknownError'
    const errMsg = err instanceof Error ? err.message : String(err)
    const reason =
      errMsg.includes('base64url') ? 'encoding_not_base64url' :
      errMsg.includes('65-byte') ? 'public_key_not_uncompressed_p256' :
      errMsg.includes('32-byte') ? 'private_key_length_mismatch' :
      errMsg.includes('signature does not match') ? 'signature_verification_failed' :
      `crypto_exception_${errName}`

    return {
      status: 'invalid',
      reason,
      publicKeyLength: publicKey.trim().length,
      privateKeyLength: privateKey.trim().length,
    }
  }
}

// ─── Error Classification ─────────────────────────────────────────────────────

export interface ClassifiedPushError {
  stage: 'vapid_signing' | 'payload_encryption' | 'push_http_request' | 'push_dispatch'
  category: string
  sanitizedName: string
  sanitizedMessage: string
  sanitizedStack?: string
}

export function classifyPushException(err: unknown): ClassifiedPushError {
  const errName = err instanceof Error ? err.name : 'Unknown'
  const rawMsg = err instanceof Error ? err.message : String(err)
  const rawStack = err instanceof Error ? err.stack : undefined

  const sanitizedMessage = sanitizeDiagnostic(rawMsg)
  const sanitizedStack = rawStack ? sanitizeDiagnostic(rawStack) : undefined

  const lowerMsg = rawMsg.toLowerCase()
  const lowerName = errName.toLowerCase()
  const lowerStack = (rawStack || '').toLowerCase()

  // VAPID signing & JWT creation exceptions
  if (
    lowerMsg.includes('sign') ||
    lowerMsg.includes('jwt') ||
    lowerMsg.includes('vapid') ||
    lowerMsg.includes('forgevapidtoken') ||
    lowerMsg.includes('forgejwt') ||
    lowerStack.includes('forgejwt') ||
    lowerStack.includes('forgevapidtoken')
  ) {
    return {
      stage: 'vapid_signing',
      category: 'vapid_signing_exception',
      sanitizedName: errName,
      sanitizedMessage,
      sanitizedStack,
    }
  }

  // Web Crypto / SubtleCrypto / payload encryption errors
  if (
    lowerName.includes('domexception') ||
    lowerName.includes('dataerror') ||
    lowerName.includes('operationerror') ||
    lowerMsg.includes('crypto') ||
    lowerMsg.includes('encrypt') ||
    lowerMsg.includes('cryptokey') ||
    lowerMsg.includes('arraybuffer') ||
    lowerMsg.includes('typedarray') ||
    lowerMsg.includes('ecdh') ||
    lowerMsg.includes('hkdf') ||
    lowerMsg.includes('gcm')
  ) {
    return {
      stage: 'payload_encryption',
      category: 'encryption_exception',
      sanitizedName: errName,
      sanitizedMessage,
      sanitizedStack,
    }
  }

  // Network / fetch errors
  if (
    lowerName.includes('network') ||
    lowerMsg.includes('fetch failed') ||
    lowerMsg.includes('econnrefused') ||
    lowerMsg.includes('enotfound') ||
    lowerMsg.includes('etimedout') ||
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('dns') ||
    lowerMsg.includes('connection')
  ) {
    return {
      stage: 'push_http_request',
      category: 'network_exception',
      sanitizedName: errName,
      sanitizedMessage,
      sanitizedStack,
    }
  }

  // Fallback
  return {
    stage: 'push_dispatch',
    category: 'push_exception',
    sanitizedName: errName,
    sanitizedMessage,
    sanitizedStack,
  }
}

// ─── Push Dispatch Outcome Evaluation ─────────────────────────────────────────

export interface PushDispatchEvaluation {
  success: boolean
  statusCode: number | null
  errorCategory: string | null
  stage: string
  classifiedError?: ClassifiedPushError
}

export function evaluatePushDispatchOutcome(
  pushResult: unknown
): PushDispatchEvaluation {
  // If pushTextMessage resolved without throwing, push was accepted!
  // If pushResult has a numeric status (e.g. Response.status), preserve it; otherwise record null (never fabricate 201)
  const acceptedStatus: number | null =
    pushResult && typeof (pushResult as any).status === 'number'
      ? (pushResult as any).status
      : null

  return {
    success: true,
    statusCode: acceptedStatus,
    errorCategory: null,
    stage: 'response_processing',
  }
}

export function evaluatePushDispatchError(
  err: unknown
): PushDispatchEvaluation {
  // Check if error wraps an HTTP response (e.g. PushMessageError.response or err.status / err.statusCode)
  const httpResponse = (err as any)?.response ?? ((err as any)?.status ? err : null)
  const httpStatus: number | null =
    httpResponse && typeof httpResponse.status === 'number'
      ? httpResponse.status
    : typeof (err as any)?.statusCode === 'number'
      ? (err as any).statusCode
    : null

  if (httpStatus !== null && httpStatus > 0) {
    if (httpStatus === 410 || httpStatus === 404) {
      return {
        success: false,
        statusCode: httpStatus,
        errorCategory: 'expired_sub',
        stage: 'response_processing',
      }
    }
    return {
      success: false,
      statusCode: httpStatus,
      errorCategory: `push_http_${httpStatus}`,
      stage: 'response_processing',
    }
  }

  // Pre-HTTP exception (status is NULL)
  const classified = classifyPushException(err)
  return {
    success: false,
    statusCode: null,
    errorCategory: classified.category,
    stage: classified.stage,
    classifiedError: classified,
  }
}

// ─── Multi-Subscription Result Aggregation ───────────────────────────────────

export interface SingleSubscriptionResult {
  subscriptionId: string
  success: boolean
  statusCode: number | null
  errorCategory: string | null
  stage?: string
}

export interface OverallPushOutcome {
  finalResult: 'sent' | 'failed' | 'expired_sub' | 'no_tasks'
  finalStatusCode: number | null
  finalErrorCategory: string | null
  successCount: number
  failureCount: number
}

export function aggregateSubscriptionResults(
  results: SingleSubscriptionResult[],
  hasSubscriptions: boolean
): OverallPushOutcome {
  if (!hasSubscriptions || results.length === 0) {
    return {
      finalResult: 'no_tasks',
      finalStatusCode: null,
      finalErrorCategory: null,
      successCount: 0,
      failureCount: 0,
    }
  }

  const successes = results.filter((r) => r.success)
  const failures = results.filter((r) => !r.success)

  // 1. If any subscription succeeded, the reminder is sent
  if (successes.length > 0) {
    const firstSuccessStatus = successes.find((s) => s.statusCode !== null)?.statusCode ?? null
    return {
      finalResult: 'sent',
      finalStatusCode: firstSuccessStatus,
      finalErrorCategory: null,
      successCount: successes.length,
      failureCount: failures.length,
    }
  }

  // 2. All subscriptions failed
  // Check if all failed subscriptions are expired (404 / 410)
  const allExpired =
    failures.length > 0 &&
    failures.every((f) => f.errorCategory === 'expired_sub' || f.statusCode === 410 || f.statusCode === 404)

  if (allExpired) {
    const firstStatus = failures.find((f) => f.statusCode !== null)?.statusCode ?? null
    return {
      finalResult: 'expired_sub',
      finalStatusCode: firstStatus ?? 410,
      finalErrorCategory: 'expired_sub',
      successCount: 0,
      failureCount: failures.length,
    }
  }

  // 3. Mixed or non-expired failures
  // Check if any HTTP status code was recorded
  const lastHttpFailure = [...failures].reverse().find((f) => f.statusCode !== null && f.statusCode > 0)
  const lastErrorCategory = [...failures].reverse().find((f) => f.errorCategory)?.errorCategory ?? 'failed'

  return {
    finalResult: 'failed',
    finalStatusCode: lastHttpFailure ? lastHttpFailure.statusCode : null,
    finalErrorCategory: lastErrorCategory,
    successCount: 0,
    failureCount: failures.length,
  }
}

// ─── Event Persistence Evaluation ─────────────────────────────────────────────

export interface EventPersistenceDecision {
  status: 'persisted' | 'persistence_failed'
  incrementCounter: 'sent' | 'errors'
  sanitizedErrorMessage?: string
}

export function evaluateEventPersistence(
  outcomeResult: 'sent' | 'failed' | 'expired_sub' | 'no_tasks',
  updateError: { message: string } | null | undefined
): EventPersistenceDecision {
  if (updateError) {
    return {
      status: 'persistence_failed',
      incrementCounter: 'errors',
      sanitizedErrorMessage: sanitizeDiagnostic(updateError.message),
    }
  }

  return {
    status: 'persisted',
    incrementCounter: outcomeResult === 'sent' ? 'sent' : 'errors',
  }
}

// ─── Subscription Timestamp Evaluation ────────────────────────────────────────

export interface SubscriptionTimestampDecision {
  success: boolean
  sanitizedErrorMessage?: string
}

export function evaluateSubscriptionTimestampUpdate(
  tsError: { message: string } | null | undefined
): SubscriptionTimestampDecision {
  if (tsError) {
    return {
      success: false,
      sanitizedErrorMessage: sanitizeDiagnostic(tsError.message),
    }
  }
  return { success: true }
}
