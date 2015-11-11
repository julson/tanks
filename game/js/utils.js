'use strict';

class Vector {
  constructor (x, y) {
    this.x = x;
    this.y = y;
  }
}

module.exports = {
  toRadians (degree) {
    return degree * Math.PI / 180;
  },
  Vector
};
