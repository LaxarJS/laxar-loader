'use strict';

var loaderUtils = require( 'loader-utils' );
var laxarTooling = require( 'laxar-tooling' );

module.exports = function( source ) {
   var loaderContext = this;
   var done = this.async();

   if( this.cacheable ) {
      this.cacheable();
   }

   var artifactCollector = laxarTooling.artifactCollector.create( null, {
      projectPath: projectPath,
      readJson: readJson
   } );

   artifactCollector.collectArtifacts( [ loaderContext.resourcePath ] )
      .then( function( artifacts ) {
         done( null, 'module.exports = ' + JSON.stringify( artifacts, undefined, "\t" ) );
      }, done );

   function projectPath( ref ) {
      return ref;
   }

   function readJson( ref ) {
      return new Promise( function( resolve, reject ) {
         loaderContext.resolve( loaderContext.context, ref, function( err, filename ) {
            if( err ) {
               return reject( err );
            }

            if( filename === loaderContext.resourcePath ) {
               return resolve( loaderContext.exec( source, filename ) );
            }

            loaderContext.addDependency( filename );
            loaderContext.loadModule( filename, function( err, data ) {
               if( err ) {
                  return reject( err );
               }

               resolve( loaderContext.exec( data, filename ) );
            } );
         } );
      } );
   }
};
