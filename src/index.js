/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

import { posix as path } from 'path';
import loaderUtils from 'loader-utils';
import laxarTooling from 'laxar-tooling';

const DEFAULT_CONFIG = {};

module.exports = function( source /*, map */ ) {
   const loaderContext = this;
   const query = loaderUtils.parseQuery( loaderContext.query );
   const entries = query.entries && buildEntries( query );

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

   const loaders = {
      json: require.resolve( './json' ),
      content: require.resolve( './content' ),
      url: require.resolve( './url' )
   };

   configPath
      .then( filename => loadModule( filename ).then( config => {
         const paths = {};
         const context = path.dirname( filename );

         Object.keys( config.paths || [] ).forEach( key => {
            const p = config.paths[ key ];
            paths[ key ] = p[ 0 ] === '.' ? path.resolve( context, p ) : p;
         } );

         return {
            ...config,
            paths
         };
      } ), () => DEFAULT_CONFIG )
      .then( config => {
         const paths = config.paths;
         let promise;

         if( query.entries ) {
            const artifactCollector = laxarTooling.artifactCollector.create( {
               log,
               paths,
               resolve,
               readJson
            } );

            const artifactValidator = laxarTooling.artifactValidator.create( {
               log
            } );

            promise = entries
               .then( artifactCollector.collectArtifacts )
               .then( artifactValidator.validateArtifacts );
         }
         else {
            promise = Promise.resolve( loaderContext.exec( source, loaderContext.resource ) );
         }

         if( query.debug ) {
            const debugInfoListing = laxarTooling.debugInfoListing.create( {
               log
            } );

            promise = promise
               .then( debugInfoListing.buildDebugInfos );
         }

         if( query.artifacts ) {
            const artifactListing = laxarTooling.artifactListing.create( {
               log,
               paths,
               resolve,
               readJson,
               requireFile
            } );

            promise = promise
               .then( artifactListing.buildArtifacts );
         }

         return promise;
      } )
      .then( laxarTooling.serialize )
      .then( code => `module.exports = ${code};` )
      .then(
         result => done( null, result ),
         error => done( error )
      );

   function readJson( filename ) {
      return loadModule( `${loaders.json}!${filename}` );
   }

   function requireFile( module, type, name ) {
      const loader = loaders[ type ];
      const request = loader ? `${loader}!${module}` : module;

      if( type === 'module' ) {
         return resolveRelative( loaderContext.context, module )
            .then( null, () => resolveRelative( loaderContext.context, `${module}/${name}` ) )
            .then( path => () => `require( ${loaderUtils.stringifyRequest( loaderContext, path )} )` );
      }

      return () => `require( ${loaderUtils.stringifyRequest( loaderContext, request )} )`;
   }

   function loadModule( request ) {
      const filename = request.split( '!' ).pop().split( '?' ).shift();

      return new Promise( ( resolve, reject ) => {
         loaderContext.loadModule( request, ( err, code ) => {
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
      return resolveRelative( loaderContext.context, ref );
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
