# @wandelbots/nova

The Wandelbots Nova client library provides convenient access to the Nova API from frontend JavaScript applications. In addition to typed methods for each API endpoint, we provide some higher level abstractions that manage the websocket connection state for tracking robot movement and handling jogging and Wandelscript program execution.

```bash
npm install @wandelbots/nova
```

## Contributing

To set up nova-js for development, first clone the repo and run:

```bash
npm install
```

Then you can run the tests against any Nova instance:

```bash
NOVA_INSTANCE_URL=https://example.instance.wandelbots.io npm run test
```
