import React, { useState } from "react";
import { supabase } from "./supabaseClient";

function haalIngredientenOp(recept) {
  // Haal maximaal 20 ingrediënten + hoeveelheden op
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

export default function ReceptenZoeker({ huidigeGebruiker, naToevoegen }) {
  const [zoekwoord, setZoekwoord] = useState("");
  const [recepten, setRecepten] = useState([]);
  const [laden, setLaden] = useState(false);

  async function zoekRecepten(e) {
    e.preventDefault();
    setLaden(true);
    setRecepten([]);
    const resp = await fetch(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(zoekwoord)}`
    );
    const data = await resp.json();
    setRecepten(data.meals || []);
    setLaden(false);
  }

  async function voegIngredientenToe(ingredienten) {
    // Voeg elk ingrediënt toe aan boodschappenlijst in Supabase
    const items = ingredienten.map(i => ({
      product: i.naam,
      aantal: i.hoeveelheid || null,
      gekocht: false,
      toegevoegd_door: huidigeGebruiker,
    }));
    // Voeg toe via Supabase
    for (let item of items) {
      await supabase.from("boodschappen").insert([item]);
    }
    if (naToevoegen) naToevoegen();
    alert("Ingrediënten toegevoegd aan de boodschappenlijst!");
  }

  return (
    <div style={{ background: "#d9ed92", padding: 16, borderRadius: 12, margin: "2em 0" }}>
      <h3>Zoek een recept</h3>
      <form onSubmit={zoekRecepten}>
        <input
          value={zoekwoord}
          onChange={e => setZoekwoord(e.target.value)}
          placeholder="Typ bijvoorbeeld: kip"
          style={{ padding: 6, borderRadius: 6, border: "1px solid #ccc", marginRight: 8 }}
        />
        <button type="submit" disabled={laden || !zoekwoord}>Zoeken</button>
      </form>
      {laden && <div>Bezig met zoeken...</div>}
      {recepten.map(recept => (
        <div key={recept.idMeal} style={{
          margin: "14px 0",
          background: "#fff",
          border: "1px solid #bbb",
          padding: 12,
          borderRadius: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={recept.strMealThumb} alt={recept.strMeal} width={100} style={{ marginRight: 14, borderRadius: 6 }} />
            <div>
              <h4 style={{ margin: 0 }}>{recept.strMeal}</h4>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {haalIngredientenOp(recept).map((ing, idx) => (
                  <li key={idx}>{ing.naam}{ing.hoeveelheid ? ` (${ing.hoeveelheid})` : ""}</li>
                ))}
              </ul>
            </div>
          </div>
          <button
            style={{
              marginTop: 10,
              background: "#a3b18a",
              border: "none",
              borderRadius: 6,
              padding: "0.5em 1em",
              cursor: "pointer",
            }}
            onClick={() => voegIngredientenToe(haalIngredientenOp(recept))}
          >
            Zet ingrediënten op boodschappenlijst
          </button>
        </div>
      ))}
      {recepten.length === 0 && !laden && (
        <div style={{ color: "#888", marginTop: 14 }}>Nog geen recepten gevonden.</div>
      )}
    </div>
  );
}
