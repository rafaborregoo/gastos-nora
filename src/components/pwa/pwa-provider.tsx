"use client"

import { useEffect } from "react"

export function PwaProvider() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return
    }

    const isSupportedEnvironment =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"

    if (!isSupportedEnvironment) {
      return
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" })
      } catch {
        // Ignore registration failures silently; the web app still works without offline mode.
      }
    }

    register()
  }, [])

  return null
}
