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

class HistoryStack {

  constructor(backend) {
    this.backend = backend;
    this.state = (history.state && history.state.category) ? history.state : this.parseUrlIntoState();

    // if the category doesn't exist (e.g. we came from a different backend)
    // return the default one.
    if (!this.backend.categories[this.state.category]) {
      this.state.category = this.backend.defaultCategory;
      history.replaceState({
        category: this.state.category
      }, '', this.constructUrl());
    }
  }

  constructUrl(articleUrl) {
    return '/' + this.backend.appTitle.toLowerCase() + '/' + ((window.shadowReader && shadowReader.nav.category) || this.state.category) + (articleUrl ? '/' + this.backend.getAMPUrlComponent(articleUrl) : '');
  }

  parseUrlIntoState() {

    // grab the pathname from the url (minus slashes at the beginning and end, and the backend)
    var path = location.pathname.replace(/^\/*/, '').replace(/\/*$/, '').replace(this.backend.appTitle.toLowerCase() + '/', '');
    var state = {
      category: this.backend.defaultCategory,
      articleUrl: null
    };

    if (this.backend.getCategoryTitle(path)) {
      // if the pathname is an actual category, use that
      state.category = path;
    } else if (path) {
      // now we can be reasonably sure the path is a full article url
      state.category = path.split('/')[0];
      state.articleUrl = this.backend.constructAMPUrl(state.category, path.substr(state.category.length+1));
    }

    return state;

  }

  setDocTitle(subTitle) {
    document.title = 'ShadowReader' + ' – ' + shadowReader.nav.categoryTitle + (subTitle ? ' – ' + subTitle : '');
  }

  navigate(articleUrl, replace, subTitle) {

    // set the correct document title
    this.setDocTitle(subTitle);

    var newUrl = this.constructUrl(articleUrl);

    // bail if nothing would change
    if (newUrl === document.location.pathname) {
      if (replace) {
        // we need to replace the state anyway due to that nasty AMP bug.
        history.replaceState({
          category: shadowReader.nav.category,
          articleUrl: articleUrl
        }, '', newUrl);
      }
      return;
    }

    // set a new browser history entry and update the URL
    history.pushState({
      category: shadowReader.nav.category,
      articleUrl: articleUrl
    }, '', newUrl);

  }

}
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

class Evented {

  constructor () {
    this._events = {};
  }

  bind (eventName, fn) {
    this._events[eventName] = this._events[eventName] || [];
    this._events[eventName].push(fn);
    return this;
  }

  unbind (eventName, fn) {
    this._events[eventName] = this._events[eventName] || [];
    let index = this._events[eventName].indexOf(fn);
    if(index > -1) {
      this._events[eventName].splice(index, 1);
    }
    return this;
  }

  trigger (eventName, a, b, c, d, e, f, g, h) {
    this._events[eventName] = this._events[eventName] || [];
    for (let i = 0; i < this._events[eventName].length; i++) {
      this._events[eventName][i](a, b, c, d, e, f, g, h);
    }
    return this;
  }

}
class DragObserver extends Evented {

  constructor (element, options = {}) {

    super();

    this._started = false;

    this.element = element;
    this.axis = options.axis || 'both';
    this.distance = options.distance || 10;

    this._clickPreventer = this._createClickPreventer();

    this._supportsPointerEvents = !!window.PointerEvent;

    this.element.addEventListener(
      this._supportsPointerEvents ? 'pointerdown' : 'touchstart',
      this._start.bind(this),
      { passive: true }
    );

  }

  _createClickPreventer () {
    var div = document.createElement('div');
    div.style.width = '30px';
    div.style.height = '30px';
    div.style.position = 'absolute';
    div.style.left = '0';
    div.style.top = '0';
    div.style.zIndex = '1000';
    return div;
  }

  _calculateOffset (elem) {

    var curleft = 0;
    var curtop = 0;

    do {
      curleft += elem.offsetLeft;
      curtop += elem.offsetTop;
    } while (elem = elem.offsetParent);

    return { x: curleft, y: curtop };

  }

  _meetsDistance (position) {
    return ((this.axis === 'both' && (Math.abs(position.x) >= this.distance || Math.abs(position.y) >= this.distance))
      || (this.axis === 'x' && Math.abs(position.x) >= this.distance)
      || (this.axis === 'y' && Math.abs(position.y) >= this.distance));
  }

  _start (event) {

    // store event for re-use
    if (event.pageX) {
      this.eventDown = event;
    }

    this.__move = (e) => this._move(e);
    this.__stop = (e) => this._stop(e);

    document.addEventListener(
        this._supportsPointerEvents ? 'pointermove' : 'touchmove',
        this.__move,
        { passive: true }
    );
    document.addEventListener(
        this._supportsPointerEvents ? 'pointerup' : 'touchend',
        this.__stop,
        { passive: true }
    );

  }

  _move (event) {

    // store event for re-use
    if (event.pageX) {
      this.eventMove = event;
    }

    // store event for re-use
    this.eventMovePrev = this.eventMove || this.eventStart;
    this.eventMove = event;

    // keep track of position before axis 'removal'
    let rawPosition = {
      x: -(this.eventDown.pageX - this.eventMove.pageX),
      y: -(this.eventDown.pageY - this.eventMove.pageY)
    }

    let position = {
      x: (this.axis === 'both' || this.axis === 'x') ? rawPosition.x : 0,
      y: (this.axis === 'both' || this.axis === 'y') ? rawPosition.y : 0
    };

    // only execute start callback when moved at least one pixel (configured as 'distance')
    if(this._meetsDistance(position) && !this._started) {
      this._started = true;
      document.body.appendChild(this._clickPreventer);
      this.trigger('start', position);
    }

    // only execute move callback when properly started
    if(this._started) {
      this._clickPreventer.style.transform = 'translate3d(' + (this.eventDown.pageX + rawPosition.x - 15) + 'px, ' + (this.eventDown.pageY + rawPosition.y - 15) + 'px, 0)';
      this.trigger('move', position);
    }
  }

  _stop (event) {

    document.removeEventListener(
        this._supportsPointerEvents ? 'pointermove' : 'touchmove',
        this.__move
    );
    document.removeEventListener(
        this._supportsPointerEvents ? 'pointerup' : 'touchend',
        this.__stop
    );

    if(this._started) {
      event.stopPropagation();
      this._clickPreventer.remove();
      this._started = false;
      this.trigger('stop');
    }
  }
}

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

class ShadowReader {

  constructor() {
    this.backend = new Backend();
    this.history = new HistoryStack(this.backend);
    this.clickEvent = 'click';
  }

  init() {
    this.itemsElement = document.querySelector('main');
    this.headerElement = document.querySelector('header');
    this.hamburgerElement = document.querySelector('.sr-hamburger');

    this.nav = new Nav();

  }

  ampReady(callback) {
    (window.AMP = window.AMP || []).push(callback);
  }

  enableCardTabbing() {
    let children = Array.from(this.itemsElement.children); // sadly needed for Safari
    for (let item of children) {
      item.children[1].removeAttribute('tabindex');
    }
  }

  disableCardTabbing() {
    let children = Array.from(this.itemsElement.children); // sadly needed for Safari
    for (let item of children) {
      item.children[1].setAttribute('tabindex', -1);
    }
  }

  focusVisibleCard() {

    // if cards haven't been initialized yet, ignore
    if (!this.nav || !this.nav.cards) {
      return;
    }

    const scrollY = window.scrollY;
    const innerHeight = window.innerHeight;

    for (let card of this.nav.cards) {
      if (card.elem.offsetTop < (scrollY + innerHeight)
          && card.elem.offsetTop > scrollY) {
        card.innerElem.focus();
        break;
      }
    }

  }

}
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

// Create app singleton as global
window.shadowReader = new ShadowReader();

// Initialize fully when DOM is ready
document.addEventListener('DOMContentLoaded', function() {

  // initialize the entire app
  shadowReader.init();

  // install the Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }

});
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

class Nav {

  constructor() {
    this.category = null;
    this.cards = [];
    this.feedReader = new FeedReader;
    this.element = document.querySelector('.sr-navigation');

    this.bind();

    // initialize slide logic
    this.initMenuSlide();

    // Create the nav items from categories
    this.create();

    // The history module resolves the initial state from either the history API
    // or the loaded URL, in case there's no history entry.
    var state = shadowReader.history.state;

    if (state.articleUrl) {
      // Open the correct article, even before switching to the category, if we
      // have one (but only when the AMP lib is ready, since it's loaded async).
      shadowReader.ampReady(() => {
        this.startWithArticle(state);
      });
    } else {
      // If there's no article to be loaded, just load the default or
      // selected category.
      this.switchCategory(state.category);
    }

  }

  clear() {
    this.element.innerHTML = '';
  }

  create() {

    let fragment = document.createDocumentFragment();

    for (let category in shadowReader.backend.categories) {
      let item = document.createElement('li');
      let link = document.createElement('a');
      link.href = '#';
      link.dataset.tag = category;
      link.textContent = shadowReader.backend.categories[category];
      item.appendChild(link);
      fragment.appendChild(item);
    }

    this.element.appendChild(fragment);

  }

  initMenuSlide() {

    const skirt = document.querySelector('.sr-navigation-skirt');
    var wasOpen = false;
    var delta = 0;

    this.dragObserver = new DragObserver(document, { axis: 'x' });

    this.dragObserver.bind('start', () => {
      wasOpen = document.body.classList.contains('sr-nav-shown');
      this.element.classList.add('sr-disable-transitions');
    });

    this.dragObserver.bind('move', (position) => {
      delta = position.x;
      let refPoint = wasOpen ? 0 : 200;
      let x = Math.max(-200, Math.min(position.x, refPoint) - refPoint);
      this.element.style.transform = 'translateX(' + x + 'px)';
      skirt.style.opacity = 1 - (x / -200);
    });

    this.dragObserver.bind('stop', () => {
      this.element.classList.remove('sr-disable-transitions');
      this.element.style.transform = '';
      skirt.style.opacity = '';
      if (Math.abs(delta) > 70) {
        this[wasOpen ? 'hide' : 'show']();
      }
    });

  }

  startWithArticle(state) {

    let article = Article.getArticleByURL(state.articleUrl) || new Article(state.articleUrl);

    // if we have a card, things are easy: simply pretend we click on the card!
    if (article.card) {
      return article.card.activate();
    }

    // otherwise things are a little more complicated, as we have no card to click on..
    article.load()
      .then(() => article.render())
      .then(() => {

        // disable transitions temporarily, don't want them at load time
        article.container.classList.add('sr-disable-transitions');

        // passing true here ensures that the state is overwritten again..
        article.show(true).then(() => {
          // hide the skeleton UI
          // INVESTIGATE: For some reason needs a delay..
          setTimeout(() => {
            document.body.classList.remove('sr-skeleton-ui-article');
            article.container.classList.remove('sr-disable-transitions');
          }, 100);

        });

        // the return button in this state is a special case, and can't animate (yet)
        this.hamburgerReturnAction = () => {
          shadowReader.enableCardTabbing();
          article.card && article.card.animateBack();
          article.hide();
          shadowReader.history.navigate(null);
        };

        // switch to the correct category only after the article is loaded for max perf
        this.switchCategory(state.category).then(() => {
          // now that the cards have been lazily loaded, attempt to reconnect the
          // already loaded article with the proper card
          for (let card of this.cards) {
            if (card.article.url === article.url) {
              card.ready(() => {

                // link our custom initialized article with our card
                article.card = card;
                card.article = article;

                // if the card is somewhere outside the scroll position, we need
                // to set it to a place where the card is actually visible.
                article._mainScrollY = Math.max(0, card.elem.offsetTop - innerHeight / 3);

                // apply the 'zoomed-in' state on the card behind the scenes, so
                // we can animate back when the user clicks back
                // TODO: stupid to call this method animate..
                article.card.animate(false, -article._mainScrollY);

              });
            }
          }

          // set main view to inert so you can't tab into it
          shadowReader.disableCardTabbing();

        });

      });

  }

  setOpenArticle(article, replace) {
    this.openArticle = article;

    // Set new history entry
    shadowReader.history.navigate(article.url, replace, article.ampDoc.title);
  }

  getNavElement(category) {
    return document.querySelector('.sr-navigation a[data-tag="' + category + '"]');
  }

  setNavElement(category) {

    // mark old menu element as inactive
    if (this.category) {
      let oldNavElement = this.getNavElement(this.category);
      oldNavElement && oldNavElement.parentNode.classList.remove('active');
    }

    // mark new one as active
    let navElement = this.getNavElement(category);
    navElement.parentNode.classList.add('active');

    // change category title
    document.querySelector('.sr-category span').textContent = this.categoryTitle;

  }

  switchCategory(category) {

    // set the new title
    this.categoryTitle = shadowReader.backend.getCategoryTitle(category);

    // mark menu element as active
    this.setNavElement(category);

    // set the category
    this.category = category;

    // set current cards to loading
    for (let card of this.cards) {
      card.elem.classList.add('sr-loading');
    }

    // hide menu
    this.hide();

    // fetch new nav entries via RSS via YQL
    return this.feedReader.fetch(category).then(entries => {

      // if this is the first time loading cards, now would
      // be a good time to remove the skeleton ui class from the body
      if (!this._cardViewInitialized) {
        document.body.classList.remove('sr-skeleton-ui');
        this._cardViewInitialized = true;
      }

      // If for some reason the feed failed, let's bail
      if(!entries.length) {
        console.error('feed failed to update!');
        return;
      }

      // empty items container (lazy..)
      shadowReader.itemsElement.innerHTML = '';
      this.cards = [];

      // render new entries
      let prerender = 3;
      for (let entry of entries) {
        this.cards.push(new Card(entry, /*headless*/false, /*prerender*/--prerender >= 0));
      }

      // reset scroll position
      document.scrollingElement.scrollTop = 0;

      // restore focus
      shadowReader.itemsElement.firstElementChild.children[1].focus();

    });

  }

  show() {

    //disable focus for all menu elements
    let children = Array.from(this.element.children); // sadly needed for Safari
    for (let child of children) {
      child.firstChild.removeAttribute('tabindex');
    }

      // focus the first element in the menu
    this.element.children[0].firstChild.focus();

    document.body.classList.add('sr-nav-shown');

  }

  hide() {

    //disable focus for all menu elements
    const children = Array.from(this.element.children); // sadly needed for Safari
    for (let child of children) {
      child.firstChild.setAttribute('tabindex', '-1');
    }

    // focus on the appropriate card in the main view
    shadowReader.focusVisibleCard();

    document.body.classList.remove('sr-nav-shown');
  }

  toggle() {
    return this[document.body.classList.contains('sr-nav-shown') ? 'hide' : 'show']();
  }

  resize() {
    for (let card of this.cards) {
      card.refresh();
    }
  }

  bind() {

    /* history navigation */
    window.addEventListener('popstate', event => {

      let state = {
        category: event.state && event.state.category ? event.state.category : this.category,
        articleUrl: event.state ? event.state.articleUrl : null
      };

      // switch to the correct category if not already on it
      if (this.category !== state.category) {
        this.switchCategory(state.category);
      }

      // if we go to a state where no article was open, and we have a
      // currently-opened one, close it again
      if (this.openArticle && !state.articleUrl && this.hamburgerReturnAction) {
        this.hamburgerReturnAction();
        this.hamburgerReturnAction = null;
        this.openArticle = null;
      }

      // If there's an article in the state object, we need to open it
      if (state.articleUrl) {
        this.startWithArticle(state);
      }

    }, false);

    /* clicks on the hamburger menu icon */
    document.querySelector('.sr-hamburger').addEventListener(shadowReader.clickEvent, event => {

      // default menu toggle (only executes when not in article view)
      !document.documentElement.classList.contains('sr-article-shown') && this.toggle();

      // use as temporary back button
      if (this.hamburgerReturnAction) {
        this.hamburgerReturnAction(event);
        this.hamburgerReturnAction = null;
      }

    }), false;

    /* clicks on menu links */
    document.querySelector('.sr-navigation').addEventListener(shadowReader.clickEvent, event => {

      // we're doing event delegation, and only want to trigger action on links
      if (event.target.nodeName !== 'A')
        return;

      // switch to the clicked category
      this.switchCategory(event.target.dataset.tag, event.target.parentNode);

      // set entry in the browser history, navigate URL bar
      shadowReader.history.navigate(null);

      event.preventDefault();
    }), false;

    /* clicks on menu skirt */
    document.querySelector('.sr-navigation-skirt').addEventListener(shadowReader.clickEvent, () => {
      this.hide();
    }), false;

    /* resize event, mostly relevant for Desktop resolutions */
    let debounce;
    window.addEventListener('resize', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        this.resize();
      }, 100);
    });

  }

}
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

