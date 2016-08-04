# laxar-loader

> webpack loader for LaxarJS

## Example

`init.js`:

```js
import artifacts from 'laxar-loader?flow=main&themes[]=cube&themes[]=default!./package.json';
```

## Query options (aka the stuff after the "?")

- `?flows` or `?flow`: reference(s) to the flow(s) to bundle
- `?themes` or `?theme`: reference(s) to the theme(s) to bundle

Refer to the [webpack documentation][parse-query] for details about the loader syntax.


[parse-query]: https://github.com/webpack/loader-utils#parsequery
