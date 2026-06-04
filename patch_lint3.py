import re

with open("components/UserPanel.tsx", "r") as f:
    content = f.read()

content = content.replace("  const checkSession = async () => {", "  const checkSession = useCallback(async () => {")
content = content.replace("    }\n  };\n\n  const handleLogout", "    }\n  }, []);\n\n  const handleLogout")
content = content.replace("useEffect(() => {\n    checkSession();\n  }, []);", "useEffect(() => {\n    checkSession();\n  }, [checkSession]);")

if "useCallback" not in content[:200]:
    content = content.replace("import React, { useState, useEffect }", "import React, { useState, useEffect, useCallback }")

with open("components/UserPanel.tsx", "w") as f:
    f.write(content)
