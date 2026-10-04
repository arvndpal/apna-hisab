const React = require('react');

// Jest-only: avoid transforming lucide's hundreds of individual icon .mjs files on every run.
// Any named import (Fuel, House, LayoutGrid, ...) resolves to a trivial stand-in component.
function makeIcon(name) {
  const Icon = (props) => React.createElement('Icon', { ...props, name });
  Icon.displayName = name;
  return Icon;
}

module.exports = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (prop === '__esModule') return true;
      if (prop === 'default') return makeIcon('default');
      return makeIcon(String(prop));
    },
  },
);
