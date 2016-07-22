'use strict';

const path = require( 'path' ).posix;

const loaderUtils = require( 'loader-utils' );
const laxarTooling = require( 'laxar-tooling' );

const NodeTemplatePlugin = require( 'webpack/lib/node/NodeTemplatePlugin' );
const NodeTargetPlugin = require( 'webpack/lib/node/NodeTargetPlugin' );
const LibraryTemplatePlugin = require( 'webpack/lib/LibraryTemplatePlugin' );
const SingleEntryPlugin = require( 'webpack/lib/SingleEntryPlugin' );
const LimitChunkCountPlugin = require( 'webpack/lib/optimize/LimitChunkCountPlugin' );

function lookup( object ) {
   return function( key ) { return object[ key ]; };
}

/*eslint-disable consistent-return*/
module.exports = function( source ) {
   const loaderContext = this;
   const query = loaderUtils.parseQuery( this.query );

   const queryModes = [
      'artifacts',
      'resources',
      'dependencies',
      'stylesheets'
   ];

   if( queryModes.filter( lookup( query ) ).length !== 1 ) {
      const message = 'Expected exactly on of the following query parameters: ' +
                      queryModes.join( ', ' );
      return this.emitError( new Error( message ) );
   }

   if( this[ __filename ] ) {
      return '';
   }

   if( this.cacheable ) {
      this.cacheable();
   }

   const logger = {
      error: this.emitError
   };

   const done = this.async();
   const success = function( result ) {
      done( null, result );
   };

   const themeRefs = query.themes || [];
   const publicPath = typeof query.publicPath === 'string' ?
      query.publicPath :
      this._compilation.outputOptions.publicPath;

   const readJson = traceDependencies( this,
      moduleReader( this, query[ 'json-loader' ], publicPath ) ||
      laxarTooling.jsonReader.create( logger ) );

   const readRaw = traceDependencies( this,
      moduleReader( this, query[ 'raw-loader' ], publicPath ) ||
      laxarTooling.fileReader.create( logger ) );

   const readCss = traceDependencies( this,
      moduleReader( this, query[ 'css-loader' ], publicPath ) ||
      laxarTooling.fileReader.create( logger ) );

   const artifactCollector = laxarTooling.artifactCollector.create( logger, {
      projectPath,
      readJson: injectInputValue( this, source, readJson )
   } );

   const artifactsPromise = projectPath( this.resourcePath )
      .then( collectArtifacts );

   if( query.artifacts ) {
      artifactsPromise
         .then( exportObject )
         .then( success, done );
   }

   if( query.resources ) {
      const resourceCollector = laxarTooling.resourceCollector.create( logger, {
         readFile: readRaw,
         embed: query.embed
      } );

      artifactsPromise
         .then( resourceCollector.collectResources )
         .then( exportObject )
         .then( success, done );
   }

   if( query.dependencies ) {
      const dependencyCollector = laxarTooling.dependencyCollector.create( logger, {
      } );

      artifactsPromise
         .then( dependencyCollector.collectDependencies )
         .then( exportDependencies )
         .then( success, done );
   }

   if( query.stylesheets ) {
      const stylesheetCollector = laxarTooling.stylesheetCollector.create( logger, {
         readFile: readCss
      } );

      artifactsPromise
         .then( stylesheetCollector.collectStylesheets )
         .then( exportStyles )
         .then( success, done );
   }

   function collectArtifacts( flowPath ) {
      return artifactCollector.collectArtifacts( [ flowPath ], themeRefs.concat( [ 'default.theme' ] ) );
   }

   function projectPath( ref ) {
      return new Promise( function( resolve ) {
         loaderContext.resolve( loaderContext.context, ref, function( err, result ) {
            // webpack can only resolve things for which it has loaders.
            // to resolve a directory, we replace all aliases.
            const filename = err ?
               resolveAliases( ref, loaderContext.options.resolve.alias ) :
               result;

            resolve( path.relative( loaderContext.options.context || '', filename ) );
         } );
      } );
   }
};

