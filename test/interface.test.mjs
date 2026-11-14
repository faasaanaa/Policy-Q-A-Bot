import test from 'node:test';
import assert from 'node:assert/strict';
import { languages, localeFor, translate, guidedQuestions, optionLabel } from '../public/locales.js';
import { activeClarification, shouldCollapseAnswer, isNearBottom, exportConversation } from '../public/chat-core.js';

test('25 locale records have complete labels and correct RTL direction', () => {
  assert.equal(languages.length, 25);
  assert.equal(new Set(languages.map(l => l.code)).size, 25);
  const expected = Object.keys(languages[0].strings).sort();
  for (const language of languages) {
    assert.deepEqual(Object.keys(language.strings).sort(), expected);
    assert.ok(Object.values(language.strings).every(s => typeof s === 'string' && s.trim() && !s.includes('coming soon')));
    assert.equal(language.dir, ['ur','ar','fa'].includes(language.code) ? 'rtl' : 'ltr');
    assert.deepEqual(Object.keys(language.choices), Object.keys(languages[0].choices));
    assert.ok(Object.values(language.choices).every(s => typeof s === 'string' && s.trim()));
  }
  assert.equal(localeFor('unsupported').code, 'en');
  assert.equal(translate('es','send'), 'Enviar');
  assert.equal(translate('de','copy'), 'Antwort kopieren');
  assert.equal(optionLabel('es','clothing'), 'Ropa');
  assert.equal(optionLabel('fr','card'), 'Carte bancaire');
  assert.equal(optionLabel('ur','yes'), 'ہاں');
  assert.equal(optionLabel('es','Lahore'), 'Lahore');
  assert.ok(Object.values(guidedQuestions).every(q => q.length > 10));
});

test('only the most recent active clarification is offered as a form', () => {
  const clarification = { field: 'region' };
  const history = [{role:'assistant', result:{status:'clarification_required', clarification}}];
  assert.equal(activeClarification(history, null), null);
  assert.equal(activeClarification(history, {question:'Return?'}), clarification);
  assert.equal(activeClarification([...history,{role:'user',text:'Lahore'}], {question:'Return?'}), null);
  assert.equal(activeClarification([...history,{role:'assistant',result:{status:'answered'}}], {question:'Return?'}), null);
});

test('long and multiline answers collapse without truncating the underlying answer', () => {
  assert.equal(shouldCollapseAnswer('Short supported answer.'), false);
  assert.equal(shouldCollapseAnswer('x'.repeat(1000)), true);
  assert.equal(shouldCollapseAnswer(Array.from({length:20},()=> 'policy line').join('\n')), true);
});

test('scroll following respects users reading older messages', () => {
  assert.equal(isNearBottom(200, 500, 700), true);
  assert.equal(isNearBottom(100, 500, 1100), false);
  assert.equal(isNearBottom(440, 500, 1000), true);
});

test('conversation export preserves complete original evidence and calculation steps', () => {
  const excerpt='2.1 Standard fee: Rs. 600.\nNo free shipping.';
  const result=exportConversation([{role:'assistant',text:'Estimated refund: Rs. 8,300.',result:{trace:['10000 - 1500 - 200 = 8300'],evidence:[{filename:'19_remote_areas_addendum.md',section:'2.1',effectiveDate:'2026-04-01',excerpt}]}}]);
  assert.ok(result.includes(excerpt));
  assert.match(result,/19_remote_areas_addendum\.md, Section 2\.1, effective 2026-04-01/);
  assert.match(result,/10000 - 1500 - 200 = 8300/);
});