class Card {

  constructor(data, headless, prerender) {

    this.data = data;
    this.headless = headless;
    this.currentTransform = { scaleX: 1, scaleY: 1 };
    this.naturalDimensions = { width: 0, height: 0 };

    this.create();
    this.bind();

    // if we're in headless mode, that means the Card is initialized purely to
    // render out the featured image in the Shadow DOM, not for the list view,
    // thus we don't need to fancy it up.
    if (this.headless) {
      this.elem.classList.add('sr-full');
      this.innerElem.setAttribute('tabindex', -1);
    } else {
      this.article = new Article(this.data.link, this);
      this.render();
    }

    if (prerender) {
      this.article.load();
    }

  }

  resizeChildren(dimensions, animate, toFullView) {

    let width = this.imageData.width;
    let height = this.imageData.height;
    let elemWidth = dimensions.width;
    let elemHeight = dimensions.height;
    let scaleY = elemHeight / height;
    let scaleX = elemWidth / width;

    let fitHorizontally = scaleX > scaleY;
    let centerX = 'translateX(' + (-(((width * scaleY) - elemWidth) / 2)) + 'px)';
    let centerY = 'translateY(' + (-(((height * scaleX) - elemHeight) / 2)) + 'px)';

    if (animate === false) {
      this.elem.classList.add('sr-disable-transitions');
    }

    // rescale image
    this.img.style.transform = (fitHorizontally ? centerY : centerX) + // center
      'scaleY(' + (1 / this.currentTransform.scaleY) + ')' + // normalizing
      'scaleX(' + (fitHorizontally ? scaleX : scaleY) + ')' + // fill the whole card
      'scaleY(' + (fitHorizontally ? scaleX : scaleY) + ')' + // fill the whole card
      'scaleX(' + (1 / this.currentTransform.scaleX) + ')' + // normalizing
      'scale(var(--hover-scale))'; // additional CSS variable we can control (we use it for hover effects)

    // rescale inner element
    this.innerElem.style.transform = 'scaleX(' + (1 / this.currentTransform.scaleX) + ')' // normalizing
      + 'scaleY(' + (1 / this.currentTransform.scaleY) + ')'; // normalizing

    // if the paragraph was hidden before, we need to slide it in..
    if (!this.elem.matches('.sr-card:first-child') && toFullView) {
      let paragraph = this.elem.children[1].children[1];
      this.innerElem.style.transform += ' translateY(-' + (paragraph.offsetHeight+16) + 'px)'; // 16px = 1em
    }

    // back to transitions after next render tick if prev disabled..
    if (animate === false) {
      setTimeout(() => { // turns out requestAnimationFrame isn't enough here..
        this.elem.classList.remove('sr-disable-transitions');
      }, 0);
    }

  }

