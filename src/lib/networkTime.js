export async function resolveNetworkTimeOffset() {
  const startedAt = Date.now()

  try {
    const response = await fetch('https://worldtimeapi.org/api/ip', { cache: 'no-store' })
    if (!response.ok) throw new Error('time API unavailable')

    const data = await response.json()
    const networkTime = new Date(data.utc_datetime || data.datetime).getTime()
    if (!Number.isFinite(networkTime)) throw new Error('time API returned invalid data')

    const receivedAt = Date.now()
    const estimatedDeviceTime = startedAt + (receivedAt - startedAt) / 2

    return {
      offsetMs: networkTime - estimatedDeviceTime,
      source: 'Network synced',
      lastSyncedAt: new Date(receivedAt),
    }
  } catch {
    return {
      offsetMs: 0,
      source: 'Device time',
      lastSyncedAt: new Date(),
    }
  }
}
