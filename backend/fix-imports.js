import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src').concat(walk('./api'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  // Reemplazar: import ... from './...' (sin .js al final)
  // Ignorar librerias que no empiezan con '.'
  const regex = /(import\s+.*?from\s+['"])(\..*?)(?<!\.js)(['"])/g;
  let changed = false;
  const newContent = content.replace(regex, (match, p1, p2, p3) => {
    changed = true;
    return `${p1}${p2}.js${p3}`;
  });

  if (changed) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Fixed', file);
  }
}
