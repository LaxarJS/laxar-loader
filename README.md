# laxar-loader

> webpack loader for LaxarJS

- [x] generate artifact model
- [ ] generate resource map
- [ ] generate dependencies

## Example

`webpack.config.js`:

```js
   module: {
      loaders: [
         { /* the laxar loader should appear before the json loader */
            test: /application\/flow\/[^\/]+\.json$/,
            loader: 'laxar-loader'
         },
         {
            test: /\.json$/,
            exclude: /(node_modules|bower_components|spec)/,
            loader: 'json-loader'
         }
      ]
   }
```

`init.js`:

```js
import artifacts from 'laxar-application/application/flow/flow.json';
```
