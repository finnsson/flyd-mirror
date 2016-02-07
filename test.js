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
      // console.error("data.a", data.a());
      // console.error("data['a'].apply(data, arguments)", data["a"].apply(data, []));
      assert.equal(image.a, 1);
      assert.equal(image.b, 2);

      data.a(5);
      assert.equal(image.a, 5);

      var c = flyd.stream("Pelle");
      data.b(c);
      assert.equal(image.b, "Pelle");
    });

    it('unwraps streams in functions', function() {
      var data = {
        name: flyd.stream("Pelle"),
        getName: function() { return this.name() },
        getNameStream: function() { return this.name }
      };

      var image = flydMirror.image(data);
      assert.equal(image.getName(), "Pelle");
      data.name("Arne");
      assert.equal(image.getNameStream(), "Arne");
    });

    it('permits calling updating actions with arguments', function() {
      var data = {
        name: flyd.stream("Pelle"),
        setName: function(n) { this.name(n); }
      };

      var image = flydMirror.image(data);
      assert.equal(image.name, "Pelle");
      image.setName("Arne");
      assert.equal(image.name, "Arne");
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
        return image.a*image.b;
      });
      assert.equal(sqMirror(), 6);

      // update dependencies
      data.a(7);
      assert.equal(sqMirror(), 21);
      data.b(-1);
      assert.equal(sqMirror(), -7);
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
        if(image.a > 0) {
          return image.b;
        } else {
          return image.c;
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
  });
});
