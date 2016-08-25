'use strict';

const fs = require( 'fs' );
const path = require( 'path' ).posix;

const loaderUtils = require( 'loader-utils' );
const laxarTooling = require( 'laxar-tooling' );

/*eslint-disable consistent-return*/
module.exports = function( /* source, map */ ) {
   const loaderContext = this;
   const query = loaderUtils.parseQuery( loaderContext.query );
   const entries = buildEntries( query );

   if( loaderContext.cacheable ) {
      loaderContext.cacheable();
   }

   const log = {
      error: loaderContext.emitError,
      warn: loaderContext.emitWarning
   };

   const done = loaderContext.async();

   const configPath = typeof query.laxarConfig === 'string' ?
      resolveRelative( loaderContext.context, query.laxarConfig ) :
      resolveRelative( loaderContext.options.context || '', './laxar.config' );

   let configContext;

   const loaders = {
      json: resolveLoader( 'json-loader' ),
      raw: resolveLoader( 'raw-loader' )
   };

   configPath
      .then( filename => {
         configContext = path.dirname( filename );
         return filename;
      } )
      .then( loadModule )
      .then( config => {
         const paths = {};

         Object.keys( config.paths || [] ).forEach( key => {
            const p = config.paths[ key ];
            paths[ key ] = p[ 0 ] === '.' ? path.resolve( configContext, p ) : p;
         } );

         const artifactCollector = laxarTooling.artifactCollector.create( {
            log,
            paths,
            resolve,
            readJson
         } );

         const artifactListing = laxarTooling.artifactListing.create( {
            log,
            paths,
            resolve,
            readJson,
            requireFile: ( module, loader ) => {
               const modulePath = path.relative( loaderContext.context, module );
               const moduleRef = /^[\/.]/.test( modulePath ) ? modulePath : `./${modulePath}`;
               const loaderPath = loaders[ loader ];
               const resource = loaderPath ? `${loaderPath}!${moduleRef}` : moduleRef;

               if( loader === 'url' ) {
                  return path.relative( loaderContext.options.context || '', module );
               }

               return () => `require( '${resource}' )`;
            }
         } );

         return entries
            .then( artifactCollector.collectArtifacts )
            .then( artifactListing.buildArtifacts )
            .then( laxarTooling.serialize )
            .then( code => `module.exports = ${code};` )
            .then( result => done( null, result ), done );
      } );

   function readJson( filename ) {
      return loadModule( loaders.json + '!' + filename );
   }

   function loadModule( filename ) {
      return new Promise( ( resolve, reject ) => {
         loaderContext.loadModule( filename, ( err, code ) => {
            if( err ) {
               reject( err );
               return;
            }
            try {
               resolve( loaderContext.exec( code, filename ) );
            }
            catch( err ) {
               reject( err );
            }
         } );
      } );
   }

   function resolve( ref ) {
      return resolveRelative( loaderContext.context, ref )
         .then( null, err => new Promise( ( resolve, reject ) => {
            // webpack can only resolve things for which it has loaders.
            // to resolve a directory, we replace all aliases.
            const filename = resolveAliases( ref );

            fs.access( filename, fs.F_OK, e => {
               if( e ) {
                  reject( err );
               }
               else {
                  resolve( filename );
               }
            } );
         } ) );
   }

   function resolveLoader( loader ) {
      return './' + path.relative( loaderContext.context, require.resolve( loader ) );
   }

   function resolveRelative( context, ref ) {
      return new Promise( ( resolve, reject ) => {
         loaderContext.resolve( context, ref, ( err, filename ) => {
            if( err ) {
               reject( err );
            }
            else {
               resolve( filename );
            }
         } );
      } );
   }

   function resolveAliases( string ) {
      const context = loaderContext.options.context || '';
      const aliases = loaderContext.options.resolve.alias || {};

      return path.resolve( context, Object.keys( aliases ).reduce( ( string, alias ) => {
         const pattern = new RegExp( '^' + alias + '($|/)' );
         return string.replace( pattern, aliases[ alias ] + '$1' );
      }, string ) );
   }
};

function buildEntries( query ) {
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

   return Promise.resolve( [ entry ] );
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

