# @wandelbots/nova-js

[![NPM version](https://img.shields.io/npm/v/@wandelbots/nova-js.svg)](https://npmjs.org/package/@wandelbots/nova-js) [![npm bundle size](https://img.shields.io/bundlephobia/minzip/@wandelbots/nova-js)](https://bundlephobia.com/package/@wandelbots/nova-js) [![Release](https://github.com/wandelbotsgmbh/nova-js/actions/workflows/release.yml/badge.svg)](https://github.com/wandelbotsgmbh/nova-js/actions/workflows/release.yml)

This library provides convenient access to the Wandelbots API from frontend JavaScript applications. Currently this contains typed methods for each API endpoint. We are also working on providing some higher level abstractions to manage the websocket connection state for tracking robot movement and handling jogging and Wandelscript program execution, which will be included in this package.

```bash
npm install @wandelbots/nova-js
```

If you develop an react application we also provide a set of [react components](https://github.com/wandelbotsgmbh/wandelbots-js-react-components) which you can use together with this library.

## Table of contents

- [Basic usage](#basic-usage)
- [API calls](#api-calls)
- [Opening websockets](#opening-websockets)
- [Connect to a motion group](#connect-to-a-motion-group)
- [Execute Wandelscript](#execute-wandelscript)
- [Jogging](#jogging)
  - [Stopping the jogger](#stopping-the-jogger)
  - [Rotating a joint](#rotating-a-joint)
  - [Moving a TCP](#moving-the-tcp)
  - [Rotating a TCP](#rotating-the-tcp)
  - [Post-jogging cleanup](#post-jogging-cleanup)
  - [Jogging UI Panel](#jogging-ui-panel)

## Basic usage

The core of this package is the `NovaClient`, which represents a connection to a configured robot cell on a given Nova instance:

```ts
import { NovaClient } from "@wandelbots/nova-js"

const nova = new NovaClient({
  instanceUrl: "https://example.instance.wandelbots.io",
  cellId: "cell",

  // Access token is given in the developer portal UI when you create an instance
  accessToken: "...",
})
```

## API calls

You can make calls to the REST API via `nova.api`, which contains a bunch of namespaced methods for each endpoint generated from the OpenAPI spec and documentation.

For example, to list the controllers configured in your cell:

```ts
const { instances } = await nova.api.controller.listControllers()
// -> e.g. [{ controller: "ur5e", model_name: "UniversalRobots::Controller", ... }, ...]
```

Documentation for the various API endpoints is available on your Nova instance at `/api/v1/ui` (public documentation site is in the works)

## Opening websockets

`NovaClient` has various convenience features for websocket handling in general. Use `openReconnectingWebsocket` to get a persistent socket for a given Nova streaming endpoint that will handle unexpected closes with exponential backoff:

```ts
const programStateSocket = nova.openReconnectingWebsocket(`/programs/state`)

this.programStateSocket.addEventListener("message", (ev) => {
  console.log(ev.data)
})
```

Websockets on a given Nova client are deduplicated by path, so if you call `openReconnectingWebsocket` twice with the same path you'll get the same object. The exception is if you called `dispose`, which you may do to permanently clean up a reconnecting websocket and free its resources:

```ts
programStateSocket.dispose()
```

The reconnecting websocket interface is fairly low-level and you won't get type safety on the messages. So when available, you'll likely want to use one of the following endpoint-specific abstractions instead which are built on top!

## Connect to a motion group

The library provides an easy to use way to access properties of a motion group.

```ts
activeRobot = await this.nova.connectMotionGroup(`some-motion-group-id`)
```

This connected motion group opens a websocket and listens to changes of the current joints and the TCP pose. You can read out those values by using the `rapidlyChangingMotionState` of the object. Along other properties it also provides the current `safetySetup` and `tcps`.

```ts
const newJoints =
  activeRobot.rapidlyChangingMotionState.state.joint_position.joints
```

To render a visual representation, you can use the `robot` component of the [react components](https://wandelbotsgmbh.github.io/wandelbots-js-react-components/?path=/docs/3d-view-robot--docs).

## Execute Wandelscript

The `ProgramStateConnection` provides an object which allows to execute and stop a given Wandelscript.

```ts
import script from "./example.ws"
...
programRunner.executeProgram(script)
```

You can `stop` the current execution or listen to state updates of your wandelscript code by observing the `programRunner.executionState`.

## Jogging

Jogging in a robotics context generally refers to the manual movement of the robot via direct human input. The Wandelbots platform provides websocket-based jogging methods which can be used to build similar jogging interfaces to those found on teach pendants.

```ts
const jogger = await nova.connectJogger(`some-motion-group-id`)
```

The jogger has two mutually exclusive modes. You must set the appropriate jogging mode before starting a jogging motion; this ensures that the motion is ready to start immediately when called with minimal delay.

```ts
// Set the jogger to "joint" mode, enabling continuous joint rotations.
await jogger.setJoggingMode("joint")

// Set the jogger to "tcp" mode, enabling continuous translation
// and rotation movements of the tool center point.
await jogger.setJoggingMode("tcp", {
  tcpId: "flange",
  coordSystemId: "world",
})
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

Requires `tcp` mode. This example starts moving a TCP in a positive direction along the X axis of the specified coordinate system, at a velocity of 10 millimeters per second:

```ts
await jogger.startTCPTranslation({
  axis: "x",
  direction: "+",
  velocityMmPerSec: 10,
})
```

### Rotating a TCP

Requires `tcp` mode. This example starts rotating the TCP in a positive direction around the X axis of the specified coordinate system, at a velocity of 1 radians per second:

```ts
await jogger.startTCPRotation({
  axis: "x",
  direction: "+",
  velocityRadsPerSec: 1,
})
```

### Post-jogging cleanup

When you are done with a jogger, make sure to call dispose:

```ts
await jogger.dispose()
```

This will close any open websockets and ensure things are left in a good state.

### Jogging UI Panel

You can use the [Jogging Panel](https://wandelbotsgmbh.github.io/wandelbots-js-react-components/?path=/docs/jogging-joggingpanel--docs) from the [react components](https://github.com/wandelbotsgmbh/wandelbots-js-react-components) library to get a easy to use visualization component.

## Contributing

To set up nova-js for development, first clone the repo and run:

```bash
npm install
```

Then you can run the tests which will use a mocked Nova API and socket connections:

```bash
npm run test
```
