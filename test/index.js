import webpack from 'webpack';
import defaults from './webpack.config.js';

describe( 'laxar-loader', () => {

   it( 'does not explode', done => {

      const compiler = webpack( {
         ...defaults,
         entry: './init.js',
         mock: {
            'laxar.config.json': 'module.exports = ' + JSON.stringify( {
               paths: {
                  flows: 'app/flows',
                  pages: 'app/pages'
               }
            } ) + ';',
            'default.theme/': null,
            'init.js': 'module.exports = require( \'laxar-loader!dummy.js\' );',
            'dummy.js': '/* empty */'
         }
      } );

      compiler.run( ( err, stats ) => {
         if( err ) {
            return done( err );
         }
         if( stats && stats.compilation && stats.compilation.errors.length ) {
            return done( stats.compilation.errors[ 0 ] );
         }

         const fs = compiler.outputFileSystem;
         if( !fs.existsSync( '/test/bundle.js', 'utf-8' ) ) {
            return done(new Error('Expected bundle to be created'));
         }

         return done();
      } );

   } );

} );
