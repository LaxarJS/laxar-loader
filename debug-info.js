/* global process, __resourceQuery */
if( process && process.env.NODE_ENV !== 'production' ) {
   module.exports = require( '!!bundle-loader?lazy&name=debug-info!./lib/index?debug&entries&' + __resourceQuery.substr( 1 ) + '!./dummy.js' );
}
else {
   module.exports = { info: 'debug info not available in production' };
}
