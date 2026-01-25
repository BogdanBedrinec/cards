// const API_URL = "http://localhost:5000/api/cards";

// // --- Отримати картки ---
// export async function getCards(userId) {
//   const res = await fetch(`${API_URL}?userId=${userId}`);
//   if (!res.ok) {
//     throw new Error("Помилка при отриманні карток");
//   }
//   return res.json();
// }

// // --- Додати картку ---
// export async function addCard(card) {
//   const res = await fetch(API_URL, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(card),
//   });

//   if (!res.ok) throw new Error("Помилка при створенні картки");
//   return res.json();
// }

// // --- Оновити статистику ---
// export async function reviewCard(id, correct) {
//   const res = await fetch(`${API_URL}/${id}/review`, {
//     method: "PUT",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ correct }),
//   });

//   if (!res.ok) throw new Error("Помилка при оновленні картки");
//   return res.json();
// }

// // --- Видалити ---
// export async function deleteCard(id) {
//   const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });

//   if (!res.ok) throw new Error("Помилка при видаленні картки");
//   return res.json();
// }
