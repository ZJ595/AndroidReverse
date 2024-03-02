import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { URL } from 'node:url';

import fetch from 'node-fetch';

const __dirname = import.meta.dirname;
const postsDir = path.join(__dirname, '../Article/');
const CAN_USE_WEBP = testCanConvertWebp();

function testCanConvertWebp() {
  const { status } = spawnSync('cwebp', { stdio: 'ignore' });
  return status === 0;
}

async function processDir(dirname) {
  const children = fs.readdirSync(dirname).map((f) => ({
    name: f,
    path: dirname + '/' + f,
    stat: fs.statSync(dirname + '/' + f),
  }));

  const files = children.filter((f) => f.stat.isFile() && f.name.toLowerCase().endsWith('.md'));
  const dirs = children.filter((f) => f.stat.isDirectory()).map((f) => f.path);

  for (const dir of dirs) {
    await processDir(dir);
  }

  for (const f of files) {
    await processFile(f.path);
  }
}

async function processFile(filePath) {
  const fileName = path.basename(filePath);
  const filePrefix = fileName.match(/^\d+/)?.[0] || '00';
  console.info(`process file: ${fileName}\n`);
  const content = fs.readFileSync(filePath, 'utf-8');

  const regex = /!\[(.*?)\]\((https?:\/\/.+?)\)/g;
  const replacements = [];
  let m = null;
  while ((m = regex.exec(content)) !== null) {
    const [_, alt, url] = m;
    const imageName = path.basename(new URL(url).pathname);
    const imagePath = path.resolve(filePath, '..', `_assets_${filePrefix}`, imageName);
    fs.mkdirSync(path.dirname(imagePath), { recursive: true });

    console.log('download from %s...', url);
    const buffer = await fetch(url, {
      headers: {
        Referer: url,
      },
    }).then((resp) => resp.arrayBuffer());
    fs.writeFileSync(imagePath, Buffer.from(buffer));

    let finalImagePath = imagePath;
    if (CAN_USE_WEBP && imageName.toLowerCase().endsWith('.png')) {
      finalImagePath = finalImagePath.replace(/\.png$/i, '.webp');
      const { status } = spawnSync('cwebp', ['-lossless', '-z', '9', '-m', '6', imagePath, '-o', finalImagePath], {
        stdio: 'inherit',
      });
      if (status === 0) {
        fs.unlinkSync(imagePath);
      } else {
        console.warn(`cwebp exit with error ${status}`);
      }
    }

    const relativeImagePath = path.relative(postsDir, finalImagePath);
    replacements.push({ alt, path: relativeImagePath });
  }

  if (replacements.length === 0) {
    // 没有要转存的图片
    return;
  }

  let replacement_id = 0;
  const fixedContent = content.replace(regex, () => {
    const replacement = replacements[replacement_id++];
    return `![${replacement.alt}](${replacement.path})`;
  });

  fs.writeFileSync(filePath, fixedContent, 'utf-8');
}

console.info(`\n\n!!!start!!!\n`);
processDir(postsDir);
