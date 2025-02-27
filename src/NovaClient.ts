import type { Configuration as BaseConfiguration } from "@wandelbots/wandelbots-api-client"
import type { AxiosInstance, AxiosRequestConfig } from "axios"
import axios, { isAxiosError } from "axios"
import urlJoin from "url-join"
import { loginWithAuth0 } from "./lib/LoginWithAuth0.js"
import { NovaAPIClient } from "./lib/NovaAPIClient"
import { NovaCellClient } from "./lib/NovaCellClient.js"
import { availableStorage } from "./lib/availableStorage.js"
import { MockNovaInstance } from "./mock/MockNovaInstance"

export type NovaClientConfig = {
  /**
   * Url of the deployed Nova instance to connect to
   * e.g. https://saeattii.instance.wandelbots.io
   */
  instanceUrl: string | "https://mock.example.com"

  /**
   * Identifier of the cell on the Nova instance to connect this client to.
   * If omitted, the default identifier "cell" is used.
   **/
  cellId?: string

  /**
   * Username for basic auth to the Nova instance.
   * @deprecated use accessToken instead
   */
  username?: string

  /**
   * Password for basic auth to the Nova instance.
   * @deprecated use accessToken instead
   */
  password?: string

  /**
   * Access token for Bearer authentication.
   */
  accessToken?: string
} & Omit<BaseConfiguration, "isJsonMime" | "basePath">

/**
 * Client for connecting to a Nova instance and controlling robots.
 */
export class NovaClient {
  readonly api: NovaAPIClient
  readonly mock?: MockNovaInstance
  readonly axiosInstance: AxiosInstance
  authPromise: Promise<string | null> | null = null
  accessToken: string | null = null

  constructor(readonly config: NovaClientConfig) {
    this.accessToken =
      config.accessToken ||
      availableStorage.getString("wbjs.access_token") ||
      null

    if (this.config.instanceUrl === "https://mock.example.com") {
      this.mock = new MockNovaInstance()
    }

    // Set up Axios instance with interceptor for token fetching
    this.axiosInstance = axios.create({
      baseURL: urlJoin(this.config.instanceUrl, "/api/v1"),
    })

    this.axiosInstance.interceptors.request.use(async (request) => {
      if (!request.headers.Authorization) {
        if (this.accessToken) {
          request.headers.Authorization = `Bearer ${this.accessToken}`
        } else if (this.config.username && this.config.password) {
          request.headers.Authorization = `Basic ${btoa(config.username + ":" + config.password)}`
        }
      }
      return request
    })

    if (typeof window !== "undefined") {
      this.axiosInstance.interceptors.response.use(
        (r) => r,
        async (error) => {
          if (isAxiosError(error)) {
            if (error.response?.status === 401) {
              // If we hit a 401, attempt to login the user and retry with
              // a new access token
              try {
                await this.renewAuthentication()

                if (error.config) {
                  if (this.accessToken) {
                    error.config.headers.Authorization = `Bearer ${this.accessToken}`
                  } else {
                    delete error.config.headers.Authorization
                  }
                  return this.axiosInstance.request(error.config)
                }
              } catch (err) {
                return Promise.reject(err)
              }
            } else if (error.response?.status === 503) {
              // Check if the server as a whole is down
              const res = await fetch(window.location.href)
              if (res.status === 503) {
                // Go to 503 page
                window.location.reload()
              }
            }
          }

          return Promise.reject(error)
        },
      )
    }

    this.api = new NovaAPIClient({
      ...config,
      basePath: urlJoin(this.config.instanceUrl, "/api/v1"),
      baseOptions: {
        ...(this.mock
          ? ({
              adapter: (config) => {
                return this.mock!.handleAPIRequest(config)
              },
            } satisfies AxiosRequestConfig)
          : {}),
        ...config.baseOptions,
      },
      axiosInstance: this.axiosInstance,
    })
  }

  /**
   * Get a NovaCellClient for making requests to
   * a specific cell on the Nova instance.
   */
  cell(cellId: string): NovaCellClient {
    return new NovaCellClient(this, cellId)
  }

  async renewAuthentication(): Promise<void> {
    this.authPromise = loginWithAuth0(this.config.instanceUrl)
    try {
      this.accessToken = await this.authPromise
      if (this.accessToken) {
        // Cache access token so we don't need to log in every refresh
        availableStorage.setString("wbjs.access_token", this.accessToken)
      } else {
        availableStorage.delete("wbjs.access_token")
      }
    } finally {
      this.authPromise = null
    }
  }
}
