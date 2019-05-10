var gl, pCanvas; // Palette
var curr_r = 0, curr_g = 0, curr_b = 0;
var useDropper = false;
var useDropperOnCanvas = false;
var addingDish = false;
var id = 0; // incremented with each new dish
var curr_dish_id = null;
var retrieveDish_id = null;
var movedBlob = false;
var curr_drawing_id = null;
var colorChange = false;
var drawingOnCanvas  = true;
var curr_swatchCoord_x = null;
var curr_swatchCoord_y = null;
var coord_x = null;
var coord_y = null;
var blob_id = 0;
var moveEnabled = true;
var alreadyClickedMarker = false;
var swatchFromHistory = false;
var deleteBlob = false;
var stroke = [];
var strokes = [];
var pixel_index;
var changedStrokes = new Map();
var previousStrokeIndicesLength = 0;
var drawingHistory = [];
var mixingCanvas = document.getElementById('mixing');
/*Palette boundaries*/
var offsetTop = 300, offsetLeft = 75;
var topBoundary = 0, leftBoundary = 0, bottomBoundary = mixingCanvas.height*2, rightBoundary = mixingCanvas.width*2;
var newTop = offsetTop, newLeft = offsetLeft, newBottom = mixingCanvas.height*2 + offsetTop, newRight = mixingCanvas.width*2 + offsetLeft;
var swatchHeight = 40;
var swatchWidth = 1;
var prevSwatchColor = null;
var interactedWithPalette = false;
/*history wheel*/
var theta = 0;
var r = 170;
var step = 5;
var rotDegree = 90;

/************** Initialize drawing canvas *******************/
var drawingCanvas = document.getElementById('myCanvas');
drawingCanvas.width = window.innerWidth;
drawingCanvas.height = window.innerHeight;
var ctx = drawingCanvas.getContext('2d');
const imgData = ctx.createImageData(1440, 740);

var j = 0;
var pixels = [1440*740];

// Iterate through every pixel
for (let i = 0; i < imgData.data.length; i += 4) {
  imgData.data[i + 0] = 255;        // R value
  imgData.data[i + 1] = 255;        // G value
  imgData.data[i + 2] = 255;        // B value
  imgData.data[i + 3] = 0;          // A value
  pixels[j++] = {                   // store pix
    dish_id: null,
    color: 'white',
    swatchCoord_x: null, // coordinates of swatch color
    swatchCoord_y: null,
    coord_x: null, // coordinates of swatch marker
    coord_y: null
  };
}
ctx.putImageData(imgData, 0, 0);

var mouse = {x: 0, y: 0};
drawingCanvas.addEventListener('mousemove', function(e) {
  mouse.x = e.pageX - this.offsetLeft;
  mouse.y = e.pageY - this.offsetTop;
}, false);

/********* Brush slider *****************************************/
var slider = document.getElementById("myRange");
// var output = document.getElementById("demo");
slider.oninput = function() {
  var brushSize = document.getElementById('brush-size');
  brushSize.style.width = this.value + 'px';
}

ctx.lineWidth = slider.value;
ctx.lineJoin = 'round';
ctx.lineCap = 'round';
ctx.strokeStyle = 'black';

/********* JS color swatch picker *****************************************/
function update(picker) {
    interactedWithPalette = false;
    curr_r = picker.rgb[0];
    curr_g = picker.rgb[1];
    curr_b = picker.rgb[2];
    var currentColor = document.getElementById('currentColor');
    currentColor.style.backgroundColor = 'rgb(' + curr_r + ',' + curr_g + ',' + curr_b + ')';
}

/*************** Make palette draggable **************************/
dragElement(document.getElementById("mydiv"));

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "header")) {
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = elmnt.offsetTop - pos2 + "px";
    elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    offsetTop = elmnt.offsetTop - pos2;
    offsetLeft = elmnt.offsetLeft - pos1;
    newLeft = leftBoundary + offsetLeft;
    newRight = rightBoundary + offsetLeft;
    newTop = topBoundary + offsetTop;
    newBottom = bottomBoundary + offsetTop;
  }
}

/************** Drawing canvas mouse events ********************************/
drawingCanvas.addEventListener('mousedown', function(e) {
  var i = mouse.x + (mouse.y * window.innerWidth);
  if (addingDish === true) {
    retrieveDish_id = pixels[i].dish_id;
    if (retrieveDish_id !== null) {
      palette.addDishToPalette(retrieveDish_id);
      palette.moveSwatchMarker(pixels[i].coord_x, pixels[i].coord_y);
    }
  } else {
    if (!useDropperOnCanvas && !swatchFromHistory) {
      ctx.lineWidth = slider.value;
      ctx.beginPath();
      drawingOnCanvas = true;
      ctx.strokeStyle = 'rgb(' + curr_r + ',' + curr_g + ',' + curr_b + ')';
      var buffer = ctx.lineWidth/2;// buffer to fill in top and bottom of pixel
      for (var l = i - 720*buffer; l <= i + 720*buffer; l += 720) {// TOP DOWN
        for (var k = l - buffer; k <= l + buffer; k++) { //LEFT RIGHT
          if (k >= 0 || k <= 720*740 - 4) { // check for out of bounds
            imgData.data[k*4 + 0] = curr_r;
            imgData.data[k*4 + 1] = curr_g;
            imgData.data[k*4 + 2] = curr_b;
            imgData.data[k*4 + 3] = 255;
            // store pixel data
            pixels[k].color = [curr_r, curr_g, curr_b];
            if (interactedWithPalette === false) {
              pixels[k].dish_id = null;
            } else {
              pixels[k].dish_id = curr_drawing_id;
            }
            pixels[k].coord_x = coord_x;
            pixels[k].coord_y = coord_y;
            if (curr_swatchCoord_x !== null) {
              pixels[k].swatchCoord_x = curr_swatchCoord_x;
              pixels[k].swatchCoord_y = curr_swatchCoord_y;
            }
          }
        }
      }
      ctx.moveTo(mouse.x, mouse.y);
      stroke.push({ x: mouse.x, y: mouse.y });
    }
  }
  drawingCanvas.addEventListener('mousemove', onPaint, false);
}, false);

