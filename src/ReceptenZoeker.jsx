// src/ReceptenZoeker.jsx
import React, { useState } from "react";
import { supabase } from "./supabaseClient";

// Haalt de ingrediënten + hoeveelheden uit een “Meal” object
function haalIngredientenOp(recept) {
  let ingredienten = [];
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

// Vertaal-tabel voor Nederlandse ingredienten naar Engels
const VERTALING = {
  kip:          "chicken",
  aardappel:    "potato",
  ui:           "onion",
  tomaat:       "tomato",
  paprika:      "bell pepper",
  kaas:         "cheese",
  melk:         "milk",
  eieren:       "eggs",
  rijst:        "rice",
  pasta:        "pasta",
  wortel:       "carrot",
  appel:        "apple",
  sinaasappel:  "orange",
  brood:        "bread",
};

export default function ReceptenZoeker({ huidigeGebruiker, naToevoegen }) {
  // ─── state ─────────────────────────────────────────────────────────────
  const [zoekwoord, setZoekwoord] = useState("");
  const [recepten, setRecepten] = useState([]);
  const [laden, setLaden]         = useState(false);

  // ─── ophalen van recepten op basis van 1 ingrediënt ─────────────────────
  async function zoekRecepten(e) {
    e.preventDefault();
    setLaden(true);
    setRecepten([]);

    // 1) vertaal term
    const termNL = zoekwoord.trim().toLowerCase();
    const termEN = VERTALING[termNL] || termNL;

    // 2) zoek op ingrediënt
    const filterUrl = `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(termEN)}`;
    const resp1     = await fetch(filterUrl);
    const lijst     = (await resp1.json()).meals || [];

    // 3) haal van elk meal de volledige details op
    const details = await Promise.all(
      lijst.map(async meal => {
        const resp2 = await fetch(
          `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`
        );
        const json  = await resp2.json();
        return json.meals[0];
      })
    );

    setRecepten(details);
    setLaden(false);
  }

  // ─── ingrediënten toevoegen aan Supabase ───────────────────────────────
  async function voegIngredientenToe(ingredienten) {
    const items = ingredienten.map(i => ({
      product:          i.naam,
      aantal:           i.hoeveelheid || null,
      gekocht:          false,
      toegevoegd_door:  huidigeGebruiker,
    }));
    for (let itm of items) {
      await supabase.from("boodschappen").insert([itm]);
    }
    if (naToevoegen) naToevoegen();
    alert("Ingrediënten toegevoegd aan de boodschappenlijst!");
  }

  // ─── render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#d9ed92", padding: 16, borderRadius: 12, margin: "2em 0" }}>
      <h3>Zoek een recept</h3>

      <form onSubmit={zoekRecepten} style={{ marginBottom: 12 }}>
        <input
          value={zoekwoord}
          onChange={e => setZoekwoord(e.target.value)}
          placeholder="Typ bijvoorbeeld: kip"
          style={{ padding: 6, borderRadius: 6, border: "1px solid #ccc", marginRight: 8 }}
        />
        <button type="submit" disabled={laden || !zoekwoord.trim()}>
          {laden ? "Bezig..." : "Zoeken"}
        </button>
      </form>

      {recepten.map((recept) => (
        <div key={recept.idMeal} style={{
          margin: "14px 0", background: "#fff", border: "1px solid #bbb",
          padding: 12, borderRadius: 10,
        }}>
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
                {haalIngredientenOp(recept).map((ing, i) =>
                  <li key={i}>
                    {ing.naam}{ing.hoeveelheid ? ` (${ing.hoeveelheid})` : ""}
                  </li>
                )}
              </ul>
            </div>
          </div>
          <button
            style={{
              marginTop: 10, background: "#a3b18a", border: "none",
              borderRadius: 6, padding: "0.5em 1em", cursor: "pointer",
            }}
            onClick={() => voegIngredientenToe(haalIngredientenOp(recept))}
          >
            Zet ingrediënten op boodschappenlijst
          </button>
        </div>
      ))}

      {!laden && recepten.length === 0 && (
        <div style={{ color: "#888", marginTop: 14 }}>Nog geen recepten gevonden.</div>
      )}
    </div>
  );
}
