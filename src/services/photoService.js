import { cloudinary, hasCloudinary } from './config'

/** Redimensiona e comprime a imagem no aparelho antes de enviar. */
async function compress(file, maxSide, quality, type = 'image/jpeg') {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao processar a imagem'))), type, quality)
  )
}

const blobToDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

/**
 * Com Cloudinary configurado: envia a foto (unsigned preset) e devolve a URL.
 * Sem Cloudinary: guarda a foto comprimida (~100-200 KB) dentro do próprio banco.
 */
export async function uploadPhoto(file) {
  if (hasCloudinary) {
    const blob = await compress(file, 1600, 0.8)
    const body = new FormData()
    body.append('file', blob)
    body.append('upload_preset', cloudinary.uploadPreset)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`, {
      method: 'POST',
      body
    })
    if (!res.ok) throw new Error('Não foi possível enviar a foto (Cloudinary).')
    const data = await res.json()
    return { url: data.secure_url, inline: false }
  }
  const blob = await compress(file, 1024, 0.65)
  return { url: await blobToDataURL(blob), inline: true }
}

/** Miniatura leve para a galeria (só Cloudinary; fotos inline já são pequenas). */
export function thumbUrl(photo) {
  if (photo.inline || !photo.url.includes('/upload/')) return photo.url
  return photo.url.replace('/upload/', '/upload/w_480,h_480,c_fill,q_auto,f_auto/')
}

/**
 * Logo de patrocinador: PNG pequeno (mantém fundo transparente).
 * Cloudinary se estiver configurado; senão fica dentro do próprio documento (~20-80 KB).
 */
export async function uploadLogo(file) {
  const blob = await compress(file, 512, 0.9, 'image/png')
  if (hasCloudinary) {
    const body = new FormData()
    body.append('file', blob)
    body.append('upload_preset', cloudinary.uploadPreset)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`, {
      method: 'POST',
      body
    })
    if (!res.ok) throw new Error('Não foi possível enviar o logo (Cloudinary).')
    const data = await res.json()
    return { logoUrl: data.secure_url, inline: false }
  }
  return { logoUrl: await blobToDataURL(blob), inline: true }
}
