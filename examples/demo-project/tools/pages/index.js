'use strict';
/**
 * Every view of the project: view path -> view.json document.
 * To add a page: write pages/<name>.js exporting { 'Pages/<Name>': page(...) }, spread it in here,
 * and add its URL to PAGES in pages/shell.js.
 */
const shell = require('./shell');

module.exports = {
    PAGES: shell.PAGES,
    views: Object.assign({}, shell.views, require('./stubs'), require('./overview'), require('./line'), require('./quality'), require('./gallery'), require('./energy'), require('./schedule')),
};
