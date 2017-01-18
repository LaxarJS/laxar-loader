import fs from 'fs';
import path from 'path';

import MemoryFS from 'memory-fs';
import CachedInputFileSystem from 'enhanced-resolve/lib/CachedInputFileSystem';


export class MockFSPlugin {
   constructor(contents) {
      this.contents = contents;
   }
   apply(compiler) {
      const inputFS = new MemoryFS();
      const outputFS = new MemoryFS();
      const contextFS = fs;
      const loaderFS = fs;

      // execute after the NodeEnvironmentPlugin and mock the filesystem access
      compiler.plugin( 'after-environment', () => {
         compiler.inputFileSystem = inputFS;
         compiler.watchFileSystem = null;
         compiler.outputFileSystem = outputFS;

         fillDirectory( inputFS, compiler.options.context, this.contents );
      } );
      compiler.plugin( 'after-resolvers', () => {
         compiler.resolvers.normal.fileSystem = new CachedInputFileSystem( inputFS );
         compiler.resolvers.context.fileSystem = new CachedInputFileSystem( contextFS );
         compiler.resolvers.loader.fileSystem = new CachedInputFileSystem( loaderFS );
      } );
   }
}

function fillDirectory( fs, directory, data ) {
   fs.mkdirpSync(directory);

   const entries = Object.keys( data || {} );

   entries.forEach( name => {
      const file = path.join( directory, name );
      const content = data[ name ];

      if( typeof content === 'string' ) {
         fs.mkdirpSync( path.dirname( file ) );
         fs.writeFileSync( file, content, 'utf-8' );
      }
      else if( typeof content === 'object' ) {
         fillDirectory( fs, file, content );
      }
   } );
}
