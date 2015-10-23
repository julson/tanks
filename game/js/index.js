'use strict';

var spriteSheet;

var textureData = {
  tiles : {
    dirt : { x : 0, y : 0, width : 128, height : 128 }
  },
  tanks : {
    red : { x : 568, y : 440, width : 75, height : 70,
            halfWidth : 37.5, halfHeight : 35 },
    beige : { x : 730, y :340, width : 75, height : 70,
              halfWidth : 37.5, halfHeight : 35 }
  },
  barrels : {
    red : { x : 842, y : 158, width : 16, height : 50,
            halfWidth : 8 },
    beige : { x : 842, y : 108, width : 16, height : 50,
              halfWidth : 8 }
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

var utils = require('./utils.js');

var appState = {
  player : {
    keysPressed : new Set()
  },
  tanks : [],
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

class Vector2D {
  constructor (x, y) {
    this.x = x;
    this.y = y;
  }
}

class Entity {
  constructor (x, y) {
    this.position = new Vector2D(x, y);
  }
}

class Tank extends Entity {
  constructor (color, x, y) {
    super(x, y);
    this.color = color;
    this.health = 100;
    this.rotation = 0;
    this.barrelRotation = 0;
  }
}

function updatePlayer (playerState) {
  var tank = playerState.tank;

  if (playerState.keysPressed.has(65)) { // A
    tank.rotation -= ROTATIONAL_VELOCITY;
  } else if (playerState.keysPressed.has(68)) { // D
    tank.rotation += ROTATIONAL_VELOCITY;
  }

  if (tank.rotation === 360 || tank.rotation === -360) {
    tank.rotation = 0; // make sure we don't have a high rotation value
  }

  var angleInRadians = utils.toRadians(tank.rotation);
  if (playerState.keysPressed.has(83)) { // W
    tank.position.y -= Math.sin(angleInRadians) * TANK_SPEED;
    tank.position.x -= Math.cos(angleInRadians) * TANK_SPEED;
  } else if (playerState.keysPressed.has(87)) { // S
    tank.position.y += Math.sin(angleInRadians) * TANK_SPEED;
    tank.position.x += Math.cos(angleInRadians) * TANK_SPEED;
  }
}

function updateEnemies () {

}

function updateBarrel (playerState) {
  var tank = playerState.tank;
  if (playerState.keysPressed.has(74)) { // J
    tank.barrelRotation -= ROTATIONAL_VELOCITY;
  } else if (playerState.keysPressed.has(75)) { // L
    tank.barrelRotation += ROTATIONAL_VELOCITY;
  }

  if (tank.barrelRotation === 360 || tank.barrelRotation === -360) {
    tank.barrelRotation = 0;
  }
}

function fireBullet (playerState) {
  playerState.lastFired = new Date();

  var initialAngle = playerState.tank.rotation + playerState.tank.barrelRotation;

  var angleInRadians = initialAngle * Math.PI / 180;
  var tankData = textureData.tanks.red;
  var bullet = {
    x : playerState.tank.x + tankData.halfWidth,
    y : playerState.tank.y + tankData.halfHeight,
    dx : Math.cos(angleInRadians) * BULLET_SPEED,
    dy : Math.sin(angleInRadians) * BULLET_SPEED,
    angle : initialAngle
  };
  return bullet;
}

function updateBullets (playerState) {

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

function updateState (appState) {
  updatePlayer(appState.player);
  updateBarrel(appState.player);
  updateEnemies();
  updateBullets(appState.player);
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

function renderTanks (tanks) {
  var canvas = document.getElementById('canvas');
  var context = canvas.getContext('2d');

  for (let i = 0; i < tanks.length; i++) {
    context.save();
    context.resetTransform();

    var tank = tanks[i];
    var tankTexture = textureData.tanks[tank.color];

    context.translate(tank.position.x + tankTexture.halfWidth,
                      tank.position.y + tankTexture.halfHeight);

    var angleInRadians = utils.toRadians(tank.rotation + TANK_TEXTURE_ROTATION_OFFSET);
    context.rotate(angleInRadians);

    context.drawImage(spriteSheet,
                      tankTexture.x,
                      tankTexture.y,
                      tankTexture.width,
                      tankTexture.height,
                      -tankTexture.halfWidth,
                      -tankTexture.halfHeight,
                      tankTexture.width,
                      tankTexture.height);

    context.restore();
  }
}

function renderBarrels (playerState) {
  var canvas = document.getElementById('canvas');
  var context = canvas.getContext('2d');

  context.save();
  context.resetTransform();

  var tankData = textureData.tanks.red;
  var tank = playerState.tank;

  context.translate(tank.position.x + tankData.halfWidth,
                    tank.position.y + tankData.halfHeight);

  var absoluteRotation = appState.player.tank.rotation
        + appState.player.tank.barrelRotation
        + BARREL_TEXTURE_ROTATION_OFFSET;
  var angleInRadians = utils.toRadians(absoluteRotation);
  context.rotate(angleInRadians);

  var barrelData = textureData.barrels.red;
  context.drawImage(spriteSheet,
                    barrelData.x,
                    barrelData.y,
                    barrelData.width,
                    barrelData.height,
                    -barrelData.halfWidth,
                    -barrelData.halfWidth,
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
  renderTanks(appState.tanks);
  renderBarrels(appState.player);
  renderBullets();
}

function main () {
  updateState(appState);
  render();
  window.requestAnimationFrame(main);
}

function init () {
  loadAssets(main);
  appState.player.tank = new Tank('red', 30, 30);
  appState.tanks.push(appState.player.tank);
  appState.tanks.push(new Tank('beige', 180, 180));
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
