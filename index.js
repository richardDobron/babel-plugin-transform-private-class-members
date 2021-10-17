const defaultBlacklist = [
  /^_super.*/, // prefix _super
  /^_extend.*/, // prefix _extend
  /^__.*/, // prefix __
  /^_$/, // underscore
  /^[^_].*/, // properties without underscore
];

function escapeRegExp(pattern) {
  if (Object.prototype.toString.call(pattern) === "[object RegExp]") {
    return pattern.source.replace(/\//g, "/");
  } else if (typeof pattern === "string") {
    // eslint-disable-next-line
    const escaped = pattern.replace(/[\-\[\]\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");

    return escaped.replace(/\//g, "\\" + "/");
  } else {
    throw new Error("Unexpected blacklist pattern: " + pattern);
  }
}

function blacklist(additionalBlacklist) {
  return new RegExp(
    "(" +
      (additionalBlacklist || [])
        .concat(defaultBlacklist)
        .map(escapeRegExp)
        .join("|") +
      ")$"
  );
}

module.exports = function ({ types: t }, options = {}) {
  let privateId = 1;

  const blacklistRegex = blacklist(options.blacklist),
    memoize = options.memoize || false,
    onlyClassMembers =
      options.onlyClassMembers === undefined ? true : options.onlyClassMembers,
    nameMap = new Map();

  function createPrivateName(name) {
    let newName = nameMap.get(name);
    if (!newName) {
      newName = "$" + privateId++;
      nameMap.set(name, newName);
    }

    return newName;
  }

  function isPrototypeMethod(assignment) {
    const { left } = assignment;

    if (
      left &&
      t.isMemberExpression(left) &&
      t.isMemberExpression(left.object) &&
      left.object.property.name === "prototype"
    ) {
      return left.object.object.name;
    }

    return null;
  }

  const replaceClassPropertyOrMethod = {
    exit(path) {
      const { node } = path;

      if (
        onlyClassMembers &&
        !t.isClassProperty(node) &&
        !t.isClassMethod(node) &&
        !t.isIdentifier(node.key)
      ) {
        return;
      }

      if (t.isIdentifier(node.key) && node.computed) {
        return;
      }

      const name = node.key.name || node.key.value;

      if (blacklistRegex.test(name)) {
        return;
      }

      const newName = createPrivateName(name),
        newNode = t.cloneNode(node, false);

      if (t.isIdentifier(node.key) && t.isValidIdentifier(newName)) {
        newNode.key = t.identifier(newName);
      } else {
        newNode.key = t.stringLiteral(newName);
      }

      path.replaceWith(newNode);
      path.skip();
    },
  };

  return {
    name: "transform-private-class-members",
    visitor: {
      Property: replaceClassPropertyOrMethod,
      Method: replaceClassPropertyOrMethod,
      MemberExpression: {
        exit(path) {
          const { node } = path;

          if (
            onlyClassMembers &&
            !t.isThisExpression(node.object) &&
            !isPrototypeMethod(path.parent)
          ) {
            return;
          }

          if (!t.isIdentifier(node.property) || node.computed) {
            return;
          }

          const { name } = node.property;

          if (blacklistRegex.test(name)) {
            return;
          }

          const newName = createPrivateName(name);

          let newNode;

          if (t.isValidIdentifier(newName)) {
            newNode = t.memberExpression(node.object, t.identifier(newName));
          } else {
            newNode = t.memberExpression(
              node.object,
              t.stringLiteral(newName),
              true
            );
          }

          path.replaceWith(newNode);
          path.skip();
        },
      },
    },
    post: () => {
      if (!memoize) {
        nameMap.clear();
        privateId = 1;
      }
    },
  };
};
