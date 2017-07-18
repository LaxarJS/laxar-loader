/* global process, __resourceQuery */

// Note: webpack has to be able to parse this condition statically.
//       If you change it, make sure it's still correctly processed by webpack.
//       If in doubt consult webpack/lib/Parser.js.
if( __resourceQuery !== __resourceQuery.replace( /(^\?|\&)lazy(\&|$)/, '$1' ) ) {
   module.exports = function( callback ) {
      require.ensure( [], function( require ) {
         callback( require( '!!./lib/index?debug&entries&' + __resourceQuery.substr( 1 ) + '!./dummy.js' ), callback );
      }, 'debug-info' );
   };
}
else if( process && process.env && process.env.NODE_ENV === 'production' ) {
   module.exports = { info: 'debug info not available in production' };
}
else {
   module.exports = require( './lib/index?debug&entries&' + __resourceQuery.substr( 1 ) + '!./dummy.js' );
}
