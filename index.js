'use strict';

var path = require( 'path' ).posix;

var loaderUtils = require( 'loader-utils' );
var laxarTooling = require( 'laxar-tooling' );

module.exports = function( source ) {
   var loaderContext = this;
   var done = this.async();
   var success = module => done( null, module );
   var query = loaderUtils.parseQuery( this.query );

   var logger = {
      error: this.emitError
   };

   if( this.cacheable ) {
      this.cacheable();
   }

   var readJson = traceDependencies( this,
                     moduleReader( this, query[ 'json-loader' ] ) ||
                     laxarTooling.jsonReader.create( logger ) );

   var readFile = traceDependencies( this,
                     moduleReader( this, query[ 'file-loader' ] ) ||
                     laxarTooling.fileReader.create( logger ) );

   var artifactCollector = laxarTooling.artifactCollector.create( logger, {
      projectPath,
      readJson
   } );

   var artifactsPromise = projectPath( this.resourcePath )
         .then( flowPath => [ flowPath ] )
         .then( artifactCollector.collectArtifacts )

   if( query.artifacts ) {
      artifactsPromise
         .then( exportObject )
         .then( success, done );
   }

   if( query.resources ) {
      var resourceCollector = laxarTooling.resourceCollector.create( logger, {
         readFile,
         embed: !!(query.embed)
      } );

      artifactsPromise
         .then( resourceCollector.collectResources )
         .then( exportObject )
         .then( success, done );
   }

   if( query.dependencies ) {
      var dependencyCollector = laxarTooling.dependencyCollector.create( logger, {
      } );

      artifactsPromise
         .then( dependencyCollector.collectDependencies )
         .then( exportDependencies )
         .then( success, done );
   }

   function projectPath( ref ) {
      return new Promise( function( resolve, reject ) {
         loaderContext.resolve( loaderContext.context, ref, function( err, filename ) {
            if( err ) {
               // webpack can only resolve things for which it has loaders.
               // to resolve a directory, we replace all aliases.
               filename = resolveAliases( ref, loaderContext.options.resolve.alias );
            }
            resolve( path.relative( loaderContext.options.context || '', filename ) );
         } );
      } );
   }
};

function moduleReader( loaderContext, loader ) {
   if( !loader ) {
      return;
   }

   return function readModule( filename ) {
      var request = isString( loader ) ?
                    '!!' + loader + '!' + filename :
                    Array.isArray( loader ) ?
                    '!!' + loader.join( '!' ) + '!' + filename :
                    filename;

      return new Promise( function( resolve, reject ) {
         loaderContext.loadModule( request, function( err, module ) {
            if( err ) {
               reject( err );
            } else {
               resolve( loaderContext.exec( module, filename ) );
            }
         } );
      } );
   };
}

function isString( something ) {
   return ( typeof something === 'string' ) || ( something instanceof String );
}

function traceDependencies( loaderContext, fn ) {
   return function( ref, ...args ) {
      var filename = path.resolve( loaderContext.options.context || '', ref );
      loaderContext.addDependency( filename );
      return fn( filename, ...args );
   };
}

function resolveAliases( string, aliases ) {
   return Object.keys( aliases ).reduce( function( string, alias ) {
      var pattern = new RegExp( '(^|/)' + alias + '($|/)', 'g' );
      return string.replace( pattern, '$1' + aliases[ alias ] + '$2' );
   }, string );
}

function exportObject( object ) {
   return 'module.exports = ' + JSON.stringify( object, undefined, "\t" ) + ';';
}

function exportDependencies( modulesByTechnology ) {
   var dependencies = [];
   var registryEntries = [];

   Object.keys( modulesByTechnology )
      .reduce( function( start, technology ) {
         var end = start + modulesByTechnology[ technology ].length;
         [].push.apply( dependencies, modulesByTechnology[ technology ] );
         registryEntries.push( '\'' + technology + '\': modules.slice( ' + start + ', ' + end + ' )' );
         return end;
      }, 0 );

   var requireString = '[\n   ' + dependencies.map( function( dependency ) {
      return 'require( \'' + dependency + '\' )';
   } ).join( ',\n   ' ) + '\n]';

   return 'var modules = ' + requireString + ';\n' +
          'module.exports = {\n' +
          '   ' + registryEntries.join( ',\n   ' ) + '\n' +
          '};\n';
}

