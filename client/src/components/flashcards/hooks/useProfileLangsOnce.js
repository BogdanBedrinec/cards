// src/components/flashcards/hooks/useProfileLangsOnce.js

import { useEffect } from "react";
import { API, LS_UI, LS_L1, LS_L2 } from "../utils/constants.js";
import { normalizeLang } from "../utils/format.js";
import { apiFetch } from "../utils/apiFetch.js";

export function useProfileLangsOnce({
  handle401,
  setInterfaceLang,
  setNativeLang,
  setLearningLang,
}) {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch({
          url: `${API}/api/users/me`,
          method: "GET",
          handle401,
        });

        if (!res.ok || cancelled) return;

        const user = res.data;
        if (!user) return;

        const ui = normalizeLang(user.interfaceLang, localStorage.getItem(LS_UI) || "en");
        const l1 = normalizeLang(user.nativeLang, localStorage.getItem(LS_L1) || "uk");
        const l2 = normalizeLang(user.learningLang, localStorage.getItem(LS_L2) || "en");

        localStorage.setItem(LS_UI, ui);
        localStorage.setItem(LS_L1, l1);
        localStorage.setItem(LS_L2, l2);

        setInterfaceLang(ui);
        setNativeLang(l1);
        setLearningLang(l2);
      } catch {
        // ignore (offline / server sleeping / etc.)
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [handle401, setInterfaceLang, setNativeLang, setLearningLang]);
}