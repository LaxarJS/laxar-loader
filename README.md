# laxar-loader

> webpack loader for LaxarJS

## Example

`init.js`:

```js
import artifacts from 'laxar-loader?flow=main&theme=rainbows-and-unicorns!./package.json';
```

## Query options (aka the stuff after the "?")

| Parameter | Description |
| --------- | ----------- |
| `?flow`, `?flows[]` | reference(s) to the flow(s) to bundle |
| `?theme`, `?themes[]` | reference(s) to the theme(s) to bundle |
| `?page`, `?pages[]` | reference(s) to the page(s) to bundle; can be omitted if pages are reachable from the flow |
| `?layout`, `?layouts[]` | reference(s) to the layout(s) to bundle; can be omitted if layouts are referenced in bundled pages |
| `?widget`, `?widgets` | reference(s) to the widget(s) to bundle; can be omitted if widgets are referenced in bundled pages |
| `?control`, `?controls` | reference(s) to the control(s) to bundle; can be omitted if controls are referenced in bundled widgets |

Refer to the [webpack documentation][parse-query] for details about the loader syntax.

The loaded artifacts listing can then be used to [bootstrap LaxarJS][bootstrap].

[bootstrap]: https://github.com/LaxarJS/laxar
[parse-query]: https://github.com/webpack/loader-utils#parsequery
