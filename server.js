import { createServer } from "http";
import { readFile } from "fs/promises";
import escapeHtml from "escape-html";

createServer(async (req, res) => {
  const author = "Lars Thorup";
  const postContent = await readFile("./posts/hello-world.txt", "utf8");
  const jsx = h(
    "html",
    {},
    h("head", {}, h("title", {}, "My blog")),
    h(
      "body",
      {},
      h("nav", {}, h("a", { href: "/" }, "Home"), h("hr")),
      h("article", {}, postContent),
      h(
        "footer",
        {},
        h("hr"),
        h("p", {}, h("i", {}, `(c) ${author}, ${new Date().getFullYear()}`))
      )
    )
  );
  // console.log(JSON.stringify(jsx, null, 2));
  const html = renderJSXToHTML(jsx);
  sendHTML(res, html);
}).listen(8080);

function h(type, props = {}, ...children) {
  return {
    $$typeof: Symbol.for("react.element"),
    type,
    props: { ...props, children },
  };
}

function renderJSXToHTML(jsx) {
  if (typeof jsx === "string" || typeof jsx === "number") {
    // This is a string. Escape it and put it into HTML directly.
    return escapeHtml(jsx);
  } else if (jsx == null || typeof jsx === "boolean") {
    // This is an empty node. Don't emit anything in HTML for it.
    return "";
  } else if (Array.isArray(jsx)) {
    // This is an array of nodes. Render each into HTML and concatenate.
    return jsx.map((child) => renderJSXToHTML(child)).join("");
  } else if (typeof jsx === "object") {
    // Check if this object is a React JSX element (e.g. <div />).
    if (jsx.$$typeof === Symbol.for("react.element")) {
      // Turn it into an an HTML tag.
      let html = "<" + jsx.type;
      for (const propName in jsx.props) {
        if (jsx.props.hasOwnProperty(propName) && propName !== "children") {
          html += " ";
          html += propName;
          html += "=";
          html += escapeHtml(jsx.props[propName]);
        }
      }
      html += ">";
      html += renderJSXToHTML(jsx.props.children);
      html += "</" + jsx.type + ">";
      return html;
    } else throw new Error("Cannot render an object.");
  } else throw new Error("Not implemented.");
}

function sendHTML(res, html) {
  res.setHeader("Content-Type", "text/html");
  res.end(html);
}
