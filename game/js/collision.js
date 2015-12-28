'use strict';

var utils = require('./utils.js');

var Vector = utils.Vector;

class Projection {
  constructor (min, max) {
    this.min = min;
    this.max = max;
  }
}

function dotProduct (v1, v2) {
  return v1.x * v2.x + v1.y * v2.y;
}

function normalize (v) {
  let len = Math.sqrt(v.x * v.x + v.y * v.y);
  return new Vector(v.x / len, v.y / len );
}

function normal (v) {
  return new Vector(-v.y, v.x);
}

function subtract (v1, v2) {
  return new Vector(v1.x - v2.x, v1.y - v2.y);
}

function negate (v) {
  return new Vector(-v.x, -v.y);
}

function projectPolygon (corners, axis) {
  let min = dotProduct(corners[0], axis);
  let max = min;

  for (let i = 0; i < corners.length; i++) {
    let p = dotProduct(corners[i], axis);
    if (p < min) {
      min = p;
    } else if (p > max) {
      max = p;
    }
  }
  return new Projection(min, max);
}

function rotate (v, center, angle) {
  //not sure yet on why it has to be negative, but this matches the actual rotation of the object
  let radians = -utils.toRadians(angle);
  let magX = (center.x - v.x);
  let magY = (center.y - v.y);
  let x = center.x + magX * Math.cos(radians) + magY * Math.sin(radians);
  let y = center.y - magX * Math.sin(radians) + magY * Math.cos(radians);
  return new Vector(x, y);
}

function getCorners (p) {
  let verts = [];
  let centerX = p.position.x;
  let centerY = p.position.y;
  let halfWidth = p.dimension.halfWidth;
  let halfHeight = p.dimension.halfHeight;

  verts[0] = new Vector(centerX + halfWidth, centerY + halfHeight);
  verts[1] = new Vector(centerX + halfWidth, centerY - halfHeight);
  verts[2] = new Vector(centerX - halfWidth, centerY - halfHeight);
  verts[3] = new Vector(centerX - halfWidth, centerY + halfHeight);

  return _.map(verts, v => rotate(v, p.position, p.rotation));
}

function getAxes (corners) {
  let axes = [];

  for (let i = 0; i < corners.length; i++) {
    let c1 = corners[i];
    let c2 = corners[i + 1 == corners.length ? 0 : i + 1];
    let edge = subtract(c1, c2);
    let perp = normal(edge);
    axes.push(normalize(perp));
  }
  return axes;
}

function intervalDistance(p1Projection, p2Projection) {
  if (p1Projection.min < p2Projection.min) {
    return p2Projection.min - p1Projection.max;
  } else {
    return p1Projection.min - p2Projection.max;
  }
}

module.exports = {

  // we assume that the polygons are quadrilaterals for now
  isColliding (p1, p2) {
    let p1Corners = getCorners(p1),
        p2Corners = getCorners(p2),
        axes = getAxes(p1Corners).concat(getAxes(p2Corners)),
        isColliding = true,
        minInterval = null,
        translationAxis;

    for (let i = 0; i < axes.length; i++) {
      let axis = axes[i],
          p1Projection = projectPolygon(p1Corners, axis),
          p2Projection = projectPolygon(p2Corners, axis),
          interval = intervalDistance(p1Projection, p2Projection);

      // polygons are not intersecting
      if (interval > 0) {
        return false;
      }

      interval = Math.abs(interval);
      if (_.isNull(minInterval) || interval < minInterval) {
        minInterval = interval;
        translationAxis = axis;

        let displacement = subtract(p1.position, p2.position);
        if (dotProduct(displacement, translationAxis) < 0) {
          translationAxis = negate(translationAxis);
        }
      }
    }
    return new Vector(translationAxis.x * minInterval, translationAxis.y * minInterval);
  }
};
