
import '../assets/mask.png'
import '../assets/ParticleCloudWhite.png'
import '../assets/ParticleCloudBlack.png'
import '../assets/star1.png';
import "../assets/loading.svg";
import '../stylesheets/style.scss';
import p5 from 'p5';
import { Dropzone } from "dropzone";
import "dropzone/dist/dropzone.css";


let canvasWidth = 100;
let canvasHeight = 100;
let maskImage = null;
const rawImages = [];
const images = [];
let hookPoints = [];
let sphereRadius = 500;
let starImage = null;

let globalRotX = 0.0
let globalRotY = 0.0;

let isDragging = false;
let startDragX = 0;
let startDragY = 0;
let previousDragX = 0;
let previousDragY = 0;

let momentumX = 0;
let momentumY = 0;
let dampingFactor = 0.9; // Adjust the damping factor to control the inertia
let maxSpeed = 0.05; // Adjust the maximum speed
let renderDustCloud = true;

let targetRotX = 0.0;
let targetRotY = 0.0;
const mistImages = [];

let sketchContainer = document.getElementById("sketch-container");

function resizeToFullScreen() {
  sketchContainer.style.width = "100vw";
  sketchContainer.style.height = "100vh";
  /*
  let computedWidth = sketchContainer.getBoundingClientRect().width;
  let computedHeight = sketchContainer.getBoundingClientRect().height;
  sketchContainer.setAttribute("width", computedWidth);
  sketchContainer.setAttribute("height", computedHeight);
  */
}

document.addEventListener("DOMContentLoaded", function() {

    const dropzone = new Dropzone("#dropzone", {
        url: "/dummy-url", // Set a dummy URL to prevent Dropzone from making a server request
        maxFilesize: 20, // MB
        acceptedFiles: ".jpg, .png, .gif, .jpeg, .webp",
        addRemoveLinks: true,
        maxFiles: 20,
        autoProcessQueue: false,
        init: function () {

          document.querySelector("#dropzone > div > button").innerHTML = "Feed me images, up to 20";

          this.on("maxfilesexceeded", function (file) {
            this.removeFile(file);
          });
          this.on("addedfile", function (file) {
            console.log("File added:", file)

            //check that this is a valid mime type
            let validMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
            if(!validMimeTypes.includes(file.type)) {
              this.removeFile(file);
              return;
            }

            // File added to the dropzone, handle it in-memory
            var reader = new FileReader();
            reader.onload = (event) => {
              var imageDataUrl = event.target.result;
              rawImages.push(imageDataUrl);
            };
    
            // Read the file as a Data URL
            reader.readAsDataURL(file);
          });
    
          this.on("removedfile", function (file) {
            // File removed from the dropzone, handle any necessary cleanup
            console.log("File removed:", file);
            rawImages.splice(rawImages.indexOf(file.dataURL), 1);
            /*
            if(rawImages.length < 1) {
              console.log("No more images")
              document.getElementById("create-btn").disabled = true;
            }
            */
          });
        },
      });

      document.getElementById("create-btn").addEventListener("click", function() {
        console.log("create button clicked");

        if(rawImages.length < 1) {
          alert("Please feed me at least one image");
          return;
        }

        let btn = document.getElementById("create-btn");
        btn.classList.add("loading-container");
        btn.innerHTML = "<img src='loading.svg' />";

        
        new SeadBubbles(p5, sketch);
        
        sketchContainer.style.display = "none";
      });

});

