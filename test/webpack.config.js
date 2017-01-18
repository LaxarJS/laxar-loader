import path from 'path';

module.exports = {
   context: '/test',
   output: {
      path: '/test',
      filename: 'bundle.js',
      library: 'test'
   },
   resolveLoader: {
      modules: [
         path.join( __dirname, '..' ),
         path.join( __dirname, '..', '..' )
      ]
   },
   resolve: {
      modules: [
         __dirname
      ]
   },
   module: {
      rules: []
   }
};

