# laxar-loader

> webpack loader for LaxarJS

## Example

`init.js`:

```js
import artifacts from 'laxar-loader?flows=main&themes=cube,default!./package.json';
```

## Query options (aka the stuff after the "?")

- `?flows`: references to the flows to bundle
- `?themes`: references to the themes to bundle

Refer to the [webpack documentation][parse-query] for details about the loader syntax.


[parse-query]: https://github.com/webpack/loader-utils#parsequery
