# VSCode Surround

A vscode extension analogous to vim's pair motion

<!-- ![Showcase]() -->

**How it works?**

We simultaneously search for the nearest substring pair (position relative to the cursor) that matches the specified `start` and `end` patterns respectively. The search process will not take AST into account. Currently, VS Code doesn't expose any AST information in its Extension API.

**Default Patterns**

The following selection patterns are provided out-of-the-box:

- `<>`
- `{}`
- `[]`
- `''`
- `""`
- `()`
- `` ` ``
- ` ``` `

**Custom Pattern**

Custom selection patterns can be specified in `Preferences`. Match patterns are specified as Javascript regular expression strings. An example configuration is given below. Custom pattern 2 here formulates a typical Typescript function declaration. Notes that this custom pattern is _fragile_. We recommend keeping the patterns simple.

```json
{
  "vscode-surround.custom-patterns": {
    "1": {
      "startPattern": "\\(",
      "endPattern": "\\)"
    },
    "2": {
      "startPattern": "function \\w+\\([^\\n]*\\)(: \\w+)? {",
      "endPattern": "}"
    }
  }
}
```
