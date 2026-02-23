import React from "react";

export default function ImportExportPanel({
  importFormat,
  setImportFormat,
  importText,
  setImportText,
  onExportJson,
  onExportCsv,
  onImport,
}) {
  return (
    <div className="panel" style={{ marginTop: 12, padding: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" onClick={onExportJson}>
          ⬇️ Export JSON
        </button>

        <button type="button" onClick={onExportCsv}>
          ⬇️ Export CSV
        </button>

        <select value={importFormat} onChange={(e) => setImportFormat(e.target.value)}>
          <option value="json">Import JSON</option>
          <option value="csv">Import CSV</option>
        </select>
      </div>

      <textarea
        value={importText}
        onChange={(e) => setImportText(e.target.value)}
        placeholder={
          importFormat === "csv"
            ? "Paste CSV (headers: word,translation,example,deck,...)"
            : "Paste JSON array or {cards:[...]}"
        }
        rows={6}
        style={{ width: "100%", marginBottom: 8 }}
      />

      <button type="button" onClick={onImport}>
        ⬆️ Import
      </button>
    </div>
  );
}