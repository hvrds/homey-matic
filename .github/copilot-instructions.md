# Homey Homematic app – AI agent notes

## Big picture
- Homey app that discovers Homematic CCU bridges via UDP broadcast and then talks to the CCU using one of three transports: XML/BIN RPC, MQTT (RedMatic/Mosquitto), or CCU Jack (MQTT + REST). Entry point is `app.js`; bridge initialization happens in `lib/HomeMaticDiscovery.js` and `lib/HomeMaticCCU*.js`.
- Device flow: drivers list CCU devices during pairing, Homey devices subscribe to CCU events, and capability updates map through a per-device `capabilityMap` (see `lib/device.js`).

## Key components and data flow
- Discovery: UDP broadcast to port 43439, responses saved into Homey settings with prefix `bridge_` (`lib/HomeMaticDiscovery.js`, `lib/constants.js`).
- Bridges:
  - RPC: `lib/HomeMaticCCURPC.js` uses `homematic-xmlrpc` and `@twendt/binrpc`, creates one connection per interface (`BidCos-RF`, `HmIP-RF`, `CUxD`) and emits `event-<address>-<datapoint>`.
  - MQTT: `lib/HomeMaticCCUMQTT.js` subscribes to `hm/status/<iface>/<channel>/<datapoint>` and emits `event-<channel>-<datapoint>`; device list comes from `hm/devices`.
  - CCU Jack: `lib/HomeMaticCCUJack.js` subscribes to `device/status/<addr>/<channel>/<datapoint>` and emits `event-<addr>:<channel>-<datapoint>`; device list via REST (`/device`).
- Pairing flow: `lib/driver.js` lists bridges first, then devices; it filters CCU devices by `this.homematicTypes` per driver.

## Driver/device conventions
- Each driver lives in `drivers/<TYPE>/` with `driver.js`, `device.js`, and `driver.compose.json`. `driver.compose.json` defines pairing steps and settings UI.
- `driver.js` extends `lib/driver.js` and sets `this.capabilities` and `this.homematicTypes`.
- `device.js` extends `lib/device.js` and passes a `capabilityMap` describing CCU channel/datapoint mappings and optional converters.
- Event name formats must match the bridge transport when subscribing in `lib/device.js` (`event-<address>:<channel>-<datapoint>` for CCU Jack, `event-<channel>-<datapoint>` for MQTT, `event-<address>-<datapoint>` for RPC).

## Generated config
- Do not edit `app.json` directly. It is generated from `.homeycompose/app.json` and the driver compose files. Edit `.homeycompose/` and `drivers/**/driver.compose.json` instead.

## Workflows
- Homey development runs via the Homey CLI (e.g. `homey app run`). There are no automated tests in `package.json`.
- The Go CLI in `cli/` generates driver templates and README content. Build with `go generate ./... && go build` (see `cli/README.md`).

## Integration points
- External dependencies: `homematic-xmlrpc`, `@twendt/binrpc`, `mqtt`, and `axios` underpin the CCU transports. Any changes to event naming or channel/datapoint formats must stay aligned with these protocols.

## New drivers
- To add a new driver, create a new folder in `drivers/` with the driver and device files, and define the driver compose JSON. Follow the existing patterns for capabilities and Homematic type filtering. Use the Go CLI to generate boilerplate if needed.
- Ensure that the new driver correctly maps CCU channels and datapoints to Homey capabilities, and that it subscribes to the correct event formats based on the transport used by the bridge.
- Test the new driver with a compatible CCU device to verify that events are received and capabilities update as expected.
- Update the README and documentation to include the new driver and any specific setup instructions for users.
- Consider contributing the new driver back to the project if it could benefit other users.
- When implementing a new driver, ensure that it adheres to the existing code style and conventions used throughout the project for consistency and maintainability.
- Use CCU-Jack, as MQTT and XML-RPC are being deprecated. CCU-Jack provides a more modern and efficient way to communicate with the CCU, and it is recommended for all new driver development. If you need to support older CCU versions that do not support CCU-Jack, you can still use MQTT or XML-RPC, but be aware that these transports may have limitations and may not receive updates in the future.
- When implementing a new driver, consider the user experience during pairing and device setup. Ensure that the driver provides clear instructions and feedback to users, and that it handles errors gracefully. This will help users successfully set up their devices and have a positive experience with the app.
- For new drivers, consider implementing support for Homey Flow actions and conditions if applicable. This can enhance the functionality of the driver and allow users to create more complex automations with their Homematic devices.
- When adding a new driver, ensure that it is properly documented in the code and in the README. This will help other developers understand how the driver works and how to use it effectively. Include information about supported devices, capabilities, and any specific setup instructions or limitations.
- If the new driver requires additional dependencies, ensure that they are added to `package.json` and that the installation instructions are updated accordingly. Be mindful of adding only necessary dependencies to keep the app lightweight and maintainable.
- When implementing a new driver, consider the performance implications of subscribing to events and updating capabilities. Ensure that the driver efficiently handles events and updates to avoid unnecessary processing or delays in the user interface.
- If the new driver supports multiple device types or configurations, consider implementing a dynamic capability mapping that can adapt to different devices. This can help reduce code duplication and make it easier to maintain the driver as new devices are added in the future.