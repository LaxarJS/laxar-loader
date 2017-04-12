/* global __resourceQuery */
module.exports = require( '!!./lib/index?artifacts&entries&' + __resourceQuery.substr( 1 ) + '!./dummy.js' );
