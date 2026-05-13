# Debugging

- **Logs:** `/tmp/oh-my-opencode.log`
- **Health check:** `bunx oh-my-opencode doctor`
- **Disable a broken hook:** add its name to `disabled_hooks` in config
- **Hashline edit rejects:** re-read the file first — the edit hash is stale
- **Plugin not loading:** check OpenCode config has `"plugins": { "oh-my-openagent": {} }`
