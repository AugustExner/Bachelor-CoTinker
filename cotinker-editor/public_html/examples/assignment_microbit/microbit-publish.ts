enum SensorEnum {
    //% block="sound level"
    //% block.loc.da="lydniveau"
    Sound,
    //% block="light level"
    //% block.loc.da="lysniveau"
    Light,
    //% block="temperature"
    //% block.loc.da="temperatur"
    Temperature,
    //% block="compas direction"
    //% block.loc.da="kompas retning"
    Compas,
    //% block="acceleration"
    //% block.loc.da="acceleration"
    Accel,
    //% block="magnetic strength"
    //% block.loc.da="magnetisk styrke"
    Magnetic,
    //% block="rotation"
    //% block.loc.da="rotation"
    Rotation,
}

/**
 * Custom blocks
 */
//% weight=100 color=#0fbc11 icon=""
//% block="Publish"
//% block.loc.da="Publicer"
namespace publish {
    /**
     * Publishes a sensor value via BlueTooth
     * @param s The sensor to publish
     */
    //% block="publish sensor $s"
    //% block.loc.da="udgiv sensor $s"
    //% jsdoc.loc.da="Udgiv en sensor værdi over BlueTooth"
    //% s.loc.da="Sensoren der skal udgives"
    export function publishSensor(s: SensorEnum): void {
        let btMsg = null;

        switch (s) {
            case SensorEnum.Accel: {
                let x = input.acceleration(Dimension.X);
                let y = input.acceleration(Dimension.Y);
                let z = input.acceleration(Dimension.Z);

                btMsg = "a:" + x + ":" + y + ":" + z;

                break;
            }
            case SensorEnum.Sound: {
                let level = input.soundLevel();

                btMsg = "s:" + level;

                break;
            }
            case SensorEnum.Light: {
                let level = input.lightLevel();

                btMsg = "l:" + level;

                break;
            }
            case SensorEnum.Temperature: {
                let level = input.temperature();

                btMsg = "t:" + level;

                break;
            }
            case SensorEnum.Magnetic: {
                let x = input.magneticForce(Dimension.X);
                let y = input.magneticForce(Dimension.Y);

                btMsg = "m:" + x + ":" + y;

                break;
            }
            case SensorEnum.Compas: {
                let heading = input.compassHeading();

                btMsg = "c:" + heading;

                break;
            }
            case SensorEnum.Rotation: {
                let pitch = input.rotation(Rotation.Pitch);
                let roll = input.rotation(Rotation.Roll);

                btMsg = "r:" + pitch + ":" + roll;

                break;
            }
        }

        if (btMsg != null) {
            sendMessage(btMsg);
        }
    }

    /**
     * Publishes a value via BlueTooth
     * @param v The value to publish
     */
    //% block="publish value $v"
    //% block.loc.da="publicer værdi $v"
    //% jsdoc.loc.da="Udgiv en værdi over BlueTooth"
    //% v.loc.da="Værdien der skal udgives"
    export function publishValue(v: number): void {
        let btMsg = "v:" + v;

        if (btMsg != null) {
            sendMessage(btMsg);
        }
    }

    /**
     *
     * @param address
     * @param values
     */
    //%block="send to unity OscAddress: $address Values: $values"
    export function sendToUnity(address: string, values: number[]) {
        let btMsg = "u:" + address;

        values.forEach((v) => {
            btMsg = btMsg + ":" + v;
        });

        sendMessage(btMsg);
    }

    //Support 100 messages at a time, to prevent threading to mess up fragments
    let msgId = 0;

    function sendMessage(payload:string) {
        let idString = "" + msgId;
        msgId = (msgId + 1) % 100;

        if (idString.length < 2) {
            idString = "0" + idString;
        }
        let header = idString;

        //Full Message form ^msgIdpayload$

        /**
         * Parts:
         * ^01something
         * 01someMoreThing
         * 01theLastThing$
         */

            // The +2 is for $ and ^
        let headerLength = header.length + 2;

        let maxFragmentSize = 20 - headerLength;

        let first = true;

        while (payload.length > 0) {
            //Get as much of the payload as we can fit
            let fragment = payload.slice(0, maxFragmentSize);

            //Construct the bt message
            let btMsg = header + fragment;

            //Reduce the payload we still need to send
            payload = payload.slice(maxFragmentSize);

            if (payload.length == 0) {
                btMsg += "$";
            }

            if (first) {
                first = false;
                btMsg = "^" + btMsg;
            }

            bluetooth.uartWriteLine(btMsg);
        }
    }

    bluetooth.startUartService();
}
