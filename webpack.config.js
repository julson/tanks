var path = require('path');
module.exports = {
  context : path.join(__dirname, 'game'),
  entry : {
    javascript : './js/index.js'
  },
  output : {
    path : path.join(__dirname, 'game'),
    filename : 'bundle.js'
  }
};
