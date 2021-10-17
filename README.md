# babel-plugin-transform-private-class-members ![](https://github.com/richardDobron/babel-plugin-transform-private-class-members/workflows/tests/badge.svg) [![npm](https://img.shields.io/npm/v/babel-plugin-transform-private-class-members.svg)](https://www.npmjs.com/package/babel-plugin-transform-private-class-members)

Mangle JavaScript private class members.

## Installation

```
$ npm install babel-plugin-transform-private-class-members
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["babel-plugin-transform-private-class-members"]
}
```

### Via CLI

```sh
$ babel --plugins babel-plugin-transform-private-class-members script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  plugins: ["babel-plugin-transform-private-class-members"]
});
```

## Example

Input file:

```js
class Rectangle {
    result = null;

    constructor(height, width) {
        this._height = height;
        this._width = width;
    }

    area() {
        if (this.result === null) {
            this.result = this._calcArea();
        }

        return this.result;
    }

    _calcArea() {
        return this._height * this._width;
    }
}
```

Output:

```js
class Rectangle {
    result = null;

    constructor(height, width) {
        this.$1 = height;
        this.$2 = width;
    }

    area() {
        if (this.result === null) {
            this.result = this.$3();
        }

        return this.result;
    }

    $3() {
        return this.$1 * this.$2;
    }
}
```

## Options

| Option      | Description                                               | Default                                     |
| ----------- | --------------------------------------------------------- | ------------------------------------------- |
| blacklist   | A RegEx defining which members to ignore                  | *[ /^_super.*/, /^__.*/, /^_$/, /^[^_].*/ ] |
| memoize     | Keep mangle position and keys for another transform       | *false*                                     |
| onlyClass   | Replace only private class members and properties         | *true*                                      |

## License

This plugin is licensed under the MIT license. See [LICENSE](./LICENSE).
