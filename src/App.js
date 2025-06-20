import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { vraagChatGPT } from "./openai";           // ← named import, geen default!
import ReceptenZoeker from "./ReceptenZoeker";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
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
  const [listening, setListening] = useState(false);

  //  ────────────────────────────────────────────────────────
  //  Init user + realtime updates
  //  ────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) setUser(saved);
  }, []);

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel("public:boodschappen")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "boodschappen" },
        fetchItems
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  //  ────────────────────────────────────────────────────────
  //  Wrapper voor OpenAI
  //  ────────────────────────────────────────────────────────
  async function vraagAanChatGPT(prompt) {
    try {
      const data = await vraagChatGPT({
        messages: [{ role: "user", content: prompt }],
      });
      const antwoord = data.choices[0].message.content;
      alert("ChatGPT zegt:\n\n" + antwoord);
    } catch (error) {
      console.error("OpenAI fout compleet:", error);
      alert("Foutmelding van OpenAI:\n\n" + error.message);
    }
  }

  //  ────────────────────────────────────────────────────────
  //  CRUD op Supabase
  //  ────────────────────────────────────────────────────────
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
      {
        product,
        aantal: aantal ? parseInt(aantal) : null,
        gekocht: false,
        toegevoegd_door: user,
      },
    ]);
    setProduct("");
    setAantal("");
    fetchItems();
  }

  async function toggleGekocht(id, gekocht) {
    await supabase
      .from("boodschappen")
      .update({ gekocht: !gekocht })
      .eq("id", id);
    fetchItems();
  }

  async function deleteItem(id) {
    await supabase.from("boodschappen").delete().eq("id", id);
    fetchItems();
  }

  //  ────────────────────────────────────────────────────────
  //  Spraakinput
  //  ────────────────────────────────────────────────────────
  function startListening() {
    if (listening) return;
    setListening(true);
    recognition.start();
    recognition.onresult = (evt) => {
      setProduct(evt.results[0][0].transcript);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
  }

  //  ────────────────────────────────────────────────────────
  //  Recepten via ChatGPT
  //  ────────────────────────────────────────────────────────
  function vertaalIngredienten(nlLijst) {
    const woordenboek = {
      aardappelen: "potatoes",
      aardappel: "potato",
      ui: "onion",
      uien: "onions",
      tomaat: "tomato",
      tomaten: "tomatoes",
      paprika: "bell pepper",
      kaas: "cheese",
      melk: "milk",
      eieren: "eggs",
      pasta: "pasta",
      rijst: "rice",
      kip: "chicken",
      wortel: "carrot",
      wortels: "carrots",
      appel: "apple",
      appels: "apples",
      sinaasappel: "orange",
      sinaasappels: "oranges",
      brood: "bread",
    };
    return nlLijst
      .split(",")
      .map((w) => woordenboek[w.trim().toLowerCase()] || w.trim().toLowerCase())
      .filter(Boolean)
      .join(", ");
  }

  function zoekRecepten() {
    const NL = items.map((i) => i.product).join(", ");
    const EN = vertaalIngredienten(NL);
    vraagAanChatGPT(
      `Geef 3 recepten die ik kan maken met alleen deze ingrediënten: ${EN}.`
    );
  }

  //  ────────────────────────────────────────────────────────
  //  UI
  //  ────────────────────────────────────────────────────────
  return (
    <div
      style={{
        maxWidth: 420,
        margin: "2rem auto",
        padding: "1rem",
        borderRadius: 12,
        background: "#a3b18a",
        fontFamily: "sans-serif",
      }}
    >
      <h2>Boodschappenlijst</h2>
      <label>
        Wie ben je?{" "}
        <select
          value={user}
          onChange={(e) => {
            setUser(e.target.value);
            localStorage.setItem("user", e.target.value);
          }}
        >
          <option value="">Kies gebruiker…</option>
          {USERS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>

      <ReceptenZoeker huidigeGebruiker={user} naToevoegen={fetchItems} />

      <div style={{ margin: "1rem 0", display: "flex", gap: 8 }}>
        <button onClick={() => vraagAanChatGPT("Wat kan ik koken met tomaat en paprika?")}>
          Vraag recept aan ChatGPT
        </button>
        <button onClick={zoekRecepten}>Recepten via ChatGPT</button>
      </div>

      <form onSubmit={addItem} style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            placeholder="Product"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <button type="button" onClick={startListening}>
            🎤
          </button>
        </div>
        <input
          type="number"
          min="1"
          placeholder="Aantal"
          value={aantal}
          onChange={(e) => setAantal(e.target.value)}
          style={{ width: 60, marginRight: 8 }}
        />
        <button type="submit" disabled={!user}>
          Toevoegen
        </button>
      </form>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {items.map((it) => (
          <li
            key={it.id}
            style={{
              background: it.gekocht ? "#e0ffe0" : "#fff",
              margin: "0.5em 0",
              padding: "0.5em",
              borderRadius: 8,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>
              <strong>{it.product}</strong>{" "}
              {it.aantal ? `(${it.aantal})` : null}
              <br />
              <small>Door: {it.toegevoegd_door}</small>
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => toggleGekocht(it.id, it.gekocht)}>
                {it.gekocht ? "✔" : "Nog halen"}
              </button>
              <button onClick={() => deleteItem(it.id)}>🗑</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
