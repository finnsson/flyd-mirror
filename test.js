var assert = require("assert");
var flyd = require("flyd");
var flydMirror = require("./index");

describe('flyd-mirror', function() {
  describe('image api', function() {
    it('unwraps all streams', function() {
      var data = {
        a: flyd.stream(1),
        b: flyd.stream(2)
      };
      var image = flydMirror.image(data);
      assert.equal(image.a(), 1);
      assert.equal(image.b(), 2);

      data.a(5);
      assert.equal(image.a(), 5);
    });

    it('unwraps streams in functions', function() {
      var data = {
        name: flyd.stream("Pelle"),
        getName: function() {
          return this.name()
        },
        getNameStream: function() {
          return this.name
        },
        getArr: function() {
          return ["foo"];
        }
      };

      var image = flydMirror.image(data);
      assert.equal(image.getName(), "Pelle");
      assert.equal(image.getArr()[0], "foo");
      data.name("Arne");
      assert.equal(image.getNameStream()(), "Arne");
    });

    it('unwraps streams with arrays', function() {
      var data = {
        names: flyd.stream(["Pelle", "Arne"]),
        arrNames: ["Lars", "Urban"]
      };

      var image = flydMirror.image(data);
      assert.equal(image.names()[0], "Pelle");
      assert.equal(image.names()[1], "Arne");
      assert.equal(image.arrNames[0], "Lars");
      assert.equal(image.arrNames[1], "Urban");
      assert.equal(image.arrNames.length, 2);

      var arrNamesLength = image.arrNames.map(function(n) {
        return n.length;
      });
      assert.equal(arrNamesLength.length, 2);
      assert.equal(arrNamesLength[0], 4);
      assert.equal(arrNamesLength[1], 5);

      data.names(["Sofia", "Lena"]);

      assert.equal(image.names()[0], "Sofia");
      assert.equal(image.names()[1], "Lena");

      var namesLength = image.names().map(function(n) {
        return n.length;
      });
      assert.equal(namesLength.length, 2);
      assert.equal(namesLength[0], 5);
      assert.equal(namesLength[1], 4);
    });

    it('unwraps data with methods on prototype', function() {
      var User = function(name) {
        this.name = flyd.stream(name);
      };
      User.prototype.getName = function() {
        return this.name();
      };
      User.prototype.getNameStream = function() {
        return this.name;
      };
      var data = new User("Pelle");

      var image = flydMirror.image(data);
      assert.equal(image.getName(), "Pelle");
      data.name("Arne");
      assert.equal(image.getNameStream()(), "Arne");
    });

    it('permits calling updating actions with arguments', function() {
      var data = {
        name: flyd.stream("Pelle"),
        setName: function(n) {
          this.name(n);
        }
      };

      var image = flydMirror.image(data);
      assert.equal(image.name(), "Pelle");
      image.setName("Arne");
      assert.equal(image.name(), "Arne");
    });

    it('permits null and undefined values', function() {
      var data = {
        name: null,
        age: flyd.stream(null),
        gender: undefined
      };

      var image = flydMirror.image(data);
      assert.equal(image.name, null);
      assert.equal(image.age(), null);
      assert.equal(image.gender, undefined);

      data.age(42);
      assert.equal(image.age(), 42);
    });
  });

  describe('mirror api', function() {
    it('updates when dependencies update', function() {
      var data = {
        a: flyd.stream(2),
        b: flyd.stream(3)
      };
      var image = flydMirror.image(data);
      var sqMirror = flydMirror.mirror(function() {
        return image.a() * image.b();
      });
      assert.equal(sqMirror(), 6);

      // update dependencies
      data.a(7);
      assert.equal(sqMirror(), 21);
      data.b(-1);
      assert.equal(sqMirror(), -7);
    });

    it('can be terminated manually', function() {
      var data = {
        a: flyd.stream(1)
      };
      var count = 0;
      var image = flydMirror.image(data);
      var sqMirror = flydMirror.mirror(function() {
        count++;
        return image.a() * image.a();
      });

      assert.equal(sqMirror(), 1);
      assert.equal(count, 1);
      data.a(4);
      assert.equal(sqMirror(), 16);
      assert.equal(count, 2);
      assert.equal(sqMirror.deps.length, 1);
      // terminate sqMirror
      sqMirror.end(true);
      assert.equal(count, 2);
      assert.equal(sqMirror.deps.length, 0);
    });

    it('can be terminated automatically', function() {
      var data = {
        a: flyd.stream(1)
      };
      var count = 0;
      var image = flydMirror.image(data);
      var sqMirror = flydMirror.mirror(function() {
        count++;
        return image.a() * image.a();
      });

      assert.equal(sqMirror(), 1);
      assert.equal(count, 1);
      data.a(4);
      assert.equal(sqMirror(), 16);
      assert.equal(count, 2);
      assert.equal(sqMirror.deps.length, 1);
      assert.equal(sqMirror.deps[0], data.a);
      assert.equal(data.a.listeners.length, 1);
      assert.equal(data.a.listeners[0], sqMirror);
      // terminate a
      data.a.end(true);
      assert.equal(count, 2);
      assert.equal(sqMirror.deps.length, 0);
      assert.equal(data.a.listeners.length, 0);
    });

    it('is updated when current dependencies change', function() {
      var a = flyd.stream(1);
      var b = flyd.stream(2);
      var c = flyd.stream(3);
      var data = {
        a: a,
        b: b,
        c: c
      };
      var image = flydMirror.image(data);
      var count = 0;

      var abTest = flydMirror.mirror(function() {
        count++;
        if (image.a() > 0) {
          return image.b();
        } else {
          return image.c();
        }
      });
      assert.equal(abTest(), 2);
      assert.equal(count, 1);
      assert.equal(a.listeners.length, 1);
      assert.equal(b.listeners.length, 1);
      assert.equal(c.listeners.length, 0);
      assert.equal(abTest.deps.length, 2);

      c(5);
      assert.equal(abTest(), 2);
      assert.equal(count, 1);
      assert.equal(a.listeners.length, 1);
      assert.equal(b.listeners.length, 1);
      assert.equal(c.listeners.length, 0);
      assert.equal(abTest.deps.length, 2);

      b(11);
      assert.equal(abTest(), 11);
      assert.equal(count, 2);
      assert.equal(a.listeners.length, 1);
      assert.equal(b.listeners.length, 1);
      assert.equal(c.listeners.length, 0);
      assert.equal(abTest.deps.length, 2);

      a(-1);
      assert.equal(abTest(), 5);
      assert.equal(abTest(), 5);
      assert.equal(count, 3);
      assert.equal(a.listeners.length, 1);
      assert.equal(b.listeners.length, 0);
      assert.equal(c.listeners.length, 1);
      assert.equal(abTest.deps.length, 2);
    });

    it('updates correct mirror when dependencies change', function() {
      var data = {
        a: flyd.stream(42),
        b: {
          a: flyd.stream(11)
        }
      };
      var image = flydMirror.image(data);
      var rootMirrorCount = 0;
      var subMirrorCount = 0;
      var subMirrorResult = 0;
      var rootMirror = flydMirror.mirror(function() {
        rootMirrorCount++;
        var subMirror = flydMirror.mirror(function() {
          subMirrorCount++;
          subMirrorResult = image.b.a() * image.a();
        });
        return image.a()*image.a();
      });

      assert.equal(rootMirror(), 42*42);
      assert.equal(rootMirrorCount, 1);
      assert.equal(subMirrorResult, 42*11);
      assert.equal(subMirrorCount, 1);

      data.b.a(12);

      // now only subMirror should be updated
      assert.equal(rootMirror(), 42*42);
      assert.equal(rootMirrorCount, 1);
      assert.equal(subMirrorResult, 42*12);
      assert.equal(subMirrorCount, 2);

    });
  });
});