const sketch = (p5) => {
  p5.preload = () => {
    p5.loadImage('mask.png', (img) => {
      maskImage = img;
      rawImages.forEach(imageDataUrl => {
          p5.loadImage(imageDataUrl, (image => {
              image.mask(maskImage);
              images.push({
                image: image,
                opacity: 128
              });
          }));
      });
    });

    p5.loadImage('ParticleCloudWhite.png', (image) => {
      mistImages.push(image);
    });
    p5.loadImage('ParticleCloudBlack.png', (image) => {
      mistImages.push(image);
    });
    p5.loadImage('star1.png', (image) => {
      starImage = image;
    });
    
  }

  p5.setup = () => {
    document.getElementById("upload-controls").style.display = "none";
    document.getElementById("sketch-container").style.display = "block";

    canvasWidth = p5.windowWidth;
    canvasHeight = p5.windowHeight;
    p5.createCanvas(canvasWidth, canvasHeight, p5.WEBGL, document.getElementById("sketch-container"));
    p5.frameRate(60);
    //p5.ortho();
    p5.rectMode(p5.CENTER);

    let gl = p5._renderer.GL;
    gl.disable(gl.DEPTH_TEST);

    p5.calculateHookPoints();
    /*
    let hookPointsNum = images.length;
    let R = sphereRadius;
      
    for(let i = 0; i < hookPointsNum; i++) {
      let indices = i;
      let num_pts = hookPointsNum;
      let phi = p5.acos(1 - 2*indices/num_pts);
      let theta = p5.PI * (1 + 5**0.5) * indices;

      let x = p5.cos(theta) * p5.sin(phi) * R;
      let y = p5.sin(theta) * p5.sin(phi) * R;
      let z = p5.cos(phi) * R;

      let v = p5.createVector(x, y, z);

      hookPoints.push(v);
    }
    */

    p5.setupDustCloud(canvasWidth, canvasHeight);
  }

  p5.calculateHookPoints = () => {
    hookPoints = [];
    
    let hookPointsNum = images.length;
    let R = sphereRadius;
      
    for(let i = 0; i < hookPointsNum; i++) {
      let indices = i;
      let num_pts = hookPointsNum;
      let phi = p5.acos(1 - 2*indices/num_pts);
      let theta = p5.PI * (1 + 5**0.5) * indices;

      let x = p5.cos(theta) * p5.sin(phi) * R;
      let y = p5.sin(theta) * p5.sin(phi) * R;
      let z = p5.cos(phi) * R;

      let v = p5.createVector(x, y, z);

      hookPoints.push(v);
    }
  }

  p5.draw = () => {
    p5.background(0);
    if(renderDustCloud) {
      p5.renderDustCloud();
    }

    let x = globalRotX;
    let y = globalRotY;

    let rotV = p5.createVector(x, y, 0);
    
    p5.rotateX(rotV.x);
    p5.rotateY(rotV.y);
    
    //p5.fill(255, 0, 0);
    p5.noFill();
    p5.noStroke();
    let imageIndex = 0;
    hookPoints.forEach(hp => {
      p5.push();
      p5.translate(hp);

      let rotatedHP = {
        x: hp.x,
        y: hp.y,
        z: hp.z
      };

      // Apply global rotations manually
      let tempX = rotatedHP.x * Math.cos(globalRotY) - rotatedHP.z * Math.sin(globalRotY);
      let tempZ = rotatedHP.x * Math.sin(globalRotY) + rotatedHP.z * Math.cos(globalRotY);

      rotatedHP.x = tempX;
      rotatedHP.z = tempZ;

      let tempY = rotatedHP.y * Math.cos(globalRotX) - rotatedHP.z * Math.sin(globalRotX);
      rotatedHP.z = rotatedHP.y * Math.sin(globalRotX) + rotatedHP.z * Math.cos(globalRotX);
      rotatedHP.y = tempY;

      images[imageIndex].opacity = p5.map(rotatedHP.z, -sphereRadius, sphereRadius, 0, 255);
      
      p5.texture(images[imageIndex].image);
      p5.tint(255, 255, 255, images[imageIndex].opacity)
      
      p5.rotateY(rotV.y*-1);
      p5.rotateX(rotV.x*-1);
      
      let rectW = 320*3;
      let rectH = 200*3;

      p5.rect(0, 0, rectW, rectH);
      p5.pop();

      imageIndex++;
    });

    // Smoothly transition towards the target rotation
    globalRotY = p5.lerp(globalRotY, targetRotY, 0.1);
    globalRotX = p5.lerp(globalRotX, targetRotX, 0.1);

    // Apply momentum with maximum speed
    momentumX = p5.constrain(momentumX, -maxSpeed, maxSpeed);
    momentumY = p5.constrain(momentumY, -maxSpeed, maxSpeed);

    // Apply momentum
    targetRotY += momentumX;
    targetRotX -= momentumY;

    // Gradually reduce momentum over time
    let minSpin = 0.0005;
    if(momentumX > minSpin || momentumX < -minSpin) {
      momentumX *= dampingFactor;
    }
    if(momentumY > minSpin || momentumY < -minSpin) {
      momentumY *= dampingFactor;
    }

    if(momentumX == 0 && momentumY == 0) {
      momentumX = minSpin;
      momentumY = minSpin;
    }

  }

  p5.touchStarted = () => {
    isDragging = true;
    startDragX = p5.mouseX || p5.touches[0].x;
    startDragY = p5.mouseY || p5.touches[0].y;
    previousDragX = startDragX;
    previousDragY = startDragY;

    momentumX = 0;
    momentumY = 0;
  };

  p5.touchMoved = () => {
    if (isDragging) {
      let currentX = p5.mouseX || p5.touches[0].x; //FIXME - sometimmes missing x or y here
      let currentY = p5.mouseY || p5.touches[0].y;

      let deltaX = currentX - previousDragX;
      let deltaY = currentY - previousDragY;

      // Accumulate momentum
      momentumX += deltaX * 0.005;
      momentumY += deltaY * 0.005;

      previousDragX = currentX;
      previousDragY = currentY;
    }
  };

  p5.touchEnded = () => {
    isDragging = false;
    targetRotX += momentumY;
    targetRotY += momentumX;
  };

  p5.keyPressed = () => {
    console.log(p5.keyCode);

    if(p5.keyCode == 187) {
      sphereRadius += 50;
      p5.calculateHookPoints();
      console.log("sphereRadius: " + sphereRadius);
    }
    if(p5.keyCode == 189) {
      sphereRadius -= 50;
      p5.calculateHookPoints();
      console.log("sphereRadius: " + sphereRadius);
    }

    if(p5.keyCode == 49) {
      //toggle dust cloud
      renderDustCloud = !renderDustCloud;
    }

    if(p5.keyCode == p5.UP_ARROW) {
      targetRotX += 0.1;
    }
    if(p5.keyCode == p5.DOWN_ARROW) {
      targetRotX -= 0.1;
    }
    if(p5.keyCode == p5.LEFT_ARROW) {
      targetRotY += 0.1;
    }
    if(p5.keyCode == p5.RIGHT_ARROW) {
      targetRotY -= 0.1;
    }

    if(p5.keyCode == 32) {
      console.log("spacebar pressed");
      p5.fadeOut = true;
      p5.fadeFrames = 60;
    }
  };

  p5.windowResized = () => {
    // Handle window resize here
    console.log('Window resized!');
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
    // Additional resizing or adjustments can be done here
    resizeToFullScreen();
  };

  p5.setupDustCloud = (canvasWidth, canvasHeight) => {
    let dustParticlesNum = 50;
    p5.dustParticles = [];
    for(let i = 0; dustParticlesNum > i; i++) {
        p5.dustParticles.push({
            x: p5.random(-canvasWidth/2, canvasWidth/2),
            y: p5.random(-canvasWidth/2, canvasHeight/2),
            rotation: p5.random(0, p5.TWO_PI),
            waves: [p5.random(0, p5.PI), p5.random(0, p5.PI), p5.random(0, p5.PI*2)],
            waveMod: [p5.random(0, p5.PI*0.01), p5.random(0, p5.PI*0.01), p5.random(0.01, 0.02)],
            opacity: 1.0
            //image: p5.dustImages[Math.round(p5.random(0, p5.dustImages.length-1))]
        });
    }
}

p5.renderDustCloud = () => {
    p5.dustParticles.forEach(p => {
        p5.push();
        p.x += p5.sin(p.waves[0]) * 0.5;
        p.y += p5.sin(p.waves[1]) * 0.5;
        p.waves[0] += p.waveMod[0];
        p.waves[1] += p.waveMod[1];
        p.waves[2] += p.waveMod[2];
        p5.translate(p.x, p.y);
        //p5.translate(0, 0);
        p5.tint(255, 255, 255, 100);
        p.rotation += p.waveMod[2];
        p5.rotateZ(p.rotation);
        //p5.image(p.image, -50, -50, 100, 100);
        if(p5.fadeOut && p5.fadeFrames > 0) {
            p.opacity = p5.fadeFrames / 60;
        }
        if(p5.fadeOut == false && p5.fadeFrames > 0) {
            p.opacity = p5.map(p5.fadeFrames, 60, 0, 0, 1.0);
        }
        let opacity = Math.abs(p5.sin(p.waves[2]))*60 * p.opacity;
        //if(opacity > 200) { opacity = 150; }
        //p5.fill(255, 255, 255, opacity);
        //p5.ellipse(0, 0, 8, 2);
        p5.tint(255, 255, 255, opacity)
        p5.texture(starImage);
        p5.rect(0, 0, 25, 25);
        p5.pop();
    });
}

}


class SeadBubbles {
  constructor(p5, sketch) {
    this.p5 = new p5(sketch);
  }
}

