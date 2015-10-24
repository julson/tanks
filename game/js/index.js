'use strict';

var utils = require('./utils.js');

var spriteSheet;

const ROTATIONAL_VELOCITY = 5;
const TANK_SPEED = 2;
const BULLET_SPEED = 10;
const RELOAD_TIME = 700; //ms

var textureData = {
  tiles : {
    dirt : { x : 0, y : 0, width : 128, height : 128 }
  }
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

class Entity {
  constructor () {
    this.id = uuid.v4();
  }
}

class Position {
  constructor (x, y) {
    this.x = x;
    this.y = y;
  }
}

class Velocity {
  constructor (angle, speed) {
    this.angle = angle;
    this.speed = speed;
  }
}

// assumes a quad for now
class Dimension {
  constructor (width, height) {
    this.width = width;
    this.height = height;
    this.halfWidth = width/2;
    this.halfHeight = height/2;
  }
}

class Sprite {
  constructor (x, y, rotationOffset, heightOffset) {
    this.x = x;
    this.y = y;
    this.rotationOffset = rotationOffset || 0;
    this.heightOffset = heightOffset || 0; // mainly used to adjust barrel center
  }
}

function tankSprite (color) {
  switch (color) {
  case 'red' : return new Sprite(568, 440, 90);
  case 'beige':
    default : return new Sprite(730, 340, 90);
  }
}

class Tank extends Entity {
  constructor (color, position, barrelId) {
    super();

    this.position = position;
    this.velocity = new Velocity(0, 0);
    this.dimension = new Dimension(75, 70);
    this.sprite = tankSprite(color);
    this.health = 100;
    this.rotation = 0;
  }
}

function barrelSprite (color) {
  switch(color) {
  case 'red' : return new Sprite(842, 158, -90, 20);
  case 'beige' :
    default : return new Sprite(842, 108, -90, 20);
  }
}

class Barrel extends Entity {
  constructor (color, position) {
    super();
    this.position = position;
    this.velocity = new Velocity(0, 0);
    this.dimension = new Dimension(16, 50);
    this.sprite = barrelSprite(color);
    this.rotation = 0;
  }
}

class Bullet extends Entity {
  constructor (tankId, position, velocity) {
    super();
    this.tankId = tankId;
    this.position = position;
    this.velocity = velocity;
    this.dimension = new Dimension(12, 26);
    this.sprite = new Sprite(188, 345, 90);
    this.rotation = velocity.angle;
  }
}

class Player extends Entity {
  constructor (tankId) {
    super();
    this.tankId = tankId;
    this.keysPressed = new Set();
  }
}

function rotate (angle, change) {
  change = change || 0;
  // make sure we don't end up with a high rotational value;

  return (angle + change) % 360;
}

function canFire (tank) {
  return tank.lastFired === undefined
    || Date.now() - tank.lastFired > RELOAD_TIME;
}

function fireBullet (tankId, barrel) {
  var initialAngle = rotate(barrel.rotation);
  var x = barrel.position.x + Math.cos(utils.toRadians(initialAngle)) * barrel.dimension.height;
  var y = barrel.position.y + Math.sin(utils.toRadians(initialAngle)) * barrel.dimension.height;
  var position = new Position(x, y);
  var velocity = new Velocity(initialAngle, BULLET_SPEED);
  return new Bullet(tankId, position, velocity);
}

function processInput (playerId, entities) {
  var player = entities[playerId];
  var tank = entities[player.tankId];
  var barrel = entities[tank.barrelId];

  // TANK ROTATION
  if (player.keysPressed.has(65)) { // A
    tank.rotation = rotate(tank.rotation, -ROTATIONAL_VELOCITY);
    barrel.rotation = rotate(barrel.rotation, -ROTATIONAL_VELOCITY);
  } else if (player.keysPressed.has(68)) { // D
    tank.rotation = rotate(tank.rotation, ROTATIONAL_VELOCITY);
    barrel.rotation = rotate(barrel.rotation, ROTATIONAL_VELOCITY);
  }

  // TANK/BARREL MOVEMENT
  if (player.keysPressed.has(87)) { // W
    tank.velocity = new Velocity(tank.rotation, TANK_SPEED);
    barrel.velocity = tank.velocity;
  } else if (player.keysPressed.has(83)) { // S
    tank.velocity = new Velocity(tank.rotation, -TANK_SPEED);
    barrel.velocity = tank.velocity;
  } else {
    tank.velocity = new Velocity(tank.rotation, 0);
    barrel.velocity = tank.velocity;
  }

  // BARREL ROTATION
  if (player.keysPressed.has(74)) { // J
    barrel.rotation = rotate(barrel.rotation, -ROTATIONAL_VELOCITY);
  } else if (player.keysPressed.has(75)) { // K
    barrel.rotation = rotate(barrel.rotation, ROTATIONAL_VELOCITY);
  }

  // FIRE COMMAND
  if (player.keysPressed.has(32) && canFire(tank)) { // SPACE
    var bullet = fireBullet(tank.id, barrel);
    tank.lastFired = new Date();
    entities[bullet.id] = bullet;
  }
}

function move (entities) {
  _.forEach(entities, function (entity) {
    if (entity.velocity && entity.position) {
      var inRadians = utils.toRadians(entity.velocity.angle);
      var dx = Math.cos(inRadians) * entity.velocity.speed;
      entity.position.x += dx;
      var dy = Math.sin(inRadians) * entity.velocity.speed;
      entity.position.y += dy;
    }

    return entity;
  });
}

function draw (entities) {
  var canvas = document.getElementById('canvas');
  var context = canvas.getContext('2d');

  _.forEach(entities, function (entity) {
    context.save();
    context.resetTransform();

    context.translate(entity.position.x, entity.position.y);


    var sprite = entity.sprite;
    if (entity.rotation !== undefined) {
      var inRadians = utils.toRadians(entity.rotation + sprite.rotationOffset);
      context.rotate(inRadians);
    }

    if (entity instanceof Barrel) {
      console.log(JSON.stringify(entity));
    }

    var dimension = entity.dimension;
    context.drawImage(spriteSheet,
                      sprite.x,
                      sprite.y,
                      dimension.width,
                      dimension.height,
                      -dimension.halfWidth,
                      -dimension.halfHeight + sprite.heightOffset,
                      dimension.width,
                      dimension.height);
    context.restore();
  });
}

function render (entities) {

  var tanks = []; //make sure these get rendered first;
  var rest = [];

  _.forEach(entities, function (entity) {
    if (entity.dimension && entity.sprite && entity.position) {
      if (entity instanceof Tank) {
        tanks.push(entity);
      } else {
        rest.push(entity);
      }
    }
  });

  draw(tanks);
  draw(rest);
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

function main (playerId, entities) {
  processInput(playerId, entities);
  move(entities);
  renderTiles();
  render(entities);
  window.requestAnimationFrame(function () {
    return main(playerId, entities);
  });
}

function createPlayer (entities) {
  var player = new Player();

  document.addEventListener('keyup', function (e) {
    player.keysPressed.delete(e.keyCode);
  });

  document.addEventListener('keydown', function (e) {
    player.keysPressed.add(e.keyCode);
  });

  entities[player.id] = player;
  return player;
}

function createTank (color, position, entities) {
  var initialPos = new Position(50, 50);
  var barrel = new Barrel(color, position);
  entities[barrel.id] = barrel;

  var tank = new Tank(color, position, barrel.id);
  tank.barrelId = barrel.id;
  entities[tank.id] = tank;

  return tank;
}

function init () {
  loadAssets(function () {
    var entities = {};
    var player = createPlayer(entities);
    var playerTank = createTank('red', new Position(50, 50), entities);
    player.tankId = playerTank.id;

    var enemyTank = createTank('beige', new Position(180, 180), entities);

    main(player.id, entities);
  });
}

document.addEventListener('DOMContentLoaded', function (event) {
  window.addEventListener('resize', resizeCanvas, false);
  resizeCanvas();
  init();
});
