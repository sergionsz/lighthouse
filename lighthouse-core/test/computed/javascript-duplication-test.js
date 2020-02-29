/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const assert = require('assert');
const fs = require('fs');
const JavascriptDuplication = require('../../computed/javascript-duplication.js');

function load(name) {
  const mapJson = fs.readFileSync(`${__dirname}/../fixtures/source-maps/${name}.js.map`, 'utf-8');
  const content = fs.readFileSync(`${__dirname}/../fixtures/source-maps/${name}.js`, 'utf-8');
  return {map: JSON.parse(mapJson), content};
}

describe('JavascriptDuplication computed artifact', () => {
  it('works', async () => {
    const context = {computedCache: new Map()};
    const {map, content} = load('foo.min');
    const artifacts = {
      SourceMaps: [
        {scriptUrl: 'https://example.com/foo1.min.js', map},
        {scriptUrl: 'https://example.com/foo2.min.js', map},
      ],
      ScriptElements: [
        {src: 'https://example.com/foo1.min.js', content},
        {src: 'https://example.com/foo2.min.js', content},
      ],
    };
    const results = await JavascriptDuplication.request(artifacts, context);
    expect(results).toMatchInlineSnapshot(`
      Map {
        "node_modules/browser-pack/_prelude.js" => Array [
          Object {
            "scriptUrl": "https://example.com/foo1.min.js",
            "size": 480,
          },
          Object {
            "scriptUrl": "https://example.com/foo2.min.js",
            "size": 480,
          },
        ],
        "src/bar.js" => Array [
          Object {
            "scriptUrl": "https://example.com/foo1.min.js",
            "size": 104,
          },
          Object {
            "scriptUrl": "https://example.com/foo2.min.js",
            "size": 104,
          },
        ],
        "src/foo.js" => Array [
          Object {
            "scriptUrl": "https://example.com/foo1.min.js",
            "size": 98,
          },
          Object {
            "scriptUrl": "https://example.com/foo2.min.js",
            "size": 98,
          },
        ],
      }
    `);
  });

  it('_normalizeSource', () => {
    const testCases = [
      ['test.js', 'test.js'],
      ['node_modules/othermodule.js', 'node_modules/othermodule.js'],
      ['node_modules/somemodule/node_modules/othermodule.js', 'node_modules/othermodule.js'],
      ['node_modules/somemodule/node_modules/somemodule2/node_modules/othermodule.js', 'node_modules/othermodule.js'],
      ['webpack.js?', 'webpack.js'],
    ];
    for (const [input, expected] of testCases) {
      expect(JavascriptDuplication._normalizeSource(input)).toBe(expected);
    }
  });
});
