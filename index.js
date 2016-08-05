'use strict';

const path = require( 'path' ).posix;

const loaderUtils = require( 'loader-utils' );
const laxarTooling = require( 'laxar-tooling' );
const moduleReader = require( './lib/module_reader' );

function pickQuery( pluralValue, singularValue, defaultValue ) {
   if( pluralValue ) {
      return Array.isArray( pluralValue ) ? pluralValue : [ pluralValue ];
   }
   if( singularValue ) {
      return [ singularValue ];
   }

   return defaultValue;
}

/*eslint-disable consistent-return*/
module.exports = function( source ) {
   const loaderContext = this;
   const query = loaderUtils.parseQuery( this.query );
   const flows = pickQuery( query.flows, query.flow, [] );
   const themes = pickQuery( query.themes, query.theme, [ 'default' ] );
   const entries = [ { flows, themes } ];

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
      readJson: injectInputValue( this, source, readJson ),
   } );

   const resolveLoader = loader => './' + path.relative( loaderContext.context, require.resolve( loader ) );
   const loaders = {
      json: resolveLoader( 'json-loader' ),
      raw: resolveLoader( 'raw-loader' )
   };

   const artifactListing = laxarTooling.artifactListing.create( logger, {
      projectPath,
      readJson: injectInputValue( this, source, readJson ),
      requireFile: ( module, loader ) => {
         const modulePath = './' + path.relative( loaderContext.context, path.resolve( module ) );
         const loaderPath = loaders[ loader ];
         const resource = loader ? `!!${loaderPath}!${modulePath}` : modulePath;

         if( loader === 'url' ) {
            return module;
         }

         return () => `require( '${resource}' )`;
      }
   } );

   artifactCollector.collectArtifacts( entries )
      .then( artifactListing.buildArtifacts )
      .then( laxarTooling.serialize )
      .then( code => `module.exports = ${code};` )
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

};

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