function moduleReader( loaderContext, loader, publicPath ) {
   if( !loader ) {
      return null;
   }

   return function readModule( module ) {

      const filename = path.relative( loaderContext.options.context || '', module );
      const outputOptions = {
         filename,
         publicPath
      };
      const compiler = loaderContext._compilation.createChildCompiler( filename, outputOptions );
      const request = isString( loader ) ?
                    '!!' + loader + '!' + module :
                    Array.isArray( loader ) ?
                    '!!' + loader.join( '!' ) + '!' + module :
                    filename;

      compiler.apply(new NodeTemplatePlugin(outputOptions));
      compiler.apply(new LibraryTemplatePlugin(null, 'commonjs2'));
      compiler.apply(new NodeTargetPlugin());
      compiler.apply(new SingleEntryPlugin(loaderContext.context, request));
      compiler.apply(new LimitChunkCountPlugin({ maxChunks: 1 }));

      loaderContext.addDependency( filename );

      return new Promise( function( resolve, reject ) {
         let asset;
         let source;
         let map;

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
               loaderContext[ __filename ] = true;
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
               return reject( new Error( 'Didn\'t get a result from compiler' ) );
            }

            compilation.fileDependencies
               .forEach( loaderContext.addDependency, loaderContext );
            compilation.contextDependencies
               .forEach( loaderContext.addContextDependency, loaderContext );

            delete loaderContext[ __filename ];

            try {
               const code = loaderContext.exec( source, filename );
               return resolve( code );
            }
            catch( err ) {
               return reject( err );
            }
         } );
      } );
   };
}

function isString( something ) {
   return ( typeof something === 'string' ) || ( something instanceof String );
}

function injectInputValue( loaderContext, source, fn ) {
   return function( ref ) {
      const filename = path.resolve( loaderContext.options.context || '', ref );

      if( filename === loaderContext.resourcePath ) {
         return inputValue( loaderContext, source );
      }

      return fn.apply( null, arguments );
   };
}

function inputValue( loaderContext, source ) {
   if( !loaderContext.inputValue ) {
      try {
         loaderContext.inputValue = [ loaderContext.exec( source, loaderContext.resourcePath ) ];
      }
      catch( err ) {
         return Promise.reject( err );
      }
   }
   return Promise.resolve( loaderContext.inputValue[ 0 ] );
}

function traceDependencies( loaderContext, fn ) {
   return function( ref ) {
      const filename = path.resolve( loaderContext.options.context || '', ref );
      loaderContext.addDependency( filename );
      return fn.apply( null, [ filename ].concat( [].slice.call( arguments, 1 ) ) );
   };
}

function resolveAliases( string, aliases ) {
   return Object.keys( aliases ).reduce( function( string, alias ) {
      const pattern = new RegExp( '(^|/)' + alias + '($|/)', 'g' );
      return string.replace( pattern, '$1' + aliases[ alias ] + '$2' );
   }, string );
}

function exportObject( object ) {
   return 'module.exports = ' + JSON.stringify( object, undefined, '\t' ) + ';';
}

function exportDependencies( modulesByTechnology ) {
   const dependencies = [];
   const registryEntries = [];

   Object.keys( modulesByTechnology )
      .reduce( function( start, technology ) {
         const end = start + modulesByTechnology[ technology ].length;
         [].push.apply( dependencies, modulesByTechnology[ technology ] );
         registryEntries.push( '\'' + technology + '\': modules.slice( ' + start + ', ' + end + ' )' );
         return end;
      }, 0 );

   const requireString = '[\n   ' + dependencies.map( function( dependency ) {
      return 'require( \'' + dependency + '\' )';
   } ).join( ',\n   ' ) + '\n]';

   return 'const modules = ' + requireString + ';\n' +
          'module.exports = {\n' +
          '   ' + registryEntries.join( ',\n   ' ) + '\n' +
          '};\n';
}

function exportStyles( stylesheetList ) {
   return 'module.exports = ' + JSON.stringify( stylesheetList.toString() ) + ';';
}
