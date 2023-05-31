class StreamingCanvas {
    constructor(canvas, streamNode) {
        this.canvas = canvas;
        this.streamNode = streamNode;
        let stream;

        this.streamNode.webstrate.signalStream((clientId, accept) =&gt; {
            if (!stream) stream = this.canvas.captureStream(60);
            let meta = { type: "video", title: "Streamed Canvas"};
            let conn = accept(stream, meta, () =&gt; {
                console.log("streaming", stream, "to", clientId);
            });            
        });
    }
}

class ReceivingCanvas {
    constructor(container, streamNode, { width, height }) {
        this.container = container;
        this.streamNode = streamNode;

        this.streamNode.webstrate.on("signalStream", (clientId, meta, accept) =&gt; {
            let conn = accept((stream) =&gt; {
                console.log("Got stream", stream, "from", clientId);
                // clear out the node's contents in case there was
                // already a video playing there
                let video;
                if (this.container.querySelector('video')) {
                    video = this.container.querySelector('video');
                } else {
                    this.container.insertAdjacentHTML('afterbegin', '&lt;video muted="muted" autoplay="autoplay" loop="loop"&gt;&lt;/video&gt;');
                    video = this.container.firstElementChild;
                }
                video.width = width;
                video.height = height;
                video.srcObject = stream;
                video.play();
            });
        })
    }
}

exports.StreamingCanvas = StreamingCanvas;
exports.ReceivingCanvas = ReceivingCanvas;