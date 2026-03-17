import fs from 'fs';
import path from 'path';

const files = ['src/data/cards.ts', 'src/App.tsx', 'src/components/DeckEditor.tsx'];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/\/static\/images\//g, '/img/');
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
