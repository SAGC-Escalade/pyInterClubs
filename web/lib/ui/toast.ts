"use client";

/**
 * Toast d'erreur minimal (Bootstrap), utilisé pour signaler une perte de
 * connexion Realtime (doc 07 §5, équivalent du Toast SSE de l'ancien front).
 */
export function toastErreur(message: string) {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.className = "toast-container position-fixed bottom-0 end-0 p-3";
  el.setAttribute("role", "alert");
  el.innerHTML =
    `<div class="toast show align-items-center text-bg-danger border-0">` +
    `<div class="d-flex"><div class="toast-body">${message}</div>` +
    `<button type="button" class="btn-close btn-close-white me-2 m-auto"></button>` +
    `</div></div>`;
  const fermer = () => el.remove();
  el.querySelector("button")?.addEventListener("click", fermer);
  document.body.appendChild(el);
  setTimeout(fermer, 5000);
}

/** Réagit au statut d'un canal Realtime : toast sur perte de connexion. */
export function surStatutRealtime(status: string) {
  if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
    toastErreur("Perte de la connexion au serveur");
  }
}
