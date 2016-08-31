# laxar-loader

> webpack loader for LaxarJS

## Example


You could use `laxar-loader` directly, but since it does not need a specific entry
module, we pre-rolled the `artifacts` entry point for you and placed it into this
module. Import the entry point in your `init.js`:

```js
import artifacts from 'laxar-loader/artifacts?flow=main&theme=rainbows-and-unicorns';
import { bootstrap } from 'laxar';

// ... later ...

bootstrap( element, {
   widgetAdapters,
   configuration,
   artifacts
} );
```

## Configuration

Place a `laxar.config.js` file into your project root directory.
This is either the directory where your `webpack.config.js` is, or the directory configured
with webpack's [`context` option][webpack-context].

The `laxar.config.js` file should look like this:

```js
module.exports = {
   paths: {
      flows: './path/to/flows', // default: 'flows'
      themes: './path/to/themes', // default: 'themes'
      pages: './path/to/pages', // default: 'pages'
      layouts: './path/to/layouts', // default: 'layouts'
      widgets: './path/to/widgets', // default: 'widgets'
      controls: './path/to/controls', // default: 'controls'
      'default-theme': './path/to/default.theme'
   }
};
```

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
required files, `laxar-loader` will use the [`json-loader`][] for JSON files, [`raw-loader`][] for HTML
and will write out the resource path for CSS files.

If you want to leverage the power of webpack to pre-process these artifacts, just add your loaders to
the webpack configuration and they will be used to load the artifacts' assets. There are just a few rules
your loaders should obey:

- Template sources should be valid HTML strings after passing through your loaders.
- Style sources should be URLs ([`file-`][file-loader] or [`url-loader`][]) or be loaded outside _Laxar_ via the [`style-loader`][].

Example:

```js
module.exports = {
   module: {
      loaders: [
         {
            test: /\.(css|gif|jpe?g|png|ttf|woff2?|svg|eot|otf)(\?.*)?$/,
            loader: 'file'
         },
         {
            test: /\.(gif|jpe?g|png|svg)$/,
            loader: 'img?progressive=true'
         },
         {
            test: /\.css$/,
            loader: 'style!css'
         },
         {
            test: /\/default.theme\/.*\.scss$/,
            loader: 'style!css!sass'
         },
         {
            test: /\/rainbows-and-unicorns\.theme\/.*\.scss$/,
            loader: 'style!css!sass?config=sassLoaderRainbows'
      ]
   },
   fileLoader: {
      name: 'assets/[name]-[sha1:hash:hex:6].[ext]'
   },
   sassLoader: {
      includePaths: [
         './themes/default.theme/scss',
         './bower_components/bootstrap-sass-official/assets/stylesheets',
         './bower_components'
      ].map( p => path.resolve( __dirname, p ) )
   },
   sassLoaderRainbows: {
      includePaths: [
         './themes/rainbows-and-unicorns.theme/scss',
         './bower_components/bootstrap-sass-official/assets/stylesheets',
         './bower_components'
      ].map( p => path.resolve( __dirname, p ) )
   }
};
```

[bootstrap]: https://github.com/LaxarJS/laxar
[parse-query]: https://github.com/webpack/loader-utils#parsequery
[webpack-context]: http://webpack.github.io/docs/configuration.html#context
[raw-loader]: https://github.com/webpack/raw-loader
[json-loader]: https://github.com/webpack/json-loader
[style-loader]: https://github.com/webpack/style-loader
[file-loader]: https://github.com/webpack/file-loader
[url-loader]: https://github.com/webpack/url-loader
