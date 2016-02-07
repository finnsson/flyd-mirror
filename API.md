# image

Creates a new mirror

**Signature**: `Stream a -> a`

**Parameters**

-   `stream` **stream** the stream
-   `data`  

**Examples**

```javascript
var data = {a: flyd.stream(2)};
var image = fm.image(data);
var sq = image.a * image.b;
```

Returns **Any** unwrapped data

# mirror

Creates a new mirror

**Signature**: `(() -> a) -> Stream a`

**Parameters**

-   `fn` **Function** the function to run every time a dependency is updated

**Examples**

```javascript
var data = {a: flyd.stream(2)};
var image = fm.image(data);
var sqMirror = fm.mirror(function() { return data.a*data*a; });
```

Returns **stream** the stream
