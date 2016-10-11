import fs from 'fs';
import path from 'path';

import MemoryFS from 'memory-fs';
import CachedInputFileSystem from 'enhanced-resolve/lib/CachedInputFileSystem';

module.exports = {
   context: '/test',
   output: {
      path: '/test',
      filename: 'bundle.js'
   },
   resolve: {
      root: '/test'
   },
   resolveLoader: {
      root: [
         path.join( __dirname, '..' )
      ],
      alias: {
         'laxar-loader': path.join( __dirname, '../src/index.js' )
      }
   },
   module: {
      loaders: []
   },
   plugins: [
      {
         apply: compiler => {
            // execute after the NodeEnvironmentPlugin and mock the filesystem access
            compiler.plugin( 'after-environment', () => {
               const inputFS = new MemoryFS();
               const outputFS = inputFS;
               const contextFS = fs;
               const loaderFS = fs;

               compiler.inputFileSystem = inputFS;
               compiler.watchFileSystem = null;
               compiler.outputFileSystem = outputFS;

               compiler.resolvers.normal.fileSystem = new CachedInputFileSystem( inputFS );
               compiler.resolvers.context.fileSystem = new CachedInputFileSystem( contextFS );
               compiler.resolvers.loader.fileSystem = new CachedInputFileSystem( loaderFS );

               fillDirectory( inputFS, compiler.options.context, compiler.options.mock );
            } );
         }
      }
   ]
};

function fillDirectory( fs, directory, data ) {
   fs.mkdirpSync(directory);

   const entries = Object.keys( data || {} );

   entries.forEach( name => {
      const file = path.join( directory, name );
      const content = data[ name ];

      if( typeof content === 'string' ) {
         fs.writeFileSync( file, content, 'utf-8' );
      }
      else if( typeof content === 'object' ) {
         fillDirectory( fs, file, content );
      }
   } );
}
