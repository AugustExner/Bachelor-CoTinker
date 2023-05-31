let UART_SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase();
let UART_TX_SERVICE_UUID = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase();
let UART_RX_SERVICE_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E".toLowerCase();

class CaviBT {
    constructor() {
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();

        this.onMessageCallbacks = [];
        this.onDisconnectedCallbacks = [];
        this.msgToSend = null;
        this.readyToSend = false;
        this.currentMessages = new Map();
    }

    async reconnect() {
        const self = this;

        async function tryReconnect() {
            self.server = await self.device.gatt.connect();
            self.service = await self.server.getPrimaryService(UART_SERVICE_UUID);

            self.rx = await self.service.getCharacteristic(UART_RX_SERVICE_UUID);
            self.tx = await self.service.getCharacteristic(UART_TX_SERVICE_UUID);

            self.msgToSend = null;
            self.readyToSend = true;
            self.currentMessages.clear();

            await self.startReading();

            console.log("Connected!");
        }

        for(let i = 0;i<5; i++) {
            try {
                console.log("Attempting connection: " + (i + 1));
                await tryReconnect();
                return true;
            } catch(e) {
                console.log("Error connecting, retrying in 1 sec...", e);
            }

            await new Promise((resolve)=>{
                setTimeout(()=>{
                    resolve();
                }, 1000);
            });
        }

        return false;
    }

    async connect() {
        const self = this;

        console.log("Connecting...");

        let options = {
            filters: [
                {
                    namePrefix: "BBC micro:bit",
                },
            ],
            optionalServices: [UART_SERVICE_UUID]
        };

        this.device = await navigator.bluetooth.requestDevice(options);

        this.device.addEventListener("gattserverdisconnected", async (evt) => {
            let start = Date.now();
            let reconnectSuccess = await self.reconnect();

            if(!reconnectSuccess) {
                self.onDisconnectedCallbacks.forEach((callback) => {
                    callback();
                });
            } else {
                console.log("Connected in: "+(Date.now() - start)+" ms");
            }
        });

        return this.reconnect();
    }

    async disconnect() {
        console.log("Disconnecting...");
        if (this.device?.gatt.connected) {

            await this.tx.stopNotifications();

            this.device.gatt.disconnect();

            this.device = null;
            this.server = null;
            this.service = null;
            this.rx = null;
            this.tx = null;
            this.readyToSend = false;
            this.msgToSend = null;
            this.currentMessages.clear();

            console.log("Done...");
        } else {
            console.log("Already disconnected!")
        }
    }

    startReading() {
        const self = this;

        console.log("Starting reading...")
        return new Promise((resolve)=>{
            this.tx.startNotifications().then((remoteCharacteristics)=>{
                remoteCharacteristics.addEventListener("characteristicvaluechanged", (evt)=>{
                    let msg = this.decoder.decode(evt.target.value).trim();

                    if(msg.length === 0) {
                        return;
                    }

                    //Parse fragments
                    let id = null;
                    let fragmentMessage = null;

                    if(msg.startsWith("^")) {
                        id = msg.substring(1, 3);
                        fragmentMessage = msg.substring(3);
                    } else {
                        id = msg.substring(0, 2);
                        fragmentMessage = self.currentMessages.get(id);
                        fragmentMessage += msg.substring(2);
                    }

                    self.currentMessages.set(id, fragmentMessage);

                    if(fragmentMessage.endsWith("$")) {
                        fragmentMessage = fragmentMessage.substring(0, fragmentMessage.length - 1);
                        //We have complete message

                        //We have whole fragment, send msg to callbacks
                        this.onMessageCallbacks.forEach((callback)=>{
                            callback(fragmentMessage);
                        })

                        self.currentMessages.delete(id);
                    }
                });
                resolve();
            });
        });
    }

    onMessage(callback) {
        this.onMessageCallbacks.push(callback);
    }

    onDisconnected(callback) {
        this.onDisconnectedCallbacks.push(callback);
    }

    doSendInternal() {
        const self = this;

        if(this.readyToSend === false || this.msgToSend == null) {
            return;
        }

        const msg = this.msgToSend;
        this.msgToSend = null;

        this.readyToSend = false;
        this.rx.writeValue(this.encoder.encode(msg+"\n")).then(()=>{
            console.log("Sent:", msg);
            self.readyToSend = true;
            self.doSendInternal();
        }).catch((e)=>{
            console.log("Error sending msg over BT:", e);
            self.readyToSend = true;
            self.doSendInternal();
        });
    }

    send(msg) {
        this.msgToSend = msg;
        this.doSendInternal();
    }

    static async supportsBT() {
        if (!navigator.bluetooth) return false;
        return await navigator.bluetooth.getAvailability();
    }

    isConnected() {
        return this.device != null;
    }
}

window.CaviBT = CaviBT;
