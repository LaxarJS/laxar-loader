'use strict';

const path = require( 'path' ).posix;

const loaderUtils = require( 'loader-utils' );
const laxarTooling = require( 'laxar-tooling' );

const NodeTemplatePlugin = require( 'webpack/lib/node/NodeTemplatePlugin' );
const NodeTargetPlugin = require( 'webpack/lib/node/NodeTargetPlugin' );
const LibraryTemplatePlugin = require( 'webpack/lib/LibraryTemplatePlugin' );
const SingleEntryPlugin = require( 'webpack/lib/SingleEntryPlugin' );
const LimitChunkCountPlugin = require( 'webpack/lib/optimize/LimitChunkCountPlugin' );

function splitQuery( queryValue, defaultValue ) {
   if( Array.isArray( queryValue ) ) {
      return queryValue;
   }
   if( queryValue ) {
      return ( queryValue + '' ).split( ',' );
   }

   return defaultValue;
}

/*eslint-disable consistent-return*/
module.exports = function( source ) {
   const loaderContext = this;
   const query = loaderUtils.parseQuery( this.query );

   const flows = splitQuery( query.flows, [] );
   const themes = splitQuery( query.themes, [ 'default' ] );

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

   const publicPath = typeof query.publicPath === 'string' ?
      query.publicPath :
      this._compilation.outputOptions.publicPath;

   const readJson = traceDependencies( this,
      moduleReader( this, query[ 'json-loader' ], publicPath ) ||
      laxarTooling.jsonReader.create( logger ) );

   const artifactCollector = laxarTooling.artifactCollector.create( logger, {
      projectPath,
      readJson: injectInputValue( this, source, readJson )
   } );

   const assetResolver = laxarTooling.assetResolver.create( logger, {
      projectPath
   } );

   function RequireCall( module, loader ) {
      this.path = './' + path.relative( loaderContext.context, path.resolve( module ) );
      this.loaderPrefix = loader ?
         '!!./' + path.relative( loaderContext.context, require.resolve( loader ) ) + '!' :
         '';
   }

   RequireCall.prototype.toJSON = function() {
      return `require( '${this.loaderPrefix}${this.path}' )`;
   };

   artifactCollector.collectArtifacts( [ { flows, themes } ] )
      .then( artifacts => Promise.all( [
         Promise.resolve( artifacts ),
         Promise.all( artifacts.themes.map( theme =>
            assetResolver.themeAssets( theme ) ) ),
         Promise.all( artifacts.layouts.map( layout =>
            assetResolver.layoutAssets( layout, artifacts.themes ) ) ),
         Promise.all( artifacts.widgets.map( widget =>
            assetResolver.widgetAssets( widget, artifacts.themes ) ) ),
         Promise.all( artifacts.controls.map( control =>
            assetResolver.controlAssets( control, artifacts.themes ) ) )
      ] ) )
      .then( results => {
         const inputArtifacts = results[ 0 ];
         const themeAssets = results[ 1 ];
         const layoutAssets = results[ 2 ];
         const widgetAssets = results[ 3 ];
         const controlAssets = results[ 4 ];
         const artifacts = {};

         artifacts.aliases = {
            flows: buildAliases( inputArtifacts.flows ),
            themes: buildAliases( inputArtifacts.themes ),
            layouts: buildAliases( inputArtifacts.layouts ),
            pages: buildAliases( inputArtifacts.pages ),
            widgets: buildAliases( inputArtifacts.widgets ),
            controls: buildAliases( inputArtifacts.controls )
         };

         artifacts.flows = inputArtifacts.flows.map( flow => ( {
            descriptor: { name: flow.name },
            definition: new RequireCall( flow.path, 'json-loader' )
         } ) );

         artifacts.themes = inputArtifacts.themes.map( ( theme, index ) => ( {
            descriptor: { name: theme.name },
            assets: wrapAssets( themeAssets[ index ] )
         } ) );

         artifacts.pages = inputArtifacts.pages.map( page => ( {
            descriptor: { name: page.name },
            definition: new RequireCall( page.path, 'json-loader' )
         } ) );

         artifacts.layouts = inputArtifacts.layouts.map( ( layout, index ) => ( {
            descriptor: { name: layout.name },
            assets: wrapAssets( layoutAssets[ index ] )
         } ) );

         artifacts.widgets = inputArtifacts.widgets.map( ( widget, index ) => ( {
            descriptor: new RequireCall( path.join( widget.path, 'widget.json' ), 'json-loader' ),
            module: new RequireCall( path.join( widget.path, widget.name ) ),
            assets: wrapAssets( widgetAssets[ index ] )
         } ) );

         artifacts.controls = inputArtifacts.controls.map( ( control, index ) => ( {
            descriptor: new RequireCall( path.join( control.path, 'control.json' ), 'json-loader' ),
            module: new RequireCall( path.join( control.path, control.name ) ),
            assets: wrapAssets( controlAssets[ index ] )
         } ) );

         return artifacts;
      } )
      .then( exportObject )
      .then( success, done );

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

   function wrapAssets( inputAssets ) {
      return Object.keys( inputAssets ).reduce( ( assets, key ) => {
         const asset = inputAssets[ key ];
         if( typeof asset === 'object' ) {
            assets[ key ] = wrapAssets( asset );
         }
         else if( /\.html$/.test( asset ) ) {
            assets[ key ] = { content: new RequireCall( asset, 'raw-loader' ) };
         }
         else {
            assets[ key ] = { url: asset };
         }

         return assets;
      }, {} );
   }
};

function buildAliases( artifacts ) {
   return artifacts.reduce( ( aliases, artifact, index ) => {
      artifact.refs.forEach( ref => { aliases[ ref ] = index; } );
      return aliases;
   }, {} );
}

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
   return 'module.exports = ' + replaceRequire( JSON.stringify( object, undefined, '\t' ) ) + ';';
}

function replaceRequire( string ) {
   return string.replace( /"(require\([^)]+\))"/g, '$1' );
}

