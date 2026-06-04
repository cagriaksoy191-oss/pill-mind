import re

with open("components/UserPanel.tsx", "r") as f:
    content = f.read()

# Fix 'any' in components/UserPanel.tsx catch blocks
content = content.replace("} catch (err: any) {", "} catch (error) {\n      const err = error instanceof Error ? error : new Error(String(error));")
content = content.replace("setErrorMsg(err.message || ", "setErrorMsg(err.message || ")

with open("components/UserPanel.tsx", "w") as f:
    f.write(content)
