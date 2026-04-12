async function askAI(question) {
  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-70b-8192", // 🔥 fast + powerful
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: question,
          },
        ],
        temperature: 0.4,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const answer = res.data.choices[0].message.content.trim();

    console.log("[ARIA][AI_RESPONSE]", answer);

    if (
      !answer ||
      answer.toLowerCase().includes("not explicitly stated") ||
      answer.toLowerCase().includes("not sure") ||
      answer.toLowerCase().includes("contact support")
    ) {
      return `I’m not fully sure about this one 🤔\n\n${ESCALATION_REPLY}`;
    }

    return answer;
  } catch (err) {
    console.error("[ARIA][AI_ERROR]", err.response?.data || err.message || err);
    return `Something went wrong.\n\n${ESCALATION_REPLY}`;
  }
}