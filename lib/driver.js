'use strict';

const Homey = require('homey');

class Driver extends Homey.Driver {

    onInit() {
        this.multiDevice = false
        this.numDevices = 1
    }

    async getBridge({serial}) {
        let self = this;
        //backwards compatibility
        if (serial === undefined && Object.keys(this.homey.app.bridges).length > 0) {
            return this.homey.app.bridges[Object.keys(this.homey.app.bridges)[0]]
        }

        if (this.homey.app.bridges[serial])
            return this.homey.app.bridges[serial];

        //self.homey.app.bridges = await self.homey.app.discovery.discover();
        await this.homey.app.discovery.discover();
        //backwards compatibility
        if (serial === undefined && Object.keys(this.homey.app.bridges).length > 0) {
            return self.homey.app.bridges[Object.keys(this.homey.app.bridges)[0]]
        }

        if (this.homey.app.bridges[serial])
            return this.homey.app.bridges[serial];

        throw new Error('Bridge not found');
    }

    async onPair(session) {
        let currentBridge;
        let self = this;

        const onListDevices = (data) => {
            if (!currentBridge)
                return onListDevicesBridges(data);

            return onListDevicesDevices(data);
        }

        const onListDevicesBridges = async (data) => {
            try {
                await self.homey.app.discovery.discover()

                const result = Object.values(self.homey.app.bridges).map(bridge => {
                    return {
                        name: "CCU(" + bridge.address + ")",
                        data: {
                            serial: bridge.serial,
                        }
                    }
                });

                return result;

            } catch (err) {
                throw new Error('Discovery failed')
            }
        }

        const onListDevicesDevices = async (data) => {
            if (!currentBridge)
                throw new Error('Missing Bridge');

            let devices = [];
            var self = this;

            self.log('🔍 DEBUG:', 'onListDevicesDevices called');
            self.log('🔍 DEBUG:', 'Looking for types:', self.homematicTypes);

            try {
              let bridgeDevices = await currentBridge.listDevices()
              
              self.log('🔍 DEBUG:', '📦 bridgeDevices structure:', Object.keys(bridgeDevices));

              Object.keys(bridgeDevices).forEach((interfaceName) => {
                self.log('🔍 DEBUG:', 'Interface:', interfaceName, 'Device count:', bridgeDevices[interfaceName].length);
                
                for (var i = 0; i < bridgeDevices[interfaceName].length; i++) {
                  let deviceType = bridgeDevices[interfaceName][i].TYPE;
                  
                  if (self.homematicTypes.includes(deviceType)) {
                    self.log('🔍 DEBUG:', '  ✅ MATCH! Device type:', deviceType);
                    
                    for (let idx = 0; idx < this.numDevices; idx++) {
                      let device = {
                        "name": this.getDeviceName(bridgeDevices[interfaceName][i].ADDRESS, idx),
                        "capabilities": self.capabilities,
                        "data": {
                          "id": bridgeDevices[interfaceName][i].ADDRESS,
                          "attributes": {
                            "HomeyInterfaceName": interfaceName,
                            "bridgeSerial": currentBridge.serial
                          }
                        }
                      }
                      if (this.multiDevice) {
                        device.data.attributes.Index = idx
                      }
                      self.log('🔍 DEBUG:', '  📦 Adding device:', device.name);
                      devices.push(device);
                    }
                  } else {
                    self.log('🔍 DEBUG:', '  ❌ No match for:', deviceType);
                  }
                }
              })
              
              self.log('🔍 DEBUG:', '✅ Total devices to return:', devices.length);
            } catch (err) {
              self.log('🔍 DEBUG:', '⚠️ Error listing devices:', err.message);
              throw new Error('Failed to list devices: ' + err)
            }

            return devices;

        }

        const onListBridgesSelection = async (data) => {
            currentBridge = self.homey.app.bridges[data[0].data.serial];
        }

        session.setHandler('list_devices', onListDevices);
        session.setHandler('list_bridges_selection', onListBridgesSelection);

    }

    getDeviceName(address, idx) {
        if (this.multiDevice == true) {
            return address + "-" + (idx + 1)
        } else {
            return address
        }
    }
}

module.exports = Driver;
