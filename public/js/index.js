'use strict';

var spriteSheet;

var textureData = {
  tiles : {
    dirt : { x : 0, y : 0, width : 128, height : 128 }
  },
  tanks : {
    red : { x : 568, y : 440, width : 75, height: 70 }
  }
};

var appState = {
  tank : {
    x : 30,
    y : 30,
    rotation : 3
  }
};


function loadAssets (callback) {
  spriteSheet = new Image();
  spriteSheet.src = './img/sheet_tanks.png';
  spriteSheet.onload = function () {
    //initTankSprites();
    callback();
  };
}

function resizeCanvas () {
  var canvas = document.getElementById('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function renderTiles () {
  var tempCanvas = document.createElement('canvas');
  var tileData = textureData.tiles.dirt;
  tempCanvas.width = tileData.width;
  tempCanvas.height = tileData.height;

  var tempContext = tempCanvas.getContext('2d');
  tempContext.drawImage(spriteSheet,
                    tileData.x,
                    tileData.y,
                    tileData.width,
                    tileData.height,
                    0,
                    0,
                    tileData.width,
                    tileData.height);

  var canvas = document.getElementById('canvas');
  var context = canvas.getContext('2d');
  var pattern = context.createPattern(tempCanvas, 'repeat');
  context.fillStyle = pattern;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function renderTanks () {
  var canvas = document.getElementById('canvas');
  var context = canvas.getContext('2d');

  var tankData = textureData.tanks.red;
  context.drawImage(spriteSheet,
                    tankData.x,
                    tankData.y,
                    tankData.width,
                    tankData.height,
                    appState.tank.x,
                    appState.tank.y,
                    tankData.width,
                    tankData.height);
}

function render () {
  renderTiles();
  renderTanks();
}

function main () {
  render();
  window.requestAnimationFrame(main);
}

function init () {
  loadAssets(main);
}

document.addEventListener('DOMContentLoaded', function (event) {
  window.addEventListener('resize', resizeCanvas, false);
  resizeCanvas();
  init();
});
