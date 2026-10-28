/** Starter projects for the code playground (HTML / CSS / JavaScript). */
export type Project = { html: string; css: string; js: string };
export type Example = Project & { id: string; title: string; level: string };

export const EXAMPLES: Example[] = [
  {
    id: "hello", title: "Hello, HTML", level: "Basics",
    html: `<h1>Hello, እውቀትNET!</h1>
<p>This is my first web page.</p>
<ul>
  <li>HTML gives the page its <b>structure</b></li>
  <li>CSS gives it <i>style</i></li>
  <li>JavaScript makes it interactive</li>
</ul>
<a href="https://developer.mozilla.org/" target="_blank">Learn more on MDN</a>`,
    css: `body {
  font-family: system-ui, sans-serif;
  margin: 24px;
  color: #0b1f3a;
}
h1 {
  color: #155eef;
}`,
    js: `console.log("Page loaded!");`,
  },
  {
    id: "card", title: "Styled profile card", level: "CSS",
    html: `<div class="card">
  <div class="avatar">A</div>
  <h2>Abebe Kebede</h2>
  <p>Grade 12 · Natural Science</p>
  <button>Follow</button>
</div>`,
    css: `body {
  display: grid;
  place-items: center;
  min-height: 100vh;
  margin: 0;
  background: linear-gradient(135deg, #0b1f3a, #155eef);
  font-family: system-ui, sans-serif;
}
.card {
  background: white;
  padding: 28px 36px;
  border-radius: 20px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
}
.avatar {
  width: 72px;
  height: 72px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: #f4b740;
  display: grid;
  place-items: center;
  font-size: 32px;
  font-weight: bold;
}
button {
  background: #155eef;
  color: white;
  border: none;
  padding: 10px 22px;
  border-radius: 10px;
  cursor: pointer;
}
button:hover {
  background: #0b1f3a;
}`,
    js: ``,
  },
  {
    id: "counter", title: "Button & counter", level: "JavaScript",
    html: `<h2>Click counter</h2>
<p>You clicked <span id="count">0</span> times.</p>
<button id="add">Click me</button>
<button id="reset">Reset</button>`,
    css: `body { font-family: system-ui, sans-serif; margin: 24px; }
#count { font-weight: bold; color: #155eef; font-size: 1.4em; }
button { padding: 8px 16px; margin-right: 6px; border-radius: 8px; border: 1px solid #ccc; cursor: pointer; }`,
    js: `let count = 0;
const label = document.getElementById("count");

document.getElementById("add").addEventListener("click", () => {
  count++;
  label.textContent = count;
  console.log("Count is now", count);
});

document.getElementById("reset").addEventListener("click", () => {
  count = 0;
  label.textContent = count;
});`,
  },
  {
    id: "form", title: "Form validation", level: "JavaScript",
    html: `<form id="signup">
  <h2>Sign up</h2>
  <label>Name <input id="name" placeholder="Your name"></label>
  <label>Email <input id="email" type="email" placeholder="you@example.com"></label>
  <button>Submit</button>
  <p id="message"></p>
</form>`,
    css: `body { font-family: system-ui, sans-serif; margin: 24px; }
form { display: grid; gap: 12px; max-width: 320px; }
label { display: grid; gap: 4px; font-weight: 600; }
input { padding: 8px; border: 1px solid #bbb; border-radius: 6px; }
button { padding: 10px; background: #155eef; color: white; border: 0; border-radius: 6px; }
.error { color: #dc2626; }
.ok { color: #16a34a; }`,
    js: `document.getElementById("signup").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message");

  if (name.length < 2) {
    message.textContent = "Please enter your name.";
    message.className = "error";
  } else if (!email.includes("@")) {
    message.textContent = "Please enter a valid email.";
    message.className = "error";
  } else {
    message.textContent = "Welcome, " + name + "!";
    message.className = "ok";
  }
});`,
  },
  {
    id: "flex", title: "Flexbox layout", level: "CSS",
    html: `<header>My Website</header>
<nav>
  <a href="#">Home</a>
  <a href="#">About</a>
  <a href="#">Contact</a>
</nav>
<main>
  <section>Box 1</section>
  <section>Box 2</section>
  <section>Box 3</section>
</main>`,
    css: `body { margin: 0; font-family: system-ui, sans-serif; }
header { background: #0b1f3a; color: white; padding: 16px; font-size: 22px; }
nav { display: flex; gap: 16px; background: #f4b740; padding: 10px 16px; }
nav a { color: #0b1f3a; font-weight: bold; text-decoration: none; }
main { display: flex; flex-wrap: wrap; gap: 12px; padding: 16px; }
section {
  flex: 1 1 150px;
  height: 100px;
  background: #e0ebff;
  border-radius: 12px;
  display: grid;
  place-items: center;
}`,
    js: ``,
  },
  {
    id: "table", title: "Table of results", level: "HTML",
    html: `<table>
  <caption>Mock exam results</caption>
  <tr><th>Student</th><th>Subject</th><th>Score</th></tr>
  <tr><td>Hana</td><td>Mathematics</td><td>92</td></tr>
  <tr><td>Dawit</td><td>Physics</td><td>85</td></tr>
  <tr><td>Selam</td><td>Biology</td><td>78</td></tr>
</table>`,
    css: `body { font-family: system-ui, sans-serif; margin: 24px; }
table { border-collapse: collapse; min-width: 320px; }
caption { font-weight: bold; margin-bottom: 8px; }
th, td { border: 1px solid #ccd; padding: 8px 12px; text-align: left; }
th { background: #0b1f3a; color: white; }
tr:nth-child(even) td { background: #f1f5fb; }`,
    js: ``,
  },
];

