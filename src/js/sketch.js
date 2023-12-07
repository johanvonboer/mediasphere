import p5 from 'p5';

class Sketch {
    constructor() {
        this.p5Instance = new p5(this, document.getElementById("sketch-container"));
        console.log(this.p5Instance);

        this.p5Instance.preload = () => {
        }

        this.p5Instance.setup = () => {
            console.log("sketch setup");
        }
    
        this.p5Instance.draw = () => {
            console.log("sketch draw");
        }

    }

    
}

export default Sketch;