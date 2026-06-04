export const PRESETS = [
  { id: 'identity',  label: 'Тождественное',         kernel: [0, 0, 0,  0, 1, 0,  0, 0, 0] },
  { id: 'sharpen',   label: 'Повышение резкости',     kernel: [0, -1, 0,  -1, 5, -1,  0, -1, 0] },
  { id: 'gaussian',  label: 'Фильтр Гаусса 3×3',     kernel: [1, 2, 1,  2, 4, 2,  1, 2, 1] },
  { id: 'box',       label: 'Прямоугольное размытие', kernel: [1, 1, 1,  1, 1, 1,  1, 1, 1] },
  { id: 'prewitt_h', label: 'Прюитт горизонтальный', kernel: [-1, 0, 1,  -1, 0, 1,  -1, 0, 1] },
  { id: 'prewitt_v', label: 'Прюитт вертикальный',   kernel: [-1, -1, -1,  0, 0, 0,  1, 1, 1] },
]

export const EDGE_STRATEGIES = [
  { id: 'black', label: 'Заполнение чёрным' },
  { id: 'white', label: 'Заполнение белым'  },
  { id: 'copy',  label: 'Копирование края'  },
]

function padImage(imageData, strategy) {
  const { width, height, data } = imageData
  const pw = width + 2
  const ph = height + 2
  const out = new Uint8ClampedArray(pw * ph * 4)

  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const sx = x - 1
      const sy = y - 1
      const di = (y * pw + x) * 4
      if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
        const si = (sy * width + sx) * 4
        out[di] = data[si]; out[di + 1] = data[si + 1]
        out[di + 2] = data[si + 2]; out[di + 3] = data[si + 3]
      } else if (strategy === 'black') {
        out[di] = 0; out[di + 1] = 0; out[di + 2] = 0; out[di + 3] = 255
      } else if (strategy === 'white') {
        out[di] = 255; out[di + 1] = 255; out[di + 2] = 255; out[di + 3] = 255
      } else {
        const cx = Math.max(0, Math.min(width - 1, sx))
        const cy = Math.max(0, Math.min(height - 1, sy))
        const si = (cy * width + cx) * 4
        out[di] = data[si]; out[di + 1] = data[si + 1]
        out[di + 2] = data[si + 2]; out[di + 3] = data[si + 3]
      }
    }
  }
  return { data: out, width: pw, height: ph }
}

const CH_INDEX = { R: [0], G: [1], B: [2], A: [3], Grey: [0, 1, 2] }

export async function applyConvolution(imageData, kernelValues, enabledChannels, edgeStrategy, onProgress) {
  const kernel = kernelValues.map(Number)
  const ksum = kernel.reduce((a, b) => a + b, 0)
  const divisor = ksum > 1 ? ksum : 1

  const { width, height, data } = imageData
  const padded = padImage(imageData, edgeStrategy)
  const pw = padded.width
  const out = new Uint8ClampedArray(data)

  const indices = new Set()
  for (const ch of enabledChannels) {
    const arr = CH_INDEX[ch]
    if (arr) arr.forEach(i => indices.add(i))
  }
  const channelList = [...indices]

  for (let y = 0; y < height; y++) {
    if (y % 50 === 0) {
      if (onProgress) onProgress(y / height)
      await new Promise(r => setTimeout(r, 0))
    }
    for (let x = 0; x < width; x++) {
      const di = (y * width + x) * 4
      for (const ci of channelList) {
        let acc = 0
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            acc += padded.data[((y + ky) * pw + (x + kx)) * 4 + ci] * kernel[ky * 3 + kx]
          }
        }
        out[di + ci] = Math.max(0, Math.min(255, Math.round(acc / divisor)))
      }
    }
  }

  return new ImageData(out, width, height)
}
