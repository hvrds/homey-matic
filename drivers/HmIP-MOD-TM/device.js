'use strict';

const Homey = require('homey');
const Device = require('../../lib/device.js')
const Convert = require('../../lib/convert.js')

const doorStateToCoveringState = function (value) {
    if (value === "CLOSED") {
        return "down"
    } else if (value === "OPEN") {
        return "up"
    }

    return "idle"
}

const CoveringStateToDoorCommand = function (value) {
    if (value === "up") {
        return 1
    } else if (value === "down") {
        return 3
    }
    return 2
}

const SendPartialOpen = function(value) {
    if (value === true) {
        return 4
    }
    return undefined
}

const capabilityMap = {
    "windowcoverings_state": {
        "channel": 1,
        "key": "DOOR_STATE",
        "convert": doorStateToCoveringState,
        "set": {
            "key": "DOOR_COMMAND",
            "channel": 1,
            "convert": CoveringStateToDoorCommand
        }
    },
    "measure_mod_ho_door_state": {
        "channel": 1,
        "key": "DOOR_STATE",
        "convert": Convert.toString
    },
    "homematic_button_mod_ho_partial_open": {
        "set": {
            "key": "DOOR_COMMAND",
            "channel": 1,
            "convert": SendPartialOpen
        }
    },
    "onoff": {
        "channel": 2,
        "key": "STATE",
        "set": {
            "key": "STATE",
            "channel": 2
        }
    }
}

class HomematicDevice extends Device {

    onInit() {
        super.onInit(capabilityMap);
    }

    initializeExtraEventListeners() {
        this.initializeVentilationSupport();
        this.initializeProcessingListener();
    }

    initializeVentilationSupport() {
        const channel = 1;
        const key = 'VENTILATION_POSITION_SUPPORTED';
        const eventName = 'event-' + this.deviceAddress + ':' + channel + '-' + key;

        this.bridge.on(eventName, (value) => {
            this.applyVentilationSupport(value);
        });

        this.bridge.getValue(this.HomeyInterfaceName, this.deviceAddress + ':' + channel, key)
            .then((value) => {
                this.applyVentilationSupport(value);
            })
            .catch((err) => {
                this.logger.log('info', 'Ventilation support not available for device', this.deviceAddress);
            });
    }

    applyVentilationSupport(value) {
        const supported = this.toBoolean(value);
        this.ventilationPositionSupported = supported;

        if (!supported && this.hasCapability('homematic_button_mod_ho_partial_open')) {
            this.removeCapability('homematic_button_mod_ho_partial_open')
                .catch((err) => {
                    this.logger.log('info', 'Failed to disable ventilation capability for device', this.deviceAddress, err);
                });
        }
    }

    initializeProcessingListener() {
        const channel = 1;
        const key = 'PROCESSING';
        const eventName = 'event-' + this.deviceAddress + ':' + channel + '-' + key;

        this.bridge.on(eventName, (value) => {
            this.processing = value;
        });

        this.bridge.getValue(this.HomeyInterfaceName, this.deviceAddress + ':' + channel, key)
            .then((value) => {
                this.processing = value;
            })
            .catch((err) => {
                this.processing = undefined;
            });
    }

    toBoolean(value) {
        if (value === true) {
            return true;
        }
        if (value === 1 || value === '1') {
            return true;
        }
        if (value === 'true') {
            return true;
        }
        return false;
    }

}

module.exports = HomematicDevice;
