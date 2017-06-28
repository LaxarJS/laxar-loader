/**
 * Copyright 2016-2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

module.exports = function( content, map ) {
   if( this.cacheable ) {
      this.cacheable();
   }

   this.callback( null, content, map );
};

module.exports.pitch = function( remainingRequest /*, precedingRequest, data */ ) {
   if( this.cacheable ) {
      this.cacheable();
   }

   if( remainingRequest.indexOf( '!' ) < 0 ) {
      const loader = require.resolve( 'raw-loader' );
      const request = `-!${loader}!${remainingRequest}`;

      this.loadModule( request, this.async() );
   }
};
