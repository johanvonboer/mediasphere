
import "../assets/loading.svg";
import '../stylesheets/style.scss';
import AWN from 'awesome-notifications';
import 'awesome-notifications/dist/style.css';
import { Dropzone } from "dropzone";
import "dropzone/dist/dropzone.css";
import { MediaSphere } from './MediaSphere';

let presets = [
  {
    name: "Linda B",
    images: [
      "ascrowssing.png",
      "bethwhee.png",
      "blarr.png",
      "calamityoftouch.png",
      "cardgames.png",
      "eyreequel.png",
      "fallen.png",
      "forest.png",
      "goddess.png",
      "hand.png",
      "helium.png",
      "horn.png",
      "ikaril.png",
      "jeir.png",
      "kgdfjkgh.png",
      "mehach.png",
      "lovely.png",
      "vic2.png"
    ]
  },
  {
    name: "SEAD",
    images: [
      'Aquatics.jpg',
      'Carrion.jpg',
      'Coniferous.jpg',
      'Deciduous.jpg',
      'Disturbed_arable.jpg',
      'Dry_dead_wood.jpg',
      'Dung.jpg',
      'Dung_foul_habitats.jpg',
      'Ectoparasite.jpg',
      'General_synanthropic.jpg',
      'Halotolerant.jpg',
      'Heathland_&_moorland.jpg',
      'Meadowland.jpg',
      'Mould_beetles.jpg',
      'Open_wet_habitats.jpg',
      'Pasture_Dung.jpg',
      'Running_water.jpg',
      'Sandy_dry_disturbed_arable.jpg',
      'Standing_water.jpg',
      'Stored_grain_pest.jpg',
      'Wetlands_marshes.jpg',
      'Wood_and_trees.jpg'
    ]
  },
  {
    name: "Video mix",
    images: [
      "mixkit-rain-falling-on-the-water-of-a-lake-seen-up-18312-medium.mp4",
      "mixkit-highway-in-the-middle-of-a-mountain-range-4633-medium (1).mp4",
      "mixkit-forest-stream-in-the-sunlight-529-medium.mp4",
      "mixkit-blue-sky-background-as-the-clouds-travel-blown-by-the-26108-medium.mp4",
      "mixkit-white-sand-beach-background-1564-medium.mp4",
      "mixkit-highway-in-the-middle-of-a-mountain-range-4633-medium.mp4",
      "mixkit-stars-in-space-background-1610-medium.mp4",
      "mixkit-bright-orange-sunset-on-beach-2168-medium.mp4",
      "mixkit-people-pouring-a-warm-drink-around-a-campfire-513-medium.mp4",
      "mixkit-waterfall-in-forest-2213-medium.mp4",
      "mixkit-going-down-a-curved-highway-through-a-mountain-range-41576-medium.mp4",
      "mixkit-countryside-meadow-4075-medium.mp4",
      "mixkit-raft-going-slowly-down-a-river-1218-medium.mp4",
    ]
  },
  {
    name: "Carl-Erik E",
    images: []
  }
];

//place in top right corner
let notifier = new AWN({
  position: 'top-right'
});

// Global variables
const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const videoMimeTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/m4v', 'video/mkv', 'video/wmv'];
const imageFileEndings = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const videoFileEndings = ['.mp4', '.mov', '.avi', '.webm', '.m4v', '.mkv', '.wmv', ''];
const acceptedFiles = imageFileEndings.concat(videoFileEndings);
let loadingPreset = false;
const videosEnabled = true;

let inputMedia = [];
let mediaSphere = null;
let maxFiles = 30;
let filesProcessing = [];

document.addEventListener("DOMContentLoaded", function() {
  let canvasContainer = document.getElementById("threejs-canvas");

  const dropzone = new Dropzone("#dropzone", {
      url: "/dummy-url", // Set a dummy URL to prevent Dropzone from making a server request
      maxFilesize: 500, // MB
      acceptedFiles: acceptedFiles.join(', '),
      addRemoveLinks: true,
      maxFiles: maxFiles,
      autoProcessQueue: false,
      init: function () {

        document.querySelector("#dropzone > div > button").innerHTML = "Images and videos, up to "+maxFiles;

        this.on("maxfilesexceeded", function (file) {
          notifier.alert('You can only add up to '+maxFiles+' files');
          this.removeFile(file);
        });

        this.on("maxfilesreached", function (file) {
        });

        this.on("addedfiles", function (files) {
        });

        this.on("addedfile", function (file) {
          if(dropzone.files.length > maxFiles) {
            return;
          }

          let fileOk = false;
          if(videosEnabled && videoMimeTypes.includes(file.type)) {
            fileOk = true;
          }

          //check that this is a valid mime type
          if(imageMimeTypes.includes(file.type)) {
            fileOk = true;
          }

          if(!fileOk) {
            notifier.alert('There was a problem with '+file.name+'. File type not supported:' + file.type)
            this.removeFile(file);
            return;
          }

          var reader = new FileReader();

          reader.onload = (event) => {
            var imageDataUrl = event.target.result;
            inputMedia.push({
              data: imageDataUrl,
              type: file.type
            });
            //notifier.success('File processing complete: '+file.name);
            this.emit("success", file);
          };
          reader.readAsDataURL(file);
          
        });
  
        this.on("removedfile", function (file) {
          // File removed from the dropzone, handle any necessary cleanup
          //notifier.success('File removed: '+file.name);
          inputMedia.splice(inputMedia.findIndex(i => i.data == file.data), 1);
        });
      },
    });

    document.getElementById("create-btn").addEventListener("click", function() {
      //do nothing if button is disabled
      if(this.disabled) {
        return;
      }

      console.log("create button clicked");
      if(loadingPreset) {
        alert("Please wait for the preset to finish loading");
        return;
      }

      if(inputMedia.length < 1) {
        alert("Please input at least one image or video");
        return;
      }

      let btn = document.getElementById("create-btn");
      btn.classList.add("loading-container");
      btn.innerHTML = "<img src='loading.svg' />";

      mediaSphere = new MediaSphere(inputMedia, {
        imageMimeTypes: imageMimeTypes,
        videoMimeTypes: videoMimeTypes,
      });
      mediaSphere.setup().then(() => {
        document.getElementById("upload-controls").style.display = "none";
        document.getElementById("threejs-canvas").style.display = "block";
        mediaSphere.draw();
      });
    });


    const presetButtons = document.getElementsByClassName("preset-button");
    Array.from(presetButtons).forEach(btn => {
      // Your logic for each button
      btn.addEventListener("click", function() {
        let preset = this.getAttribute("data-preset");
        console.log("preset: " + preset);
        let loadedImages = 0;
        
        presets.forEach(p => {
          if(p.name == preset) {
            if(p.images.length > 0) {
              loadingPreset = true;
              document.getElementById("create-btn").innerHTML = "<img src='loading.svg' />";
            }

            dropzone.removeAllFiles();
            p.images.forEach(image => {
              let xhr = new XMLHttpRequest();
              xhr.open('GET', "https://demo.humlab.umu.se/imagesphere/presets/"+p.name+"/"+image, true);
              xhr.responseType = 'blob';
              xhr.onload = function(e) {
                if (this.status == 200) {
                  // get binary data as a response
                  var blob = this.response;
                  //convert to File type
                  blob.lastModifiedDate = new Date();
                  blob.name = image;
                  dropzone.addFile(blob);
                  loadedImages++;
                  if(loadedImages == p.images.length) {
                    document.getElementById("create-btn").innerHTML = "RENDER";
                    loadingPreset = false;
                  }
                }
              }
              xhr.send();
            });
          }
        });
      });
    });

});

