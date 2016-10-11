import path from 'path';
import webpack from 'webpack';
import defaults from './webpack.config.js';
import { expect } from 'chai';

describe( 'laxar-loader', () => {

   it( 'does not explode', done => {

      const compiler = webpack( {
         ...defaults,
         entry: './init.js',
         mock: {
            'laxar.config.json': 'module.exports = ' + JSON.stringify( {
               paths: {
                  flows: 'app/flows',
                  pages: 'app/pages',
                  themes: 'components/themes',
                  layouts: 'components/layouts',
                  widgets: 'components/widgets',
                  controls: 'components/controls'
               }
            } ) + ';',
            'init.js': 'module.exports = require( \'laxar-loader?flow=main!dummy.js\' );',
            'dummy.js': '/* empty */',
            'app/': {
               'flows/main.json': '{ "places": { "entry": { "page": "test" } } }',
               'pages/test.json': '{ "layout": "main", "areas": { "main": [ { "widget": "test-widget" } ] } }'
            },
            'components/themes/default.theme/': {
               'css/theme.css': '/* empty */'
            },
            'components/layouts/main/': {
               'layout.json': '{ "name": "main" }',
               'css/main.css': '/* empty */'
            },
            'components/widgets/test-widget/': {
               'widget.json': '{ "name": "test-widget", "controls": [ "test-control" ] }',
               'test-widget.js': 'module.exports = function TestWidget() {};'
            },
            'components/controls/test-control/': {
               'control.json': '{ "name": "test-control" }',
               'test-control.js': 'module.exports = function TestControl() {};'
            }
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
         const bundle = path.join( compiler.options.output.path, compiler.options.output.filename );
         const library = compiler.options.output.library;

         expect( fs.existsSync( bundle ) ).to.eql( true );

         const code = fs.readFileSync( bundle, 'utf-8' );

         // eslint-disable-next-line no-new-func
         const result = new Function( `${code}; return ${library};` )();

         expect( result ).to.have.all.keys( [
            'aliases',
            'flows',
            'themes',
            'pages',
            'layouts',
            'widgets',
            'controls'
         ] );

         return done();
      } );

   } );

} );
