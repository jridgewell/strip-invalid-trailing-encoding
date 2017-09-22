# strip-invalid-trailing-encoding

Strips improperly truncated percent encodings.

```js
const base = "http://github.com";
const query = `?value=${encodeURIComponent('test ⚡')}`;

const url = base + query; // => "http://github.com?value=test%20%E2%9A%A1"

// Now, something happens and the url gets truncated:
// url = "http://github.com?value=test%20%E2%9A%A"

decodeURIComponent(url); // THROWS ERROR
```

Truncating "useless" params from a URL happen for any number of reasons.
But, it's a problem when you try to decode the values on the server
side. If the URL has been improperly truncated, you'll end up with
Errors!

Thus, `strip-invalid-trailing-encoding`, which strips the strips the
invalid trailing encodings (yah). It performs the least amount of
trimming possible to generate a valid URL:

```js
const strip = require('strip-invalid-trailing-encoding');

strip(url); // => "http://github.com?value=test%20"
```

Notice that `%20` is still in the URL? That's because it's a valid
encoding, and we try to only strip the invalid encodings.

```js
strip("value=test%20%E2%9A%A1"); // => "value=test%20%E2%9A%A1"
strip("value=test%20%E2%9A%A");  // => "value=test%20"
strip("value=test%20%E2%9A%");   // => "value=test%20"
strip("value=test%20%E2%9A");    // => "value=test%20"
strip("value=test%20%E2%9");     // => "value=test%20"
strip("value=test%20%E2%");      // => "value=test%20"
strip("value=test%20%E2");       // => "value=test%20"
strip("value=test%20%E");        // => "value=test%20"
strip("value=test%20%");         // => "value=test%20"
strip("value=test%20");          // => "value=test%20"
strip("value=test%2");           // => "value=test"
strip("value=test%");            // => "value=test"
strip("value=test");             // => "value=test"
```

## Caveats

We assume a "good" string that was truncated improperly, and fix that.
We **do not** sanitize the input string in any other way. It is possible
for attackers to craft strings that we will not strip.

```js
decodeURIComponent(strip("%A00")); // THROWS ERROR
```

