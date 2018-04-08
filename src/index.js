/**
 * Copyright 2016-2017 aixigo AG
 * Released under the MIT license.
 * http://laxarjs.org/license
 */
'use strict';

import path from 'path';
import loaderUtils from 'loader-utils';
import laxarTooling from 'laxar-tooling';

const DEFAULT_CONFIG = {};
const JSONISH = /^\s*[{[]/;

const DUMMY_MODULE = `${path.dirname(__dirname)}/dummy.js`;
const SPLIT_MODULE = `${__dirname}/split-base.js`;

module.exports = function( source /*, map */ ) {
   const loaderContext = this;
   const rootContext = loaderContext.rootContext ||
      ( loaderContext.options ? loaderContext.options.context : '' );
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
      resolveRelative( rootContext, './laxar.config' );

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
         const split = [];
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

         if( query.split ) {
            promise = promise
               .then( artifacts => {
                  split.push( ...artifacts.pages );
                  artifacts.pages = [];
                  artifacts.widgets = [];
                  artifacts.controls = [];
                  artifacts.layouts = [];
                  return artifacts;
               } );
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

         promise = promise
            .then( laxarTooling.serialize );

         if( query.split ) {
            promise = promise
               .then( code => {
                  const proxy = split.map( artifact => {
                     const entry = { [ artifact.category ]: artifact.refs };
                     const request = loaderUtils.stringifyRequest( loaderContext, recursiveQuery( entry ) );
                     return `proxy( artifacts, ${JSON.stringify( entry )},
                        () => import( /* webpackChunkName: "${artifact.name}" */ ${request} ) );`;
                  } );

                  return `
                     import { proxy } from '${SPLIT_MODULE}';
                     const artifacts = ${code};
                     ${proxy.join('\n')}
                     export default artifacts;
                  `;
               } );
         }
         else {
            promise = promise
               .then( code => `module.exports = ${code};` );
         }

         return promise;
      } )
      .then(
         result => done( null, result ),
         error => done( error )
      );

   function readJson( filename ) {
      return loadSource( filename )
         .then( code => {
            if( JSONISH.test( code ) ) {
               return JSON.parse( code );
            }
            return loaderContext.exec( code, filename );
         } );
   }

   function requireFile( module, type, name ) {
      const loader = loaders[ type ];
      const request = loader ? `${loader}!${module}` : module;

      if( type === 'module' ) {
         return resolve( module )
            .then( null, () => resolve( `${module}/${name}` ) )
            .then( path => () => `require( ${loaderUtils.stringifyRequest( loaderContext, path )} )` );
      }

      return () => `require( ${loaderUtils.stringifyRequest( loaderContext, request )} )`;
   }

   function loadModule( request ) {
      const filename = request.split( '!' ).pop().split( '?' ).shift();
      return loadSource( request )
         .then( code => loaderContext.exec( code, filename ) );
   }

   function loadSource( request ) {
      return new Promise( ( resolve, reject ) => {
         loaderContext.loadModule( request, ( err, code ) => {
            if( err ) {
               reject( err );
               return;
            }
            resolve( code );
         } );
      } );
   }

   function resolve( ref ) {
      return resolveRelative( rootContext, ref );
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

   function recursiveQuery( entry ) {
      const mode = query.debugInfo ? 'debug-info' : 'artifacts';

      const themes = [
         ...ensureArray( query.theme ),
         ...ensureArray( query.themes )
      ];

      const entries = [].concat.apply(
         themes.map( theme => `themes[]=${theme}` ),
         Object.keys( entry )
            .map( category => entry[ category ].map( ref => `${category}[]=${ref}` ) ) );
      return `${__filename}?entries&${mode}&${entries.join('&')}!${DUMMY_MODULE}`;
   }
};

function buildEntries( query ) {
   const entry = {
      themes: []
   };

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
      const items = [
         ...ensureArray( query[ singular ] ),
         ...ensureArray( query[ plural ] )
      ];

      if( items.length > 0 ) {
         entry[ plural ] = items;
      }
   } );

   if( entry.themes.indexOf( 'default' ) < 0 ) {
      entry.themes.push( 'default' );
   }

   return Promise.resolve( [ entry ] );
}

function ensureArray( _ = [] ) {
   return Array.isArray( _ ) ? _ : [ _ ];
}
