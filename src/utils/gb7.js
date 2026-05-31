const SIGNATURE = [0x47, 0x42, 0x37, 0x1d]
const VERSION = 0x01
const HEADER_SIZE = 12

export function decodeGb7(buffer) {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== SIGNATURE[i]) throw new Error('Invalid GB7 signature')
  }

  const flags = bytes[5]
  const hasMask = (flags & 0x01) !== 0
  const width = view.getUint16(6, false)
  const height = view.getUint16(8, false)

  const imageData = new ImageData(width, height)
  const out = imageData.data

  for (let i = 0; i < width * height; i++) {
    const byte = bytes[HEADER_SIZE + i]
    const grey7 = byte & 0x7f
    const grey8 = Math.round((grey7 * 255) / 127)
    const alpha = hasMask ? ((byte & 0x80) !== 0 ? 255 : 0) : 255
    const p = i * 4
    out[p] = grey8
    out[p + 1] = grey8
    out[p + 2] = grey8
    out[p + 3] = alpha
  }

  return imageData
}

export function encodeGb7(imageData, useMask = false) {
  const { width, height, data } = imageData
  const buf = new ArrayBuffer(HEADER_SIZE + width * height)
  const view = new DataView(buf)
  const bytes = new Uint8Array(buf)

  bytes[0] = SIGNATURE[0]
  bytes[1] = SIGNATURE[1]
  bytes[2] = SIGNATURE[2]
  bytes[3] = SIGNATURE[3]
  bytes[4] = VERSION
  bytes[5] = useMask ? 0x01 : 0x00
  view.setUint16(6, width, false)
  view.setUint16(8, height, false)
  view.setUint16(10, 0, false)

  for (let i = 0; i < width * height; i++) {
    const p = i * 4
    const grey8 = Math.round((data[p] + data[p + 1] + data[p + 2]) / 3)
    const grey7 = Math.round((grey8 * 127) / 255)
    const maskBit = useMask && data[p + 3] >= 128 ? 0x80 : 0
    bytes[HEADER_SIZE + i] = (grey7 & 0x7f) | maskBit
  }

  return buf
}
