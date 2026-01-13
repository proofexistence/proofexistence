// Run with: node seed-themes.mjs
const res = await fetch('http://localhost:3000/api/admin/quests/seed-themes', {
  method: 'POST',
  headers: { 'X-Wallet-Address': '0xA7D2A0647F1f12455f543Db4CaA350e85C0Eae09' }
});
const data = await res.json();
console.log(data);
