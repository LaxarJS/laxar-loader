'use strict';

const path = require( 'path' ).posix;

const loaderUtils = require( 'loader-utils' );
const laxarTooling = require( 'laxar-tooling' );
const moduleReader = require( './lib/module_reader' );

/*eslint-disable consistent-return*/
module.exports = function( source ) {
   const loaderContext = this;
   const query = loaderUtils.parseQuery( this.query );
   const entries = [ buildEntry( query ) ];

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

   const resolveLoader = loader => './' + path.relative( loaderContext.context, require.resolve( loader ) );
   const loaders = {
      json: resolveLoader( 'json-loader' ),
      raw: resolveLoader( 'raw-loader' )
   };

   const readJson = traceDependencies( this,
      moduleReader( this, query[ 'json-loader' ], publicPath ) ||
      laxarTooling.jsonReader.create( logger ) );

   const artifactCollector = laxarTooling.artifactCollector.create( logger, {
      projectPath,
      readJson: readJson
   } );

   const artifactListing = laxarTooling.artifactListing.create( logger, {
      projectPath,
      readJson: readJson,
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
         loaderContext.resolve( loaderContext.context, ref, ( err, result ) => {
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

function buildEntry( query ) {
   const entry = {};

   const entryKeys = {
      flows: 'flow',
      themes: 'theme',
      pages: 'page',
      layouts: 'layout',
      widgets: 'widget',
      controls: 'control'
   };

   Object.keys( entryKeys ).forEach( plural => {
      const singular = entryKeys[ plural ];
      entry[ plural ] = pickQuery( query[ plural ], query[ singular ] );
   } );

   if( entry.themes.indexOf( 'default' ) < 0 ) {
      entry.themes.push( 'default' );
   }

   return entry;
}

function pickQuery( pluralValue, singularValue ) {
   if( pluralValue ) {
      return Array.isArray( pluralValue ) ? pluralValue : [ pluralValue ];
   }
   if( singularValue ) {
      return [ singularValue ];
   }

   return [];
}

function traceDependencies( loaderContext, fn ) {
   return function( ref ) {
      const filename = path.resolve( loaderContext.options.context || '', ref );
      loaderContext.addDependency( filename );
      return fn.apply( null, [ filename ].concat( [].slice.call( arguments, 1 ) ) );
   };
}

function resolveAliases( string, aliases ) {
   return Object.keys( aliases ).reduce( ( string, alias ) => {
      const pattern = new RegExp( '^' + alias + '($|/)' );
      return string.replace( pattern, aliases[ alias ] + '$1' );
   }, string );
}

