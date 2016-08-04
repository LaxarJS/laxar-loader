'use strict';

const NodeTemplatePlugin = require( 'webpack/lib/node/NodeTemplatePlugin' );
const NodeTargetPlugin = require( 'webpack/lib/node/NodeTargetPlugin' );
const LibraryTemplatePlugin = require( 'webpack/lib/LibraryTemplatePlugin' );
const SingleEntryPlugin = require( 'webpack/lib/SingleEntryPlugin' );
const LimitChunkCountPlugin = require( 'webpack/lib/optimize/LimitChunkCountPlugin' );

module.exports = function moduleReader( loaderContext, loader, publicPath ) {
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

