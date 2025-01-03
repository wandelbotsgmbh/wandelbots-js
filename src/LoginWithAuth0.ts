import { Auth0Client } from "@auth0/auth0-spa-js"

const DOMAIN_SUFFIX = "wandelbots.io"

/** Mapping of stages to Auth0 configurations */
const auth0ConfigMap = {
  dev: {
    domain: `https://auth.portal.dev.${DOMAIN_SUFFIX}`,
    clientId: process.env.NOVA_AUTH0_DEV_CLIENT_ID,
  },
  stg: {
    domain: `https://auth.portal.stg.${DOMAIN_SUFFIX}`,
    clientId: process.env.NOVA_AUTH0_STG_CLIENT_ID,
  },
  prod: {
    domain: `https://auth.portal.${DOMAIN_SUFFIX}`,
    clientId: process.env.NOVA_AUTH0_PROD_CLIENT_ID,
  },
}

/** Determine which Auth0 configuration to use based on instance URL  */
const getAuth0Config = (instanceUrl: string) => {
  if (instanceUrl.includes(`dev.${DOMAIN_SUFFIX}`)) return auth0ConfigMap.dev
  if (instanceUrl.includes(`stg.${DOMAIN_SUFFIX}`)) return auth0ConfigMap.stg
  if (instanceUrl.includes(DOMAIN_SUFFIX)) return auth0ConfigMap.prod
  throw new Error(
    "Unsupported instance URL. Cannot determine Auth0 configuration.",
  )
}

/**
 * Checks if login is required based on the instance URL.
 */
export const isLoginRequired = (instanceUrl: string): boolean => {
  return instanceUrl.includes(DOMAIN_SUFFIX)
}

export const isDeployedOnPortalInstance = (): boolean => {
  return (
    typeof window !== "undefined" &&
    window.location.origin.includes(DOMAIN_SUFFIX)
  )
}

/**
 * Initializes Auth0 login process using redirect if necessary and retrieves an access token.
 * Stops the process if login is not required or if NOVA_USERNAME and NOVA_PASSWORD are set.
 */
export const loginWithAuth0 = async (
  instanceUrl: string,
  forceAuthLogin: boolean = false,
): Promise<string | null> => {
  if (typeof window === "undefined") {
    throw new Error(
      "Window object is not available. Cannot perform login flow.",
    )
  }

  if (!forceAuthLogin) {
    if (!isLoginRequired(instanceUrl) || isDeployedOnPortalInstance()) {
      console.log("Login not required for this instance.")
      return null
    }
  }

  const auth0Config = getAuth0Config(instanceUrl)
  const auth0Client = new Auth0Client({
    domain: auth0Config.domain,
    clientId: auth0Config.clientId ?? "",
    useRefreshTokens: false,
    authorizationParams: {
      audience: "nova-instance-rest-api",
      redirect_uri: window.location.origin,
    },
  })

  // If the URL includes a redirect result, handle it
  if (
    window.location.search.includes("code=") &&
    window.location.search.includes("state=")
  ) {
    const { appState } = await auth0Client.handleRedirectCallback()
    // Return to the URL the user was originally on before the redirect
    window.history.replaceState(
      {},
      document.title,
      appState?.returnTo || window.location.pathname,
    )
  } else {
    // Initiate login with redirect
    await auth0Client.loginWithRedirect()
  }

  // Once logged in, retrieve the access token silently
  const accessToken = await auth0Client.getTokenSilently()
  return accessToken
}