drawingCanvas.addEventListener('mouseup', function(e) {
    drawingCanvas.removeEventListener('mousemove', onPaint, false);
    drawingOnCanvas = false;
    swatchFromHistory = false;
    if (!addingDish && !useDropperOnCanvas && !swatchFromHistory) {
      ctx.lineTo(mouse.x, mouse.y);
      ctx.stroke();
      if (interactedWithPalette === false) {
        var stroke_obj = { dish_id: null, color: {r: curr_r, g: curr_g, b: curr_b}, swatchCoord_x: null, swatchCoord_y: null, stroke: stroke, lineWidth: slider.value };
      } else {
        var stroke_obj = { dish_id: curr_drawing_id, color: {r: curr_r, g: curr_g, b: curr_b}, swatchCoord_x: curr_swatchCoord_x, swatchCoord_y: curr_swatchCoord_y, stroke: stroke, lineWidth: slider.value };
      }
      stroke = [];
      strokes.push(stroke_obj); // collection of stroke arrays
      var strokesCopy = [];
      // push new stroke to drawing history
      if (drawingHistory.length - 1 >= 0) {
        var strokesLastState = drawingHistory[drawingHistory.length - 1];
        for (var i = 0; i < strokesLastState.length; i++) {
          var curr_stroke = strokesLastState[i];
          var di = curr_stroke.dish_id;
          var swatchx = curr_stroke.swatchCoord_x;
          var swatchy = curr_stroke.swatchCoord_y;
          var lw = curr_stroke.lineWidth;
          var c = curr_stroke.color;
          var strokeCoords = [];
          for (var k = 0; k < curr_stroke.stroke.length; k++) {
            strokeCoords.push(curr_stroke.stroke[k]);
          }
          var currStrokeCopy = { dish_id: di, color: c, swatchCoord_x: swatchx, swatchCoord_y: swatchy, stroke: strokeCoords, lineWidth: lw };
          strokesCopy.push(currStrokeCopy);
        }
      }
      var di = stroke_obj.dish_id;
      var swatchx = stroke_obj.swatchCoord_x;
      var swatchy = stroke_obj.swatchCoord_y;
      var lw = stroke_obj.lineWidth;
      var c = stroke_obj.color;
      var strokeCoords = [];
      for (var k = 0; k < stroke_obj.stroke.length; k++) {
        strokeCoords.push(stroke_obj.stroke[k]);
      }
      var currStrokeCopy = { dish_id: di, color: c, swatchCoord_x: swatchx, swatchCoord_y: swatchy, stroke: strokeCoords, lineWidth: lw };
      strokesCopy.push(currStrokeCopy);
      drawingHistory.push(strokesCopy);
      // if current color is different from previous color add new swatch to wheel
      if (prevSwatchColor === null || curr_r !== prevSwatchColor[0] ||
      curr_g !== prevSwatchColor[1] || curr_b !== prevSwatchColor[2]) {
        var myDiv = document.getElementById('mydiv');
        var swatches = myDiv.getElementsByClassName('swatch');
        var rotStep = 5;
        if (swatches.length >= 50) {
          // shrink swatches
          swatchWidth -= 0.5;
          rotStep -= 0.75;
          for (var i = 0; i < swatches.length; i++) {
            swatches[i].style.width = swatchWidth;
            var newRotDegree = swatches[i].rotDegree - rotStep;
            swatches[i].style.transform='rotate(' + newRotDegree + 'deg)';
          }
        }
        // add new swatch to wheel
        var swatch = document.createElement('div');
        swatch.className = 'swatch';
        swatch.style.display='block';
        swatch.style.position = 'absolute';
        swatch.style.zIndex = '-1';
        swatch.style.backgroundColor = 'rgb(' + curr_r + ',' + curr_g + ',' + curr_b + ')';
        swatch.color = [curr_r, curr_g, curr_b];
        prevSwatchColor = [curr_r, curr_g, curr_b];
        var rad = theta * Math.PI / 180;
        swatch.style.left = 210 + r*Math.cos(rad) + 'px';
        swatch.style.top = 134 + r*Math.sin(rad) + 'px';
        theta+=step;
        if (theta === 360) {
            theta = 0; // restart loop
        }
        swatch.style.transformOrigin= '0% 100%';
        rotDegree+=rotStep;
        swatch.style.transform='rotate(' + rotDegree + 'deg)';
        swatch.rotDegree = rotDegree;
        swatch.style.width = swatchWidth + 'px';
        swatch.style.height = swatchHeight + 'px';
        swatch.dish_id = curr_drawing_id;
        swatch.coord_x = curr_swatchCoord_x; // gl color extraction coordinate
        swatch.coord_y = curr_swatchCoord_y;
        swatch.scoord_x = coord_x; // swatch coordinate
        swatch.scoord_y = coord_y;

        swatch.addEventListener("mousedown", function() {
          var swatches = document.getElementById('history').getElementsByTagName('div');
          for (var i = 0; i < swatches.length; i++) {
            var newSwatchHeight = swatchHeight + 5;
            if (swatches[i].style.height === newSwatchHeight +'px') {
              swatches[i].style.height = swatchHeight + 'px';
              break;
            }
          }
          swatch.style.height = newSwatchHeight + 'px';
          if (this.dish_id === null) {
            curr_r = swatch.color[0];
            curr_g = swatch.color[1];
            curr_b = swatch.color[2];
            var currentColor = document.getElementById('currentColor');
            currentColor.style.backgroundColor = 'rgb(' + curr_r + ',' + curr_g + ',' + curr_b + ')';
          } else {
            swatchFromHistory = true;
            retrieveDish_id = this.dish_id;
            coord_x = swatch.scoord_x;
            coord_y = swatch.scoord_y;
          }
        });
        myDiv.appendChild(swatch);
      }
    } else if (useDropperOnCanvas) {
      // extract color from mouse up event
      var i = mouse.x + (mouse.y * window.innerWidth);
      var c = ctx.getImageData(mouse.x, mouse.y, 1, 1).data;
      document.getElementById("currentColor").style.backgroundColor = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
      curr_r = c[0];
      curr_g = c[1];
      curr_b = c[2];
      // set curr_drawing_id to id associated with dropped color
      curr_drawing_id = pixels[i].dish_id;
      moveSwatchMarkerHere(pixels[i].coord_x, pixels[i].coord_y);
    }
}, false);

function moveSwatchMarkerHere(x, y) {
  coord_x = x;
  coord_y = y;
  var newX = x - 6;
  var newY = y - 4;
  document.getElementById('coord').style.left = newX + 'px';
  document.getElementById('coord').style.top = newY + 'px';
}

var onPaint = function(e) {
  ctx.lineWidth = slider.value;
  var i = mouse.x + (mouse.y * window.innerWidth);
  if (!useDropperOnCanvas && !addingDish) {
    pixels[i].color = [curr_r, curr_g, curr_b];
    pixels[i].dish_id = curr_drawing_id;
    var buffer = ctx.lineWidth/2;// buffer to fill in top and bottom of pixel
    for (var l = i - 720*buffer; l <= i + 720*buffer; l += 720) {// TOP DOWN
      for (var k = l - buffer; k <= l + buffer; k++) { //LEFT RIGHT
        if (k >= 0 && k <= 720*740 - 4) { // check for out of bounds
          imgData.data[k*4 + 0] = curr_r;
          imgData.data[k*4 + 1] = curr_g;
          imgData.data[k*4 + 2] = curr_b;
          imgData.data[k*4 + 3] = 255;
          // store pixel data
          pixels[k].color = [curr_r, curr_g, curr_b];
          pixels[k].dish_id = curr_drawing_id;
          pixels[k].coord_x = coord_x;
          pixels[k].coord_y = coord_y;
          if (curr_swatchCoord_x !== null) {
            pixels[k].swatchCoord_x = curr_swatchCoord_x;
            pixels[k].swatchCoord_y = curr_swatchCoord_y;
          }
        }
      }
    }
    ctx.lineTo(mouse.x, mouse.y);
    ctx.stroke();
    stroke.push({ x: mouse.x, y: mouse.y });
  } else if (useDropperOnCanvas) {
    // update current color square
    var c = ctx.getImageData(mouse.x, mouse.y, 1, 1).data;
    document.getElementById("currentColor").style.backgroundColor = 'rgb(' + c[0] +',' + c[1] + ',' + c[2] + ')';
  }
};

// Convert mouse event coordinates to readPixels coordinates
function pixelInputToCanvasCoord(event, canvas) {
  var x = event.clientX - newLeft,
  y = event.clientY - newTop,
  rect = event.target.getBoundingClientRect();
  y = rect.bottom - newTop - y;
  return { x: x, y: y };
}

