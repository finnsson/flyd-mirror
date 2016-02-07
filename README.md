# flyd-mirror

A small (0.5 kB min+gzip) module for [flyd](https://github.com/paldepind/flyd)
that can generate `mirror`s and `image`s, useful when you want to combine
reactive programming with plain old JavaScript objects.

## Install

```bash
npm install flyd-mirror
```

## Examples

`image` is automatically unwrapping streams...

```javascript
var data = {
  name: flyd.stream("Fry"),
  age: flyd.stream(1023)
};
var image = fm.image(data);
assert.equal(image.name, "Fry");
assert.equal(image.age, 1023);
```

...while `mirror` is listening to these unwrappings...

```javascript
var sq = fm.mirror(function() {
  return image.age*image.age;
});
assert.equal(sq(), 1046529);
data.age(1024); // happy birthday!
assert.equal(sq(), 1048576);
```

making it possible for the mirror to automatically update when the underlying
streams are updated.