  animate(dontAnimate, scrollOffset) {

    let elem = this.elem;
    elem.classList.add('sr-full');

    let offsetLeft = elem.offsetLeft + elem.offsetParent.offsetLeft;
    let offsetTop = (elem.offsetTop + elem.offsetParent.offsetTop) - shadowReader.headerElement.offsetHeight - scrollY + (scrollOffset || 0);
    let currentWidth = this.naturalDimensions.width;
    let currentHeight = this.naturalDimensions.height;
    let newWidth = innerWidth;
    let newHeight = newWidth * this.imageData.ratio;

    this.currentTransform = {
      scaleX: (newWidth / currentWidth),
      scaleY: (newHeight / currentHeight),
      translateX: -offsetLeft,
      translateY: -offsetTop
    };

    // animate the card to the natural ratio of the featured image
    this.elem.style.transform = 'translateY(' + this.currentTransform.translateY + 'px)'
                                + 'translateX(' + this.currentTransform.translateX + 'px)'
                                + 'scaleX(' + this.currentTransform.scaleX + ')'
                                + 'scaleY(' + this.currentTransform.scaleY + ')';

    // counter-animate all children
    this.resizeChildren({
      width: newWidth,
      height: newHeight
    }, /*animate*/!dontAnimate, true);

  }

