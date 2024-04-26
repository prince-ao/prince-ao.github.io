import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import remarkFrontmatter from "remark-frontmatter";
import { readdir } from "node:fs/promises";
import yaml from "yaml";
import type { isLiteralExpression } from "typescript";

const BLOG_PATH = "../blogs/";
const BUILD_PATH = "../";
const OUTPUT_BLOG_PATH = "../blog/";

async function markdownToHtml(markdown: string) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .use(extractFrontmatter)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown);

  return [file?.value ?? "", file.data.frontmatter];
}

function extractFrontmatter() {
  return (tree: any, file: any) => {
    const yamlNode = tree.children.find((node: any) => node.type === "yaml");
    if (yamlNode) {
      file.data.frontmatter = yaml.parse(yamlNode.value);
    }
  };
}

function wrapHtml(html: string) {
  const preamble = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>~</title>
  </head>
  <body>

`;
  const postamble = `
  </body>
</html>
`;

  return preamble + html + postamble;
}

function generateBlogPage(files: string[], frontmatters: any[]) {
  const preamble = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>~/blog</title>
    <link rel="stylesheet" href="blog.css" />
  </head>
  <body>
    <ul>
`;
  const postamble = `
    </ul>
  </body>
</html>
`;

  let list = "";

  for (let i = 0; i < files.length; i++) {
    list += `
  <li>
    <p>${frontmatters[i].date}</p>
    <a href="/blog/${files[i]}">${files[i]
      .split(".")[0]
      .split("-")
      .join(" ")}</a>
  </li>
`;
  }

  return preamble + list + postamble;
}

async function processBlogs() {
  const files = await readdir(BLOG_PATH);
  const frontmatters = [];
  const newfiles: string[] = [];

  for (const file of files) {
    const markdownFile = await Bun.file(BLOG_PATH + file).text();

    let [html, frontmatter] = await markdownToHtml(markdownFile);

    html = wrapHtml(String(html));

    frontmatters.push(frontmatter);

    const filename = file.split("/").at(-1)?.split(".")[0] + ".html";

    newfiles.push(filename);

    await Bun.write(OUTPUT_BLOG_PATH + filename, html as string);
  }

  Bun.write(BUILD_PATH + "blog.html", generateBlogPage(newfiles, frontmatters));
}

processBlogs();
