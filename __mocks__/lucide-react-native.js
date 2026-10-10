const icons = {};
const handler = {
  get: function(target, name) {
    if (!icons[name]) {
      icons[name] = name;
    }
    return name;
  }
};
module.exports = new Proxy({}, handler);
