import '../assets/mask.png'
import '../assets/ParticleCloudWhite.png'
import '../assets/ParticleCloudBlack.png'
import '../assets/star1.png';
import "../assets/loading.svg";
import '../stylesheets/style.scss';
import * as THREE from 'three';

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

let targetRotX = 0.0;
let targetRotY = 0.0;

let mediaList = [];
let mistImages = [];
var scene, camera, renderer;
var maskTexture, starImage;
var textureLoader = new THREE.TextureLoader();
let sphereRadius = 8;
let imageScale = 15.0;
//dust cloud settings
let fadeOut = true;
let fadeFrames = 60;

export class MediaSphere {
    constructor(inputMedia, config) {
      this.inputMedia = inputMedia;
      this.config = config;
      this.config.renderDustCloud = false;
      this.hookPoints = [];
      this.dustParticles = [];

          // Handle window resize
      window.addEventListener('resize', () => {
        console.log("resize")
        var newWidth = window.innerWidth;
        var newHeight = window.innerHeight;

        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(newWidth, newHeight);
      });
    }
  
    async setup() {
      // Load mask image
      maskTexture = await new Promise((resolve, reject) => {
        textureLoader.load('mask.png', function (texture) {
          resolve(texture);
        });
      });
  
      // Loop through inputMedia
      for(let key in this.inputMedia) {
        let media = this.inputMedia[key];
        // Check if it's an image
        if (this.config.imageMimeTypes.includes(media.type)) {
          await new Promise((resolve, reject) => {
            textureLoader.load(media.data, function (image) {
              //image.mask(maskImage);
              mediaList.push({
                image: image,
                opacity: 128
              });
              resolve();
            });
          });
        }
  
        // Check if it's a video
        if (this.config.videoMimeTypes.includes(media.type)) {
          var video = document.createElement('video');
          video.src = media.data;
          video.muted = true;
          video.loop = true;
          video.play();
  
          // Create a video texture
          var videoTexture = new THREE.VideoTexture(video);

          //wait for video to intialize
          await new Promise((resolve, reject) => {
            videoTexture.image.addEventListener('loadeddata', () => {
              resolve();
            });
          });
  
          mediaList.push({
            video: video,
            image: videoTexture,
            opacity: 128
          });
        }
      }
  
      // Load additional images
      let p1 = new Promise((resolve, reject) => {
        textureLoader.load('ParticleCloudWhite.png', function (image) {
          mistImages.push(image);
          resolve();
        });
      });
  
      let p2 = new Promise((resolve, reject) => {
        textureLoader.load('ParticleCloudBlack.png', function (image) {
          mistImages.push(image);
          resolve();
        });
      });
  
      let p3 = new Promise((resolve, reject) => {
        textureLoader.load('star1.png', function (image) {
          starImage = image;
          starImage.colorSpace = THREE.SRGBColorSpace;
          resolve();
        });
      });
      
      await Promise.all([p1, p2, p3]);
  
      // Set up scene, camera, and renderer
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      
      // Specify the canvas for rendering
      renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('threejs-canvas') });
      //renderer.depthTest = false;
      renderer.sortObjects = false;
      renderer.setSize(window.innerWidth, window.innerHeight);
  
      // Set the camera position
      camera.position.z = 10;
  
      this.calculateHookPoints();
  
      mediaList.forEach((media) => {
        //media.position = vectors.shift();
        if(!media.image) {
          console.log("no image");
          return;
        }
        // Create a custom material that combines the main texture with the mask texture
        media.image.colorSpace = THREE.SRGBColorSpace;
        media.material = new THREE.ShaderMaterial({
          uniforms: {
            mainTexture: { value: media.image },
            maskTexture: { value: maskTexture },
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D mainTexture;
            uniform sampler2D maskTexture;
            varying vec2 vUv;
            void main() {
              vec4 mainColor = texture2D(mainTexture, vUv);
              vec4 maskColor = texture2D(maskTexture, vUv);
              gl_FragColor = vec4(mainColor.rgb, maskColor.a);
            }
          `,
          transparent: true,
          depthTest: false,
        });
        
        let mediaWidth = 0;
        let mediaHeight = 0;
        if(media.video) {
          mediaWidth = media.image.source.data.videoWidth;
          mediaHeight = media.image.source.data.videoHeight;
        }
        else {
          mediaWidth = media.image.source.data.width;
          mediaHeight = media.image.source.data.height;
        }
        
        let aspectRatio = mediaWidth / mediaHeight;
        let rectW = imageScale;
        let rectH = imageScale;
    
        if (aspectRatio > 1) {
          rectH = rectW / aspectRatio;
        } else {
          rectW = rectH * aspectRatio;
        }

  
        media.geometry = new THREE.PlaneGeometry(rectW, rectH);
        media.plane = new THREE.Mesh(media.geometry, media.material);
  
        media.plane.position.x = media.position.x;
        media.plane.position.y = media.position.y;
        media.plane.position.z = media.position.z;
        const cameraRotation = camera.rotation.clone();
        media.plane.rotation.set(cameraRotation.x, cameraRotation.y, cameraRotation.z);
  
        scene.add(media.plane);
      });
  
  
      this.bindInputEvents();
      
      if(this.config.renderDustCloud) {
        this.setupDustCloud(window.innerWidth, window.innerHeight);
      }
  
    }
  
    draw() {
      requestAnimationFrame(() => {
        this.draw();
      });
  
      mediaList.forEach((media) => {
        
        //set position
        media.plane.position.x = media.position.x;
        media.plane.position.y = media.position.y;
        media.plane.position.z = media.position.z;
        const cameraRotation = camera.rotation.clone();
        media.plane.rotation.set(cameraRotation.x, cameraRotation.y, cameraRotation.z);

        //set opacity
        //media.material.opacity = media.opacity / 255.0;
      });

      if (this.config.renderDustCloud) {
        this.renderDustCloud();
      }

      
      
      // Smoothly transition towards the target rotation
      globalRotY = THREE.MathUtils.lerp(globalRotY, targetRotY, 0.1);
      globalRotX = THREE.MathUtils.lerp(globalRotX, targetRotX, 0.1);
    
      // Apply momentum with maximum speed
      momentumX = Math.min(Math.max(momentumX, -maxSpeed), maxSpeed);
      momentumY = Math.min(Math.max(momentumY, -maxSpeed), maxSpeed);
    
      // Apply momentum
      targetRotY += momentumX;
      targetRotX -= momentumY;
    
      // Gradually reduce momentum over time
      let minSpin = 0.0005;
      if (momentumX > minSpin || momentumX < -minSpin) {
        momentumX *= dampingFactor;
      }
      if (momentumY > minSpin || momentumY < -minSpin) {
        momentumY *= dampingFactor;
      }
    
      if (momentumX === 0 && momentumY === 0) {
        momentumX = minSpin;
        momentumY = minSpin;
      }
  
      //rotate camera around scene
      camera.position.x = 0;
      camera.position.y = 0;
      camera.position.z = 0;
      camera.lookAt(0, 0, 0);
      camera.rotation.y = globalRotY;
      camera.rotation.x = globalRotX;
      camera.translateZ(sphereRadius+5);
      
      // Render the scene
      renderer.render(scene, camera);
    }

    setupDustCloud(canvasWidth, canvasHeight) {
      const dustParticlesNum = 50;
      this.dustParticles = [];
    
      const spriteMaterial = new THREE.SpriteMaterial({
        color: 0xffffff,
        map: starImage, // You can replace this with your desired texture
        transparent: true,
        depthTest: false
      });

      //spriteMaterial.sizeAttenuation = false;

      this.dustCloudContainer = new THREE.Object3D(); // Create a container for the dust particles
    
      let spreadFactor = 10.0;

      for (let i = 0; i < dustParticlesNum; i++) {
        const particle = new THREE.Sprite(spriteMaterial);
        particle.scale.set( 2, 2, 1 );
        particle.position.set(
          THREE.MathUtils.randFloat(-1 * spreadFactor, 1 * spreadFactor),
          THREE.MathUtils.randFloat(-1 * spreadFactor, 1 * spreadFactor),
          THREE.MathUtils.randFloat(0, 5)
        );
    
        const waves = [
          THREE.MathUtils.randFloat(0, Math.PI),
          THREE.MathUtils.randFloat(0, Math.PI),
          THREE.MathUtils.randFloat(0, Math.PI * 2),
          THREE.MathUtils.randFloat(0, 1.0),
        ];
    
        const waveMod = [
          THREE.MathUtils.randFloat(0, Math.PI * 0.01),
          THREE.MathUtils.randFloat(0, Math.PI * 0.01),
          THREE.MathUtils.randFloat(0.01, 0.02),
          THREE.MathUtils.randFloat(0.01, 0.02),
        ];
    
        particle.data = {
          waves,
          waveMod,
          opacity: THREE.MathUtils.randFloat(0, 1.0),
        };
    
        this.dustParticles.push(particle);
        this.dustCloudContainer.add(particle); // Add each particle to the container
      }
    
      scene.add(this.dustCloudContainer); // Add the container to the scene
    }
    
    
    renderDustCloud() {
      const reverseCameraPos = camera.position.clone().negate(); // Reverse of the camera's position

      this.dustCloudContainer.lookAt(reverseCameraPos); // Make the dust cloud face the camera
      
      this.dustParticles.forEach(p => {
        //p.position.add(reverseCameraPos);
        const movementScale = 0.01;
        p.position.x += Math.sin(p.data.waves[0]) * movementScale;
        p.position.y += Math.sin(p.data.waves[1]) * movementScale;
        p.data.waves[0] += p.data.waveMod[0];
        p.data.waves[1] += p.data.waveMod[1];
        p.data.waves[2] += p.data.waveMod[2];
    
        //p.rotation.z += p.data.waveMod[2];
    
        const opacityModifier = 60;
        const fadeFrames = 60;
    
        if (fadeOut && fadeFrames > 0) {
          p.material.opacity = fadeFrames / 60;
        }
    
        if (!fadeOut && fadeFrames > 0) {
          p.material.opacity = (fadeFrames / 60) * 1.0;
        }

        //p.data.opacity = p.data.waves[3] += p.data.waveMod[3];
        p.data.opacity = Math.sin(p.data.waves[3] += p.data.waveMod[3]);

        //const opacity = Math.abs(Math.sin(p.data.waves[2])) * opacityModifier * p.material.opacity;
        const opacity = p.data.opacity;
        p.material.transparent = true;
        p.material.opacity = opacity;
        
        //p.position.sub(reverseCameraPos);
      });
      
    }
    
    
    
    // Function to handle mouse down event
    onMouseDown(event) {
      this.startDragging(event.clientX, event.clientY);
    }
  
    // Function to handle mouse move event
    onMouseMove(event) {
      if (isDragging) {
        this.updateDrag(event.clientX, event.clientY);
      }
    }
  
    // Function to handle mouse up event
    onMouseUp() {
      this.endDragging();
    }
  
    // Function to handle touch start event
    onTouchStart(event) {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        this.startDragging(touch.clientX, touch.clientY);
      }
    }
  
    // Function to handle touch move event
    onTouchMove(event) {
      if (isDragging && event.touches.length === 1) {
        const touch = event.touches[0];
        this.updateDrag(touch.clientX, touch.clientY);
      }
    }
  
    // Function to handle touch end event
    onTouchEnd() {
      this.endDragging();
    }
  
    // Common function to start dragging
    startDragging(x, y) {
      isDragging = true;
      startDragX = x;
      startDragY = y;
      previousDragX = startDragX;
      previousDragY = startDragY;
      momentumX = 0;
      momentumY = 0;
    }
  
    // Common function to update dragging
    updateDrag(x, y) {
      let deltaX = x - previousDragX;
      let deltaY = y - previousDragY;
  
      // Accumulate momentum
      momentumX += deltaX * 0.005;
      momentumY += deltaY * 0.005;
  
      previousDragX = x;
      previousDragY = y;
    }
  
    // Common function to end dragging
    endDragging() {
      isDragging = false;
      targetRotX += momentumY;
      targetRotY += momentumX;
    }
  
    calculateHookPoints() {
      this.hookPoints = [];
    
      let hookPointsNum = mediaList.length;
      let R = sphereRadius;
    
      for (let i = 0; i < hookPointsNum; i++) {
        let indices = i;
        let num_pts = hookPointsNum;
        let phi = Math.acos(1 - 2 * indices / num_pts);
        let theta = Math.PI * (1 + Math.sqrt(5)) * indices;
    
        let x = Math.cos(theta) * Math.sin(phi) * R;
        let y = Math.sin(theta) * Math.sin(phi) * R;
        let z = Math.cos(phi) * R;
    
        let v = new THREE.Vector3(x, y, z);
    
        this.hookPoints.push(v);
      }

      let vectors = this.hookPoints;
      mediaList.forEach((media) => {
        media.position = vectors.shift();
      });
    }

    bindInputEvents() {
      document.addEventListener('mousedown', (evt) => { this.onMouseDown(evt); });
      document.addEventListener('mousemove', (evt) => { this.onMouseMove(evt); });
      document.addEventListener('mouseup', (evt) => { this.onMouseUp(evt); });
      document.addEventListener('touchstart', (evt) => { this.onTouchStart(evt); });
      document.addEventListener('touchmove', (evt) => { this.onTouchMove(evt); });
      document.addEventListener('touchend', (evt) => { this.onTouchEnd(evt); });

      document.addEventListener('keydown', (event) => {
        console.log(event.key);
      
        if (event.key === '+') {
          // Key '+': Increase sphere radius
          sphereRadius += 0.5;
          this.calculateHookPoints();
          console.log("sphereRadius: " + sphereRadius);
        }
      
        if (event.key === '-') {
          // Key '-': Decrease sphere radius
          sphereRadius -= 0.5;
          this.calculateHookPoints();
          console.log("sphereRadius: " + sphereRadius);
        }

        if (event.key === '?') {
          // Key '+': Increase sphere radius
          imageScale += 0.5;

          mediaList.forEach((media) => {
            media.geometry.scale(1.1, 1.1, 1);
          });

          console.log("imageScale: " + imageScale);
        }
      
        if (event.key === '_') {
          // Key '-': Decrease sphere radius
          mediaList.forEach((media) => {
            media.geometry.scale(0.9, 0.9, 1);
          });
          console.log("imageScale: " + imageScale);
        }
      
        if (event.key === '1') {
          // Key '1': Toggle dust cloud
          this.config.renderDustCloud = !this.config.renderDustCloud;
          console.log("renderDustCloud: " + this.config.renderDustCloud);
        }

        if (event.key === '2') {
          //toggle all images
          mediaList.forEach((media) => {
            media.plane.visible = !media.plane.visible;
          });
        }
      
        if (event.key === 'ArrowUp') {
          // Arrow Up: Increase targetRotX
          targetRotX += 0.2;
        }
        if (event.key === 'ArrowDown') {
          // Arrow Down: Decrease targetRotX
          targetRotX -= 0.2;
        }
        if (event.key === 'ArrowLeft') {
          // Arrow Left: Increase targetRotY
          targetRotY += 0.2;
        }
        if (event.key === 'ArrowRight') {
          // Arrow Right: Decrease targetRotY
          targetRotY -= 0.2;
        }
      
        if (event.key === ' ') {
          // Spacebar: Log message and trigger fade out
          console.log("spacebar pressed");
          fadeOut = true;
          fadeFrames = 60;
        }
      });
    }
    
  }