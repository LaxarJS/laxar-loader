'use strict';

var path = require( 'path' ).posix;

var loaderUtils = require( 'loader-utils' );
var laxarTooling = require( 'laxar-tooling' );

var NodeTemplatePlugin = require("webpack/lib/node/NodeTemplatePlugin");
var NodeTargetPlugin = require("webpack/lib/node/NodeTargetPlugin");
var LibraryTemplatePlugin = require("webpack/lib/LibraryTemplatePlugin");
var SingleEntryPlugin = require("webpack/lib/SingleEntryPlugin");
var LimitChunkCountPlugin = require("webpack/lib/optimize/LimitChunkCountPlugin");

function lookup( object ) {
   return function( key ) { return object[ key ]; };
}

module.exports = function( source ) {
   var loaderContext = this;
   var query = loaderUtils.parseQuery( this.query );

   var queryModes = [
      'artifacts',
      'resources',
      'dependencies',
      'stylesheets'
   ];

   if( queryModes.filter( lookup( query ) ).length !== 1 ) {
      var message = 'Expected exactly on of the following query parameters: ' +
                    queryModes.join( ', ' );
      return this.emitError( new Error( message ) );
   }

   if( loaderContext[ __filename ] === false ) {
      return '';
   }

   if( this.cacheable ) {
      this.cacheable();
   }

   var logger = {
      error: this.emitError
   };

   var done = this.async();
   var success = function( result ) {
      done( null, result );
   };

   var publicPath = typeof query.publicPath === "string" ? query.publicPath : loaderContext._compilation.outputOptions.publicPath;

   var readJson = traceDependencies( this,
                     moduleReader( this, query[ 'json-loader' ], publicPath ) ||
                     laxarTooling.jsonReader.create( logger ) );

   var readFile = traceDependencies( this,
                     moduleReader( this, query[ 'raw-loader' ], publicPath ) ||
                     laxarTooling.fileReader.create( logger ) );

   var readCss = traceDependencies( this,
                    moduleReader( this, query[ 'css-loader' ], publicPath ) ||
                    laxarTooling.fileReader.create( logger ) );

   var artifactCollector = laxarTooling.artifactCollector.create( logger, {
      projectPath: projectPath,
      readJson: readJson
   } );

   var artifactsPromise = projectPath( this.resourcePath )
         .then( function( flowPath ) { return [ flowPath ]; } )
         .then( artifactCollector.collectArtifacts )

   if( query.artifacts ) {
      artifactsPromise
         .then( exportObject )
         .then( success, done );
   }

   if( query.resources ) {
      var resourceCollector = laxarTooling.resourceCollector.create( logger, {
         readFile: readFile,
         embed: query.embed
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

   if( query.stylesheets ) {
      var stylesheetCollector = laxarTooling.stylesheetCollector.create( logger, {
         readFile: readCss,
      } );

      artifactsPromise
         .then( stylesheetCollector.collectStylesheets )
         .then( exportStyles )
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

function moduleReader( loaderContext, loader, publicPath ) {
   if( !loader ) {
      return;
   }

   return function readModule( filename ) {
      var projectFile = path.relative( loaderContext.options.context || '', filename );
      var outputOptions = {
         filename: projectFile,
         publicPath: publicPath
      };
      var compiler = loaderContext._compilation.createChildCompiler( projectFile, outputOptions );
      var request = isString( loader ) ?
                    '!!' + loader + '!' + filename :
                    Array.isArray( loader ) ?
                    '!!' + loader.join( '!' ) + '!' + filename :
                    filename;

      compiler.apply(new NodeTemplatePlugin(outputOptions));
      compiler.apply(new LibraryTemplatePlugin(null, 'commonjs2'));
      compiler.apply(new NodeTargetPlugin());
      compiler.apply(new SingleEntryPlugin(loaderContext.context, request));
      compiler.apply(new LimitChunkCountPlugin({ maxChunks: 1 }));

      loaderContext.addDependency( filename );

      return new Promise( function( resolve, reject ) {
         var asset;
         var source;
         var map;

         compiler.plugin( 'after-compile', function( compilation, callback ) {
            asset = compilation.assets[ outputOptions.filename ];
            source = asset && asset.source();
            map = asset && asset.map();

            compilation.chunks.forEach( function( chunk ) {
               chunk.files.forEach( function( file ) {
                  delete compilation.assets[ file ];
               } );
            } );
            callback();
         } );

         compiler.plugin( 'this-compilation', function( compilation ) {
            compilation.plugin( 'normal-module-loader', function( loaderContext ) {
               loaderContext[ __filename ] = false;
            } );
         } );

         compiler.runAsChild( function( err, entries, compilation ) {
            if( err ) {
               return reject( err );
            }

            if( compilation.errors.length > 0 ) {
               return reject( compilation.errors[ 0 ] );
            }

            if( !source ) {
               return reject(new Error('Didn\'t get a result from compiler'));
            }

            compilation.fileDependencies
               .forEach( loaderContext.addDependency, loaderContext );
            compilation.contextDependencies
               .forEach( loaderContext.addContextDependency, loaderContext );

            loaderContext[ __filename ] = true;

            try {
               var code = loaderContext.exec( source, filename );
               resolve( code );
            }
            catch( err ) {
               reject( err );
            }
         } );
      } );
   };
}

function isString( something ) {
   return ( typeof something === 'string' ) || ( something instanceof String );
}

function traceDependencies( loaderContext, fn ) {
   return function( ref ) {
      var filename = path.resolve( loaderContext.options.context || '', ref );
      loaderContext.addDependency( filename );
      return fn.apply( null, [ filename ].concat( [].slice.call( arguments, 1 ) ) );
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

function exportStyles( stylesheetList ) {
   return 'module.exports = ' + JSON.stringify( stylesheetList.toString() ) + ';';
}
