/**
 * Die Post.
 *
 * Die eine Regel, an der alles hängt: Dank kommt nur, wenn man wirklich
 * geholfen hat. Ein Dankesbrief für nichts ist eine Floskel, und Floskeln
 * merkt man beim dritten Mal.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { mailFor, fileMail, unreadCount, MAILBOX_MAX } from '../../src/game/mail.js';
import { SPIRITS, SPIRIT_IDS } from '../../src/game/spirits.js';
import { getItem } from '../../src/game/items.js';

const WELT = { seed: 4711 };

test('Ohne Hilfe kommt kein Dank', () => {
  for (let day = 1; day < 40; day++) {
    const post = mailFor(day, WELT, { geholfen: [] });
    for (const b of post) {
      assert.notEqual(b.kind, 'thanks', 'Tag ' + day + ': Dank ohne Hilfe');
    }
  }
});

test('Wer geholfen hat, bekommt Dank – vom richtigen Geist', () => {
  let gesehen = 0;
  for (let day = 1; day < 30; day++) {
    const post = mailFor(day, WELT, { geholfen: ['mira'] });
    const dank = post.filter((b) => b.kind === 'thanks');
    assert.equal(dank.length, 1, 'Tag ' + day + ': genau ein Dankesbrief');
    assert.equal(dank[0].from, 'mira');
    assert.equal(dank[0].subject, SPIRITS.mira.name);
    gesehen++;
  }
  assert.ok(gesehen > 0);
});

test('Jeder Geist kann schreiben, und jeder legt etwas bei, das er mag', () => {
  for (const id of SPIRIT_IDS) {
    let brief = null;
    for (let day = 1; day < 30 && !brief; day++) {
      brief = mailFor(day, WELT, { geholfen: [id] }).filter((b) => b.kind === 'thanks')[0];
    }
    assert.ok(brief, id + ' schreibt nie');
    assert.ok(brief.text.length > 20, id + ': Brief zu kurz');
    assert.ok(brief.text.length < 200, id + ': Brief zu lang – das ist ein Symbolspiel');
    assert.ok(brief.gift, id + ' legt nichts bei');
    assert.ok(getItem(brief.gift.id), id + ' legt unbekanntes ' + brief.gift.id + ' bei');
    assert.ok(brief.gift.n > 0);
    // Beigelegt wird, was der Geist selbst mag
    assert.ok(SPIRITS[id].likes.indexOf(brief.gift.id) >= 0,
      id + ' verschenkt etwas, das er gar nicht mag');
  }
});

test('Derselbe Tag bringt dieselbe Post', () => {
  const a = mailFor(7, WELT, { geholfen: ['bruno'] });
  const b = mailFor(7, WELT, { geholfen: ['bruno'] });
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) {
    assert.equal(a[i].text, b[i].text);
    assert.equal(a[i].kind, b[i].kind);
    assert.deepEqual(a[i].gift, b[i].gift);
  }
});

test('Jeder Brief trägt Kennung, Tag, Absender und Betreff', () => {
  const ids = Object.create(null);
  for (let day = 1; day < 40; day++) {
    for (const b of mailFor(day, WELT, { geholfen: ['kiesel'] })) {
      assert.ok(b.id && !ids[b.id], 'Kennung doppelt: ' + b.id);
      ids[b.id] = 1;
      assert.equal(b.day, day);
      assert.ok(b.from && b.subject && b.text);
      assert.equal(b.read, false);
    }
  }
});

test('Zum Wechsel der Jahreszeit kommt ein Wort – und sonst nicht', () => {
  const jahreszeit = { id: 'herbst', name: 'Herbst' };
  const mit = mailFor(5, WELT, { geholfen: [], jahreszeit: jahreszeit, tagNeu: true });
  assert.equal(mit.filter((b) => b.kind === 'season').length, 1);
  const ohne = mailFor(5, WELT, { geholfen: [], jahreszeit: jahreszeit, tagNeu: false });
  assert.equal(ohne.filter((b) => b.kind === 'season').length, 0);
});

test('Der Kasten läuft nicht über – die ältesten weichen', () => {
  let kasten = [];
  for (let day = 1; day <= 200; day++) {
    kasten = fileMail(kasten, mailFor(day, WELT, { geholfen: ['mira'] }));
  }
  assert.equal(kasten.length, MAILBOX_MAX);
  // Und übrig bleiben die NEUESTEN
  const tage = kasten.map((b) => b.day);
  assert.equal(Math.max.apply(null, tage), 200);
  assert.ok(Math.min.apply(null, tage) > 150, 'alte Briefe müssen weichen');
});

test('Ungelesene werden gezählt, gelesene nicht', () => {
  const kasten = mailFor(3, WELT, { geholfen: ['nelly'] });
  assert.equal(unreadCount(kasten), kasten.length);
  kasten[0].read = true;
  assert.equal(unreadCount(kasten), kasten.length - 1);
  assert.equal(unreadCount(null), 0);
  assert.equal(unreadCount([]), 0);
});

test('Über viele Tage kommt nicht jeden Tag Post', () => {
  let mit = 0;
  for (let day = 1; day <= 60; day++) {
    if (mailFor(day, WELT, { geholfen: [] }).length) mit++;
  }
  // Ohne Hilfe schreibt nur der Händler, und der nur manchmal.
  assert.ok(mit > 4, 'gar keine Post in sechzig Tagen');
  assert.ok(mit < 40, 'jeden zweiten Tag Werbung ist zu viel: ' + mit);
});
