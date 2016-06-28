# laxar-loader

> webpack loader for LaxarJS

- [x] generate artifact model
- [x] generate resource map
- [x] generate dependencies

## Example

`init.js`:

```js
import artifacts from 'laxar-loader?artifacts!laxar-application/application/flow/flow.json';
import dependencies from 'laxar-loader?dependencies!laxar-application/application/flow/flow.json';
import resources from 'laxar-loader?resources&embde!laxar-application/application/flow/flow.json';
```

## Query options (aka the stuff after the "?")

- `?artifacts`: generate the artifact listing as usually encountered in `var/flows/main/tooling/artifacts.json`
- `?dependencies`: generate the bootstrap dependencies module `var/flows/main/dependencies.js`
- `?resources`: generate the resources map `var/flows/main/resources.json`
- `?embed`: embed file contents into the resource map
- `?json-loader`: instead of using the filesystem directly, use webpack to load json files
- `?json-loader=loader-name`: use the given loader(s) (e.g. [`json`][json-loader]) for loading json files
- `?file-loader`: instead of using the filesystem directly, use webpack to load text files
- `?file-loader=loader-name`: use the given loader(s) (e.g. [`raw`][raw-loader]) for loading text files

Refer to the [webpack documentation][parse-query] for details about the loader syntax.


[json-loader]: https://github.com/webpack/json-loader
[raw-loader]: https://github.com/webpack/raw-loader
[parse-query]: https://github.com/webpack/loader-utils#parsequery
