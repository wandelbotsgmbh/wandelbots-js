export function makeURLForWebSocket(path: string, user?: string, password?: string): string {
  const url = new URL(path, location.href)
  url.protocol = url.protocol.replace("http", "ws")
  url.protocol = url.protocol.replace("https", "wss")

  // If provided, add basic auth credentials to the URL
  if (user && password) {
    url.username = user
    url.password = password
  }

  return url.toString()
}
