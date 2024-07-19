# @wandelbots/wandelbots-js

[![NPM version](https://img.shields.io/npm/v/@wandelbots/wandelbots-js.svg)](https://npmjs.org/package/@wandelbots/wandelbots-js) [![npm bundle size](https://img.shields.io/bundlephobia/minzip/@wandelbots/wandelbots-js)](https://bundlephobia.com/package/@wandelbots/wandelbots-js) [![Release](https://github.com/wandelbotsgmbh/wandelbots-js/actions/workflows/release.yml/badge.svg)](https://github.com/wandelbotsgmbh/wandelbots-js/actions/workflows/release.yml)

This library provides convenient access to the Wandelbots API from frontend JavaScript applications. Currently this contains typed methods for each API endpoint. We are also working on providing some higher level abstractions to manage the websocket connection state for tracking robot movement and handling jogging and Wandelscript program execution, which will be included in this package. 

```bash
npm install @wandelbots/wandelbots-js
```

## Usage

The core of this package is the `NovaClient`, which represents a connection to a configured robot cell on a given Nova instance:

```ts
import { NovaClient } from "@wandelbots/wandelbots-js"

const nova = new NovaClient({
  instanceUrl: "https://example.instance.wandelbots.io",
})
```

## API calls

You can make calls to the REST API via `nova.api`, which contains a bunch of namespaced methods for each endpoint generated from the OpenAPI spec and documentation.

For example, to list the devices configured in your cell:

```ts
const devices = await nova.api.deviceConfig.listDevices()
// -> e.g. [{ type: 'controller', identifier: 'abb_irb1200_7', ... }, ...]
```

Documentation for the various API endpoints is available on your Nova instance at `/api/v1/ui` (public documentation site is in the works)

## Contributing

To set up wandelbots-js for development, first clone the repo and run:

```bash
npm install
```

Then you can run the tests against any Nova instance:

```bash
NOVA_INSTANCE_URL=https://example.instance.wandelbots.io npm run test
```
