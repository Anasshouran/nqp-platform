/**
 * M1.10 — تلمترية التطبيق: أحداث مُشكَّلة + كشط إجباري قبل المغادرة.
 *
 * لا يُرسَّل أي حدث قبل مروره بـ ``scrub`` (SENSITIVE_HEALTH → SCRUBBED).
 */
import { scrub } from '../security/scrub';

export type TelemetryEventName =
  | 'api_latency'
  | 'auth_failure'
  | 'declaration_submission'
  | 'sync_failure'
  | 'contract_failure'
  | 'app_error';

export interface TelemetryEvent {
  name: TelemetryEventName;
  ts: string;
  props: Record<string, unknown>;
}

export type Transport = (event: TelemetryEvent) => void | Promise<void>;

export function createEvent(
  name: TelemetryEventName,
  props: Record<string, unknown> = {},
): TelemetryEvent {
  return { name, ts: new Date().toISOString(), props: scrub(props) };
}

export class Telemetry {
  constructor(private readonly transport: Transport) {}

  async emit(name: TelemetryEventName, props: Record<string, unknown> = {}): Promise<void> {
    await this.transport(createEvent(name, props));
  }

  async measureApiLatency<T>(path: string, run: () => Promise<T>): Promise<T> {
    const started = performance.now();
    try {
      const result = await run();
      await this.emit('api_latency', {
        path,
        duration_ms: Math.round(performance.now() - started),
      });
      return result;
    } catch (error) {
      await this.emit('api_latency', {
        path,
        duration_ms: Math.round(performance.now() - started),
        failed: true,
        error_code: (error as { message_?: { code?: string } })?.message_?.code ?? 'UNKNOWN',
      });
      throw error;
    }
  }
}
