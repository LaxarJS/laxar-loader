/* global process, __resourceQuery */
if( /(^\?|\&)lazy(\&|$)/.test( __resourceQuery ) ) {
   module.exports = require( '!!bundle-loader?lazy&name=debug-info!./lib/index?debug&entries&' + __resourceQuery.substr( 1 ) + '!./dummy.js' );
}
else if( process && process.env && process.env.NODE_ENV === 'production' ) {
   module.exports = { info: 'debug info not available in production' };
}
else {
   module.exports = require( './lib/index?debug&entries&' + __resourceQuery.substr( 1 ) + '!./dummy.js' );
}
