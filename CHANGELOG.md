# Changelog

## Last Changes

- [#18](https://github.com/LaxarJS/laxar-loader/issues/18): themes and layouts must now have descriptor `.json` files
   + **BREAKING CHANGE**: see ticket for details
- [#27](https://github.com/LaxarJS/laxar-loader/issues/27): loading the `debug-info` lazily is now opt-in with the `?lazy` parameter
   + NEW FEATURE: see ticket for details


## v2.0.0-alpha.3

- [#25](https://github.com/LaxarJS/laxar-loader/issues/25): a new entry point `debug-info` has been added
   + NEW FEATURE: see ticket for details


## v2.0.0-alpha.2

- [#26](https://github.com/LaxarJS/laxar-loader/issues/26): bump laxar-tooling version: new default paths


## v2.0.0-alpha.1

- [#24](https://github.com/LaxarJS/laxar-loader/issues/24): load widgets and controls according to webpack module resolve strategy


## v2.0.0-alpha.0

- [#23](https://github.com/LaxarJS/laxar-loader/issues/23): allow to omit the `laxar.config.js` file
- [#22](https://github.com/LaxarJS/laxar-loader/issues/22): upgraded to webpack 2


## v0.5.0

- [#21](https://github.com/LaxarJS/laxar-loader/issues/21): bump laxar-tooling version: pre-assemble pages at build-time


## v0.5.0-alpha.0

- [#17](https://github.com/LaxarJS/laxar-loader/issues/17): artifacts are now validation with JSON schema before they are serialized
  + **BREAKING CHANGE:** see ticket for details
- [#16](https://github.com/LaxarJS/laxar-loader/issues/16): updated to `laxar-tooling` v0.5.0
  + **BREAKING CHANGE:** see ticket for details
- [#15](https://github.com/LaxarJS/laxar-loader/issues/15): handle webpack aliases ending in `$` properly
- [#12](https://github.com/LaxarJS/laxar-loader/issues/12): avoid getting module objects for artifact URLs
- [#9](https://github.com/LaxarJS/laxar-loader/issues/9): the webpack loader is now tested with TravisCI
- [#14](https://github.com/LaxarJS/laxar-loader/issues/14): avoid use of node's `fs` module in favor of webpack's input filesystem
- [#13](https://github.com/LaxarJS/laxar-loader/issues/13): throw an error when the `laxar.config` can't be resolved, instead of timing out


## v0.4.1

- [#10](https://github.com/LaxarJS/laxar-loader/issues/10): fix loading of CSS files and `assetUrls`


## v0.4.0

- [#8](https://github.com/LaxarJS/laxar-loader/issues/8): read `laxar.config.js` for path configuration, update to `laxar-tooling` v0.4.1
- [#7](https://github.com/LaxarJS/laxar-loader/issues/7): resolve laxar-paths only at the beginning of the path
- [#6](https://github.com/LaxarJS/laxar-loader/issues/6): don't inject preceding loaders' output into artifact collector
- [#5](https://github.com/LaxarJS/laxar-loader/issues/5): provide the importable entry point `laxar-loader/artifacts`


## v0.3.0

- [#4](https://github.com/LaxarJS/laxar-loader/issues/4): allow loading artifacts directly (instead of starting from the flow)


# v0.2.0

- [#2](https://github.com/LaxarJS/laxar-loader/issues/2): update to [laxar-tooling][] `v0.3.0` for artifact asset support
- [#1](https://github.com/LaxarJS/laxar-loader/issues/1): modified parameters to accept singular and plural variants (e.g. `flow` and `flows[]`)


## v0.1.0

- initial version

[laxar-tooling]: /LaxarJS/laxar-tooling
