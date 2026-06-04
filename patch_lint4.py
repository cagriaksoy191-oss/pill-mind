with open("components/UserPanel.tsx", "r") as f:
    content = f.read()

content = content.replace("  const checkSession = useCallback(async () => {", "  const checkSession = async () => {")
content = content.replace("useEffect(() => {\n    checkSession();\n  }, [checkSession]);", "useEffect(() => {\n    checkSession();\n  // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, []);")

with open("components/UserPanel.tsx", "w") as f:
    f.write(content)
