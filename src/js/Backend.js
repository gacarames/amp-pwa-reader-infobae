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

class Backend {

  constructor() {
    this.appTitle = 'infobae';
    this.ampEndpoint = 'https://www.infobae.com/';
    this.defaultCategory = 'us';
    this.categories = {
      '': 'Noticias',
      'deportes-2': 'Deportes',
      'politica': 'Política',
      'economia': 'Economia',
      'sociedad': 'Sociedad',
      'tecnologia': 'Tecnología',
      'tendencias': 'Tendencias',
      'teleshow': 'Teleshow'
    };
  }

  getCategoryTitle(category) {
    return this.categories[category];
  }

  /*
   * RSS Feed related getters and functions.
   */

  getRSSUrl(category) {
    return 'https://www.infobae.com/feeds/rss/sites/' + category;
  }

  getRSSTitle(entry) {
    return entry.title;
  }

  getRSSImage(entry) {
    return entry.thumbnail;
  }

  getRSSDescription(entry) {
    return entry.description;
  }

  /*
   * AMP Doc related functions.
   */

  getAMPUrl(url) {
    return url + '?outputType=amp-type';
  }

  constructAMPUrl(category, path) {
    return this.ampEndpoint + path;
  }

  getAMPUrlComponent(articleUrl) {
    return articleUrl.replace(this.ampEndpoint, '');
  }

  getArticleData(/*doc*/) {
    return {
      description: this._description,
      title: this._title,
      image: this._image,
      imageRatio: this._imageRatio
    };
  }

  extractSchemaData(doc) {
    var schemaData = doc.querySelectorAll('script[type="application/ld+json"]');
    for (let schema of schemaData) {
      let parsedSchema = JSON.parse(schema.textContent);
      if (/WebPage|NewsArticle/.test(parsedSchema['@type'])) {
        return parsedSchema;
      }
    }
    return null;
  }

  sanitize(doc) {

    // remove stuff we don't need in embed mode
    let top = doc.querySelector('section#top');
    top.remove();

    let header = doc.getElementsByTagName('header');
    if (header.length)
      header[0].remove();

    // remove sidebar
    let sidebar = doc.getElementsByTagName('amp-sidebar');
    if (sidebar.length)
      sidebar[0].remove();

    // remove content head
    let contentHead = doc.querySelector('header.content__head');
    if (contentHead) {
      this._title = contentHead.querySelector('h1.content__headline').textContent;
      this._description = contentHead.querySelector('.content__standfirst meta').getAttribute('content');
      contentHead.remove();
    }

    // remove the featured image of the AMP article
    let featuredImage = doc.querySelector('.media-primary amp-img');
    if (featuredImage) {
      this._image = featuredImage.getAttribute('src');
      this._imageRatio = featuredImage.getAttribute('height') / featuredImage.getAttribute('width');
      featuredImage.remove();
    }

  }

}
