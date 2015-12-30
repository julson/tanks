'use strict';

var utils = require('./utils.js');
var collision = require('./collision.js');

var spriteSheet;
var Vector = utils.Vector;

const ROTATIONAL_VELOCITY = 200;
const TANK_SPEED = 100;
const BULLET_SPEED = 800;
const RELOAD_TIME = 700; //ms
const MAP_WIDTH = 2560;
const MAP_HEIGHT = 2560;

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

class Velocity {
  constructor (angle, speed) {
    this.angle = angle;
    this.speed = speed;
  }
}

// assumes a rectangle for now
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
    this.rotationalVelocity = 0;
    this.isFiring = false;
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
    this.rotationalVelocity = 0;
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
    this.rotationalVelocity = 0;
  }
}

class Player extends Entity {
  constructor (tankId) {
    super();
    this.tankId = tankId;
    this.keysPressed = new Set();
  }
}

function canFire (tank) {
  return tank.lastFired === undefined
    || Date.now() - tank.lastFired > RELOAD_TIME;
}

function processInput (playerId, entities) {
  var player = entities[playerId];
  var tank = entities[player.tankId];
  var barrel = entities[tank.barrelId];

  // TANK ROTATION
  if (player.keysPressed.has(65)) { // A
    tank.rotationalVelocity = -ROTATIONAL_VELOCITY;
    barrel.rotationalVelocity = -ROTATIONAL_VELOCITY;
  } else if (player.keysPressed.has(68)) { // D
    tank.rotationalVelocity = ROTATIONAL_VELOCITY;
    barrel.rotationalVelocity = ROTATIONAL_VELOCITY;
  } else {
    tank.rotationalVelocity = 0;
    barrel.rotationalVelocity = 0;
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
    barrel.rotationalVelocity -= ROTATIONAL_VELOCITY;
  } else if (player.keysPressed.has(75)) { // K
    barrel.rotationalVelocity += ROTATIONAL_VELOCITY;
  }

  // FIRE COMMAND
  if (player.keysPressed.has(32) && canFire(tank)) { // SPACE
    tank.isFiring = true;
  } else {
    tank.isFiring = false;
  }
}

function rotate (angle, change) {
  change = change || 0;
  // make sure we don't end up with a high rotational value;

  return (angle + change) % 360;
}

function fireBullet (tankId, barrel) {
  var initialAngle = barrel.rotation;
  var x = barrel.position.x + Math.cos(utils.toRadians(initialAngle)) * barrel.dimension.height;
  var y = barrel.position.y + Math.sin(utils.toRadians(initialAngle)) * barrel.dimension.height;
  var position = new Vector(x, y);
  var velocity = new Velocity(initialAngle, BULLET_SPEED);
  return new Bullet(tankId, position, velocity);
}

function update (dt, entities) {
  // move entities
  _.forEach(entities, function (entity) {
    if (entity.velocity && entity.position) {
      var inRadians = utils.toRadians(entity.velocity.angle);
      var dx = Math.cos(inRadians) * entity.velocity.speed * dt;
      entity.position.x += dx;
      var dy = Math.sin(inRadians) * entity.velocity.speed * dt;
      entity.position.y += dy;
    }

    if (_.has(entity, 'rotation') && _.has(entity, 'rotationalVelocity')) {
      entity.rotation = rotate(entity.rotation, entity.rotationalVelocity * dt);
    }

    return entity;
  });

  // fire bullets
  _.forEach(entities, function (entity) {
    if (entity instanceof Tank && entity.isFiring) {
      var barrel = entities[entity.barrelId];
      var bullet = fireBullet(entity.id, barrel);
      entity.lastFired = new Date();
      entities[bullet.id] = bullet;
      entity.isFiring = false;
    }
  });
}

function hitTank (entities, bullet, tank) {
  delete entities[tank.barrelId];
  delete entities[tank.id];
  delete entities[bullet.id];
}

function pushByMTV (entity, mtv) {
  entity.position.x += mtv.x;
  entity.position.y += mtv.y;
}

