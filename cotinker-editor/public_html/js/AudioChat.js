/* global webstrate, Fragment, WebRTCRecorder, WebstrateComponents, EventSystem */

enqueueAfterLoad(async ()=>{
    const recordingsFragment = Fragment.one("#cotinkerRecordings");


    class AudioChat {
        constructor() {
            const self = this;

            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            this.ourStream = null;
            this.ourAudio = null;
            this.ourSource = null;
            this.ourAnalyserNode = null;
            this.ourAnalyserIntervalId = null;
            this.ourGainNode = null;

            this.streams = new Map();
            this.ourConnections = new Map();

            this.connected = false;

            webstrate.on("signal", (msg, clientId)=>{
                if(msg.cmd === "CoTinker.AudioChat.RequestMuteStatus") {
                    self.sendMuteStatus(clientId);
                } else if(msg.cmd === "CoTinker.AudioChat.MuteStatus") {
                    EventSystem.triggerEvent("CoTinker.AudioChat.MuteStatus", {
                        muted: msg.muted,
                        client: clientId
                    });
                }
            })
        }

        join() {
            try {
                this.listenForStreams();
                this.setupOurStream();

                EventSystem.triggerEvent("CoTinker.AudioChat.UserJoined", {
                    clientId: webstrate.clientId
                });

                console.log("AudioChat enabled!");
            } catch(e) {
                console.error(e);
            }
            this.connected = true;
        }

        getRoom() {
            if(!document.querySelector("body").hasAttribute("data-chat-room-key")) {
                let chatKey = UUIDGenerator.generateUUID("room-");
                console.log("No chatroom key found, creating:", chatKey);
                document.querySelector("body").setAttribute("data-chat-room-key", chatKey, {approved: true});
            }

            return document.querySelector("body").getAttribute("data-chat-room-key");
        }

        leave() {
            try {
                this.stopListeningForStreams();

                if(this.ourStream != null) {
                    document.body.webstrate.stopStreamSignal(this.signalStream);
                    this.ourConnections.forEach((conn) => {
                        conn.close();
                    });

                    this.ourStream.getTracks().forEach(function (track) {
                        track.stop();
                    });

                    clearInterval(this.ourAnalyserIntervalId);
                    this.ourAudio.pause();
                    this.ourSource.disconnect();
                    this.ourAnalyserNode.disconnect();
                    this.ourGainNode.disconnect();
                }

                this.streams.forEach((streamObj) => {
                    streamObj.conn.close();
                    EventSystem.triggerEvent("CoTinker.AudioChat.UserLeft", {
                        clientId: streamObj.clientId
                    });
                });

                if(this.recorder != null) {
                    this.recorder.stopStream();
                    this.recorder.dispose();
                    this.recorder = null;
                }

                if(this.reconnectAttemptTimeoutId != null) {
                    clearTimeout(this.reconnectAttemptTimeoutId);
                    this.reconnectAttemptTimeoutId = null;
                }

                this.streams.clear();
                this.ourConnections.clear();
                this.ourStream = null;

                EventSystem.triggerEvent("CoTinker.AudioChat.UserLeft", {
                    clientId: webstrate.clientId
                });

                console.log("AudioChat disabled!");
            } catch(e) {
                console.error(e);
            }
            this.connected = false;
        }

        isConnected() {
            return this.connected;
        }


        async setupOurStream() {
            const self = this;

            this.ourStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true,
                echoCancellation: true,
                noiseSuppression: true
            });

            if (this.ourStream != null) {
                console.log("Got our stream, start listening for stream requests...");

                this.ourAudio = document.createElement("audio");
                this.ourSource = this.audioCtx.createMediaStreamSource(this.ourStream);
                this.ourGainNode = this.audioCtx.createGain();
                this.ourAnalyserNode = this.audioCtx.createAnalyser();

                this.ourAudio.srcObject = this.ourStream;
                this.ourAudio.muted = true;

                this.ourSource.connect(this.ourAnalyserNode);
                this.ourAnalyserNode.connect(this.ourGainNode);
                this.ourGainNode.connect(this.audioCtx.destination);

                //Make sure we dont hear ourselves
                this.ourGainNode.gain.value = 0;

                this.ourAnalyserNode.smoothingTimeConstant = 0.2;
                this.ourAnalyserNode.fftSize = 1024;

                const dataArray = new Uint8Array(this.ourAnalyserNode.frequencyBinCount);

                let currentlySpeaking = false;

                this.ourAnalyserIntervalId = setInterval(()=>{
                    self.ourAnalyserNode.getByteFrequencyData(dataArray);
                    let values = 0;

                    for (let i = 0; i < dataArray.length; i++) {
                        values += (dataArray[i]);
                    }
                    const average = (values / dataArray.length) * 10;

                    if(average > 10 && !currentlySpeaking) {
                        currentlySpeaking = true;
                        EventSystem.triggerEvent("CoTinker.AudioChat.Speaking", {
                            clientId: webstrate.clientId
                        });
                    } else if(average < 10 && currentlySpeaking) {
                        currentlySpeaking = false;
                        EventSystem.triggerEvent("CoTinker.AudioChat.Silent", {
                            clientId: webstrate.clientId
                        });
                    }
                }, 250);

                //Setup mute state
                this.setMuted(AudioChat.muted);

                this.joinRecording();

                this.signalStream = (clientId, accept) => {
                    if (clientId === webstrate.clientId) {
                        return;
                    }

                    const conn = accept(self.ourStream);

                    console.log("Connected user to our stream:", clientId);

                    self.ourConnections.set(clientId, conn);
                    conn.onclose(() => {
                        self.ourConnections.delete(clientId);
                    });
                };

                document.body.webstrate.signalStream(this.signalStream);
            } else {
                console.warn("No stream found, did user accept permission to use mic?")
            }
        }

        joinRecording() {
            const self = this;

            if(this.recorder == null) {
                this.recorder = new WebRTCRecorder("wss://stream.cavi.au.dk/recorder");
            }

            let serverTURN = "turn://video:strate@stream.cavi.au.dk:3478";

            let chatKey = this.getRoom();

            this.recorder.disconnectCallback = ()=>{
                console.log("Recording died!");
                self.recorder.dispose();
                self.recorder = null;

                //Attempt to rejoin recording in 500ms
                self.reconnectAttemptTimeoutId = setTimeout(()=>{
                    self.joinRecording();
                }, 500);
            }

            this.recorder.sendStream(this.ourStream, chatKey, {
                serverTURN: serverTURN
            }).then((recordingUrl)=>{
                console.log("Recording joined!");
                recordingsFragment.require().then((recordings)=>{
                    if(recordings.find((recording)=> {
                        return recording.url === recordingUrl;
                    }) == null) {
                        recordings.push({
                            url:recordingUrl,
                            timestamp: Date.now()
                        });
                        recordingsFragment.raw = JSON.stringify(recordings, null, 2);
                    }
                });
            });
        }

        setMuted(muted) {
            if(this.ourStream != null) {
                this.ourStream.getTracks()[0].enabled = !muted;
            }
            this.muted = muted;
            this.sendMuteStatus();
            EventSystem.triggerEvent("CoTinker.AudioChat.MuteStatus", {
                muted: this.muted,
                client: webstrate.clientId
            });
        }

        requestMuteStatus(clientId) {
            webstrate.signal({
                cmd: "CoTinker.AudioChat.RequestMuteStatus"
            }, [clientId]);
        }

        sendMuteStatus(clientId=null) {
            if(clientId == null) {
                webstrate.signal({
                    cmd: "CoTinker.AudioChat.MuteStatus",
                    muted: this.muted
                });
            } else {
                webstrate.signal({
                    cmd: "CoTinker.AudioChat.MuteStatus",
                    muted: this.muted
                }, [clientId]);
            }
        }

        stopListeningForStreams() {
            document.body.webstrate.off("signalStream", this.onSignalStream);
        }

        listenForStreams() {
            const self = this;

            this.onSignalStream = (clientId, meta, accept) => {
                if (clientId === webstrate.clientId) {
                    return;
                }

                console.log("Found stream from user:", clientId);

                let oldStreamFromClient = self.streams.get(clientId);
                if(oldStreamFromClient != null) {
                    oldStreamFromClient.conn.close();
                }

                const conn = accept((stream) => {
                    let streamObj = {
                        stream: stream,
                        source: self.audioCtx.createMediaStreamSource(stream),
                        gainNode: self.audioCtx.createGain(),
                        analyzerNode: self.audioCtx.createAnalyser(),
                        conn: conn,
                        audio: document.createElement("audio"),
                        muted: -1,
                        clientId: clientId,
                        analyzeIntervalId: null
                    };

                    self.streams.set(clientId, streamObj);

                    streamObj.audio.srcObject = stream;
                    streamObj.audio.muted = true;

                    streamObj.source.connect(streamObj.gainNode);
                    streamObj.gainNode.connect(streamObj.analyzerNode);
                    streamObj.analyzerNode.connect(self.audioCtx.destination);

                    streamObj.analyzerNode.smoothingTimeConstant = 0.2;
                    streamObj.analyzerNode.fftSize = 1024;

                    const dataArray = new Uint8Array(streamObj.analyzerNode.frequencyBinCount);

                    let currentlySpeaking = false;

                    streamObj.analyzeIntervalId = setInterval(()=>{
                        streamObj.analyzerNode.getByteFrequencyData(dataArray);
                        let values = 0;

                        for (let i = 0; i < dataArray.length; i++) {
                            values += (dataArray[i]);
                        }
                        const average = (values / dataArray.length) * 10;

                        if(average > 10 && !currentlySpeaking) {
                            currentlySpeaking = true;
                            EventSystem.triggerEvent("CoTinker.AudioChat.Speaking", {
                                clientId: clientId
                            });
                        } else if(average < 10 && currentlySpeaking) {
                            currentlySpeaking = false;
                            EventSystem.triggerEvent("CoTinker.AudioChat.Silent", {
                                clientId: clientId
                            });
                        }
                    }, 250);

                    EventSystem.triggerEvent("CoTinker.AudioChat.UserJoined", {
                        clientId: clientId
                    });

                    self.requestMuteStatus(clientId);

                    conn.onclose(() => {
                        let streamObj = self.streams.get(clientId);

                        if(streamObj != null) {
                            self.streams.delete(clientId);

                            //Do some cleaning?
                            clearInterval(streamObj.analyzeIntervalId);

                            streamObj.gainNode.disconnect();
                            streamObj.source.disconnect();
                            streamObj.analyzerNode.disconnect();

                            streamObj.audio.pause();

                            EventSystem.triggerEvent("CoTinker.AudioChat.UserLeft", {
                                clientId: clientId
                            });
                        }
                    });
                });
            };

            document.body.webstrate.on("signalStream", this.onSignalStream);
        }

        getVolume(clientId) {
            let streamObj = this.streams.get(clientId);

            if(streamObj != null) {
                return streamObj.gainNode.gain.value * 100.0;
            }

            return -1;
        }

        setVolume(clientId, volume) {
            let streamObj = this.streams.get(clientId);

            if(streamObj != null) {
                streamObj.gainNode.gain.value = volume;

                console.log("Volume set:", clientId, volume);
            }

            return -1;
        }
    }

    window.setupAudioChat = () => {
        AudioChat.muted = false;

        window.AudioChat = AudioChat;
        let callButton = document.querySelector("button.callButton");
        let muteButton = document.querySelector("button.muteButton");

        callButton.addEventListener("click", () => {
            if(AudioChat.instance == null) {
                AudioChat.instance = new AudioChat();
            }

            if (callButton.matches(".startCall")) {
                if (!AudioChat.instance.isConnected()) {
                    AudioChat.instance.join();
                    callButton.classList.remove("startCall");
                    callButton.classList.add("endCall");
                }
            } else if (callButton.matches(".endCall")) {
                if (AudioChat.instance.isConnected()) {
                    AudioChat.instance.leave();
                    callButton.classList.remove("endCall");
                    callButton.classList.add("startCall");
                }
            }
        });

        muteButton.addEventListener("click", ()=>{
            AudioChat.muted = !AudioChat.muted;

            if(AudioChat.instance != null && AudioChat.instance.isConnected()) {
                AudioChat.instance.setMuted(AudioChat.muted);
            }

            if(AudioChat.muted) {
                muteButton.classList.add("muted");
            } else {
                muteButton.classList.remove("muted");
            }
        });
    }
});
