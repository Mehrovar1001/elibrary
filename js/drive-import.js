/* Import books from a Google Drive folder laid out as
   <book>/{en,ru,tj}/{simple,standard,academic}/{book/*.pdf, audio/NN-Title.mp3}, <book>/icon/icon_<lang>.*, <book>/tests/test_A-B.json
   Re-run ("Update from Drive") to pick up files added later. */
const DRIVE_FOLDER = 'application/vnd.google-apps.folder';
const DRIVE_LANGS = { en: 'en', ru: 'ru', tj: 'tg', tg: 'tg' };
const DRIVE_LEVELS = { simple: 1, standard: 2, academic: 3 };

function driveApi(path, params) {
  return `https://www.googleapis.com/drive/v3/files${path}?${params}&key=${encodeURIComponent(ELIB_CONFIG.googleApiKey)}`;
}

async function driveList(folderId) {
  const files = [];
  let token = '';
  do {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const r = await fetch(driveApi('', `q=${q}&fields=nextPageToken,files(id,name,mimeType)&pageSize=1000${token ? '&pageToken=' + token : ''}`));
    if (!r.ok) throw new Error(`Google Drive ${r.status}: папка недоступна (нужен доступ «Все, у кого есть ссылка»)`);
    const j = await r.json();
    files.push(...j.files);
    token = j.nextPageToken || '';
  } while (token);
  return files.filter(f => !f.name.startsWith('.'));
}

const driveFileUrl = f => `https://drive.google.com/file/d/${f.id}/view`;
const isDriveBookFolder = list => list.some(f => f.mimeType === DRIVE_FOLDER && (DRIVE_LANGS[f.name.toLowerCase()] || /^(icon|tests)$/i.test(f.name)));

async function scanDriveBook(folder) {
  const book = { driveFolderId: folder.id, title: {}, covers: {}, textUrls: {}, audioUrls: {}, topics: {}, tests: [] };
  const sub = (await driveList(folder.id)).filter(f => f.mimeType === DRIVE_FOLDER);
  await Promise.all(sub.map(async dir => {
    const name = dir.name.toLowerCase();
    if (name === 'icon') {
      (await driveList(dir.id)).forEach(f => {
        const m = f.name.match(/^icon_(en|ru|tj|tg)\./i);
        if (m) book.covers[DRIVE_LANGS[m[1].toLowerCase()]] = driveFileUrl(f);
      });
    } else if (name === 'tests') {
      for (const f of await driveList(dir.id)) {
        const m = f.name.match(/^test_(\d+)-(\d+)\.json$/i);
        if (!m) continue;
        const r = await fetch(driveApi('/' + f.id, 'alt=media'));
        const { quiz, keys } = parseQuizJson(await r.text());
        book.tests.push({ from: +m[1], to: +m[2], quiz, keys });
      }
      book.tests.sort((a, b) => a.to - b.to);
    } else if (DRIVE_LANGS[name]) {
      const lang = DRIVE_LANGS[name];
      for (const lvDir of await driveList(dir.id)) {
        const lv = DRIVE_LEVELS[lvDir.name.toLowerCase()];
        if (!lv || lvDir.mimeType !== DRIVE_FOLDER) continue;
        for (const kind of await driveList(lvDir.id)) {
          if (kind.mimeType !== DRIVE_FOLDER) continue;
          const files = await driveList(kind.id);
          if (kind.name.toLowerCase() === 'book') {
            const pdf = files.find(f => /\.pdf$/i.test(f.name));
            if (!pdf) continue;
            (book.textUrls[lang] = book.textUrls[lang] || {})[lv] = driveFileUrl(pdf);
            book.title[lang] = pdf.name.replace(/\.pdf$/i, '').split(' - ')[0].trim();
          } else if (kind.name.toLowerCase() === 'audio') {
            const topics = files.map(f => {
              const m = f.name.match(/^(\d+)\s*[-–._]?\s*(.*?)\.(mp3|m4a|aac|ogg|wav|opus)$/i);
              return m && { n: +m[1], title: m[2].trim(), audio: driveFileUrl(f) };
            }).filter(Boolean).sort((a, b) => a.n - b.n);
            if (!topics.length) continue;
            (book.topics[lang] = book.topics[lang] || {})[lv] = topics;
            (book.audioUrls[lang] = book.audioUrls[lang] || {})[lv] = topics[0].audio;
          }
        }
      }
    }
  }));
  if (!Object.keys(book.title).length) book.title = { ru: folder.name, tg: folder.name, en: folder.name };
  return book;
}

/* A link to one book folder, or to a folder holding several book folders */
async function scanDriveLibrary(link) {
  const id = (String(link).match(/folders\/([a-zA-Z0-9_-]+)/) || String(link).match(/[?&]id=([a-zA-Z0-9_-]+)/) || [])[1] || String(link).trim();
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(id)) throw new Error('Вставьте ссылку на папку Google Drive');
  const list = await driveList(id);
  if (isDriveBookFolder(list)) return [await scanDriveBook({ id, name: '' })];
  const books = [];
  for (const dir of list.filter(f => f.mimeType === DRIVE_FOLDER)) {
    if (isDriveBookFolder(await driveList(dir.id))) books.push(await scanDriveBook(dir));
  }
  return books;
}
