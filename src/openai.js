const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

export async function vraagChatGPT({ messages, model = "gpt-3.5-turbo" }) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + API_KEY,
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });
  if (!res.ok) throw new Error("OpenAI fout: " + (await res.text()));
  return await res.json();
}
