import { File, Paths } from 'expo-file-system'

import type { IOwnedWatch } from '@models/mainStorage/CollectionStore/_types'
import { logDiagnosticFailure } from '@services/performance/diagnosticLog'

// What survives the app being thrown out of memory by the system (it happens in the background, and the app then starts from scratch): the
// money and the bought watches. Everything else (an opening in progress, the scene, the list) starts clean.
export interface IStoreSnapshot {
  balanceInCents: number
  ownedWatches: IOwnedWatch[]
  appliedIdempotencyKeys: string[]
  attemptCounter: number
}

const SNAPSHOT_FILE_NAME = 'mystery-watch-state.json'
const SNAPSHOT_VERSION = 1

interface IStoredFile {
  version: number
  snapshot: IStoreSnapshot
}

export const isStoreSnapshot = (value: unknown): value is IStoreSnapshot => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.balanceInCents === 'number' &&
    Number.isFinite(candidate.balanceInCents) &&
    candidate.balanceInCents >= 0 &&
    Array.isArray(candidate.ownedWatches) &&
    Array.isArray(candidate.appliedIdempotencyKeys) &&
    candidate.appliedIdempotencyKeys.every(key => typeof key === 'string') &&
    typeof candidate.attemptCounter === 'number'
  )
}

export const parseStoreSnapshot = (text: string): IStoreSnapshot | null => {
  try {
    const parsed = JSON.parse(text) as Partial<IStoredFile>

    if (parsed.version !== SNAPSHOT_VERSION || !isStoreSnapshot(parsed.snapshot)) {
      return null
    }

    return parsed.snapshot
  } catch {
    return null
  }
}

export const serializeStoreSnapshot = (snapshot: IStoreSnapshot): string =>
  JSON.stringify({ version: SNAPSHOT_VERSION, snapshot } satisfies IStoredFile)

// Reads synchronously, so that the store is filled before the first screen is drawn.
export const loadStoreSnapshot = (): IStoreSnapshot | null => {
  try {
    const file = new File(Paths.document, SNAPSHOT_FILE_NAME)

    return file.exists ? parseStoreSnapshot(file.textSync()) : null
  } catch (error) {
    logDiagnosticFailure('persistence.load.failed', error)

    return null
  }
}

export const saveStoreSnapshot = (snapshot: IStoreSnapshot) => {
  try {
    const file = new File(Paths.document, SNAPSHOT_FILE_NAME)

    if (!file.exists) {
      file.create()
    }

    file.writeSync(serializeStoreSnapshot(snapshot))
  } catch (error) {
    logDiagnosticFailure('persistence.save.failed', error)
  }
}
