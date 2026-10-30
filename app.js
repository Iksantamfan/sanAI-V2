const $ = s => document.querySelector(s);
const workspace = $("#workspace"), messagesEl = $("#messages"), welcome = $("#welcome");
const input = $("#prompt"), form = $("#composer"), send = $("#send");
let sessionId = localStorage.getItem("san_session");
if (!sessionId) { sessionId = crypto.randomUUID(); localStorage.setItem("san_session", sessionId); }

function addMessage(role, content) {
  welcome.hidden = true;
  const row = document.createElement("div"); row.className = `message ${role}`;
  const avatar = document.createElement("div"); avatar.className = "avatar"; avatar.textContent = role === "user" ? "I" : "S";
  const body = document.createElement("div"); body.className = "message-body"; body.textContent = content;
  row.append(avatar, body); messagesEl.append(row);
  workspace.scrollTop = workspace.scrollHeight;
  return body;
}
async function loadHistory() {
  try {
    const r = await fetch(`/api/history?sessionId=${encodeURIComponent(sessionId)}`);
    if (!r.ok) return;
    const data = await r.json();
    if (data.messages?.length) data.messages.forEach(m => addMessage(m.role, m.content));
  } catch {}
}
async function sendMessage(text) {
  const message = text.trim(); if (!message || send.disabled) return;
  addMessage("user", message); input.value = ""; input.style.height = "auto"; send.disabled = true;
  const answerEl = addMessage("assistant", "Thinking…"); answerEl.classList.add("typing");
  try {
    const response = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({sessionId,message}) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    answerEl.classList.remove("typing"); answerEl.textContent = data.answer;
  } catch (err) { answerEl.classList.remove("typing"); answerEl.textContent = `Error: ${err.message}`; }
  finally { send.disabled = false; input.focus(); workspace.scrollTop = workspace.scrollHeight; }
}
form.addEventListener("submit", e => { e.preventDefault(); sendMessage(input.value); });
input.addEventListener("input", () => { input.style.height="auto"; input.style.height=Math.min(input.scrollHeight,140)+"px"; });
input.addEventListener("keydown", e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit();} });
document.querySelectorAll(".suggestion").forEach(b => b.addEventListener("click",()=>sendMessage(b.dataset.prompt)));
$("#newChat").addEventListener("click",()=>{sessionId=crypto.randomUUID();localStorage.setItem("san_session",sessionId);messagesEl.replaceChildren();welcome.hidden=false;});
$("#menuBtn").addEventListener("click",()=>$("#rail").classList.toggle("expanded"));
loadHistory();
