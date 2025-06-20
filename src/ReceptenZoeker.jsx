// src/ReceptenZoeker.jsx
import React, { useState } from "react";
import { supabase } from "./supabaseClient";

// vertaalmap voor Nederlandse → Engelse termen
const VERTALING = {
  kip: "chicken",
  aardappel: "potato",
  ui: "onion",
  tomaat: "tomato",
  paprika: "bell pepper",
  kaas: "cheese",
  melk: "milk",
  eieren: "eggs",
  rijst: "rice",
  pasta: "pasta",
  wortel: "carrot",
  appel: "apple",
  sinaasappel: "orange",
  brood: "bread",
  // breid uit naar wens…
};

function haalIngredientenOp(recept) {
  const ingredienten = [];
  for (let i = 1; i <= 20; i++) {
    const naam = recept[`strIngredient${i}`];
    const hoeveelheid = recept[`strMeasure${i}`];
    if (naam && naam.trim()) {
      ingredienten.push({
        naam: naam.trim(),
        hoeveelheid: hoeveelheid ? hoeveelheid.trim() : "",
      });
    }
  }
  return ingredienten;
}

export default function ReceptenZoeker({ huidigeGebruiker, naToevoegen }) {
  const [zoekwoord, setZoekwoord] = useState("");
  const [recepten, setRecepten] = useState([]);
  const [laden, setLaden] = useState(false);

  // Zoek op ingrediënt via TheMealDB
  async function zoekRecepten(e) {
    e.preventDefault();
    setLaden(true);
    setRecepten([]);

    // vertaal NL → EN of fallback op exact term
    const termNL = zoekwoord.trim().toLowerCase();
    const termEN = VERTALING[termNL] || termNL;

    // 1) filter op ingrediënt
    const filterUrl = `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(
      termEN
    )}`;
    const resp1 = await fetch(filterUrl);
    const lijst = (await resp1.json()).meals || [];

    // 2) per gevonden meal: haal volledige data op
    const details = await Promise.all(
      lijst.map(async (meal) => {
        const resp2 = await fetch(
          `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`
        );
        const json = await resp2.json();
        return json.meals[0];
      })
    );

    setRecepten(details);
    setLaden(false);
  }

  // Voeg ingredienten toe, met parseInt op hoeveelheid
  async function voegIngredientenToe(ingredienten) {
    try {
      const items = ingredienten.map((i) => {
        const num = parseInt(i.hoeveelheid, 10);
        const aantal = isNaN(num) ? null : num;
        const productNaam =
          i.hoeveelheid && isNaN(num)
            ? `${i.naam} (${i.hoeveelheid})`
            : i.naam;
        return {
          product: productNaam,
          aantal,
          gekocht: false,
          toegevoegd_door: huidigeGebruiker,
        };
      });

      const { error } = await supabase.from("boodschappen").insert(items);
      if (error) throw error;
      if (naToevoegen) await naToevoegen();
      alert("Ingrediënten toegevoegd aan de boodschappenlijst!");
    } catch (err) {
      console.error("⚠️ Insert error:", err);
      alert("Fout bij toevoegen: " + err.message);
    }
  }

  // Sluit alle recepten (ga terug naar enkel de lijst)
  function sluitRecepten() {
    setRecepten([]);
  }

  return (
    <div
      style={{
        background: "#d9ed92",
        padding: 16,
        borderRadius: 12,
        margin: "2em 0",
      }}
    >
      <h3>Zoek een recept</h3>
      <form onSubmit={zoekRecepten} style={{ marginBottom: 12 }}>
        <input
          value={zoekwoord}
          onChange={(e) => setZoekwoord(e.target.value)}
          placeholder="Typ bijvoorbeeld: kip"
          style={{
            padding: 6,
            borderRadius: 6,
            border: "1px solid #ccc",
            marginRight: 8,
          }}
        />
        <button type="submit" disabled={laden || !zoekwoord}>
          Zoeken
        </button>
      </form>
      {laden && <div>Bezig met zoeken...</div>}

      {recepten.map((recept) => (
        <div
          key={recept.idMeal}
          style={{
            margin: "14px 0",
            background: "#fff",
            border: "1px solid #bbb",
            padding: 12,
            borderRadius: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <img
              src={recept.strMealThumb}
              alt={recept.strMeal}
              width={100}
              style={{ marginRight: 14, borderRadius: 6 }}
            />
            <div>
              <h4 style={{ margin: 0 }}>{recept.strMeal}</h4>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {haalIngredientenOp(recept).map((ing, idx) => (
                  <li key={idx}>
                    {ing.naam}
                    {ing.hoeveelheid ? ` (${ing.hoeveelheid})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button
              style={{
                background: "#a3b18a",
                border: "none",
                borderRadius: 6,
                padding: "0.5em 1em",
                cursor: "pointer",
              }}
              onClick={() =>
                voegIngredientenToe(haalIngredientenOp(recept))
              }
            >
              Zet ingrediënten op lijst
            </button>
            <button
              style={{
                background: "#ff6666",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "0.5em 1em",
                cursor: "pointer",
              }}
              onClick={sluitRecepten}
            >
              Sluit
            </button>
          </div>
        </div>
      ))}

      {recepten.length === 0 && !laden && (
        <div style={{ color: "#888", marginTop: 14 }}>
          Nog geen recepten gevonden.
        </div>
      )}
    </div>
  );
}
