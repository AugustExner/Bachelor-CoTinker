enum PlayerType {
    Ball = 1,
    Drone = 2,
    Light = 3
}

enum AccelerometerAxis {
    X,
    Y,
    Z
}

//% icon="\uf466" color="#FFD700" weight=100
namespace Unity {

    export function playerType(player: PlayerType) {
        return player;
    }

    /**
     *
     * @param force_x
     * @param force_z
     */
    //% block="Move the player. Horizontal: $force_x Vertical: $force_z"
    export function move(force_x: number, force_z: number) {
        publish.sendToUnity("/addForce", [force_x, force_z]);
        //publish.sendToUnity("/addForce", [Math.map(input.acceleration(Dimension.X), 0, 1023, 0, force_x), Math.map(input.acceleration(Dimension.Y) * -1, 0, 1023, 0, force_z)]);
    }

    /**
     * Return the current acceleration on the selected axis mapped between 0 and speed
     * @param axis
     * @param speed
     */
    //% block="Accelerometer. Axis: $axis Speed: $speed"
    export function acceleration(axis: AccelerometerAxis, speed: number) {
        switch (axis) {
            case AccelerometerAxis.X: return Math.map(input.acceleration(Dimension.X), 0, 1023, 0, speed);
            case AccelerometerAxis.Y: return Math.map(input.acceleration(Dimension.Y) * -1, 0, 1023, 0, speed);
            case AccelerometerAxis.Z: return Math.map(input.acceleration(Dimension.Z), 0, 1023, 0, speed);
        }
        return 0;
    }

    /**
     * Return the current light level mapped between -speed and speed
     * @param speed
     */
    //% block="Light level. Speed: $speed"
    export function lightLevel(speed: number) {
        return Math.map(input.lightLevel(), 0, 256, -speed, speed);
    }

    /**
     * Return the current audio level mapped between 0 and 1
     */
    //% block
    export function audioLevel() {
        return Math.map(input.soundLevel(), 0, 255, 0, 1);
    }

    /**
     * Makes the player jump if the player type is 'Ball'
     */
    //% block
    //% force_y.defl=250 force_y.min=0 force_y.max=500
    export function jump(force_y: number) {
        publish.sendToUnity("/jump", [force_y]);
    }

    /**
     * Makes the player shoot if the player type is either 'Drone' og 'Ball'
     */
    //% block="Shoot"
    export function shoot() {
        publish.sendToUnity("/shoot", []);
    }

    /**
     * Creates the player in the game
     */
    //% block
    export function createPlayer(playerType: PlayerType) {
        publish.sendToUnity("/destroy", []);
        pause(100);
        publish.sendToUnity("/create", [playerType]);
    }
}
