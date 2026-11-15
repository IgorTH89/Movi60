
import { auth } from "../firebase";

const WORKER_URL =
  "https://movi60-assistant.marcosgentili66.workers.dev"

function localAnswer(question, exercise) {
  if (exercise?.instructions) {
    return exercise.instructions;
  }

  return (
    "O assistente está indisponível no momento. " +
    "Consulte seu professor para orientações sobre o exercício."
  );
}


export async function askAssistant(
  question,
  exercise = null,
  previous = []
) {
  console.log("[AI 1] Assistant function started");

  try {
    const user = auth.currentUser;

    console.log("[AI 2] User authenticated:", !!user);

    if (!user) {
      throw new Error("Firebase user is not authenticated");
    }

    const token = await user.getIdToken();

    console.log("[AI 3] Firebase token obtained");

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 20000);

    let response;

    try {
      console.log("[AI 4] Sending request to:", WORKER_URL);

      response = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question,
          exercise,
          previous,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    console.log("[AI 5] HTTP status:", response.status);

    const result = await response.json();

    console.log(
      "[AI 6] Response received:",
      typeof result.answer,
      result.error || ""
    );

    if (!response.ok) {
      throw new Error(
        result.error || `HTTP error ${response.status}`
      );
    }

    if (typeof result.answer !== "string") {
      throw new Error("Invalid assistant response");
    }

    return result.answer;
  } catch (error) {
    console.error("[AI ERROR]", error.message);

    return (
      localAnswer(question, exercise) +
      "\n\n(Resposta local: IA indisponível.)"
    );
  }
}

