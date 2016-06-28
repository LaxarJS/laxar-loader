'use strict';

var fs = require( 'fs' );
var path = require( 'path' ).posix;

var loaderUtils = require( 'loader-utils' );
var laxarTooling = require( 'laxar-tooling' );

module.exports = function( source ) {
   var loaderContext = this;
   var query = loaderUtils.parseQuery( this.query );
   var done = this.async();

   var logger = {
      error: this.emitError
   };

   if( this.cacheable ) {
      this.cacheable();
   }

   var flowPath = loaderContext.resourcePath;

   if( query.artifacts ) {
      var artifactCollector = laxarTooling.artifactCollector.create( logger, {
         projectPath: projectPath,
         readJson: readJson
      } );

      projectPath( loaderContext.resourcePath )
         .then( function( flowPath ) {
            return artifactCollector.collectArtifacts( [ flowPath ] );
         } )
         .then( exportObject, done );
   }

   if( query.resources ) {
      var resourceCollector = laxarTooling.resourceCollector.create( logger, {
         readFile: readFile,
         embed: !!(query.embed)
      } );

      projectPath( loaderContext.resourcePath )
         .then( loadArtifacts )
         .then( resourceCollector.collectResources )
         .then( exportObject, done );
   }

   if( query.dependencies ) {
      var dependencyCollector = laxarTooling.dependencyCollector.create( logger, {
      } );

      projectPath( loaderContext.resourcePath )
         .then( loadArtifacts )
         .then( dependencyCollector.collectDependencies )
         .then( exportDependencies, done );
   }

   function projectPath( ref ) {
      return new Promise( function( resolve, reject ) {
         loaderContext.resolve( loaderContext.context, ref, function( err, filename ) {
            if( err ) {
               // webpack can only resolve things for which it has loaders.
               // to resolve a directory, we replace all aliases.
               filename = resolveAliases( ref, loaderContext.options.resolve.alias );
            }
            resolve( relPath( filename ) );
         } );
      } );
   }

   function loadArtifacts( flowPath ) {
      return new Promise( function( resolve, reject ) {
         var filename = absPath( flowPath );
         loaderContext.loadModule( 'laxar-loader?artifacts!' + filename, function( err, data ) {
            if( err ) {
               return reject( err );
            }
            return resolve( loaderContext.exec( data, filename ) );
         } );
      } );
   }


   function readJson( ref ) {
      var filename = absPath( ref );
      return new Promise( function( resolve, reject ) {
         if( filename === flowPath ) {
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
   }

   function readFile( ref ) {
      var filename = absPath( ref );
      return new Promise( function( resolve, reject ) {
         loaderContext.addDependency( filename );
         fs.readFile( filename, 'utf-8', function( err, data ) {
            if( err ) {
               return reject( err );
            }

            resolve( data );
         } );
      } );
   }

   function exportObject( object ) {
      done( null, 'module.exports = ' + JSON.stringify( object, undefined, "\t" ) );
   }

   function exportDependencies( modulesByTechnology ) {
      var dependencies = [];
      var registryEntries = [];

      Object.keys( modulesByTechnology )
         .reduce( function( start, technology ) {
            var end = start + modulesByTechnology[ technology].length;
            [].push.apply( dependencies, modulesByTechnology[ technology ] );
            registryEntries.push( '\'' + technology + '\': modules.slice( ' + start + ', ' + end + ' )' );
            return end;
         }, 0 );

      var requireString = '[\n   require( \'' + dependencies.join( '\' ),\n   require( \'' ) + '\' )\n]';

      done( null, 'var modules = ' + requireString + ';\n' +
                  'module.exports = {\n' +
                  '   ' + registryEntries.join( ',\n   ' ) + '\n' +
                  '};\n' );

   }

   function resolveAliases( string, aliases ) {
      return Object.keys( aliases ).reduce( function( string, alias ) {
         var pattern = new RegExp( '(^|/)' + alias + '($|/)', 'g' );
         return string.replace( pattern, '$1' + aliases[ alias ] + '$2' );
      }, string );
   }

   function relPath( ref ) {
      return path.relative( loaderContext.options.context || '', ref );
   }

   function absPath( ref ) {
      return path.resolve( loaderContext.options.context || '', ref );
   }

};
