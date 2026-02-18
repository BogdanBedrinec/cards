  useEffect(() => {
    const token = getToken();
    if (!token) navigate("/login", { replace: true });
  }, [navigate]);