# Changelog

## Last Changes

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
