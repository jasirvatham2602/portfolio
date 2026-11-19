# Joshua Asirvatham Portfolio

Responsive multi-page portfolio with a retrieval-augmented portfolio assistant.

## Build and run

```sh
node build.mjs
cp .env.example .env
# Add your secret OPENAI_API_KEY value to .env
node dev-server.mjs
```

The site and `/api/portfolio-assistant` endpoint run locally at `http://127.0.0.1:8131/`. The standalone runner loads `.env` locally and invokes the same assistant function used by Netlify, without requiring the Netlify CLI. Stop it with Ctrl+C.

## Assistant and RAG

The assistant uses OpenAI GPT‑4.1 mini by default (change `OPENAI_MODEL` to select another supported model). At question time, it retrieves relevant passages from Joshua’s approved interview answers and portfolio facts, then—when the question is technical—reads public GitHub README files and relevant source files from these repositories:

- [SyndromeScope](https://github.com/jasirvatham2602/QuantUM-syndrome-scope)
- [QXAI model and research](https://github.com/jasirvatham2602/QXAI-prj)
- [QXAI full stack](https://github.com/jasirvatham2602/QXAI-fullstack-prj)
- [QuantumVault](https://github.com/jasirvatham2602/QuantumVault)
- [AccessibleBrowser](https://github.com/ASH-will-WIN/AccessibleBrowser)

Live project pages: [QuantumVault](https://bluequantumvault.streamlit.app/) · [QXAI](https://blue-qxai-prj.netlify.app/).

For questions about diagrams, screenshots, saliency maps, or other visuals, the function can pass relevant public repository images to the vision-capable model. Retrieved sources are returned with the answer. It filters environment files, credentials, keys, databases, and private backup paths; retrieved repository text is treated as untrusted evidence rather than instructions.

This is RAG, not model fine-tuning: approved answers and project sources are retrieved at runtime and supplied as context. Add or edit personal responses in `rag/approved-interview-answers.md` and facts in `rag/approved-facts.md`; the build step bundles those files for the function. Unanswered personal prompts are marked as unknown so the assistant does not invent preferences or experiences.

## Configure secrets

Copy `.env.example` for local setup and provide `OPENAI_API_KEY` in the Netlify Dev environment. For deployment, set it in the host’s environment-variable settings. **Never put a live API key in frontend code, a public repository, or a committed `.env` file.** `GITHUB_TOKEN` is optional because the configured repositories are public; it only raises GitHub API read limits. The selected model is configured by `OPENAI_MODEL` and defaults to `gpt-4.1-mini`.

The browser sends questions to the same-origin serverless function. The function retrieves context, calls the LLM, and returns the answer plus source links. It does not save chat history. The model provider receives the question and retrieved context to generate each answer.
