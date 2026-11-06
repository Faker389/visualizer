import Cookies from "js-cookie"
import { userInterface } from "./types"


export const COOKIE_KEY = "userCookie"

// Save cookie
export const saveUserCookie = (data: userInterface) => {
  Cookies.set(COOKIE_KEY, JSON.stringify(data), {
    expires: 30, // 30 days
    secure: process.env.NODE_ENV === "production", // only secure on prod
    sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax", 
    path: "/", // make it available on all routes
  })
}

// Get cookie
export const getUserCookie = (): userInterface | null => {
  const raw = Cookies.get(COOKIE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// Clear cookie
export const clearUserCookie = () => {
  Cookies.remove(COOKIE_KEY, { path: "/" })
}