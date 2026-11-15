---
description: Mostra quali modelli sono stati usati nella sessione corrente e per cosa (sessione, skill, subagent), leggendo il registro della sessione e non il contesto del modello. Sola lettura. Si lancia solo su richiesta.
model: haiku
disable-model-invocation: true
disallowed-tools: Edit Write NotebookEdit
allowed-tools: Bash(node *)
---

# Modelli usati nella sessione

Non modificare nessun file. Rispondi in italiano.

Il log che segue è stato letto dal registro della sessione (il campo `message.model` di ogni risposta), non dal tuo contesto: non correggerlo e non aggiungere ipotesi sul modello che pensi di essere.

```!
node "${CLAUDE_PLUGIN_ROOT}/scripts/modelli.mjs" "${CLAUDE_SESSION_ID}"
```

Riporta il log così com'è, senza modificarlo. Se dice che il registro non è stato trovato o non è leggibile, riportalo e fermati. Se compare un solo modello, dillo in una riga: nella sessione non c'è stato nessun cambio.
