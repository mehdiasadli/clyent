import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

/**
 * Axios-compatible interceptor definitions
 */
export interface Interceptors {
  request?: {
    onFulfilled?: (
      config: InternalAxiosRequestConfig
    ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
    onRejected?: (error: any) => any;
  };
  response?: {
    onFulfilled?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;
    onRejected?: (error: any) => any;
  };
}

/**
 * Configuration for one service
 */
export interface ApiServiceConfig<Endpoints> {
  /** Unique service name, used as property on client */
  name: string;
  /** Path segment (appended to root URL) */
  baseUrl?: string;
  /** Service-specific Axios config (merged with global) */
  config?: AxiosRequestConfig;
  /** Service-specific interceptors, applied after global */
  interceptors?: Interceptors;
  /** Factory receiving the Axios instance and returning typed endpoints */
  endpoints: (instance: AxiosInstance) => Endpoints;
}

/**
 * Wrapper holding service metadata and endpoint factory
 */
export class ApiService<Endpoints> {
  readonly name: string;
  readonly baseUrl: string;
  readonly config: AxiosRequestConfig;
  readonly interceptors?: Interceptors;
  readonly build: (instance: AxiosInstance) => Endpoints;

  constructor(cfg: ApiServiceConfig<Endpoints>) {
    this.name = cfg.name;
    this.baseUrl = cfg.baseUrl ?? '';
    this.config = cfg.config ?? {};
    this.interceptors = cfg.interceptors;
    this.build = cfg.endpoints;
  }
}

/**
 * Initialization options for ApiClient
 */
export interface ApiClientConfig<Services> {
  /** Global Axios config applied to all services */
  config?: AxiosRequestConfig;
  /** Global interceptors applied before service-level */
  interceptors?: Interceptors;
  /** Map of service keys to ApiService instances */
  services: Services;
}

/**
 * Augmented service client exposing endpoints + metadata
 */
export type ServiceClient<Endpoints> = Endpoints & {
  /** Service-level metadata */
  baseUrl: string;
  config: AxiosRequestConfig;
  interceptors?: Interceptors;
  /** Raw Axios instance for advanced usages */
  instance: AxiosInstance;
};

/**
 * Derives client interface from provided services
 */
export type ApiClientType<Services extends Record<string, ApiService<any>>> = {
  [K in keyof Services]: Services[K] extends ApiService<infer Endpoints> ? ServiceClient<Endpoints> : never;
};

/**
 * Factory to build a fully-typed API client.
 * Returns an object typed as ApiClientType<Services>
 */
export function createApiClient<Services extends Record<string, ApiService<any>>>(
  rootUrl: string,
  init: ApiClientConfig<Services>
): ApiClientType<Services> {
  const { config: globalConfig = {}, interceptors: globalIxs, services } = init;
  const client = {} as ApiClientType<Services>;

  for (const key in services) {
    const service = services[key];

    // Merge Axios config
    const axiosConfig: AxiosRequestConfig = {
      baseURL: `${rootUrl}${service.baseUrl}`,
      ...globalConfig,
      ...service.config,
    };
    const instance = axios.create(axiosConfig);

    // Apply global interceptors
    if (globalIxs?.request) {
      instance.interceptors.request.use(globalIxs.request.onFulfilled!, globalIxs.request.onRejected);
    }
    if (globalIxs?.response) {
      instance.interceptors.response.use(globalIxs.response.onFulfilled!, globalIxs.response.onRejected);
    }

    // Apply service-specific interceptors
    if (service.interceptors?.request) {
      instance.interceptors.request.use(
        service.interceptors.request.onFulfilled!,
        service.interceptors.request.onRejected
      );
    }
    if (service.interceptors?.response) {
      instance.interceptors.response.use(
        service.interceptors.response.onFulfilled!,
        service.interceptors.response.onRejected
      );
    }

    // Build endpoints
    const endpoints = service.build(instance);

    // Compose service client with metadata
    const svcClient: any = {
      ...endpoints,
      baseUrl: service.baseUrl,
      config: axiosConfig,
      interceptors: service.interceptors,
      instance,
    };

    // Assign to client
    (client as any)[service.name] = svcClient;
  }

  return client;
}
