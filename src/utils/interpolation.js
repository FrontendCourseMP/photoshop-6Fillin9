export const INTERP_METHODS = [
  {
    id: 'bilinear',
    label: 'Билинейная',
    description: 'Взвешенное среднее четырёх соседних пикселей. Плавные переходы и хорошее качество при увеличении фотографий.',
  },
  {
    id: 'nearest',
    label: 'Ближайший сосед',
    description: 'Копирует ближайший пиксель без усреднения. Сохраняет чёткие края. Идеален для пиксель-арта и кратного уменьшения.',
  },
]

export function resizeImage(imageData, newWidth, newHeight, method = 'bilinear') {
  const w = Math.max(1, Math.round(newWidth))
  const h = Math.max(1, Math.round(newHeight))
  return method === 'nearest'
    ? nearestNeighbor(imageData, w, h)
    : bilinear(imageData, w, h)
}

function nearestNeighbor(imageData, nw, nh) {
  const { width: sw, height: sh, data: src } = imageData
  const out = new Uint8ClampedArray(nw * nh * 4)
  const rx = sw / nw
  const ry = sh / nh
  for (let y = 0; y < nh; y++) {
    const sy = Math.min(Math.floor(y * ry), sh - 1)
    for (let x = 0; x < nw; x++) {
      const sx = Math.min(Math.floor(x * rx), sw - 1)
      const si = (sy * sw + sx) * 4
      const di = (y * nw + x) * 4
      out[di]     = src[si]
      out[di + 1] = src[si + 1]
      out[di + 2] = src[si + 2]
      out[di + 3] = src[si + 3]
    }
  }
  return new ImageData(out, nw, nh)
}

function bilinear(imageData, nw, nh) {
  const { width: sw, height: sh, data: src } = imageData
  const out = new Uint8ClampedArray(nw * nh * 4)
  const rx = sw / nw
  const ry = sh / nh
  for (let y = 0; y < nh; y++) {
    const gy = y * ry
    const y0 = Math.floor(gy)
    const y1 = Math.min(y0 + 1, sh - 1)
    const fy = gy - y0
    for (let x = 0; x < nw; x++) {
      const gx = x * rx
      const x0 = Math.floor(gx)
      const x1 = Math.min(x0 + 1, sw - 1)
      const fx = gx - x0
      const di  = (y * nw + x) * 4
      const i00 = (y0 * sw + x0) * 4
      const i01 = (y0 * sw + x1) * 4
      const i10 = (y1 * sw + x0) * 4
      const i11 = (y1 * sw + x1) * 4
      const w00 = (1 - fx) * (1 - fy)
      const w01 = fx * (1 - fy)
      const w10 = (1 - fx) * fy
      const w11 = fx * fy
      for (let c = 0; c < 4; c++) {
        out[di + c] = Math.round(
          src[i00 + c] * w00 + src[i01 + c] * w01 +
          src[i10 + c] * w10 + src[i11 + c] * w11
        )
      }
    }
  }
  return new ImageData(out, nw, nh)
}
