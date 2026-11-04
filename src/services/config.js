const env = import.meta.env

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID
}

// Sem as chaves do Firebase o app funciona em "modo local" (localStorage).
export const hasFirebase = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

export const cloudinary = {
  cloudName: env.VITE_CLOUDINARY_CLOUD_NAME,
  uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET
}
export const hasCloudinary = Boolean(cloudinary.cloudName && cloudinary.uploadPreset)
