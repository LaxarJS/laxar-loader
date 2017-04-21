# laxar-loader [![Build Status](https://travis-ci.org/LaxarJS/laxar-loader.svg?branch=master)](https://travis-ci.org/LaxarJS/laxar-loader)

> webpack loader for LaxarJS

<span class="laxar-external-documentation-hint">
   Take a look at the <a href="https://www.laxarjs.org/docs/laxar-loader-latest/">documentation site</a> to browse documentation for all releases of this artifact.
</span>

Bundles and validates LaxarJS application artifacts as needed.


## Example

You could use `laxar-loader` directly, but since it does not need a specific entry module,
we pre-rolled the `artifacts` and `debug-info` entry points for you and placed them into this
module.
Import the entry points in your `init.js`:

```js
import artifacts from 'laxar-loader/artifacts?flow=main&theme=rainbows-and-unicorns';
import debugInfo from 'laxar-loader/debug-info?flow=main&theme=rainbows-and-unicorns';
import { create } from 'laxar';

// const adapters = [ ... ];
// const configuration = { ... };
// ... later ...

create( adapters, artifacts, configuration )
  .tooling( debugInfo )
  .bootstrap();
```




## Configuration

Place a `laxar.config.js` file into your project root directory.
This is either the directory where your `webpack.config.js` is, or the directory configured
with webpack's [`context` option][webpack-context].

The `laxar.config.js` file should look like this:

```js
module.exports = {
   paths: {
      flows: './path/to/flows', // default: './application/flows'
      themes: './path/to/themes', // default: './application/themes'
      pages: './path/to/pages', // default: './application/pages'
      layouts: './path/to/layouts', // default: './application/layouts'
      widgets: './path/to/widgets', // default: './application/widgets'
      controls: './path/to/controls', // default: './application/controls'
      'default-theme': './path/to/default.theme'
   }
};
```

If no `laxar.config.js` exists, the defaults (above) are used.


## Query options (aka the stuff after the "?")

| Parameter | Description |
| --------- | ----------- |
| `?flow`, `?flows[]` | reference(s) to the flow(s) to bundle |
| `?theme`, `?themes[]` | reference(s) to the theme(s) to bundle |
| `?page`, `?pages[]` | reference(s) to the page(s) to bundle; can be omitted if pages are reachable from the flow |
| `?layout`, `?layouts[]` | reference(s) to the layout(s) to bundle; can be omitted if layouts are referenced in bundled pages |
| `?widget`, `?widgets[]` | reference(s) to the widget(s) to bundle; can be omitted if widgets are referenced in bundled pages |
| `?control`, `?controls[]` | reference(s) to the control(s) to bundle; can be omitted if controls are referenced in bundled widgets |

Refer to the [webpack documentation][parse-query] for details about the loader syntax.

The loaded artifacts listing can then be used to [bootstrap LaxarJS][bootstrap].


## Interaction with other loaders

When building the artifacts listing, the loader collects JSON, HTML and CSS files and generates
require calls so they will be present in your webpack bundle. If no loaders are configured for the
required files, `laxar-loader` will use the [`json-loader`][json-loader] for JSON files,
[`raw-loader`][raw-loader] for HTML and will write out the resource path for CSS files.

The `debug-info` bundle is wrapped with [`bundle-loader?lazy`][bundle-loader], exporting a function
that can be called to asynchronously load debug information if necessary.

If you want to leverage the power of webpack to pre-process these artifacts, just add your loaders to
the webpack configuration and they will be used to load the artifacts' assets. There are just a few rules
your loaders should obey:

- Template sources should be valid HTML strings after passing through your loaders.
- Style sources should be URLs ([`file-`][file-loader] or [`url-loader`][url-loader]) or be loaded
  outside _Laxar_ via the [`style-loader`][style-loader].

Example:

```js
module.exports = {
   entry: { 'init': './init.js' },

   output: {
      path: path.resolve( __dirname, `./${publicPath}` ),
      publicPath,
      filename: '[name].bundle.js',
      chunkFilename: '[name].bundle.js'
   },

   module: {
      rules: [
         {
            test: /\.(css|gif|jpe?g|png|ttf|woff2?|svg|eot|otf)(\?.*)?$/,
            loader: 'file-loader',
            options: {
               name: 'assets/[name]-[sha1:hash:hex:6].[ext]'
            }
         },
         {
            test: /\.(gif|jpe?g|png|svg)$/,
            loader: 'img-loader?progressive=true'
         },
         {
            test: /\.css$/,
            loader: 'style-loader!css-loader'
         },
         {
            test: /\/default.theme\/.*\.scss$/,
            loader: 'sass-loader',
            options: require( 'laxar-uikit/themes/default.theme/sass-options' )
         },
         {
            test: /\/rainbows-and-unicorns\.theme\/.*\.scss$/,
            loader: 'sass-loader',
            options: require( './application/themes/rainbows-and-unicorns.theme/sass-options' )
         }
      ]
   }
};
```

[bootstrap]: https://laxarjs.org/docs/laxar-v2-latest/api/laxar/#laxar.create
[parse-query]: https://github.com/webpack/loader-utils#parsequery
[webpack-context]: https://webpack.js.org/configuration/entry-context/#context
[raw-loader]: https://github.com/webpack-contrib/raw-loader
[json-loader]: https://github.com/webpack-contrib/json-loader
[style-loader]: https://github.com/webpack-contrib/style-loader
[file-loader]: https://github.com/webpack-contrib/file-loader
[url-loader]: https://github.com/webpack-contrib/url-loader
[bundle-loader]: https://github.com/webpack-contrib/bundle-loader
