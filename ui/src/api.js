// src/api.js
// Centralised API service — all backend calls go through here

const BASE = "http://localhost:3000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data.error || data.detail || `HTTP ${res.status}`);
  return data;
}

// ── Health ──────────────────────────────────────
export const getHealth = () => request("/health");

// ── Upload ──────────────────────────────────────
export const uploadFile = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error || `HTTP ${xhr.status}`));
      } catch {
        reject(new Error("Invalid server response"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
};

// ── Ledger ──────────────────────────────────────
export const getLedger = (limit = 20, offset = 0) => request(`/ledger`);

export const deleteLedgerEntry = (id) =>
  request(`/ledger/${id}`, { method: "DELETE" });

// ── Download ────────────────────────────────────
export const downloadFile = async (id, filename) => {
  const res = await fetch(`${BASE}/download/${id}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
