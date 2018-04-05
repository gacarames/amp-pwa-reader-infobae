/**
 * Copyright 2017 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

class FeedReader {

  constructor() {

  }

  fetch(category, attempts = 0) {

    let rssUrl = shadowReader.backend.getRSSUrl(category);
    let yqlQuery = encodeURIComponent(rssUrl);
    let yqlUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + yqlQuery + '&count=60';

    return fetch(yqlUrl)
      .then(response => response.json() )
      .then(rss => {
        
        if(!rss.items && attempts < 10) {
          return this.fetch(category, (attempts || 0) + 1);
        }

        var entries = rss.items ? rss.items : [];

        return entries.map(entry => {
          return {
            title: shadowReader.backend.getRSSTitle(entry),
            description: shadowReader.backend.getRSSDescription(entry),
            link: entry.link,
            image: shadowReader.backend.getRSSImage(entry)
          };
        });

      });

  }

}