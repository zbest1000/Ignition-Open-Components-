/**
 * Minimal React-based stand-in for the Perspective client runtime, which is
 * an external in the real bundle. `Component` must be a real React component
 * class so the charts actually render under test.
 */
const React = require('react');

const registered = [];

module.exports = {
    Component: React.Component,
    ComponentRegistry: {
        register: (meta) => { registered.push(meta); },
    },
    __registered: registered,
};