  animateBack() {

    this.elem.classList.remove('sr-full');

    // animate to the right height
    this.elem.style.transform = '';

    this.currentTransform = {
      scaleX: 1,
      scaleY: 1,
      translateY: 0
    };

    // counter-animate all children
    this.resizeChildren(this.naturalDimensions, true, false);

  }

  create() {

    var elem = document.createElement('div'),
      innerElem = document.createElement('a'),
      img = document.createElement('img'),
      h2 = document.createElement('h2'),
      p = document.createElement('p');

    h2.innerHTML = this.data.title;
    p.innerHTML = this.data.description;
    innerElem.className = 'sr-inner';
    innerElem.href = this.data.link || '';
    elem.className = 'sr-card';
    img.src = this.data.image;
    img.setAttribute('role', 'presentation'); // prevents screen reader access

    // if we're in headless mode, that means the Card is initialized purely to
    // render out the featured image in the Shadow DOM, not for the list view,
    // thus we don't need to fancy it up for animations.
    if (!this.headless) {

      img.style.opacity = 0;
      img.onload = () => {

        this.imageData = {
          ratio: img.offsetHeight / img.offsetWidth,
          width: img.offsetWidth,
          height: img.offsetHeight
        };

        this.naturalDimensions = {
          width: this.elem.offsetWidth,
          height: this.elem.offsetHeight
        };

        this.resizeChildren(this.naturalDimensions, false);
        img.style.opacity = '';
        this.setReady();

      };

    }

    innerElem.appendChild(h2);
    innerElem.appendChild(p);
    elem.appendChild(img);
    elem.appendChild(innerElem);

    this.elem = elem;
    this.img = img;
    this.innerElem = innerElem;

  }