function redraw() {
  // clear canvas
  ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
  if (drawingHistory.length - 1 >= 0) {
    // retrieve last state of drawing canvas
    var strokesLastState = drawingHistory[drawingHistory.length - 1];
    for (var j = 0; j < strokesLastState.length; j++) {
      var stroke = strokesLastState[j].stroke;
      var lineWidth = strokesLastState[j].lineWidth;
      var color = strokesLastState[j].color;
      for (var i = 0; i < stroke.length; i++) {
        ctx.lineWidth = lineWidth;
        var r = color.r;
        var g = color.g;
        var b = color.b;
        ctx.strokeStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        if (i === 0) {
          ctx.beginPath();
          ctx.moveTo(stroke[i].x, stroke[i].y);
        } else {
          // redraw strokes using stored mouse points
          if (i % 2 === 0) {
            ctx.beginPath();
            ctx.moveTo(stroke[i].x, stroke[i].y);
          } else {
            ctx.lineTo(stroke[i].x, stroke[i].y);
            ctx.stroke();
            if (i+1 < stroke.length) {
              ctx.beginPath();
              ctx.moveTo(stroke[i].x, stroke[i].y);
              ctx.lineTo(stroke[i+1].x, stroke[i+1].y);
              ctx.stroke();
            }
          }
        }
      }
    }
  }
}

// update swatches in wheel after editing a mixing dish
function updateSwatchHistory(dish) {
  var swatches = document.getElementById('mydiv').getElementsByClassName('swatch');
  var id = dish.id;
  var parentDish = null;
  var parentId = null;
  if (dish.parent !== null) {
    parentDish = dish.parent;
    parentId = dish.parent.id;
  }
  for (var i = 0; i < swatches.length; i++) {
    var swatch = swatches[i];
    if (swatch.dish_id !== null && swatch.dish_id === id) {
      if (swatch.coord_x !== null) {
        for (var j = 0; j < dish.swatchCoords_x.length; j++) {
          if (dish.swatchCoords_x[j] === swatch.coord_x && dish.swatchCoords_y[j] === swatch.coord_y) {
            var new_color = dish.swatches[j];
            swatch.style.backgroundColor = 'rgb(' + new_color.r + ',' + new_color.g + ',' + new_color.b + ')';
          }
        }
      }
    } else if (parentId !== null && swatch.dish_id !== null && swatch.dish_id == parentId) {
      if (swatch.coord_x !== null) {
        for (var j = 0; j < parentDish.swatchCoords_x.length; j++) {
          if (parentDish.swatchCoords_x[j] === swatch.coord_x && parentDish.swatchCoords_y[j] === swatch.coord_y) {
            var new_color = parentDish.swatches[j];
            swatch.style.backgroundColor = 'rgb(' + new_color.r + ',' + new_color.g + ',' + new_color.b + ')';
          }
        }
      }
    }
  }
}

var undoBtn = document.getElementById('undo');
var selectedUndo = false;
undoBtn.addEventListener('mousedown', function (e) {
  selectedUndo = true;
  document.getElementById('undo').style.backgroundColor = "#a8e6f7";
  drawingHistory.pop();
  redraw();
});

undoBtn.addEventListener('mouseup', function (e) {
  if (selectedUndo === true) {
    document.getElementById('undo').style.backgroundColor = "white";
    selectedUndo = false;
  };
});

/************** Selecting/Deselecting buttons ***************************/
function selectedDropper() {
  if (useDropper) { // you've unselected to use the dropper
    moveEnabled = true;
    useDropper = false;
    document.getElementById("dropper").style.backgroundColor = "#bcbcbc";
  } else { // you've selected to use the dropper
    moveEnabled = false;
    useDropper = true;
    document.getElementById("dropper").style.backgroundColor = "#a8e6f7";
    useDropperOnCanvas = false;
    document.getElementById("dropperCanvas").style.backgroundColor = "white";
    colorChange = false;
    document.getElementById("changeColor").style.backgroundColor = "#bcbcbc";
    addingDish = false;
    document.getElementById("addDish").style.backgroundColor = "white";
    deleteBlob = false;
    document.getElementById("cleanPalette").style.backgroundColor = "#bcbcbc";
  }
}

function selectedDropperCanvas() {
  if (useDropperOnCanvas) { // you've unselected to use the dropper
    moveEnabled = true;
    useDropperOnCanvas = false;
    document.getElementById("dropperCanvas").style.backgroundColor = "white";
  } else { // you've selected to use the dropper
    moveEnabled = false;
    useDropperOnCanvas = true;
    document.getElementById("dropperCanvas").style.backgroundColor = "#a8e6f7";
    useDropper = false;
    document.getElementById("dropper").style.backgroundColor = "#bcbcbc";
    colorChange = false;
    document.getElementById("changeColor").style.backgroundColor = "#bcbcbc";
    addingDish = false;
    document.getElementById("addDish").style.backgroundColor = "white";
    deleteBlob = false;
    document.getElementById("cleanPalette").style.backgroundColor = "#bcbcbc";
  }
}

function addDish() {
  if (addingDish) { // you've unselected add dish
    moveEnabled = true;
    addingDish = false;
    document.getElementById("addDish").style.backgroundColor = "white";
  } else { // you've selected to add dish
    moveEnabled = false;
    colorChange = false;
    document.getElementById("changeColor").style.backgroundColor = "#bcbcbc";
    useDropper = false;
    document.getElementById("dropper").style.backgroundColor = "#bcbcbc";
    useDropperOnCanvas = false;
    document.getElementById("dropperCanvas").style.backgroundColor = "white";
    addingDish = true;
    // console.log("selected to add dish back");
    document.getElementById("addDish").style.backgroundColor = "#a8e6f7";
    deleteBlob = false;
    document.getElementById("cleanPalette").style.backgroundColor = "#bcbcbc";
  }
}

function changeColor() {
  if (colorChange) { // you've unselected to change a color
    moveEnabled = true;
    colorChange = false;
    document.getElementById("changeColor").style.backgroundColor = "#bcbcbc";
  } else { // you've selected to change a color
    moveEnabled = false;
    colorChange = true;
    document.getElementById("changeColor").style.backgroundColor = "#a8e6f7";
    useDropper = false;
    document.getElementById("dropper").style.backgroundColor = "#bcbcbc";
    useDropperOnCanvas = false;
    document.getElementById("dropperCanvas").style.backgroundColor = "white";
    addingDish = false;
    document.getElementById("addDish").style.backgroundColor = "white";
    deleteBlob = false;
    document.getElementById("cleanPalette").style.backgroundColor = "#bcbcbc";
  }
}

function cleanPalette() {
  if (deleteBlob) { // you've unselected to delete a blob
    moveEnabled = true;
    deleteBlob = false;
    document.getElementById("cleanPalette").style.backgroundColor = "#bcbcbc";
  } else { // you've selected to delete a blob
    moveEnabled = false;
    deleteBlob = true;
    document.getElementById("cleanPalette").style.backgroundColor = "#a8e6f7";
    colorChange = false;
    document.getElementById("changeColor").style.backgroundColor = "#bcbcbc";
    useDropper = false;
    document.getElementById("dropper").style.backgroundColor = "#bcbcbc";
    useDropperOnCanvas = false;
    document.getElementById("dropperCanvas").style.backgroundColor = "white";
    addingDish = false;
    document.getElementById("addDish").style.backgroundColor = "white";
  }
}

