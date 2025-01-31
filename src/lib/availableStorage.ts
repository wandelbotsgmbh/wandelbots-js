/**
 * Safety wrapper around browser localStorage providing context availability
 * checks and JSON parsing
 */
class AvailableStorage {
  available = typeof window !== "undefined" && !!window.localStorage

  getJSON<T>(key: string): Partial<T> | null {
    if (!this.available) return null

    const result = window.localStorage.getItem(key)
    if (result === null) return null

    try {
      return JSON.parse(result)
    } catch (err) {
      return null
    }
  }

  setJSON(key: string, obj: any) {
    if (!this.available) return null

    window.localStorage.setItem(key, JSON.stringify(obj))
  }

  delete(key: string) {
    if (!this.available) return null

    window.localStorage.removeItem(key)
  }

  setString(key: string, value: string) {
    if (!this.available) return null

    window.localStorage.setItem(key, value)
  }

  getString(key: string): string | null {
    if (!this.available) return null

    return window.localStorage.getItem(key)
  }
}

export const availableStorage = new AvailableStorage()
