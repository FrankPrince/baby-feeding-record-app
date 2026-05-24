const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.resolve(__dirname, '../..');

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), 'utf8');
}

test('today page places quick record section before overview metrics', () => {
  const wxml = readProjectFile('miniprogram/pages/today/index.wxml');
  const quickIndex = wxml.indexOf('panel-title">快速记录');
  const heroIndex = wxml.indexOf('class="hero-metric"');

  assert.notEqual(quickIndex, -1);
  assert.notEqual(heroIndex, -1);
  assert.ok(quickIndex < heroIndex);
});

test('today quick record grid keeps three actions inside the panel', () => {
  const wxss = readProjectFile('miniprogram/pages/today/index.wxss');

  assert.match(wxss, /\.quick-actions\s*\{[\s\S]*display:\s*flex/);
  assert.match(wxss, /\.quick\s*\{[\s\S]*width:\s*100%/);
  assert.match(wxss, /\.quick\s*\{[\s\S]*flex:\s*1 1 0/);
  assert.match(wxss, /\.quick\s*\{[\s\S]*overflow:\s*hidden/);
});

test('today quick record actions avoid native button sizing behavior', () => {
  const wxml = readProjectFile('miniprogram/pages/today/index.wxml');
  const quickSection = wxml.slice(
    wxml.indexOf('class="quick-actions"'),
    wxml.indexOf('</view>', wxml.indexOf('class="quick-actions"')) + '</view>'.length
  );

  assert.doesNotMatch(quickSection, /<button\s+class="quick/);
  assert.match(quickSection, /<view\s+class="quick/);
});

test('custom tabbar is fixed to the viewport bottom edge', () => {
  const wxss = readProjectFile('miniprogram/custom-tab-bar/index.wxss');

  assert.match(wxss, /\.tabbar\s*\{[\s\S]*position:\s*fixed/);
  assert.match(wxss, /\.tabbar\s*\{[\s\S]*left:\s*0/);
  assert.match(wxss, /\.tabbar\s*\{[\s\S]*right:\s*0/);
  assert.match(wxss, /\.tabbar\s*\{[\s\S]*bottom:\s*0/);
});
