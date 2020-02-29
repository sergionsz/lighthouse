/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('./computed-artifact.js');
const JsBundles = require('./js-bundles.js');

class JavascriptDuplication {
  /**
   * @param {string} source
   */
  static _normalizeSource(source) {
    // Trim trailing question mark - b/c webpack.
    source = source.replace(/\?$/, '');

    // Normalize paths for dependencies by keeping everything after the last `node_modules`.
    const lastNodeModulesIndex = source.lastIndexOf('node_modules');
    if (lastNodeModulesIndex !== -1) {
      source = source.substring(lastNodeModulesIndex);
    }

    return source;
  }

  /**
   * @param {string} source
   */
  static _shouldIgnoreSource(source) {
    // Ignore bundle overhead.
    if (source.includes('webpack/bootstrap')) return true;
    if (source.includes('(webpack)/buildin')) return true;

    // Ignore shims.
    if (source.includes('external ')) return true;

    return false;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   */
  static async compute_(artifacts, context) {
    const bundles = await JsBundles.request(artifacts, context);

    /**
     * @typedef SourceData
     * @property {string} source
     * @property {number} size
     */

    /** @type {Map<LH.Artifacts.RawSourceMap, SourceData[]>} */
    const sourceDatasMap = new Map();

    // Determine size of each `sources` entry.
    for (const {rawMap, sizes} of bundles) {
      /** @type {SourceData[]} */
      const sourceDatas = [];
      sourceDatasMap.set(rawMap, sourceDatas);

      for (let i = 0; i < rawMap.sources.length; i++) {
        const source = JavascriptDuplication._normalizeSource(rawMap.sources[i]);
        if (this._shouldIgnoreSource(source)) continue;

        const fullSource = (rawMap.sourceRoot || '') + source;
        const sourceSize = sizes.files[fullSource];
        sourceDatas.push({
          source,
          size: sourceSize,
        });
      }
    }

    /** @type {Map<string, Array<{scriptUrl: string, size: number}>>} */
    const sourceDataAggregated = new Map();
    for (const {rawMap, script} of bundles) {
      const sourceDatas = sourceDatasMap.get(rawMap);
      if (!sourceDatas) continue;

      for (const sourceData of sourceDatas) {
        let data = sourceDataAggregated.get(sourceData.source);
        if (!data) {
          data = [];
          sourceDataAggregated.set(sourceData.source, data);
        }
        data.push({
          scriptUrl: script.src || '',
          size: sourceData.size,
        });
      }
    }

    for (const [key, value] of sourceDataAggregated.entries()) {
      if (value.length === 1) sourceDataAggregated.delete(key);
    }

    return sourceDataAggregated;
  }
}

module.exports = makeComputedArtifact(JavascriptDuplication);
