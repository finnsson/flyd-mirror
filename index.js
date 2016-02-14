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
 */
function attachDeps(s) {
  var deps = s.deps;
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
  thisStream.end.deps = [];

  function updateListeners() {
    currentAutoStreamFn = thisStream;
    autoStreamFnStack.push(thisStream);
    // clear all triggers / listeners
    detachDeps(thisStream);
    detachDeps(thisStream.end);
    // rerun fn and collect triggers / listeners
    var result = fn();
    attachDeps(thisStream);
    attachDeps(thisStream.end);
    // reset currentAutoStreamFn
    autoStreamFnStack.pop();
    currentAutoStreamFn = autoStreamFnStack[autoStreamFnStack.length - 1]; // last item
    thisStream(result);
  }
  thisStream.fn = updateListeners;
  updateListeners();

  return thisStream;
};

function wrap(key, data, image) {
  if (key === "constructor" || key === "toString") {
    // noop
    return;
  }
  var value = data[key];
  if (!flyd.isStream(value) && typeof value === "function") {
    image[key] = function() {
      // TODO: do not use data as scope!
      return fmirror.image(value.apply(this._$_, arguments));
    }
  } else {
    Object.defineProperty(image, key, {
      get: function() {
        var result = value;
        return fmirror.image(result);
      },
      enumerable: true
    });
  }
}

var classImages = {};

var __extends = (this && this.__extends) || function(d, b) {
  for (var p in b)
    if (b.hasOwnProperty(p)) d[p] = b[p];

  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};

function getImageClass(data) {
  var proto = Object.getPrototypeOf(data);
  if (proto == RegExp.prototype) {
    return data.constructor;
  } else if (proto === Object.prototype) {
    // do nothing
    return data.constructor;
  } else if (proto === Function.prototype) {
    // do nothing
    return data.constructor;
  } else if (classImages[proto]) {
    return classImages[proto];
  } else {
    // should be custom prototype. Wrap own properties in recursion
    var ImageClass = getImageClass(proto);
    var Image = (function(_super) {
      __extends(Image, _super);

      function Image() {
        _super.apply(this, arguments);
      }
      return Image;
    })(ImageClass);
    /*
    let Image = function() {
      ImageClass.call(this);
    };
    Image.prototype = new ImageClass();
    */
    Object.getOwnPropertyNames(proto).forEach(function(key) {
      wrap(key, proto, Image.prototype);
    });
    classImages[proto] = Image;
    return Image;
  }
}

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
        if (s.end) {
          currentAutoStreamFn.end.deps.push(s.end);
        }
      }
    }
  }
  if(data == null) {
    return data;
  }
  // only image objects, not functions, primitives, etc
  if (typeof data !== "object") {
    return data;
  }
  var ImageClass = getImageClass(data);
  var image = new ImageClass();
  image._$_ = data;
  Object.getOwnPropertyNames(data).forEach(function(key) {
    wrap(key, data, image);
  });
  return image;
};

module.exports = fmirror;
