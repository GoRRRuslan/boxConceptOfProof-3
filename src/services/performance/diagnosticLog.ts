// Diagnostic events of a measurement build, sent to the local collector (EXPO_PUBLIC_PERF_SINK_URL, see scripts/perf/perfSink.py).
// A release build has no console on a device: this is how its behaviour (renderer start/stop, tab changes, sound and haptic
// failures...) is read from the Mac. Without the variable it does nothing at all.
const DIAGNOSTIC_SINK_URL: string | undefined = process.env.EXPO_PUBLIC_PERF_SINK_URL
const FLUSH_DELAY_MILLISECONDS = 250
const MAXIMUM_QUEUED_EVENTS = 200

interface IDiagnosticEvent {
  event: string
  at: number
  [key: string]: unknown
}

const queue: IDiagnosticEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | undefined

const flush = () => {
  flushTimer = undefined

  if (!DIAGNOSTIC_SINK_URL || queue.length === 0) {
    return
  }

  const events = queue.splice(0, queue.length)

  fetch(DIAGNOSTIC_SINK_URL, { method: 'POST', body: JSON.stringify({ diagnostics: events }) }).catch(() => undefined)
}

export const logDiagnostic = (event: string, data: Record<string, unknown> = {}) => {
  if (!DIAGNOSTIC_SINK_URL) {
    return
  }

  if (queue.length < MAXIMUM_QUEUED_EVENTS) {
    queue.push({ ...data, event, at: Date.now() })
  }

  flushTimer ??= setTimeout(flush, FLUSH_DELAY_MILLISECONDS)
}

// Reports a rejected promise instead of dropping it silently.
export const logDiagnosticFailure = (event: string, error: unknown) => {
  logDiagnostic(event, { error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) })
}
