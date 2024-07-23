# @wandelbots/wandelbots-js

[![NPM version](https://img.shields.io/npm/v/@wandelbots/wandelbots-js.svg)](https://npmjs.org/package/@wandelbots/wandelbots-js) [![npm bundle size](https://img.shields.io/bundlephobia/minzip/@wandelbots/wandelbots-js)](https://bundlephobia.com/package/@wandelbots/wandelbots-js) [![Release](https://github.com/wandelbotsgmbh/wandelbots-js/actions/workflows/release.yml/badge.svg)](https://github.com/wandelbotsgmbh/wandelbots-js/actions/workflows/release.yml)

This library provides convenient access to the Wandelbots API from frontend JavaScript applications. Currently this contains typed methods for each API endpoint. We are also working on providing some higher level abstractions to manage the websocket connection state for tracking robot movement and handling jogging and Wandelscript program execution, which will be included in this package.

```bash
npm install @wandelbots/wandelbots-js
```

## Table of contents

- [Basic usage](#basic-usage)
- [API calls](#api-calls)
- [Jogging](#jogging)
  - [Stopping the jogger](#stopping-the-jogger)
  - [Rotating a joint](#rotating-a-joint)
  - [Moving a TCP](#moving-the-tcp)
  - [Rotating a TCP](#rotating-the-tcp)

## Basic usage

The core of this package is the `NovaClient`, which represents a connection to a configured robot cell on a given Nova instance:

```ts
import { NovaClient } from "@wandelbots/wandelbots-js"

const nova = new NovaClient({
  instanceUrl: "https://example.instance.wandelbots.io",

  // Auth details come from the developer portal when you create an instance
  username: "wb",
  password: "SOME_PASSWORD",
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

## Jogging

Jogging in a robotics context generally refers to the manual movement of the robot via direct human input. The Wandelbots platform provides websocket-based jogging methods which can be used to build similar jogging interfaces to those found on teach pendants.

```ts
// Parameter is the id of the motion group to jog
const jogger = await nova.connectJogger(`0@example-controller`)
```

The jogger has two mutually exclusive modes. You must set the appropriate jogging mode before starting a jogging motion; this ensures that the motion is ready to start immediately when called with minimal delay.

```ts
// Set the jogger to "joint" mode, enabling continuous joint rotations.
await jogger.setJoggingMode("joint")

// Set the jogger to "tcp" mode, enabling continuous translation
// and rotation movements of the tool center point.
await jogger.setJoggingMode("tcp")
```

### Stopping the jogger

For safety purposes, let's first consider how to stop the jogger. Calling stop will stop all motion types regardless of mode:

```ts
await jogger.stop()
```

As a failsafe, the server will also stop any jogging motions when it detects the relevant websocket has been closed. This means that if e.g. the network connection drops out or the browser tab is closed in the middle of a motion, it will stop automatically.

However, you should never totally rely on any software being able to stop the robot: always have the hardware emergency stop button within reach just in case!

### Rotating a joint

Requires `joint` mode. This example starts joint 0 of the robot rotating in a positive direction at 1 radian per second:

```ts
await jogger.startJointRotation({
  joint: 0,
  direction: "+",
  velocityRadsPerSec: 1,
})
```

### Moving a TCP

Requires `tcp` mode. This example starts moving a TCP in a positive direction along the X axis of the specified coordinate system, at a velocity of 5 millimeters per second:

```ts
await jogger.startTCPTranslation({
  tcpId: "some-tcp",
  coordSystemId: "some-coord-system",
  axis: "x",
  direction: "+",
  velocityMmPerSec: 5,
})
```

### Rotating a TCP

Requires `tcp` mode. This example starts rotating the TCP in a positive direction around the X axis of the specified coordinate system, at a velocity of 5 radians per second:

```ts
await jogger.startTCPRotation({
  tcpId: "some-tcp",
  coordSystemId: "some-coord-system",
  axis: "x",
  direction: "+",
  velocityRadsPerSec: 5,
})
```

## Contributing

To set up wandelbots-js for development, first clone the repo and run:

```bash
npm install
```

Then you can run the tests against any Nova instance:

```bash
NOVA_INSTANCE_URL=https://example.instance.wandelbots.io npm run test
```
