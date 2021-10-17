const t = require("@babel/types");
const { transform } = require("@babel/core");
const { parse } = require("@babel/parser");
const { expect } = require("chai");
const plugin = require("../index.js");

function replace(input, options = {}) {
  return transform(input, {
    babelrc: false,
    configFile: false,
    plugins: [
      [
        "@babel/plugin-syntax-class-properties",
        {
          loose: true,
        },
      ],
      [plugin, options],
    ],
  }).code;
}

function compare(input, output, options = {}) {
  const transformed = replace(input, options);

  if (!t.isNodesEquivalent(parse(transformed), parse(output))) {
    expect(transformed).to.equal(output);
  }
}

describe("babel-plugin-transform-private-class-members", () => {
  describe("for object member access", () => {
    it("replace properties", () => {
      compare(
        "function foo(obj) { return this._foo + obj._bar }",
        "function foo(obj) { return this.$1 + obj._bar }"
      );
    });

    it("keep properties members", () => {
      compare("obj._foo._bar", "obj._foo._bar");
    });
  });

  describe("for object expressions", () => {
    it("keep setters", () => {
      compare(
        "const a = { set _foo(value) {} }",
        "const a = { set $1(value) {} }"
      );
    });
    it("keep computed properties that are simple string literals", () => {
      compare("const a = { ['_foo']: bar }", "const a = { ['_foo']: bar }");
    });
    it("keep computed properties that are not simple string literals", () => {
      compare("const a = { [_foo]: bar }", "const a = { [_foo]: bar }");
    });
  });

  describe("for classes", () => {
    it("replace private methods", () => {
      compare(
        "class A { _foo; _bar() { this._foo; this._bar() } }",
        "class A { $1; $2() { this.$1; this.$2() } }"
      );
    });
    it("replace private getters", () => {
      compare("class A { get _foo() {} }", "class A { get $1() {} }");
    });
    it("replace private setters", () => {
      compare("class A { set _foo(value) {} }", "class A { set $1(value) {} }");
    });
    it("replace private methods and properties", () => {
      compare(
        "class A { foo; _bar; _baz; getBar() { return this._bar._bar['_bar'] } _setBar(_bar) { this._bar = _bar } }",
        "class A { foo; $1; $2; getBar() { return this.$1._bar['_bar'] } $3(_bar) { this.$1 = _bar } }"
      );
    });
    it("replace private methods and properties", () => {
      compare(
        "class A { constructor(_bar) { this._bar = _bar; this._foo.call(global) } _foo() { } _baz() { this._bar } }",
        "class A { constructor(_bar) { this.$1 = _bar; this.$2.call(global) } $2() { } $3() { this.$1 } }"
      );
    });
    it("replace private methods and properties in assigned prototype", () => {
      compare(
        "function _foo() { this._bar } function A() {} Object.assign(A.prototype, { _foo, _bar: null, baz: true });",
        "function _foo() { this.$1 } function A() {} Object.assign(A.prototype, { $2: _foo, $1: null, baz: true });"
      );
    });
    it("replace computed property names that are simple string literals", () => {
      compare("class A { ['_foo'] = '_bar'; }", "class A { ['$1'] = '_bar'; }");
    });
    it("replace computed method names that are simple string literals", () => {
      compare("class A { ['_foo']() {} }", "class A { ['$1']() {} }");
    });
    it("keep computed properties that are not simple string literals", () => {
      compare("class A { [_foo]() {} }", "class A { [_foo]() {} }");
    });
  });
});
