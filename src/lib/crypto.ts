import crypto from "crypto"
import { getUserCookie } from "./cookies"
import { userInterface } from "./types"

const algorithm = "aes-256-gcm"

// Generate a proper 32-byte key from your secret
const rawKey = process.env.NEXT_PUBLIC_rawKey!
const secretKey = crypto.createHash("sha256").update(rawKey).digest()

// Encrypt a single field
export interface EncryptedUserSimple {
  id: string
  email:string
  encryptedData: string
  iv: string
  tag: string
}

export function encryptSimple(user:userInterface): EncryptedUserSimple|null {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv)
  const newUserDB:userInterface = {
    id:user.id ,
    email:user.email,
    name:user.name ,
    veryfiedEmail:user.veryfiedEmail,
    photoURL:user.photoURL,
    authMethod:user.authMethod,
  }
  const userData = JSON.stringify(newUserDB)
  
  let encrypted = cipher.update(userData, "utf8", "hex")
  encrypted += cipher.final("hex")
  
  const tag = cipher.getAuthTag().toString("hex")
  
  return {
    id: user.id,
    email: user.email,
    encryptedData: encrypted,
    iv: iv.toString("hex"),
    tag,
  }
}

// Decrypt simple approach
export function decryptSimple(encryptedData: EncryptedUserSimple): userInterface {
  if (!encryptedData.iv || !encryptedData.tag || !encryptedData.encryptedData) {
    throw new Error("Invalid encrypted data: missing required fields")
  }
  const ivBuffer = Buffer.from(encryptedData.iv, "hex")
  const tagBuffer = Buffer.from(encryptedData.tag, "hex")
  
  const decipher = crypto.createDecipheriv(algorithm, secretKey, ivBuffer)
  decipher.setAuthTag(tagBuffer)
  
  let decrypted = decipher.update(encryptedData.encryptedData, "hex", "utf8")
  decrypted += decipher.final("utf8")
  
  const userData = JSON.parse(decrypted) as userInterface
  return userData
}