export const BLANK: Project = { html: "", css: "", js: "" };

/** Builds the page that runs inside the sandboxed preview frame. */
export function buildDocument({ html, css, js }: Project, channel: string) {
  // Sends console output and errors to the playground (the frame has no access to our page).
  const bridge = `<script>(function(){var send=function(type,args){try{parent.postMessage({channel:${JSON.stringify(channel)},type:type,args:args},"*");}catch(e){}};
var fmt=function(v){try{if(v instanceof Error)return v.name+": "+v.message;if(typeof v==="object"&&v!==null){if(v instanceof Element)return "<"+v.tagName.toLowerCase()+(v.id?"#"+v.id:"")+">";return JSON.stringify(v,null,1);}return String(v);}catch(e){return String(v);}};
["log","info","warn","error","table","debug"].forEach(function(k){var o=console[k];console[k]=function(){var a=[].slice.call(arguments).map(fmt);send(k==="table"||k==="debug"?"log":k,a);if(o)o.apply(console,arguments);};});
window.addEventListener("error",function(e){send("error",[(e.message||"Error")+(e.lineno?" (line "+e.lineno+")":"")]);});
window.addEventListener("unhandledrejection",function(e){send("error",["Unhandled promise rejection: "+fmt(e.reason)]);});
document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("a[href^='#']");if(a){e.preventDefault();}});})();<\/script>`;
  const safeJs = js.replace(/<\/script/gi, "<\\/script");
  const style = `<style>html{background:#fff;color:#000}${css}</style>`;
  const script = safeJs.trim() ? `<script>${safeJs}\n//# sourceURL=script.js<\/script>` : "";
  if (/<html[\s>]/i.test(html)) {
    let doc = html;
    doc = /<head[^>]*>/i.test(doc) ? doc.replace(/<head[^>]*>/i, (m) => `${m}${bridge}${style}`) : doc.replace(/<html[^>]*>/i, (m) => `${m}<head>${bridge}${style}</head>`);
    doc = /<\/body>/i.test(doc) ? doc.replace(/<\/body>/i, `${script}</body>`) : doc + script;
    return doc;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${bridge}${style}</head><body>${html}${script}</body></html>`;
}