function checkCollisions (entities) {
  let tanks = _.filter(entities, v => v instanceof Tank);
  let bullets = _.filter(entities, v => v instanceof Bullet);

  // TODO this is an O(n^2) approach to checking all entities
  // Figure out a much more efficient one (e.g. broad/narrow phase checks)
  let keys = Object.keys(entities);
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      let e1 = entities[keys[i]],
          e2 = entities[keys[j]];

      if (e1 instanceof Barrel || e2 instanceof Barrel) {
        continue;
      }

      if (e1 instanceof Bullet && e2 instanceof Bullet) {
        continue;
      }

      if (e1 instanceof Bullet && e2 instanceof Tank && e1.tankId !== e2.id) {
        if (collision.isColliding(e1, e2)) {
          hitTank(entities, e1, e2);
        }
      }

      if (e1 instanceof Tank && e2 instanceof Bullet && e2.tankId !== e1.id) {
        if (collision.isColliding(e1, e2)) {
          hitTank(entities, e2, e1);
        }
      }

      if (e1 instanceof Tank && e2 instanceof Tank) {
        var mtv = collision.isColliding(e1, e2);
        if (mtv) {
          pushByMTV(e1, mtv);
        }
      }
    }
  }

  let canvas = document.getElementById('canvas');
  // check boundaries
  _.forEach(entities, function (entity) {
    if (!entity.position) { return; }

    if (entity.position.x < 0 || entity.position.x >= MAP_WIDTH ||
        entity.position.y < 0 || entity.position.y >= MAP_HEIGHT) {
      if (entity instanceof Bullet) {
        delete entities[entity.id];
      } else {
        entity.velocity.speed = 0;
      }
    }
  });
}

function draw (entities, viewportOrigin) {
  let canvas = document.getElementById('canvas');
  let context = canvas.getContext('2d');

  _.forEach(entities, function (entity) {

    let position = entity.position;
    // skip if outside of viewport
    if (position.x < viewportOrigin.x
        || position.x > (viewportOrigin.x + canvas.width)
        || position.y < viewportOrigin.y
        || position.y > (viewportOrigin.y + canvas.height)) {
      return;
    }

    context.save();
    context.resetTransform();

    let relativeX = position.x - viewportOrigin.x;
    let relativeY = position.y - viewportOrigin.y;
    context.translate(relativeX, relativeY);

    var sprite = entity.sprite;
    if (entity.rotation !== undefined) {
      var inRadians = utils.toRadians(entity.rotation + sprite.rotationOffset);
      context.rotate(inRadians);
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

function renderEntities (entities, center) {
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

  draw(tanks, center);
  draw(rest, center);
}

function renderViewport (mapCanvas, origin) {
  let canvas = document.getElementById('canvas');
  let context = canvas.getContext('2d');

  context.drawImage(mapCanvas,
                    origin.x,
                    origin.y,
                    canvas.width,
                    canvas.height,
                    0,
                    0,
                    canvas.width,
                    canvas.height);
}

function constrain (v, min, max) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function main (lastTime, playerId, entities, mapCanvas) {
  let now = Date.now();
  let dt = (now - lastTime) / 1000.0;

  processInput(playerId, entities);
  update(dt, entities);
  checkCollisions(entities);

  let canvas = document.getElementById('canvas');
  let playerTank = entities[entities[playerId].tankId];
  let originX = playerTank.position.x - canvas.width/2;
  originX = constrain(originX, 0, MAP_WIDTH - canvas.width);
  let originY = playerTank.position.y - canvas.height/2;
  originY = constrain(originY, 0, MAP_HEIGHT - canvas.height);

  let viewportOrigin = new Vector(originX, originY);

  renderViewport(mapCanvas, viewportOrigin);
  renderEntities(entities, viewportOrigin);

  window.requestAnimationFrame(function () {
    return main(now, playerId, entities, mapCanvas);
  });
}

function createMapCanvas (width, height) {
  var tileCanvas = document.createElement('canvas');
  var tileData = textureData.tiles.dirt;
  tileCanvas.width = tileData.width;
  tileCanvas.height = tileData.height;

  var tileContext = tileCanvas.getContext('2d');
  tileContext.drawImage(spriteSheet,
                        tileData.x,
                        tileData.y,
                        tileData.width,
                        tileData.height,
                        0,
                        0,
                        tileData.width,
                        tileData.height);

  var mapCanvas = document.createElement('canvas');
  var mapContext = mapCanvas.getContext('2d');

  mapCanvas.width = width;
  mapCanvas.height = height;
  var pattern = mapContext.createPattern(tileCanvas, 'repeat');
  mapContext.fillStyle = pattern;
  mapContext.fillRect(0, 0, width, height);
  return mapCanvas;
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
  var initialPos = new utils.Vector(50, 50);
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

    var playerTank = createTank('red', new utils.Vector(MAP_WIDTH/2, MAP_HEIGHT/2), entities);
    player.tankId = playerTank.id;

    let coords = [[180, 180], [500, 250], [250, 300], [400, 400]];
    for (let i = 0; i < coords.length; i++) {
      let coord = new utils.Vector(coords[i][0], coords[i][1]);
      createTank('beige', coord, entities);
    }
    let mapCanvas = createMapCanvas(MAP_WIDTH, MAP_HEIGHT);
    main(new Date, player.id, entities, mapCanvas);
  });
}

document.addEventListener('DOMContentLoaded', function (event) {
  window.addEventListener('resize', resizeCanvas, false);
  resizeCanvas();
  init();
});
