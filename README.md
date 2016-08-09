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
- `?pages` or `?page`: reference(s) to the page(s) to bundle; can be omitted if pages are reachable from the flow
- `?layouts` or `?layout`: reference(s) to the layout(s) to bundle; can be omitted if layouts are referenced in bundled pages
- `?widgets` or `?widget`: reference(s) to the widget(s) to bundle; can be omitted if widgets are referenced in bundled pages
- `?controls` or `?control`: reference(s) to the control(s) to bundle; can be omitted if controls are referenced in bundled widgets

Refer to the [webpack documentation][parse-query] for details about the loader syntax.


[parse-query]: https://github.com/webpack/loader-utils#parsequery
