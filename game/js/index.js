'use strict';

var spriteSheet;

var textureData = {
  tiles : {
    dirt : { x : 0, y : 0, width : 128, height : 128 }
  },
  tanks : {
    red : { x : 568, y : 440, width : 75, height: 70,
            halfWidth : 37.5, halfHeight : 35 }
  },
  barrels : {
    red : { x : 842, y : 158, width : 44, height : 62,
            halfWidth : 22, halfHeight : 31 }
  },
  bullets : {
    beige : { x : 188, y : 345, width : 12, height : 26 }
  }
};

const ROTATIONAL_VELOCITY = 5;
const TANK_SPEED = 3;
const TANK_TEXTURE_ROTATION_OFFSET = 90;
const BARREL_TEXTURE_ROTATION_OFFSET = -90;
const BULLET_TEXTURE_ROTATION_OFFSET = 90;
const BULLET_SPEED = 10;
const RELOAD_TIME = 700; //ms

var appState = {
  player : {
    health : 100,
    keysPressed : new Set(),
    x : 30,
    y : 30,
    rotation : 0,
    barrelRotation : 0 // relative to tank front
  },
  bullets : []
};

function loadAssets (callback) {
  spriteSheet = new Image();
  spriteSheet.src = './img/sheet_tanks.png';
  spriteSheet.onload = function () {
    callback();
  };
}

function resizeCanvas () {
  var canvas = document.getElementById('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function updatePlayer () {
  var playerState = appState.player;

  if (playerState.keysPressed.has(65)) { // A
    playerState.rotation -= ROTATIONAL_VELOCITY;
  } else if (playerState.keysPressed.has(68)) { // D
    playerState.rotation += ROTATIONAL_VELOCITY;
  }

  if (playerState.rotation === 360 || playerState.rotation === -360) {
    playerState.rotation = 0;
  }

  var angleInRadians = playerState.rotation * Math.PI/180;
  if (playerState.keysPressed.has(83)) { // W
    playerState.y -= Math.sin(angleInRadians) * TANK_SPEED;
    playerState.x -= Math.cos(angleInRadians) * TANK_SPEED;
  } else if (playerState.keysPressed.has(87)) { // S
    playerState.y += Math.sin(angleInRadians) * TANK_SPEED;
    playerState.x += Math.cos(angleInRadians) * TANK_SPEED;
  }
}

function updateBarrel () {
  var playerState = appState.player;
  if (playerState.keysPressed.has(74)) { // J
    playerState.barrelRotation -= ROTATIONAL_VELOCITY;
  } else if (playerState.keysPressed.has(75)) { // L
    playerState.barrelRotation += ROTATIONAL_VELOCITY;
  }

  if (playerState.barrelRotation === 360 || playerState.barrelRotation === -360) {
    playerState.barrelRotation = 0;
  }
}

function fireBullet () {
  var playerState = appState.player;
  playerState.lastFired = new Date();

  var initialAngle = playerState.rotation + playerState.barrelRotation;

  var angleInRadians = initialAngle * Math.PI / 180;
  var tankData = textureData.tanks.red;
  var bullet = {
    x : playerState.x + tankData.halfWidth,
    y : playerState.y + tankData.halfHeight,
    dx : Math.cos(angleInRadians) * BULLET_SPEED,
    dy : Math.sin(angleInRadians) * BULLET_SPEED,
    angle : initialAngle
  };
  return bullet;
}

function updateBullets () {
  var playerState = appState.player;

  if (playerState.keysPressed.has(32) &&
      (playerState.lastFired === undefined ||
       Date.now() - playerState.lastFired > RELOAD_TIME)) {
    appState.bullets.push(fireBullet());
  }

  var canvas = document.getElementById('canvas');

  var newBullets = [];
  for (let i = 0; i < appState.bullets.length; i++) {
    var bullet = appState.bullets[i];
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;

    if (bullet.x >= 0 && bullet.x <= canvas.width
        && bullet.y >= 0 && bullet.y <= canvas.height) {
      newBullets.push(bullet);
    }
  }

  appState.bullets = newBullets;
}

function updateState () {
  updatePlayer();
  updateBarrel();
  updateBullets();
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

  context.save();
  context.resetTransform();

  var tankData = textureData.tanks.red;
  var playerState = appState.player;

  context.translate(playerState.x + tankData.halfWidth,
                    playerState.y + tankData.halfHeight);

  var angleInRadians = (playerState.rotation + TANK_TEXTURE_ROTATION_OFFSET) * Math.PI / 180;
  context.rotate(angleInRadians);

  context.drawImage(spriteSheet,
                    tankData.x,
                    tankData.y,
                    tankData.width,
                    tankData.height,
                    -tankData.halfWidth,
                    -tankData.halfHeight,
                    tankData.width,
                    tankData.height);

  context.restore();
}

function renderBarrels () {
  var canvas = document.getElementById('canvas');
  var context = canvas.getContext('2d');

  context.save();
  context.resetTransform();

  var tankData = textureData.tanks.red;
  var playerState = appState.player;

  context.translate(playerState.x + tankData.halfWidth,
                    playerState.y + tankData.halfHeight);

  var absoluteRotation = appState.player.rotation
        + appState.player.barrelRotation
        + BARREL_TEXTURE_ROTATION_OFFSET;
  var angleInRadians = absoluteRotation * Math.PI / 180;
  context.rotate(angleInRadians);

  var barrelData = textureData.barrels.red;
  context.drawImage(spriteSheet,
                    barrelData.x,
                    barrelData.y,
                    barrelData.width,
                    barrelData.height,
                    -8,
                    -8,
                    barrelData.width,
                    barrelData.height);
  context.restore();
}

function renderBullets () {
  var canvas = document.getElementById('canvas');
  var context = canvas.getContext('2d');

  var bulletData = textureData.bullets.beige;
  for (let i = 0; i < appState.bullets.length; i++) {
    var bullet = appState.bullets[i];
    context.save();

    context.translate(bullet.x, bullet.y);
    var angle = bullet.angle + BULLET_TEXTURE_ROTATION_OFFSET;
    var angleInRadians = angle  * Math.PI / 180;
    context.rotate(angleInRadians);
    context.drawImage(spriteSheet,
                      bulletData.x,
                      bulletData.y,
                      bulletData.width,
                      bulletData.height,
                      0,
                      0,
                      bulletData.width,
                      bulletData.height);
    context.restore();
  }
}

function render () {
  renderTiles();
  renderTanks();
  renderBarrels();
  renderBullets();
}

function main () {
  updateState();
  render();
  window.requestAnimationFrame(main);
}

function init () {
  loadAssets(main);
}

document.addEventListener('keyup', function (e) {
  appState.player.keysPressed.delete(e.keyCode);
}, true);

document.addEventListener('keydown', function (e) {
  appState.player.keysPressed.add(e.keyCode);
  console.log(e.keyCode);
}, true);

document.addEventListener('DOMContentLoaded', function (event) {
  window.addEventListener('resize', resizeCanvas, false);
  resizeCanvas();
  init();
});