function changePixelColors(dish) {
  var id = dish.id;
  // get all parent dishes
  var parentDishes = [];
  var curr_dish = dish;
  while (curr_dish.parent !== null) {
    parentDishes.push(curr_dish.parent);
    curr_dish = curr_dish.parent;
  }
  var new_color;
  var strokesCopy = [];
  if (drawingHistory.length - 1 >= 0) {
    var strokesLastState = drawingHistory[drawingHistory.length - 1];
    for (var i = 0; i < strokesLastState.length; i++) {
      var stroke = strokesLastState[i];
      var strokeCopy = {};
      strokeCopy.dish_id = stroke.dish_id;
      strokeCopy.swatchCoord_x = stroke.swatchCoord_x;
      strokeCopy.swatchCoord_y = stroke.swatchCoord_y;
      strokeCopy.lineWidth = stroke.lineWidth;
      strokeCopy.color = stroke.color;
      strokeCopy.stroke = [];
      for (var k = 0; k < stroke.stroke.length; k++) {
        strokeCopy.stroke.push(stroke.stroke[k]);
      }
      if (stroke.dish_id !== null && stroke.dish_id === id) {
        if (stroke.swatchCoord_x === null) {
          strokeCopy.color = dish.blobs[0].color;
        } else {
          for (var j = 0; j < dish.swatchCoords_x.length; j++) {
            if (stroke.swatchCoord_x === dish.swatchCoords_x[j]) {
              strokeCopy.color = dish.swatches[j];
              break;
            }
          }
        }
      } else {
        if (stroke.dish_id !== null && dish.parent !== null && stroke.dish_id === dish.parent.id) {
          if (stroke.swatchCoord_x === null) {
            strokeCopy.color = dish.parent.blobs[0].color;
          } else {
            for (var m = 0; m < dish.parent.swatchCoords_x.length; m++) {
              if (stroke.swatchCoord_x === dish.parent.swatchCoords_x[m]) {
                strokeCopy.color = dish.parent.swatches[m];
                break;
              }
            }
          }
        }
      }
      strokesCopy.push(strokeCopy);
    }
  }
  drawingHistory.push(strokesCopy);
  redraw();
}

/*********** WebGL stuff *****************/
var Loader = (function (modules) { // the webpack bootstrap
  // the module cache
  var installedModules = {};
  // require function
  function __webpack_require__(moduleId) {
    // Check if module is in cache
    if (installedModules[moduleId]) {
      return installedModules[moduleId].exports;
    }
    // Otherwise create a new module (and put into the cache)
    var module = installedModules[moduleId] =
    {
      i: moduleId,
      loaded: false,
      exports: {}
    };
    // Execute the module function
    modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
    // Flag the module as loaded
    module.loaded = true;
    // Return the exports of the module
    return module.exports;
  }
  // Expose the modules object
  __webpack_require__.m = modules;
  // Expose the module cache
  __webpack_require__.c = installedModules;
  return __webpack_require__(__webpack_require__.s = 0);
})
/******************************************************************************/

