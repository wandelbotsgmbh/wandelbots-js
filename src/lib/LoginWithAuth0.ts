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
 * Initializes Auth0 login process using redirect if necessary and retrieves an access token.
 * Returns null when an access token should not be needed to authenticate (i.e. cookie auth
 * when deployed on the instance domain)
 */
export const loginWithAuth0 = async (
  instanceUrl: string,
): Promise<string | null> => {
  if (typeof window === "undefined") {
    throw new Error(
      `Access token must be set to use NovaClient when not in a browser environment.`,
    )
  }

  const auth0Config = getAuth0Config(instanceUrl)

  if (new URL(instanceUrl).origin === window.location.origin) {
    // When deployed on the instance itself, our auth is handled by cookies
    // and no access token is needed-- just need to reload the page and it'll
    // login again / set cookie as needed
    window.location.reload()
    throw new Error(
      "Failed to reload page to get auth details, please refresh manually",
    )
  }

  // If we're on localhost or another domain, we need to do the full oauth flow
  // Note this will ONLY work for origins which are whitelisted as a redirect_uri
  // in the auth0 config, currently
  const { Auth0Client } = await import("@auth0/auth0-spa-js")

  const auth0Client = new Auth0Client({
    domain: auth0Config.domain,
    clientId: auth0Config.clientId ?? "",
    useRefreshTokens: false,
    authorizationParams: {
      audience: "nova-api",
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
