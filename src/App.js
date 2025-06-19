import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import openai from "./openai";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = "nl-NL";
recognition.continuous = false;
recognition.interimResults = false;

const USERS = ["Rene", "Marjolein", "Rosanne"];

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
    .map(ingr => woordenboek[ingr.trim().toLowerCase()] || ingr.trim().toLowerCase())
    .filter(Boolean)
    .join(", ");
}

export default function App() {
  const [user, setUser] = useState("");
  const [items, setItems] = useState([]);
  const [product, setProduct] = useState("");
  const [aantal, setAantal] = useState("");
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUser(savedUser);
  }, []);

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel("public:boodschappen")
      .on("postgres_changes", { event: "*", schema: "public", table: "boodschappen" }, fetchItems)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchItems() {
    let { data, error } = await supabase.from("boodschappen").select("*").order("id", { ascending: false });
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
    await fetchItems();
  }

  async function toggleGekocht(id, gekocht) {
    await supabase.from("boodschappen").update({ gekocht: !gekocht }).eq("id", id);
    await fetchItems();
  }

  async function deleteItem(id) {
    await supabase.from("boodschappen").delete().eq("id", id);
    await fetchItems();
  }

function startListening() {
  if (listening) return; // voorkomt dubbele start
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

  recognition.onerror = (event) => {
    console.error("Spraakherkenning fout:", event.error);
    setListening(false);
  };
}


  function handleUserSelect(e) {
    setUser(e.target.value);
    localStorage.setItem("user", e.target.value);
  }

  async function vraagAanChatGPT(prompt) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      });

      const antwoord = response.choices[0].message.content;
      alert("ChatGPT zegt:\n\n" + antwoord);
    } catch (error) {
      console.error("ChatGPT fout:", error);
      alert("Foutmelding:\n\n" + JSON.stringify(error, null, 2));
    }
  }

  async function zoekReceptenViaChatGPT() {
    const ingredientenNL = items.map(i => i.product).join(", ");
    const ingredientenEN = vertaalIngredienten(ingredientenNL);
    const prompt = `Geef 3 recepten die ik kan maken met alleen deze ingrediënten: ${ingredientenEN}. Geef alleen de naam van het gerecht en de ingrediënten in een lijst.`;

    vraagAanChatGPT(prompt);
  }

  return (
    <div style={{ maxWidth: 420, margin: "2rem auto", fontFamily: "sans-serif", background: "#a3b18a", padding: "1rem", borderRadius: "12px" }}>
      <h2>Boodschappenlijst (totaalblad)</h2>
      <label>
        Wie ben je?{" "}
        <select value={user} onChange={handleUserSelect}>
          <option value="">Kies gebruiker...</option>
          {USERS.map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => vraagAanChatGPT("Wat kan ik koken met tomaat en paprika?")}
          style={{
            background: "#a3b18a",
            border: "none",
            borderRadius: 6,
            padding: "0.5em 1em",
            cursor: "pointer",
          }}
        >
          Vraag recept aan ChatGPT
        </button>

        <button
          onClick={zoekReceptenViaChatGPT}
          style={{
            background: "#b5ead7",
            border: "none",
            borderRadius: 6,
            padding: "0.5em 1em",
            cursor: "pointer",
          }}
        >
          Recepten via ChatGPT
        </button>
      </div>

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
              background: "#a3b18a",
              border: "1px solid #ccc",
              borderRadius: 6,
              padding: "0.3em 0.7em",
              cursor: "pointer",
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
        <button type="submit" disabled={!user}>
          Toevoegen
        </button>
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
              justifyContent: "space-between",
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
                  cursor: "pointer",
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
                  color: "#c00",
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
