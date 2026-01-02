import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  createOptimizedPicture,
  fetchPlaceholders,
} from './aem.js';
import { enableDescription } from './utils.js';

/**
 * Processes image links within a container element.
 * Finds links with 'assets' in the href, optionally replaces them with AI-generated images,
 * and creates optimized pictures.
 * @param {Element} container - The container element to search for image links
 * @param {Object} options - Configuration options
 * @param {string} options.imageType - The type of image for AI lookup (e.g., 'hero', 'carousel', 'cards')
 * @param {boolean} options.replaceLink - If true, replaces the link with the picture. If false, prepends picture to link.
 * @param {string} options.selector - Optional custom selector for finding links (default: 'a[href*="assets"]')
 * @returns {Promise<Array>} Array of created picture elements
 */
export async function processImageLinks(container, options = {}) {
  const {
    imageType = null,
    replaceLink = true,
    selector = 'a[href*="assets"]',
  } = options;

  const links = container.querySelectorAll(selector);
  if (!links.length) return [];

  // Fetch placeholders for AI images
  let placeholders = {};
  let aiImages = [];

  try {
    if (window.placeholders && window.placeholders.aiImageLog) {
      // If aiImageLog exists, it might be a Promise, so await it
      placeholders = await window.placeholders.aiImageLog;
    } else {
      placeholders = await fetchPlaceholders();
    }

    // Get AI images for the specified type
    // Try both singular and plural versions (e.g., 'column' and 'columns')
    if (imageType && placeholders) {
      if (placeholders[imageType]) {
        aiImages = placeholders[imageType];
      } else {
        // Try plural version (add 's' if not present)
        const pluralType = imageType.endsWith('s') ? imageType : `${imageType}s`;
        // Try singular version (remove 's' if present)
        const singularType = imageType.endsWith('s') ? imageType.slice(0, -1) : imageType;
        
        if (placeholders[pluralType]) {
          aiImages = placeholders[pluralType];
        } else if (placeholders[singularType]) {
          aiImages = placeholders[singularType];
        }
      }
    }
  } catch (error) {
    console.log('processImageLinks - failed to load placeholders:', error);
  }

  let imageIndex = 0;
  const createdPictures = [];

  links.forEach((link) => {
    let imageUrl = link.href;

    // Check if we have AI-generated images available
    if (aiImages.length > 0 && imageIndex < aiImages.length) {
      imageUrl = aiImages[imageIndex].aemPreviewUrl;
      imageIndex++;
    }

    const picture = createOptimizedPicture(imageUrl);
    createdPictures.push(picture);

    if (replaceLink) {
      // Replace the link with the picture
      const parent = link.parentElement;
      parent.textContent = '';
      parent.appendChild(picture);
    } else {
      // Prepend picture to link (useful for hero-style blocks)
      link.prepend(picture);
    }
  });

  return createdPictures;
}

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
async function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const link = main.querySelector('a');

  if (link && link.href && link.href.includes('assets')) {
    // Use the global processImageLinks utility with replaceLink=false to prepend picture
    await processImageLinks(main, {
      imageType: 'hero',
      replaceLink: false,
      selector: 'a[href*="assets"]',
    });
  }

  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }

  if (link) link.remove();
}

/**
 * Decorates h1, h2 headings with repeatable scroll animations
 * @param {Element} main The container element
 */
function decorateHeadings(main) {
  const headingElements = main.querySelectorAll('h1, h2');

  headingElements.forEach((heading) => {
    // Set initial styles (starting from left, invisible)
    heading.style.opacity = '0';
    heading.style.transform = 'translateX(-50px)';

    // Create individual observer for each heading
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Use Web Animations API for reliable animation (left to right)
          entry.target.animate([
            { opacity: 0, transform: 'translateX(-50px)' },
            { opacity: 1, transform: 'translateX(0)' },
          ], {
            duration: 1500,
            easing: 'ease',
            fill: 'forwards',
          });
        } else {
          // Fast reset animation back to left
          entry.target.animate([
            { opacity: 1, transform: 'translateX(0)' },
            { opacity: 0, transform: 'translateX(-50px)' },
          ], {
            duration: 100,
            easing: 'ease',
            fill: 'forwards',
          });
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    });

    observer.observe(heading);
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
async function buildAutoBlocks(main) {
  try {
    await buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export async function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  await buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateHeadings(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    await decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

async function loadPlaceholders() {
  const placeholders = await fetchPlaceholders();
  console.log(placeholders);
}

loadPlaceholders();

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);

  // Enable description text replacement after sections are loaded
  await enableDescription();

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
