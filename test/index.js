import vm from 'vm';
import path from 'path';
import webpack from 'webpack';
import defaults from './webpack.config.js';
import { MockFSPlugin } from './mockfs';

import { expect } from 'chai';

describe( 'laxar-loader', () => {

   it( 'does not explode', done => {

      const mockfs = new MockFSPlugin( {
         'laxar.config.js': 'module.exports = ' + JSON.stringify( {
            paths: {
               flows: './app/flows',
               pages: './app/pages',
               themes: './components/themes',
               layouts: './components/layouts',
               widgets: './components/widgets',
               controls: './components/controls',
               schemas: './schemas',
               'default-theme': 'default.theme'
            }
         } ) + ';',
         'init.js':
            'exports.artifacts = require( \'laxar-loader?entries&artifacts&flow=main!./dummy.js\' );\n' +
            'exports.debugInfo = require( \'laxar-loader?entries&debug&flow=main!./dummy.js\' );',
         'dummy.js': '/* empty */',
         'app/': {
            'flows/main.json': '{ "places": { "entry": { "page": "test" } } }',
            'pages/test.json': '{ "layout": "main", "areas": { "main": [ { "widget": "test-widget" } ] } }'
         },
         'components/themes/default.theme/': {
            'theme.json': '{ "name": "default.theme" }',
            'css/theme.css': '/* empty */'
         },
         'components/layouts/main/': {
            'layout.json': '{ "name": "main", "themeSource": "scss/main.scss" }',
            'scss/main.scss': '/* empty */'
         },
         'components/widgets/test-widget/': {
            'widget.json': '{ "name": "test-widget", "controls": [ "test-control" ] }',
            'test-widget.js': 'module.exports = function TestWidget() {};',
            'default.theme': {
               'test-widget.html': '<blink>test-widget</blink>',
               'css/test-widget.css': 'blink { color: deeppink; }'
            }
         },
         'components/controls/test-control/': {
            'control.json': '{ "name": "test-control" }',
            'test-control.js': 'module.exports = function TestControl() {};'
         },
         'schemas/': {
            'flow.json': JSON.stringify( {
               $schema: 'http://json-schema.org/draft-04/schema#',
               type: 'object',
               required: [ 'places' ]
            } ),
            'theme.json': JSON.stringify( {
               $schema: 'http://json-schema.org/draft-04/schema#',
               type: 'object'
            } ),
            'page.json': JSON.stringify( {
               $schema: 'http://json-schema.org/draft-04/schema#',
               type: 'object'
            } ),
            'layout.json': JSON.stringify( {
               $schema: 'http://json-schema.org/draft-04/schema#',
               type: 'object'
            } ),
            'widget.json': JSON.stringify( {
               $schema: 'http://json-schema.org/draft-04/schema#',
               type: 'object',
               required: [ 'name' ]
            } ),
            'control.json': JSON.stringify( {
               $schema: 'http://json-schema.org/draft-04/schema#',
               type: 'object',
               required: [ 'name' ]
            } )
         }
      } );
      const compiler = webpack( {
         ...defaults,
         entry: './init.js',
         plugins: [ mockfs ]
      } );

      compileAndRun( compiler, ( err, result ) => {
         if( err ) {
            return done( err );
         }

         expect( result.artifacts ).to.have.all.keys( [
            'aliases',
            'flows',
            'themes',
            'pages',
            'layouts',
            'widgets',
            'controls'
         ] );

         expect( result.debugInfo ).to.have.keys( [
            'aliases',
            'pages',
            'widgets'
         ] );

         return done();
      } );

   } ).timeout( 6000 );

} );

function compileAndRun( compiler, done ) {
   compiler.run( ( err, stats ) => {
      if( err ) {
         done( err );
         return;
      }
      if( stats && stats.compilation && stats.compilation.errors.length ) {
         done( stats.compilation.errors[ 0 ] );
         return;
      }

      try {
         const sandbox = {};
         const bundle = path.join( compiler.options.output.path, compiler.options.output.filename );
         const library = compiler.options.output.library;
         const code = compiler.outputFileSystem.readFileSync( bundle, 'utf-8' );

         vm.runInNewContext( code, sandbox );
         done( null, sandbox[ library ] );
      }
      catch( err ) {
         done( err );
      }
   } );
}
