"use strict";

var flyd = require("flyd");

var fmirror = {};

var currentAutoStreamFn;
var autoStreamFnStack = [];

/**
 * @private
 * copy from flyd
 */
function removeListener(s, listeners) {
  var idx = listeners.indexOf(s);
  listeners[idx] = listeners[listeners.length - 1];
  listeners.length--;
}

/**
 * @private
 * copy from flyd
 */
function detachDeps(s) {
  for (var i = 0; i < s.deps.length; ++i) {
    removeListener(s, s.deps[i].listeners);
  }
  s.deps.length = 0;
}

/**
 * @private
 * copy from flyd
 */
function addListeners(deps, s) {
  for (var i = 0; i < deps.length; ++i) {
    deps[i].listeners.push(s);
  }
}

/**
 * Creates a new mirror
 *
 * __Signature__: `(() -> a) -> Stream a`
 *
 * @name flyd-mirror.mirror
 * @param {Function} fn - the function to run every time a dependency is updated
 * @return {stream} the stream
 *
 * @example
 * var data = {a: flyd.stream(2)};
 * var image = fm.image(data);
 * var sqMirror = fm.mirror(function() { return data.a*data*a; });
 */
fmirror.mirror = function(fn) {
  var thisStream = flyd.stream();
  thisStream.deps = [];

  function updateListeners() {
    currentAutoStreamFn = thisStream;
    autoStreamFnStack.push(thisStream);
    // clear all triggers / listeners
    detachDeps(thisStream);
    // rerun fn and collect triggers / listeners
    var result = fn();
    addListeners(thisStream.deps, thisStream);
    // reset currentAutoStreamFn
    autoStreamFnStack.pop();
    currentAutoStreamFn = autoStreamFnStack[autoStreamFnStack.length - 1]; // last item
    thisStream(result);
  }
  thisStream.fn = updateListeners;
  updateListeners();

  return thisStream;
};

/**
 * Creates a new mirror
 *
 * __Signature__: `Stream a -> a`
 *
 * @name flyd-mirror.image
 * @param {stream} stream - the stream
 * @return {*} unwrapped data
 *
 * @example
 * var data = {a: flyd.stream(2)};
 * var image = fm.image(data);
 * var sq = image.a * image.b;
 */
fmirror.image = function(data) {
  // automatically unwrap streams
  while (flyd.isStream(data)) {
    var s = data;
    data = data();
    if (currentAutoStreamFn) {
      if (currentAutoStreamFn.deps.indexOf(s) === -1) {
        currentAutoStreamFn.deps.push(s);
      }
    }
  }
  // only image objects, not functions, primitives, etc
  if (typeof data !== "object") {
    return data;
  }
  // only image data on object, not its prototype since it would be
  // very bad practice to put streams on a prototype.
  var image = {};
  Object.keys(data).forEach(function(key) {
    if (!flyd.isStream(data[key]) && typeof data[key] === "function") {
      image[key] = function() {
        return fmirror.image(data[key].apply(data, arguments));
      }
    } else {
      Object.defineProperty(image, key, {
        get: function() {
          var result = data[key];
          return fmirror.image(result);
        },
        enumerable: true
      });
    }
  });
  return image;
};

module.exports = fmirror;