  refresh() {

    this.naturalDimensions = {
      width: this.elem.offsetWidth,
      height: this.elem.offsetHeight
    };

    this.resizeChildren(this.naturalDimensions, false);

  }

  hijackMenuButton() {
    shadowReader.nav.hamburgerReturnAction = event => {
      // Go back in history stack, but only if we don't trigger the method
      // manually, coming from popstate
      if(event) history.back();

      this.deactivate();
    };
  }

  activate() {

    // set main view to inert so you can't tab into it
    shadowReader.disableCardTabbing();

    // add loading spinner (and promote to layer)
    this.elem.classList.add('sr-loading', 'sr-promote-layer');

    this.article.load()
      .then(() => this.article.render())
      .then(() => {
        // remove loading spinner
        this.elem.classList.remove('sr-loading');

        this.animate();
        this.article.show();
        this.hijackMenuButton();
      })
      .catch(error => {
        this.elem.classList.remove('sr-loading');
        this.elem.classList.add('sr-error');
      });
  }

  deactivate() {

    // restore tabbing in main view
    shadowReader.enableCardTabbing();

    this.animateBack();
    this.article.hide();
  }

  bind() {
    /* use click event on purpose here, to not interfere with panning */
    this.innerElem.addEventListener('click', (event) => {

      // we only activate a card if we're on a narrow resolution, otherwise
      // we simply navigate to the link for now.
      if (innerWidth >= 768) {
        return;
      }

      // don't trigger the default link click
      event.preventDefault();

      // blur the element, as the focus style would hinder the animation
      this.innerElem.blur();

      // if we're looking at the duplicate card in the article view, a click
      // on the card should do nothing at all
      if (!this.elem.classList.contains('sr-full')) {
        // activate the card
        this.activate();
      }

    });
  }