([  // MAIN CODE
  (function (module, exports, __webpack_require__) {
    "use strict";
    // matches Babel export for ES6 modules
    Object.defineProperty(exports, '__esModule', { value: true });
    var renderer_obj = __webpack_require__(1);
    var color_obj = __webpack_require__(2);
    var blob_obj = __webpack_require__(3);
    var dish_obj = __webpack_require__(4);

    // define Palette object
    var Palette = (function () {
      function Palette(canvas) {
        pCanvas = canvas;
        this.height = canvas.height;
        this.width = canvas.width;
        this.pixelRatio = 2;
        this.blobs = [];
        this.dishes = [];
        this.renderer = new renderer_obj.Renderer(canvas);
        this.renderer.render(this);
        this._initEventHandle();

        // Initialize swatch marker
        this.coord = document.createElement('div');
        this.coord.id = 'coord';
        var style = "\n border-radius: 50%;\n border-style: solid; \n border-color: rgba(255,255,255,0.9); \n border-width: thin; \n width: 11px;\n height: 11px;\n margin-left: -5px;\n margin-top: -5px;\n cursor: crosshair; \n position: absolute; \n left: " + 0 + "px;\n top: " + 0 + "px;\n";
        this.coord.setAttribute('style', style);
        if (pCanvas.parentNode) {
          pCanvas.parentNode.appendChild(this.coord);
        }
      }

      Palette.prototype.getNearestBlob = function (x, y, blob) {
        var _this = this;
        for (var i = 0; i < _this.blobs.length; i++) {
          var curr_blob = _this.blobs[i];
          if (Math.abs(curr_blob.x - x) < 160 && Math.abs(curr_blob.y - y) < 160
            && !_this.isSameBlob(curr_blob, blob)) {
            return curr_blob;
          }
        }
        return null;
      };

      Palette.prototype.isSameBlob = function (blob1, blob2) {
        return (blob1.blob_id === blob2.blob_id);
      }

      Palette.prototype.isSameColor = function (color1, color2) {
        return (color1.r === color2.r && color1.g === color2.g && color1.b === color2.b);
      }

      Palette.prototype.isDifferent = function (blob, dish) {
        var _this = this;
        var this_r = blob.color.r;
        var this_g = blob.color.g;
        var this_b = blob.color.b;
        for (var i = 0; i < dish.blobs.length; i++) {
          var other_r = dish.blobs[i].color.r;
          var other_g = dish.blobs[i].color.g;
          var other_b = dish.blobs[i].color.b;
          // if blob is the same color or is within the same range return not different
          if (_this.isSameColor(dish.blobs[i].color, blob.color) ||
            (Math.abs(this_r - other_r) < 100 && Math.abs(this_g - other_g) < 100 &&
            Math.abs(this_b - other_b) < 100)) {
            return false;
          }
        }
        return true;
      }

      Palette.prototype.setActiveBlob = function (marker, blob) {
        var _this = this;
        marker.addEventListener('mousedown', function () {
          _this.isMouseDown = true;
          _this.activeBlob = blob;
        });
        marker.addEventListener('mouseenter', function () {
          if (!useDropper) {
            marker.style.backgroundColor = '#7ffffc';
          }
        });
        marker.addEventListener('mouseleave', function () {
          marker.style.backgroundColor = 'rgba(0,0,0,0.05)';
        });
        blob.marker = marker;
      }

      // Increment dish id of all blobs in mixing dish
      Palette.prototype.addToPrevDish = function (blobs, new_id) {
        var _this = this;
        var updated_blobs = [];
        for (var i = 0; i < blobs.length; i++) {
          var blob_copy = new blob_obj.Blob(blobs[i].x, blobs[i].y, blobs[i].color);
          blob_copy.blob_id = blobs[i].blob_id;
          blob_copy.dish_id = new_id;
          blob_copy.wasGrouped = true;
          _this.setActiveBlob(blobs[i].marker, blob_copy);
          updated_blobs.push(blob_copy);
          for (var j = 0; j < _this.blobs.length; j++) {
            if (_this.isSameBlob(_this.blobs[j], blob_copy)) {
              _this.blobs[j] = blob_copy;
            }
          }
        }
        return updated_blobs;
      }

      // Create a new dish without the given blob
      Palette.prototype.subFromPrevDish = function (blob) {
        var _this = this;
        var prevDish_id = blob.dish_id;
        var prevDish = _this.dishes[prevDish_id];
        var blobs = [];
        var dish_wo_blob = new dish_obj.Dish(++id, prevDish, blobs, [], []);
        for (var i = 0; i < prevDish.blobs.length; i++) {
          if (!_this.isSameBlob(prevDish.blobs[i], blob)) {
            var prevBlob = new blob_obj.Blob(prevDish.blobs[i].x, prevDish.blobs[i].y, prevDish.blobs[i].color);
            _this.setActiveBlob(prevDish.blobs[i].marker, prevBlob);
            prevBlob.blob_id = prevDish.blobs[i].blob_id;
            prevBlob.dish_id = id;
            prevBlob.wasGrouped = true;
            dish_wo_blob.blobCoords_x.push(prevDish.blobCoords_x[i]);
            dish_wo_blob.blobCoords_y.push(prevDish.blobCoords_y[i]);
            dish_wo_blob.events.push(prevDish.events[i]);
            dish_wo_blob.blobs.push(prevBlob);
              // replace previous blob on palette with blob
              for (var j = 0; j < _this.blobs.length; j++) {
                if (_this.isSameBlob(_this.blobs[j], prevBlob)) {
                  _this.blobs[j] = prevBlob;
                }
              }
            }
          }
          if (dish_wo_blob.blobs.length === 1) {
            dish_wo_blob.blobs[0].wasGrouped = false;
          }
          _this.dishes.push(dish_wo_blob);
        }

        Palette.prototype.updateThisBlobs = function (blob) {
          var _this = this;
          for (var i = 0; i < _this.blobs.length; i++) {
            if (_this.blobs[i].blob_id === blob.blob_id) {
              _this.blobs[i] = blob;
            }
          }
        }

        Palette.prototype.updateBlobAndEventCoords = function (dish, nearestDish, event) {
          var x = event.clientX;
          var y = event.clientY;
          dish.blobCoords_x  = nearestDish.blobCoords_x;
          dish.blobCoords_x.push(x);
          dish.blobCoords_y = nearestDish.blobCoords_y;
          dish.blobCoords_y.push(y);
          return dish;
        }

        Palette.prototype.moveSwatchMarker = function (x, y) {
          var _this = this;
          var newX = x - 6;
          var newY = y - 4;
          _this.coord.style.left = newX + 'px';
          _this.coord.style.top = newY + 'px';
          coord_x = x;
          coord_y = y;
        }

        // add blobs to the palette
        Palette.prototype.addBlob = function (event, color) {
          interactedWithPalette = true;
          var _this = this;
          var x = event.clientX;
          var y = event.clientY;
          var newX = x - newLeft;
          var newY = y - newTop;
          var blob = new blob_obj.Blob((x - newLeft) * this.pixelRatio - 15,
            this.height - (y - newTop) * this.pixelRatio, color);
            // Add marker to blob
            var marker = document.createElement('div');
            marker.id = "marker";
            var markerX = newX - 6;
            var style = "\n border-radius: 50%;\n width: 13px;\n height: 13px;\n background-color: rgba(0,0,0,0.1); \n margin-left: -5px;\n margin-top: -5px;\n position: absolute;\n cursor: pointer;\n left: " + markerX + "px;\n top: " + newY + "px;\n";
            marker.setAttribute('style', style);
            _this.setActiveBlob(marker, blob);
            if (pCanvas.parentNode) {
              pCanvas.parentNode.appendChild(marker);
            }
            // Check if in proximity of an existing blob
            var nearestBlob = _this.getNearestBlob((x - newLeft) * this.pixelRatio - 15,
              this.height - (y - newTop) * this.pixelRatio, blob);
              if (nearestBlob !== null) {
                var nearestDish = _this.dishes[nearestBlob.dish_id];
                if (_this.isDifferent(blob, nearestDish)) {
                  var updated_blobs = _this.addToPrevDish(nearestDish.blobs, ++id);
                  blob.wasGrouped = true;
                  blob.dish_id = id;
                  blob.blob_id = ++blob_id;
                  updated_blobs.push(blob);
                  var newDish = new dish_obj.Dish(id, nearestDish, updated_blobs, [], []);
                    newDish.swatches = [];
                    newDish.swatches.push(new color_obj.Color(curr_r, curr_g, curr_b));
                    newDish.swatchCoords_x.push((pixelInputToCanvasCoord(event, pCanvas).x)*2);
                    newDish.swatchCoords_y.push((pixelInputToCanvasCoord(event, pCanvas).y)*2);
                    newDish.events =  nearestDish.events;
                    newDish.events.push(event);
                    newDish.topBuffer = nearestDish.topBuffer;
                    newDish.leftBuffer = nearestDish.leftBuffer;
                    this.dishes.push(_this.updateBlobAndEventCoords(newDish, nearestDish, event));
                  } else { // blob color is already in dish
                    blob.blob_id = ++blob_id;
                    blob.dish_id = nearestDish.id;
                    blob.wasGrouped = true;
                    nearestDish.blobs.push(blob);
                    nearestDish.blobCoords_x.push(x);
                    nearestDish.blobCoords_y.push(y);
                    nearestDish.events.push(event);
                    nearestDish.swatchCoords_x.push((pixelInputToCanvasCoord(event, pCanvas).x)*2);
                    nearestDish.swatchCoords_y.push((pixelInputToCanvasCoord(event, pCanvas).y)*2);
                    nearestDish.swatches.push(new color_obj.Color(curr_r, curr_g, curr_b));
                  }
                } else {
                  if (_this.blobs.length !== 0) { // blob is not near other blobs
                    id++;
                    blob.blob_id = ++blob_id;
                  }
                  var blobs = [];
                  blob.blob_id = blob_id;
                  blob.dish_id = id;
                  blobs.push(blob);
                  var dish = new dish_obj.Dish(id, null, blobs, [], []);
                  dish.blobCoords_x.push(x);
                  dish.blobCoords_y.push(y);
                  dish.events.push(event);
                  dish.swatchCoords_x.push((pixelInputToCanvasCoord(event, pCanvas).x)*2);
                  dish.swatchCoords_y.push((pixelInputToCanvasCoord(event, pCanvas).y)*2);
                  dish.swatches.push(new color_obj.Color(curr_r, curr_g, curr_b));
                  dish.topBuffer = newTop;
                  dish.leftBuffer = newLeft;
                  this.dishes.push(dish);
                }
                curr_swatchCoord_x = (pixelInputToCanvasCoord(event, pCanvas).x)*2;
                curr_swatchCoord_y = (pixelInputToCanvasCoord(event, pCanvas).y)*2;
                _this.blobs.push(blob);
                curr_drawing_id = id;
              };


            // Handles logic for dragging blobs around the palette
            Palette.prototype.dragBlob = function (event, blob) {
              interactedWithPalette = true;
              var _this = this;
              var x = event.clientX;
              var y = event.clientY;
              var prev_dish = _this.dishes[blob.dish_id];

              // Case 1: Circling blob back to original dish
              var nearestBlob = _this.getNearestBlob((x - newLeft) * this.pixelRatio - 15,
                this.height - (y - newTop) * this.pixelRatio, blob);
                if (nearestBlob !== null) {
                  var nearestDish = _this.dishes[nearestBlob.dish_id];
                  if (nearestDish.blobs !== null) {
                    for (var i = 0; i < nearestDish.blobs.length; i++) {
                      if (nearestDish.blobs[i] === blob) {
                        nearestDish.blobs[i].x = x;
                        nearestDish.blobs[i].y = y;
                        _this.updateThisBlobs(blob);
                        return;
                      }
                    }
                  }
                }

                // If blob is separated from a dish, update previous dish
                if (blob.wasGrouped) {
                  _this.subFromPrevDish(blob);
                }

                var new_blob = new blob_obj.Blob(blob.x, blob.y, blob.color);
                new_blob.blob_id = blob.blob_id;
                new_blob.dish_id = blob.dish_id;
                _this.setActiveBlob(blob.marker, new_blob);
                _this.updateThisBlobs(new_blob);

                var nearestBlob = _this.getNearestBlob((x - newLeft) * this.pixelRatio - 15,
                  this.height - (y - newTop) * this.pixelRatio, new_blob);
                  if (nearestBlob !== null) {
                    var nearestDish = _this.dishes[nearestBlob.dish_id];
                    if (_this.isDifferent(blob, nearestDish)) {
                      var updated_blobs = _this.addToPrevDish(nearestDish.blobs, ++id);
                      blob.wasGrouped = true;
                      blob.dish_id = id;
                      updated_blobs.push(blob);
                      var newDish = new dish_obj.Dish(id, nearestDish, updated_blobs,
                        [], []);
                        newDish.swatches = [];
                        newDish.swatches.push(blob.color.r, blob.color.g, blob.color.b);
                        newDish.events = nearestDish.events;
                        newDish.events.push(event);
                        newDish.topBuffer = nearestDish.topBuffer;
                        newDish.leftBuffer = nearestDish.leftBuffer;
                      this.dishes.push(_this.updateBlobAndEventCoords(newDish, nearestDish, event));
                    } else { // blob color is already in dish
                      new_blob.dish_id = nearestDish.id;
                      new_blob.wasGrouped = true;
                      nearestDish.blobs.push(new_blob);
                      nearestDish.blobCoords_x.push(x);
                      nearestDish.blobCoords_y.push(y);
                      nearestDish.events.push(event);
                      nearestDish.swatchCoords_x.push((pixelInputToCanvasCoord(event, pCanvas).x)*2);
                      nearestDish.swatchCoords_y.push((pixelInputToCanvasCoord(event, pCanvas).y)*2);
                      nearestDish.swatches.push(blob.color.r, blob.color.g, blob.color.b);
                    }
                  } else { // blob is by itself after moving
                    if (blob.wasGrouped) {
                      new_blob.wasGrouped = false;
                      new_blob.dish_id = ++id;
                      var blobs = [];
                      blobs.push(new_blob);
                      var new_dish = new dish_obj.Dish(id, prev_dish, blobs, [], []);
                      new_dish.blobCoords_x.push(x);
                      new_dish.blobCoords_y.push(y);
                      new_dish.events.push(event);
                      new_dish.topBuffer = newTop;
                      new_dish.leftBuffer = newLeft;
                      _this.dishes.push(new_dish);
                      _this.updateThisBlobs(new_blob);
                    } else { // moving solo blob around
                      var dish = _this.dishes[blob.dish_id];
                      dish.blobCoords_x[0] = x;
                      dish.blobCoords_y[0] = y;
                      dish.events[0] = event;
                      _this.updateThisBlobs(new_blob);
                    }
                  }
                }

                Palette.prototype.blobColorsMatch = function (blobs1, blobs2) {
                  var _this = this;
                  if (blobs1.length !== blobs2.length) {
                    return false;
                  }
                  for (var i = 0; i < blobs1.length; i++) {
                    if (!_this.isSameColor(blobs1[i], blobs2[i])) {
                      return false;
                    }
                  }
                  return true;
                }

                Palette.prototype.blobCoordsMatch = function (xCoords1, xCoords2, yCoords1, yCoords2) {
                  if (xCoords1.length !== xCoords2.length || yCoords1.length !== yCoords2.length) {
                    return false;
                  }
                  for (var i = 0; i < xCoords1.length; i++) {
                    if (xCoords1[i] !== xCoords2[i] || yCoords1[i] !== yCoords2[i]) {
                      return false;
                    }
                  }
                  return true;
                }

                Palette.prototype.dishExists = function (dish) {
                  var _this = this;
                  for (var i = 0; i < _this.dishes.length; i++) {
                    // check if colors and blob coordinates match up
                    var curr_dish = _this.dishes[i];
                    if (_this.blobColorsMatch(curr_dish.blobs, dish.blobs) &&
                    _this.blobCoordsMatch(curr_dish.blobCoords_x, dish.blobCoords_x,
                    curr_dish.blobCoords_y, dish.blobCoords_y)) {
                      return curr_dish.id;
                    }
                  }
                  return null;
                }

                Palette.prototype.addDishToPalette = function(id) {
                  var _this = this;
                  var dish = _this.dishes[id];
                  var blobs = dish.blobs;
                  for (var i = 0; i < blobs.length; i++) {
                    var blob = blobs[i];
                    var x = dish.blobCoords_x[i];
                    var y = dish.blobCoords_y[i];
                    var e = dish.events[i];
                    _this.addBlob(e, blob.color);

                  }
                  var lastDish = _this.dishes[_this.dishes.length - 1];
                  // add old swatchCoords to newly added dish
                  lastDish.swatchCoords_x = dish.swatchCoords_x;
                  lastDish.swatchCoords_y = dish.swatchCoords_y;
                  lastDish.swatches = dish.swatches;

                  var sameDishId = _this.dishExists(lastDish);
                  if (sameDishId !== null) {
                    var sameDish = _this.dishes[sameDishId];
                    sameDish.blobs = [];

                    var blobs = lastDish.blobs;
                    for (var i = 0; i < blobs.length; i++) {
                      var curr_blob = blobs[i];
                      for (var j = 0; j < _this.blobs.length; j++) {
                        if (_this.isSameBlob(_this.blobs[j], curr_blob)) {
                          _this.blobs[j].dish_id = sameDishId;
                          curr_blob.dish_id = sameDishId;
                          sameDish.blobs.push(curr_blob);
                        }
                      }
                    }
                  }
                };

                Palette.prototype.retrieveDish = function (x, y) {
                  var _this = this;
                  for (var i = 0; i < _this.blobs.length; i++) {
                    var blob_x = _this.blobs[i].x / 2;
                    var blob_y = _this.blobs[i].y / 2;
                    if (Math.abs(blob_x - x) <= 50 && Math.abs(blob_y - y) <= 50) {
                      return _this.blobs[i].dish_id;
                    }
                  }
                  return null;
                }

                // Move a blob by dragging its marker
                Palette.prototype.moveBlob = function (blob, x, y) {
                  var _this = this;
                  x -= newLeft;
                  y -= newTop;
                  blob.move(x * this.pixelRatio - 15, this.height - y * this.pixelRatio);
                  if (blob.marker) {
                    var markerX = x - 6;
                    blob.marker.style.left = markerX + 'px';
                    blob.marker.style.top = y + 'px';
                  }
                };

                Palette.prototype.updateSwatches = function (dish) {
                  var _this = this;
                  for (var i = 0; i < dish.swatchCoords_x.length; i++) {
                    var x = dish.swatchCoords_x[i];
                    var y = dish.swatchCoords_y[i];
                    var pixels = new Uint8Array(4);
                    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels); // (0, 0 is in bottom left corner)
                    if (typeof dish.swatches[i] !== 'undefined') {
                      dish.swatches[i].r = Math.floor(pixels[0]);
                      dish.swatches[i].g = Math.floor(pixels[1]);
                      dish.swatches[i].b = Math.floor(pixels[2]);
                    }
                  }
                  if (dish.parent !== null) {
                    for (var i = 0; i < dish.parent.swatchCoords_x.length; i++) {
                      var x = dish.parent.swatchCoords_x[i];
                      var y = dish.parent.swatchCoords_y[i];
                      var pixels = new Uint8Array(4);
                      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels); // (0, 0 is in bottom left corner)
                      if (typeof dish.parent.swatches[i] !== 'undefined') {
                        dish.parent.swatches[i].r = Math.floor(pixels[0]);
                        dish.parent.swatches[i].g = Math.floor(pixels[1]);
                        dish.parent.swatches[i].b = Math.floor(pixels[2]);
                      }
                    }
                  }
                }

                Palette.prototype.deleteBlob = function (blob) {
                  var _this = this;
                  _this.moveSwatchMarker(0, 0);
                  for (var i = 0; i < _this.blobs.length; i++) {
                    if (_this.isSameBlob(_this.blobs[i], blob)) {
                      // delete marker
                      if (pCanvas.parentNode) {
                        pCanvas.parentNode.removeChild(blob.marker);
                      }
                      // delete blob
                      _this.blobs.splice(i, 1);
                    }
                  }
                }

                // Set palette mouse events
                Palette.prototype._initEventHandle = function () {
                  var _this = this;
                  _this.isMouseDown = false;
                  _this.isMouseMoved = false;
                  var parent = pCanvas.parentNode;
                  if (!parent) {
                    return;
                  }
                  parent.addEventListener('mousedown', function (event) {
                    // if mousedown is in palette area
                    if (swatchFromHistory === false && event.clientX < (newRight) &&
                    event.clientX > (newLeft + 20) && event.clientY <
                    (newBottom - 20) && event.clientY > (newTop)) {
                      _this.isMouseDown = true;
                    } else if (swatchFromHistory === true) {
                      _this.addDishToPalette(retrieveDish_id);
                      _this.moveSwatchMarker(coord_x, coord_y);
                      swatchFromHistory = false;
                    }
                    });
                    parent.addEventListener('mousemove', function (event) {
                      if (_this.isMouseDown && _this.activeBlob) {
                        if (moveEnabled) {
                          event.preventDefault();
                          _this.moveBlob(_this.activeBlob, event.clientX, event.clientY);
                          _this.isMouseMoved = true;
                          movedBlob = true;
                        }
                      } else if (_this.isMouseDown && useDropper) {
                        interactedWithPalette = true;
                        event.preventDefault();
                        // set current color square to color under mouse over
                        var point = pixelInputToCanvasCoord(event, pCanvas);
                        var pixels = new Uint8Array(4);
                        gl.readPixels(point.x*2, point.y*2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                        document.getElementById("currentColor").style.backgroundColor = 'rgb(' + pixels[0] + ',' + pixels[1] + ',' + pixels[2] + ')';
                      }
                    });
                    parent.addEventListener('mouseup', function (event) {
                      var newX = event.clientX - newLeft;
                      var newY = event.clientY - newTop;
                      if (_this.isMouseDown && deleteBlob === true) {
                        if (_this.activeBlob) {
                          _this.deleteBlob(_this.activeBlob);
                        }
                      } else if (_this.isMouseDown && !_this.isMouseMoved && !useDropper && !addingDish && !colorChange && !deleteBlob && !swatchFromHistory) {
                        _this.addBlob(event, new color_obj.Color(curr_r, curr_g, curr_b));  // add color here
                        _this.moveSwatchMarker(event.clientX - newLeft, event.clientY - newTop + 3.5);
                      } else if (movedBlob) {
                        movedBlob = false;
                        _this.dragBlob(event, _this.activeBlob);
                        _this.moveSwatchMarker(event.clientX - newLeft, event.clientY - newTop + 3.5);

                      } else if (_this.isMouseDown && !_this.isMouseMoved && colorChange) {
                        var blob;
                        if (_this.activeBlob) {
                          if (!alreadyClickedMarker) {
                          for (var i = 0; i < _this.blobs.length; i++) {
                            if (_this.isSameBlob(_this.blobs[i], _this.activeBlob)) {
                              blob = new blob_obj.Blob(_this.activeBlob.x, _this.activeBlob.y, new color_obj.Color(curr_r, curr_g, curr_b));
                              blob.blob_id = _this.activeBlob.blob_id;
                              blob.dish_id = _this.activeBlob.dish_id;
                              blob.wasGrouped = _this.activeBlob.wasGrouped;
                              _this.setActiveBlob(_this.activeBlob.marker, blob);
                              _this.blobs[i] = blob;
                              var dish = _this.dishes[blob.dish_id];
                              for (var i = 0; i < dish.blobs.length; i++) {
                                if (_this.isSameBlob(dish.blobs[i], blob)) {
                                  dish.blobs[i] = blob;
                                }
                              }
                              alreadyClickedMarker = true;
                              break;
                            }
                          }
                        } else {
                          if (_this.activeBlob) {
                          _this.updateSwatches(_this.dishes[_this.activeBlob.dish_id]);
                          changePixelColors(_this.dishes[_this.activeBlob.dish_id]);
                          updateSwatchHistory(_this.dishes[_this.activeBlob.dish_id]);
                          alreadyClickedMarker = false;
                          }
                        }
                      }
                    } else if (_this.isMouseDown && !_this.isMouseMoved  && !_this.activeBlob && useDropper) {
                        _this.moveSwatchMarker(event.clientX - newLeft, event.clientY - newTop - 1);
                        var point = pixelInputToCanvasCoord(event, pCanvas);
                        var pixels = new Uint8Array(4);
                        gl.readPixels(point.x*2, point.y*2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels); // (0, 0 is in bottom left corner)
                        // set current color square to color under mouse over
                        document.getElementById("currentColor").style.backgroundColor = 'rgb(' + pixels[0] + ',' + pixels[1] + ',' + pixels[2] + ')';

                        curr_r = pixels[0];
                        curr_g = pixels[1];
                        curr_b = pixels[2];

                        // Find which dish you clicked in and set curr_drawing_id to dish_id
                        curr_drawing_id = _this.retrieveDish(point.x, point.y);
                        if (curr_drawing_id !== null) {
                          var dish = _this.dishes[curr_drawing_id];
                          dish.swatchCoords_x.push(point.x*2);
                          dish.swatchCoords_y.push(point.y*2);
                          dish.swatches.push(new color_obj.Color(curr_r, curr_g, curr_b));
                          curr_swatchCoord_x = point.x*2;
                          curr_swatchCoord_y = point.y*2;
                        }
                      }
                      _this.isMouseDown = false;
                      _this.isMouseMoved = false;
                      _this.activeBlob = undefined;
                    });
                  };
                  return Palette;
                }());
                exports.Palette = Palette;
              }),

              /******* Renderer *****/
              (function (module, exports, __webpack_require__) {
                "use strict";
                Object.defineProperty(exports, "__esModule", { value: true });
                var Renderer = (function () {
                  function Renderer(canvas) {
                    pCanvas = canvas;
                    this.width = canvas.width;
                    this.height = canvas.height;
                    this.numBlobs = 0;
                    this._initGl();
                    this._initShaders();
                    this._initBuffers();
                  }
                  Renderer.prototype.render = function (palette) {
                    if (typeof this.beforeRender === 'function') {
                      this.beforeRender();
                    }
                    gl = this.gl;
                    gl.viewport(0, 0, pCanvas.width, pCanvas.height);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                    gl.clearColor(1,1,1,0);
                    gl.useProgram(this._shaderProgram);
                    if (palette.blobs.length !== this.numBlobs
                      || palette.blobs.some(function (blob) { return blob.isDirty; })) {
                        this.numBlobs = palette.blobs.length;
                        this._initShaders();
                        this._initBlobBuffers(palette.blobs);
                        palette.blobs.forEach(function (blob) { return blob.isDirty = false; });
                      }
                      var uW = gl.getUniformLocation(this._shaderProgram, 'uW');
                      if (uW) {
                        gl.uniform1f(uW, this.width);
                      }
                      var uH = gl.getUniformLocation(this._shaderProgram, 'uH');
                      if (uW) {
                        gl.uniform1f(uH, this.height);
                      }
                      gl.enableVertexAttribArray(this._positionAttr);
                      if (this._positionBuffer) {
                        gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
                      }
                      gl.vertexAttribPointer(this._positionAttr, 2, gl.FLOAT, false, 0, 0);
                      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                      if (typeof this.afterRender === 'function') {
                        this.afterRender();
                      }
                    };
                    Renderer.prototype._initGl = function () {
                      try {
                        this.gl = (pCanvas.getContext(
                          'webgl', {
                            preserveDrawingBuffer: true,
                            premultipliedAlpha:true,
                            alpha: true
                          })
                        || pCanvas.getContext('experimental-webgl'));
                      }
                      catch (e) {
                        console.error(e);
                      }
                      if (!this.gl) {
                        console.error('Failed to create GL.');
                      }
                    };
                    Renderer.prototype._initShaders = function () {
                      var gl = this.gl;
                      var uBlobStr = this.numBlobs === 0
                      ? 'uniform vec2 uBlobPos[1];' // Cannot create 0-length array
                      : "uniform vec2 uBlobPos[" + this.numBlobs + "];";
                      var vBlobStr = this.numBlobs === 0
                      ? 'varying vec2 vBlobPos[1];'
                      : "varying vec2 vBlobPos[" + this.numBlobs + "];";
                      var uBlobColorStr = this.numBlobs === 0
                      ? 'uniform vec3 uBlobColor[1];'
                      : "uniform vec3 uBlobColor[" + this.numBlobs + "];";
                      var vBlobColorStr = this.numBlobs === 0
                      ? 'varying vec3 vBlobColor[1];'
                      : "varying vec3 vBlobColor[" + this.numBlobs + "];";
                      var vertex = "\n attribute vec4 aPos;\n uniform float uW;\n uniform float uH;\n varying float vW;\n varying float vH;\n" + uBlobStr + "\n" + vBlobStr + "\n" + uBlobColorStr + "\n" + vBlobColorStr + "\n\n void main() {\n vW = uW;\n vH = uH;\n\n for (int i = 0; i < " + this.numBlobs + "; ++i) {\n vBlobPos[i] = uBlobPos[i];\n vBlobColor[i] = uBlobColor[i];\n }\n\n gl_Position = aPos;\n }\n";
                      var vShader = this._getShader(vertex, gl.VERTEX_SHADER);
                      if (!vShader) {
                        return;
                      }
                      // Algorithm to mix colors based on influences (variant of the metaball function)
                      var fragment = "\n precision highp float;\n varying float vW;\n varying float vH;\n varying float vBlobCnt;\n" + vBlobStr + "\n" + vBlobColorStr + "\n\n void main(void) {\n const int blobCnt = " + this.numBlobs + ";\n\n if (blobCnt == 0) {\n gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);\n return;\n }\n\n float r = 240.0;\n float b2 = 0.25;\n float b4 = b2 * b2;\n float b6 = b4 * b2;\n\n float influenceSum = 0.0;\n vec3 colors = vec3(0.0, 0.0, 0.0);\n for (int i = 0; i < blobCnt; ++i) {\n vec2 pos = vBlobPos[i];\n float dx = pos.x - float(gl_FragCoord.x);\n float dy = pos.y - float(gl_FragCoord.y);\n float d2 = (dx * dx + dy * dy) / r / r;\n\n if (d2 <= b2) {\n float d4 = d2 * d2;\n float influence = 1.0 - (4.0 * d4 * d2 / b6 - 17.0 * d4\n / b4 + 22.0 * d2 / b2) / 9.0;\n\n if (influence < 0.001) {\n continue;\n }\n\n colors = colors + vBlobColor[i] * influence;\n\n influenceSum += influence;\n}\n}\n\n if (influenceSum < 0.2) {\n gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);\n }\n else {\n gl_FragColor = vec4(colors / influenceSum, 1.0);\n }\n }\n";

                      var fShader = this._getShader(fragment, gl.FRAGMENT_SHADER);
                      if (!fShader) {
                        return;
                      }
                      this._shaderProgram = gl.createProgram();
                      gl.attachShader(this._shaderProgram, vShader);
                      gl.attachShader(this._shaderProgram, fShader);
                      gl.linkProgram(this._shaderProgram);
                      if (!gl.getProgramParameter(this._shaderProgram, gl.LINK_STATUS)) {
                        console.error('Could not initialize shaders');
                      }
                      gl.useProgram(this._shaderProgram);
                    };
                    Renderer.prototype._getShader = function (text, type) {
                      var gl = this.gl;
                      var shader = gl.createShader(type);
                      gl.shaderSource(shader, text);
                      gl.compileShader(shader);
                      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                        console.error('An error occurred compiling the shaders: '
                        + gl.getShaderInfoLog(shader));
                        gl.deleteShader(shader);
                        return null;
                      }
                      return shader;
                    };
                    Renderer.prototype._initBuffers = function () {
                      var gl = this.gl;
                      this._positionAttr = gl.getAttribLocation(this._shaderProgram, 'aPos');
                      this._positionBuffer = gl.createBuffer();
                      gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
                      var positions =
                      [
                        -1, -1,
                        1, -1,
                        -1, 1,
                        1, 1
                      ];
                      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
                    };
                    Renderer.prototype._initBlobBuffers = function (blobs) {
                      var gl = this.gl;
                      var blobPos = [];
                      var blobColor = [];
                      blobs.forEach(function (blob) {
                        blobPos.push(blob.x);
                        blobPos.push(blob.y);
                        blobColor.push(blob.color.r / 256);
                        blobColor.push(blob.color.g / 256);
                        blobColor.push(blob.color.b / 256);
                      });
                      var uPos = gl.getUniformLocation(this._shaderProgram, 'uBlobPos');
                      if (uPos) {
                        gl.uniform2fv(uPos, new Float32Array(blobPos));
                      }
                      var uColor = gl.getUniformLocation(this._shaderProgram, 'uBlobColor');
                      if (uColor) {
                        gl.uniform3fv(uColor, new Float32Array(blobColor));
                      }
                    };
                    return Renderer;
                  }());
                  exports.Renderer = Renderer;
                }),

                /***** Color ****/
                (function(module, exports, __webpack_require__) {
                  "use strict";
                  Object.defineProperty(exports, "__esModule", { value: true });
                  var Color = (function () {
                    function Color (r, g, b) {
                      this.r = r;
                      this.g = g;
                      this.b = b;
                    }
                    Color.prototype.toArray = function () {
                      return [this.r, this.g, this.b];
                    };
                    return Color;
                  }());
                  exports.Color = Color;
                }),

                /**** Blob ****/
                (function (module, exports, __webpack_require__) {
                  "use strict";
                  Object.defineProperty(exports, '__esModule', { value: true });
                  var Blob = (function () {
                    function Blob (x, y, color) {
                      this.x = x;
                      this.y = y;
                      this.color = color;
                      this.isDirty = true;
                      this.wasGrouped = false;
                    }
                    Blob.prototype.move = function (x, y) {
                      this.x = x;
                      this.y = y;
                      this.isDirty = true;
                    };
                    return Blob;
                  }());
                  exports.Blob = Blob;
                }),
                (function (module, exports, __webpack_require__) {
                  "use strict";
                  Object.defineProperty(exports, '__esModule', { value: true });
                  var Dish = (function () {
                    // A dish consists of one or more blobs
                    // Each dish holds its id, a reference to its parent dish (if any), and an array of blobs
                    function Dish (id, parent, blobs, swatchCoords_x, swatchCoords_y, topBuffer, leftBuffer) {
                      this.id = id;
                      this.parent = parent;
                      this.blobs = blobs;
                      this.blobCoords_x = [];
                      this.blobCoords_y = [];
                      this.events = [];
                      this.swatchCoords_x = swatchCoords_x;
                      this.swatchCoords_y = swatchCoords_y;
                      this.topBuffer = topBuffer;
                      this.leftBuffer = leftBuffer;
                      this.swatches = [];
                    }
                    return Dish;
                  }());
                  exports.Dish = Dish;
                })
              ]);

              var mixingCanvas = document.getElementById('mixing');
              mixingCanvas.width = window.innerWidth/2;
              mixingCanvas.height = window.innerHeight;
              var palette = new Loader.Palette(mixingCanvas);
              var renderer = palette.renderer;
              var stat = new Stats();
              function animate() {
                stat.begin();
                renderer.render(palette);
                stat.end();
                requestAnimationFrame(animate);
              }
              requestAnimationFrame(animate);
