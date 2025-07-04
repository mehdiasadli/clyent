# clyent

A lightweight TypeScript library for rapidly building **Axios**-based API clients with fully-typed **service definitions**, **endpoint metadata**, and built-in **interceptor** support.

---

## Features

- **Service-Centric Definition**: Group endpoints under named `ApiService` instances with per-service `baseUrl`, config, and interceptors.
- **Strong Typing**: Inferred method signatures and return types based on your endpoint definitions.
- **Metadata Exposure**: Every service client exposes `baseUrl`, merged `config`, and the underlying Axios `instance` for advanced use cases.
- **Global & Service-Level Interceptors**: Plug in request/response hooks at both global and per-service levels.
- **Zero Runtime Overhead**: Just a thin factory wrapping Axios—no heavy abstractions.

---

## Installation

```bash
npm install clyent axios
# or
yarn add clyent axios
```

> Make sure you also install `axios` (peer dependency).

---

## Basic Usage

### 1. Define Your Services

Create one or more `ApiService` instances, each with a unique `name`, optional `baseUrl`, and a factory for your endpoint methods.

```ts
import { ApiService } from 'clyent';
import { AxiosInstance } from 'axios';

// Example response types
interface User {
  id: number;
  username: string;
}
interface GetUsersResponse {
  items: User[];
}

export const usersService = new ApiService({
  name: 'users',
  baseUrl: '/users',
  endpoints: (instance: AxiosInstance) => ({
    getUsers: (page: number, limit: number) => instance.get<GetUsersResponse>('/', { params: { page, limit } }),
    getUser: (id: number) => instance.get<User>(`/${id}`),
  }),
});
```

### 2. Create the API Client

Use `createApiClient` with a root URL and a map of your services.

```ts
import { createApiClient } from 'clyent';

const api = createApiClient('https://api.example.com', {
  config: {
    headers: { 'Content-Type': 'application/json' },
  },
  interceptors: {
    request: {
      onFulfilled: (cfg) => {
        /* add auth token */ return cfg;
      },
    },
  },
  services: {
    users: usersService,
    // ...other services
  },
});
```

### 3. Consume Endpoints & Metadata

```ts
// Call an endpoint
api.users.getUsers(1, 20).then(res => {
  console.log(res.data.items);
});

// Access service metadata
console.log(api.users.baseUrl);      // "/users"
console.log(api.users.config.baseURL); // "https://api.example.com/users"

// Use raw Axios instance
api.users.instance.interceptors.response.use(...);
```

---

## Advanced Topics

- **Global vs. Service-Level Interceptors**: Pass `interceptors` in `createApiClient` for all services, or on individual `ApiService` definitions for fine-grained control.
- **Extensibility**: Because you own the raw Axios instance (`api[service].instance`), you can add retries, caching, or custom plugins on the fly.
- **Type Safety**: No need to cast; each endpoint’s parameters and `res.data` are fully inferred from your definitions.

---

## API Reference

### `new ApiService<Endpoints>(cfg: ApiServiceConfig<Endpoints>)`

- **`cfg.name`**: `string` — service key, becomes `api[name]`.
- **`cfg.baseUrl`**: `string` — URL segment appended to root.
- **`cfg.config`**: `AxiosRequestConfig` — merged with global.
- **`cfg.interceptors`**: `Interceptors` — request/response hooks for this service.
- **`cfg.endpoints`**: `(instance: AxiosInstance) => Endpoints` — factory returning your typed methods.

### `createApiClient(rootUrl: string, init: ApiClientConfig)`

- **`rootUrl`**: Base URL for all services.
- **`init.config`**: Global Axios config.
- **`init.interceptors`**: Global interceptors.
- **`init.services`**: Map of service keys → `ApiService` instances.

Returns an object typed as:

```ts
{ [K in keyof Services]: ServiceClient<Endpoints> }
```

Where **`ServiceClient<Endpoints>`** exposes:

- All your `endpoints` methods
- **`baseUrl`**, **`config`**, **`instance`**, **`interceptors`**

---

## Contributing

1. Fork the repo
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Create a PR—happy to review!

---

## License

[MIT](LICENSE)
