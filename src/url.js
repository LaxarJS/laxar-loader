/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

import { posix as path } from 'path';

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
      const context = this.options.context || '';
      const resource = path.relative( context, remainingRequest );

      this.callback( null, `module.exports = ${JSON.stringify( resource )};` );
   }
};
