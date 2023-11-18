import { createServer } from "http";
import { readFile, readdir } from "fs/promises";
import escapeHtml from "escape-html";
import sanitizeFilename from "sanitize-filename";

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const page = await matchRoute(url);
    // const postSlug = "hello-world";
    // const postContent = await readFile(`./posts/${postSlug}.txt`, "utf8");
    const jsx = h(BlogLayout, {}, page);
    // console.log(JSON.stringify(jsx, null, 2));
    const html = renderJSXToHTML(jsx);
    sendHTML(res, html);
  } catch (err) {
    console.error(err);
    res.statusCode = err.statusCode ?? 500;
    res.end();
  }
}).listen(8080);

async function matchRoute(url) {
  if (url.pathname === "/") {
    // We're on the index route which shows every blog post one by one.
    // Read all the files in the posts folder, and load their contents.
    const postFiles = await readdir("./posts");
    const postSlugs = postFiles.map((file) =>
      file.slice(0, file.lastIndexOf("."))
    );
    const postContents = await Promise.all(
      postSlugs.map((postSlug) =>
        readFile("./posts/" + postSlug + ".txt", "utf8")
      )
    );
    return h(BlogIndexPage, { postSlugs, postContents });
  } else {
    // We're showing an individual blog post.
    // Read the corresponding file from the posts folder.
    const postSlug = sanitizeFilename(url.pathname.slice(1));
    try {
      const postContent = await readFile(
        "./posts/" + postSlug + ".txt",
        "utf8"
      );
      return h(BlogPostPage, { postSlug, postContent });
    } catch (err) {
      throwNotFound(err);
    }
  }
}

function throwNotFound(cause) {
  const notFound = new Error("Not found.", { cause });
  notFound.statusCode = 404;
  throw notFound;
}

function BlogLayout({ children }) {
  const author = "Lars Thorup";
  return h(
    "html",
    {},
    h("head", {}, h("title", {}, "My blog")),
    h(
      "body",
      {},
      h("nav", {}, h("a", { href: "/" }, "Home"), h("hr")),
      h("main", {}, ...children),
      h(Footer, { author })
    )
  );
}

function BlogIndexPage({ postSlugs, postContents }) {
  return h(
    "section",
    {},
    h("h1", {}, "Welcome to my blog"),
    h(
      "div",
      {},
      postSlugs.map((postSlug, index) =>
        h(
          "section",
          { key: postSlug },
          h("h2", {}, h("a", { href: "/" + postSlug }, postSlug)),
          h("article", {}, postContents[index])
        )
      )
    )
  );
}

function BlogPostPage({ postSlug, postContent }) {
  return h(
    "section",
    {},
    h("h2", {}, h("a", { href: `/${postSlug}` }, postSlug)),
    h("article", {}, postContent)
  );
}

function Footer({ author }) {
  return h(
    "footer",
    {},
    h("hr"),
    h("p", {}, h("i", {}, `(c) ${author}, ${new Date().getFullYear()}`))
  );
}

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
      if (typeof jsx.type === "string") {
        // Is this a tag like <div>?
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
      } else if (typeof jsx.type === "function") {
        // Is it a component like <BlogPostPage>?
        // Call the component with its props, and turn its returned JSX into HTML.
        const Component = jsx.type;
        const props = jsx.props;
        const returnedJsx = Component(props);
        return renderJSXToHTML(returnedJsx);
      } else throw new Error("Not implemented.");
    }
  } else throw new Error("Not implemented.");
}

function sendHTML(res, html) {
  res.setHeader("Content-Type", "text/html");
  res.end(html);
}
