class CaviJoy {
    constructor() {
        this.html = document.createElement("canvas");
        this.context = this.html.getContext("2d");

        this.setupTouch();

        this.vectorX = 0;
        this.vectorY = 0;
        this.length = 0;

        this.updateCallbacks = [];
    }

    setupTouch() {
        const self = this;
        let isTouching = false;

        this.html.addEventListener("pointerdown", (evt)=>{
            isTouching = true;
            //Check inside circle?
        });

        window.addEventListener("pointerup", (evt)=>{
            if(isTouching) {
                isTouching = false;
                self.vectorX = 0;
                self.vectorY = 0;
                self.length = 0;
                self.drawJoystick();
                this.sendUpdate();
            }
        });

        window.addEventListener("pointermove", (evt)=>{
            if(isTouching) {
                let bounds = self.html.getBoundingClientRect();

                let centerX = bounds.x + bounds.width / 2.0;
                let centerY = bounds.y + bounds.height / 2.0;

                this.vectorX = (evt.pageX - centerX) / 100.0;
                this.vectorY = (centerY - evt.pageY) / 100.0;

                this.length = Math.sqrt((this.vectorX * this.vectorX) + (this.vectorY * this.vectorY));

                if(this.length > 1) {
                    this.vectorX = this.vectorX / this.length;
                    this.vectorY = this.vectorY / this.length;
                    this.length = 1;
                }

                this.drawJoystick();

                this.sendUpdate();
            }
        });
    }

    onUpdate(callback) {
        this.updateCallbacks.push(callback);
    }

    sendUpdate() {
        this.updateCallbacks.forEach((callback)=>{
            //Rotate vector 45 degrees, to get "correct" coordinates for engines
            let angle = -45;
            let radians = angle * (Math.PI / 180.0);
            let rotatedX = this.vectorX * Math.cos(radians) - this.vectorY * Math.sin(radians);
            let roratedY = this.vectorX * Math.sin(radians) + this.vectorY * Math.cos(radians);

            callback(rotatedX, roratedY, this.length);
        });
    }

    drawJoystick() {
        let bounds = this.html.getBoundingClientRect();

        let size = bounds.width;
        let radius = size / 2.0;

        this.html.width = size;
        this.html.height = size;

        //Clear
        this.context.clearRect(0, 0, size, size);

        //Draw background
        this.context.fillStyle = "darkgray";
        this.context.beginPath();
        this.context.arc(radius, radius, radius, 0, 2 * Math.PI);
        this.context.closePath();
        this.context.fill();

        //Draw Knob
        this.context.fillStyle = "black";
        this.context.strokeStyle = "white";
        this.context.beginPath();
        this.context.arc(radius+this.vectorX * radius * 0.8, radius-this.vectorY * radius * 0.8, 10, 0, 2 * Math.PI);
        this.context.closePath();
        this.context.fill();
    }
}

window.CaviJoy = CaviJoy;