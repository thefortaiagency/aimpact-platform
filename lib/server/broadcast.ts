// Server-side broadcast utility
let broadcastFunction: ((data: any) => void) | null = null

export function setBroadcastFunction(fn: (data: any) => void) {
  broadcastFunction = fn
}

export function broadcastUpdate(data: any) {
  if (broadcastFunction) {
    broadcastFunction(data)
  } else {
    console.warn('Broadcast function not set. Update will not be sent to clients.')
  }
}