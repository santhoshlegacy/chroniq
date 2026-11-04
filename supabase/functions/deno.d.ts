/**
 * Ambient type declarations for Deno runtime in Supabase Edge Functions.
 * Allows IDE and TypeScript compilers to recognize Deno APIs and JSR/NPM import specifiers.
 */

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined
    set(key: string, value: string): void
  }
  export const env: Env

  export interface ServeOptions {
    port?: number
    hostname?: string
    signal?: AbortSignal
  }

  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void
  export function serve(
    options: ServeOptions,
    handler: (req: Request) => Response | Promise<Response>,
  ): void
}

declare module 'jsr:@supabase/supabase-js@^2' {
  export const createClient: any
}

declare module 'jsr:@negrel/webpush@^0.5.0' {
  export interface PushSubscriber {
    pushTextMessage(payload: string, options?: any): Promise<void | Response>
    pushMessage(payload: ArrayBuffer | ArrayBufferView, options?: any): Promise<void | Response>
    [key: string]: any
  }

  export class ApplicationServer {
    static new(options: any): Promise<ApplicationServer>
    subscribe(subscription: any): PushSubscriber
    [key: string]: any
  }
}

declare module 'npm:date-fns@^3' {
  export const addMinutes: any
  export const format: any
  export const isBefore: any
  export const isEqual: any
  export const parseISO: any
}

declare module 'npm:date-fns-tz@^3' {
  export const fromZonedTime: any
  export const toZonedTime: any
}
