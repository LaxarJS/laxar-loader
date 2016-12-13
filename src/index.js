/**
 * Copyright 2016 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

import { posix as path } from 'path';
import loaderUtils from 'loader-utils';
import laxarTooling from 'laxar-tooling';

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
      } ) )
      .then( config => {
         const paths = config.paths;

         const artifactCollector = laxarTooling.artifactCollector.create( {
            log,
            paths,
            resolve,
            readJson
         } );

         const artifactValidator = laxarTooling.artifactValidator.create( {
            log
         } );

         const artifactListing = laxarTooling.artifactListing.create( {
            log,
            paths,
            resolve,
            readJson,
            requireFile
         } );

         return entries
            .then( artifactCollector.collectArtifacts )
            .then( artifactValidator.validateArtifacts )
            .then( artifactListing.buildArtifacts )
            .then( laxarTooling.serialize )
            .then( code => `module.exports = ${code};` );
      } )
      .then(
         result => done( null, result ),
         error => done( error )
      );

   function readJson( filename ) {
      return loadModule( `${loaders.json}!${filename}` );
   }

   function requireFile( module, type ) {
      const loader = loaders[ type ];
      const request = loader ? `${loader}!${module}` : module;

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
      return resolveRelative( loaderContext.context, ref )
         .then( null, err => new Promise( ( resolve, reject ) => {
            // webpack can only resolve things for which it has loaders.
            // to resolve a directory, we replace all aliases.
            const filename = resolveAliases( ref );

            // if the file exists, resolve with the the filename, otherwise
            // reject with the original error
            loaderContext._compiler.inputFileSystem.stat( filename, e => {
               if( e ) {
                  reject( err );
               }
               else {
                  resolve( filename );
               }
            } );
         } ) );
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
         const suffix = alias.substr( -1 ) === '$' ? '' : '($|/)';
         const pattern = new RegExp( `^${alias}${suffix}` );
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

