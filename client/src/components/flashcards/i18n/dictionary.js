  const T = useMemo(
    () => ({
      de: {
        review: "⚡ Wiederholen",
        library: "📖 Bibliothek",
        add: "➕ Hinzufügen",
        refresh: "Aktualisieren",
        deckFilter: "Thema",
        allDecks: "Alle",
        showTranslation: "Übersetzung anzeigen",
        know: "Weiß ich ✅",
        dontKnow: "Weiß ich nicht ❌",
        noCards: "Keine Karten zum Wiederholen 🎉",
        addCard: "Karte hinzufügen",
        addDeck: "Thema hinzufügen",
        newDeck: "➕ Neues Thema (optional)",
        exampleOpt: "📘 Beispiel (optional)",
        wordPlaceholder: "Wort",
        translationPlaceholder: "Übersetzung",
        tipAfterAdd: "Tipp: Danach zu ⚡ Wiederholen wechseln.",
        loading: "Laden…",
        retry: "Erneut versuchen",
        offlineHint: "Server nicht erreichbar. Läuft das Backend?",
        searchPlaceholder: "Suche (Wort / Übersetzung / Thema / Beispiel)…",
        reload: "Neu laden",
        noFound: "Keine Karten gefunden.",
        edit: "Bearbeiten",
        del: "Löschen",
        cancel: "Abbrechen",
        save: "Speichern",
        editTitle: "Karte bearbeiten",

        // stats
        total: "Gesamt",
        dueNow: "Fällig jetzt",
        accuracy: "Genauigkeit",
        learned: "Gelernt",
        remaining: "Verbleibend",

        // sorting
        sort: "Sortierung",
        order: "Reihenfolge",
        az: "A → Z",
        za: "Z → A",

        // deck manager
        deckManagerTitle: "🗂 Themen (Deck-Manager)",
        from: "Von",
        newName: "Neuer Name (umbenennen)",
        removeMoveTo: "Entfernen: Karten verschieben nach",
        renameBtn: "Umbenennen",
        removeBtn: "Entfernen",

        // bulk
        selected: "Ausgewählt",
        selectAll: "Alle auswählen",
        clear: "Leeren",
        moveTo: "Verschieben nach",
        move: "Verschieben",
        deleteSelected: "Ausgewählte löschen",
        confirmDeleteN: "Ausgewählte Karten löschen?",

        defaultDeck: "Ohne Thema",
        cannotRenameDefault: "⚠️ „Ohne Thema“ kann nicht umbenannt werden.",
        cannotDeleteDefault: "⚠️ „Ohne Thema“ kann nicht gelöscht werden.",
        confirmRename: (from, to) => `Thema "${from}" → "${to}" umbenennen?`,
        confirmRemove: (name, to) => `Thema "${name}" entfernen (Karten → "${to}")?`,

        sortByCreatedAt: "🆕 Erstellt",
sortByWord: "🔤 Wort",
sortByNextReview: "🕒 Nächste Wiederholung",
sortByAccuracy: "🎯 Genauigkeit",

timeMin: "Min(uten)",
timeHour: "Std(unden)",
timeDay: "Tag(e)",
timeIn: "In",

reviewCountLabel: "Bewertungen",
correctCountLabel: "Richtig",
dueNowLabel: "Fällig jetzt",

delete: "Löschen",




      },

      en: {
        review: "⚡ Review",
        library: "📖 Library",
        add: "➕ Add",
        refresh: "Refresh",
        deckFilter: "Topic",
        allDecks: "All",
        showTranslation: "Show translation",
        know: "I know ✅",
        dontKnow: "I don’t know ❌",
        noCards: "No cards to review 🎉",
        addCard: "Add card",
        addDeck: "Add topic",
        newDeck: "➕ New topic (optional)",
        exampleOpt: "📘 Example (optional)",
        wordPlaceholder: "Word",
        translationPlaceholder: "Translation",
        tipAfterAdd: "Tip: Switch to ⚡ Review after adding.",
        loading: "Loading…",
        retry: "Retry",
        offlineHint: "Server not reachable. Did you start backend?",
        searchPlaceholder: "Search (word / translation / topic / example)…",
        reload: "Reload",
        noFound: "No cards found.",
        edit: "Edit",
        del: "Delete",
        cancel: "Cancel",
        save: "Save",
        editTitle: "Edit card",

        // stats
        total: "Total",
        dueNow: "Due now",
        accuracy: "Accuracy",
        learned: "Learned",
        remaining: "Remaining",

        // sorting
        sort: "Sorting",
        order: "Order",
        az: "A → Z",
        za: "Z → A",

        // deck manager
        deckManagerTitle: "🗂 Topics (Deck manager)",
        from: "From",
        newName: "New name (rename)",
        removeMoveTo: "Remove: move cards to",
        renameBtn: "Rename",
        removeBtn: "Remove",

        // bulk
        selected: "Selected",
        selectAll: "Select all",
        clear: "Clear",
        moveTo: "Move to",
        move: "Move",
        deleteSelected: "Delete selected",
        confirmDeleteN: "Delete selected cards?",

        defaultDeck: "No topic",
        cannotRenameDefault: "⚠️ “No topic” cannot be renamed.",
        cannotDeleteDefault: "⚠️ “No topic” cannot be deleted.",
        confirmRename: (from, to) => `Rename topic "${from}" → "${to}"?`,
        confirmRemove: (name, to) => `Remove topic "${name}" (move cards → "${to}")?`,

        sortByCreatedAt: "🆕 Created",
sortByWord: "🔤 Word",
sortByNextReview: "🕒 Next review",
sortByAccuracy: "🎯 Accuracy",

timeMin: "min(s)",
timeHour: "h",
timeDay: "day(s)",
timeIn: "In",

reviewCountLabel: "Reviews",
correctCountLabel: "Correct",
dueNowLabel: "Due now",

delete: "Delete",




      },

      uk: {
        review: "⚡ Повторення",
        library: "📖 Бібліотека",
        add: "➕ Додати",
        refresh: "Оновити",
        deckFilter: "Тема",
        allDecks: "Усі",
        showTranslation: "Показати переклад",
        know: "Знаю ✅",
        dontKnow: "Не знаю ❌",
        noCards: "Немає карток для повторення 🎉",
        addCard: "Додати картку",
        addDeck: "Додати тему",
        newDeck: "➕ Нова тема (опційно)",
        exampleOpt: "📘 Приклад (необов'язково)",
        wordPlaceholder: "Слово",
        translationPlaceholder: "Переклад",
        tipAfterAdd: "Порада: після додавання переходь у ⚡ Повторення.",
        loading: "Завантаження…",
        retry: "Повторити",
        offlineHint: "Сервер недоступний. Ти запустив бекенд?",
        searchPlaceholder: "Пошук (слово / переклад / тема / приклад)…",
        reload: "Оновити список",
        noFound: "Нічого не знайдено.",
        edit: "Редагувати",
        del: "Видалити",
        cancel: "Скасувати",
        save: "Зберегти",
        editTitle: "Редагування картки",

        // stats
        total: "Усього",
        dueNow: "До повтору зараз",
        accuracy: "Точність",
        learned: "Вивчено",
        remaining: "Залишилось",

        // sorting
        sort: "Сортування",
        order: "Порядок",
        az: "А → Я",
        za: "Я → А",

        // deck manager
        deckManagerTitle: "🗂 Теми (керування)",
        from: "Звідки",
        newName: "Нова назва (перейменувати)",
        removeMoveTo: "Видалити: перемістити картки в",
        renameBtn: "Перейменувати",
        removeBtn: "Видалити",

        // bulk
        selected: "Вибрано",
        selectAll: "Вибрати все",
        clear: "Очистити",
        moveTo: "Перемістити в",
        move: "Перемістити",
        deleteSelected: "Видалити вибрані",
        confirmDeleteN: "Видалити вибрані картки?",

        defaultDeck: "Без теми",
        cannotRenameDefault: "⚠️ «Без теми» не можна перейменувати.",
        cannotDeleteDefault: "⚠️ «Без теми» не можна видалити.",
        confirmRename: (from, to) => `Перейменувати тему "${from}" → "${to}"?`,
        confirmRemove: (name, to) => `Видалити тему "${name}" (перемістити картки → "${to}")?`,

        sortByCreatedAt: "🆕 Дата додавання",
sortByWord: "🔤 Слово",
sortByNextReview: "🕒 Наступний повтор",
sortByAccuracy: "🎯 Точність",

timeMin: "хв(илин)",
timeHour: "год(ин)",
timeDay: "день(дні)",
timeIn: "Через",

reviewCountLabel: "Повторів",
correctCountLabel: "Правильно",
dueNowLabel: "До повтору зараз",

delete: "Видалити",


      },
    }),
    []
  );

  const t = T[normalizeLang(interfaceLang, "de")] || T.de;