  render() {
    shadowReader.itemsElement.appendChild(this.elem);
  }

  setReady() {
    this._ready = true;
    if (this._readyQueue) {
      for (let cb of this._readyQueue) {
        cb();
      }
      this._readyQueue = [];
    }
  }

  ready(cb) {
    if (!this._ready) {
      this._readyQueue = this._readyQueue || [];
      this._readyQueue.push(cb);
    } else {
      cb();
    }
  }

}
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

class Article {

  constructor(url, card) {
    this.url = shadowReader.backend.getAMPUrl(url);
    this.card = card;
    Article.articles[this.url] = this;
  }

  fetch() {

    // unfortunately fetch() does not support retrieving documents,
    // so we have to resort to good old XMLHttpRequest.
    var xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.open('GET', 'https://seed-octagon.glitch.me/' + encodeURIComponent(this.url), true);
      xhr.responseType = 'document';
      xhr.setRequestHeader('Accept', 'text/html');
      xhr.onload = () => {
        var isAMP = xhr.responseXML.documentElement.hasAttribute('amp') || xhr.responseXML.documentElement.hasAttribute('⚡');
        return isAMP ? resolve(xhr.responseXML) : reject('Article does not have an AMP version.');
      }; // .responseXML contains a ready-to-use Document object
      xhr.send();
    });

  }

  load() {
    return (this.doc ? Promise.resolve() : this.fetch().then(doc => {
      this.doc = doc;
      this.sanitize();
    }));
  }

  clear() {
    this.ampDoc.close();
    this.destroyShadowRoot();
  }

  sanitize() {

    let doc = this.doc;
    let hasCard = !!this.card;

    // call the sanitizer of the respective content backend
    shadowReader.backend.sanitize(doc, hasCard);

    // add the correct backend class, as the styling expects it
    this.doc.body.classList.add('sr-backend-' + shadowReader.backend.appTitle.toLowerCase());

    // insert stylesheet that styles the featured image
    var stylesheet = document.createElement('link');
    stylesheet.setAttribute('rel', 'stylesheet');
    stylesheet.href = '/inline.css';
    this.doc.body.append(stylesheet);

  }

  createShadowRoot() {
    var shadowRoot = document.createElement('article');
    shadowRoot.classList.add('sr-article');
    document.body.appendChild(shadowRoot);
    return shadowRoot;
  }

  destroyShadowRoot() {
    document.body.removeChild(this.container);
  }

  cloneCard() {

    let card = this.card.elem.cloneNode(true);

    // clear all transforms
    card.style.transform = '';
    card.children[0].style.transform = '';
    card.children[1].style.transform = '';

    // resize card to image ratio
    card.style.height = (innerWidth * this.card.imageData.ratio) + 'px';
    card.style.opacity = '0';
    card.style.margin = '0';

    this.clonedCard = card;
    return card;

  }

  generateCard() {

    let articleData = shadowReader.backend.getArticleData();
    let card = new Card(articleData, /*headless*/true).elem;

    // resize card to image ratio
    card.style.height = (innerWidth * articleData.imageRatio) + 'px';
    card.style.margin = '0';

    this.clonedCard = card;
    return card;

  }

  get cssVariables() {

    if (!this._cssVariables) {
      let htmlStyles = window.getComputedStyle(document.querySelector("html"));
      this._cssVariables = {
        animationSpeedIn: parseFloat(htmlStyles.getPropertyValue("--animation-speed-in")) * 1000,
        animationSpeedOut: parseFloat(htmlStyles.getPropertyValue("--animation-speed-in")) * 1000,
        easing: htmlStyles.getPropertyValue("--animation-easing")
      };
    }

    return this._cssVariables;

  }

  animateIn() {

    // No animation if there's no card to animate from
    if (!this.card) {
      return Promise.resolve();
    }

    return new Promise(resolve => {

      let _transitionEnd = () => {
        this.container.removeEventListener('transitionend', _transitionEnd);
        resolve();
      };

      this.container.addEventListener('transitionend', _transitionEnd, false);
      this.container.classList.add('at-top');

    });

  }

  animateOut() {

    // No animation if there's no card to animate from
    if (!this.card) {
      return Promise.resolve();
    }

    return new Promise(resolve => {

      let _transitionEnd = () => {
        this.container.removeEventListener('transitionend', _transitionEnd);
        resolve();
      };

      this.container.addEventListener('transitionend', _transitionEnd, false);
      this.container.classList.remove('at-top');

    });

  }

  render() {

    // Create an empty container for the AMP page
    this.container = this.createShadowRoot();

    // Tell Shadow AMP to initialize the AMP page in prerender-mode
    this.ampDoc = AMP.attachShadowDoc(this.container, this.doc, this.url);
    this.ampDoc.setVisibilityState('prerender');

    return this.ampDoc.ampdoc.whenReady();

  }

  show(replaceHistoryState) {

    // We need to clone the featured image into the Shadow DOM so it scrolls
    // along. There are cases were we don't have a linked card from the list
    // view (e.g. we load directly into the article), in which case we need to
    // generate a new one.
    var card = this.card ? this.cloneCard() : this.generateCard();
    card.lastElementChild.onclick = function () { return false; };
    this.ampDoc.ampdoc.getBody().prepend(card);

    // animate the article in. Only makes sense when there's a card transition
    // at the same time, within animateIn, we check for the availability of a
    // connected card, and don't animate if it's not around.
    return this.animateIn().then(() => {

      // Hide the original card, show the cloned one (this also animates)
      if (this.card) {
        card.style.opacity = '1';
      }

      // add class to html element for to contain the scroll, and transform
      // the hamburger into a 'back' button.
      document.documentElement.classList.add('sr-article-shown');

      this.takeoverScroll();

      // Set the visibility state of the AMP doc to visible
      this.ampDoc.setVisibilityState('visible');

      // Finally, add new history entry
      // Note: We're doing this deliberately late due to an AMP
      // Bug that overrides the history state object early on
      shadowReader.nav.setOpenArticle(this, replaceHistoryState);
      return true;
    });

  }

  hide() {

    // remove class to html element for global CSS stuff
    document.documentElement.classList.remove('sr-article-shown');

    // for some reason the browser restores scroll lazily, so we need
    // to wait a few ms until scrollTop can be set again..
    setTimeout(() => {

      this.restoreScroll();

      // Show the card header, hide the cloned one
      if (this.card) {
        this.clonedCard.style.opacity = '0';
      }

      // animate everything back to the card/listing view, then
      // clear the old Shadow DOM to free up memory.
      return this.animateOut().then(() => {
        this.clear();
        return true;
      });

    }, 50);

  }

  takeoverScroll() {
    this._mainScrollY = document.scrollingElement.scrollTop;
    document.scrollingElement.scrollTop = 0;
    this.container.style.transform = '';

  }

  restoreScroll() {
    document.scrollingElement.scrollTop = this._mainScrollY;
  }

}

Article.articles = {};
Article.getArticleByURL = function (url) {
  return Article.articles[url];
};