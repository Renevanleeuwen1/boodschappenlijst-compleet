import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = "nl-NL";
recognition.continuous = false;
recognition.interimResults = false;

const USERS = ["Rene", "Marjolein", "Rosanne"];

export default function App() {
  const [user, setUser] = useState("");
  const [items, setItems] = useState([]);
  const [product, setProduct] = useState("");
  const [aantal, setAantal] = useState("");

  // Gebruiker bewaren (localStorage)
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUser(savedUser);
  }, []);

  // Boodschappen ophalen & realtime updates
  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel('public:boodschappen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boodschappen' }, fetchItems)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchItems() {
    let { data, error } = await supabase
      .from("boodschappen")
      .select("*")
      .order("id", { ascending: false });
    if (!error) setItems(data);
  }

async function addItem(e) {
  e.preventDefault();
  if (!product.trim() || !user) return;
  await supabase.from("boodschappen").insert([
    { product, aantal: aantal ? parseInt(aantal) : null, gekocht: false, toegevoegd_door: user }
  ]);
  setProduct("");
  setAantal("");
  await fetchItems(); // ← deze regel erbij!
}
const [listening, setListening] = useState(false);

function startListening() {
  setListening(true);
  recognition.start();

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    setProduct(transcript);
    setListening(false);
  };

  recognition.onend = () => {
    setListening(false);
  };
}

  function handleUserSelect(e) {
    setUser(e.target.value);
    localStorage.setItem("user", e.target.value);
  }

  async function toggleGekocht(id, gekocht) {
    await supabase.from("boodschappen").update({ gekocht: !gekocht }).eq("id", id);
    await fetchItems();
  }

async function deleteItem(id) {
  await supabase.from("boodschappen").delete().eq("id", id);
  await fetchItems(); // <-- deze regel zorgt voor direct updaten!
}


return (
    <div style={{ maxWidth: 420, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h2>Boodschappenlijst (totaalblad)</h2>
      <label>
        Wie ben je?{" "}
        <select value={user} onChange={handleUserSelect}>
          <option value="">Kies gebruiker...</option>
          {USERS.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </label>

      <form onSubmit={addItem} style={{ margin: "1rem 0" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
  <input
    placeholder="Product"
    value={product}
    onChange={e => setProduct(e.target.value)}
    required
    style={{ flex: 1 }}
  />
  <button
    type="button"
    onClick={startListening}
    style={{
      marginLeft: 8,
      background: listening ? "#c0ffc0" : "#eee",
      border: "1px solid #ccc",
      borderRadius: 6,
      padding: "0.3em 0.7em",
      cursor: "pointer"
    }}
    title="Spreek productnaam in"
  >
    🎤
  </button>
</div>

        <input
          placeholder="Aantal"
          value={aantal}
          type="number"
          min="1"
          onChange={e => setAantal(e.target.value)}
          style={{ width: 70, marginLeft: 8 }}
        />
        <button type="submit" disabled={!user}>Toevoegen</button>
      </form>

      <ul style={{ padding: 0, listStyle: "none" }}>
        {items.map(item => (
       <li
  key={item.id}
  style={{
    margin: "0.5em 0",
    padding: "0.5em",
    background: item.gekocht ? "#e0ffe0" : "#fff",
    borderRadius: 8,
    border: "1px solid #eee",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  }}
>
  <span>
    <strong>{item.product}</strong> {item.aantal ? `(${item.aantal})` : null}
    <br />
    <small>Door: {item.toegevoegd_door}</small>
  </span>
  <span style={{ display: "flex", alignItems: "center" }}>
    <button
      onClick={() => toggleGekocht(item.id, item.gekocht)}
      style={{
        marginLeft: 12,
        background: item.gekocht ? "#bada55" : "#ddd",
        border: 0,
        borderRadius: 6,
        padding: "0.3em 0.7em",
        cursor: "pointer"
      }}
    >
      {item.gekocht ? "✔" : "Nog halen"}
    </button>
    <button
      onClick={() => deleteItem(item.id)}
      style={{
        marginLeft: 10,
        background: "#ffdddd",
        border: "1px solid #ff6666",
        borderRadius: 6,
        padding: "0.3em 0.7em",
        cursor: "pointer",
        color: "#c00"
      }}
      title="Verwijderen"
    >
      🗑
    </button>
  </span>
</li>

        ))}
      </ul>
    </div>
  );
}
