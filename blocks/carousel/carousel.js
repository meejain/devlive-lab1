// media query match that indicates mobile/tablet width
import { createOptimizedPicture, fetchPlaceholders } from '../../scripts/aem.js';

const isDesktop = window.matchMedia('(min-width: 900px)');

export default async function decorate(block) {
  // Check if AI image data is already available, otherwise fetch it
  let placeholders;
  if (window.placeholders && window.placeholders.aiImageLog) {
    placeholders = window.placeholders.aiImageLog;
  } else {
    placeholders = await fetchPlaceholders();
  }
  const carouselImages = placeholders.carousel || [];
  let imageIndex = 0; // Counter to track which AI image to use next

  const buttons = document.createElement('div');
  buttons.className = 'carousel-buttons';
  [...block.children].forEach((row, i) => {
    if (!i) row.classList.add('selected');
    const classes = ['image', 'text'];
    classes.forEach((e, j) => {
      row.children[j].classList.add(`carousel-${e}`);
      
      // Process image links in the carousel-image div
      if (e === 'image') {
        const imageDiv = row.children[j];
        const link = imageDiv.querySelector('a');
        if (link && link.href && link.href.includes('assets')) {
          let imageUrl = link.href; // Default to original URL
          
          // Check if we have AI-generated images available
          if (carouselImages.length > 0 && imageIndex < carouselImages.length) {
            // Use the AI-generated image URL (latest first)
            imageUrl = carouselImages[imageIndex].aemPreviewUrl;
            imageIndex++; // Move to next image for subsequent links
          }
          
          let carouselImage = createOptimizedPicture(imageUrl);
          imageDiv.textContent = '';
          imageDiv.appendChild(carouselImage);
        }
      }
    });
    /* buttons */
    const button = document.createElement('button');
    button.setAttribute('id', `carousel-button-${i}`);
    button.setAttribute('title', 'Slide');
    if (!i) button.classList.add('selected');
    button.addEventListener('click', () => {
      [...buttons.children].forEach((r) => r.classList.remove('selected'));
      [...block.children].forEach((r) => r.classList.remove('selected'));
      button.classList.add('selected');
      block.children[i].classList.add('selected');
    });
    buttons.append(button);
  });
  block.append(buttons);
  setInterval(() => { let nextButton = buttons.querySelector('button.selected').nextSibling; if (!nextButton) nextButton = buttons.querySelector('button'); nextButton.click(); }, 2000);
  /* load second image for mobile eagerly for LCP */
  if (!isDesktop.matches) {
    block.querySelector('.carousel.block > div:first-of-type picture:nth-of-type(1) img').setAttribute('loading', 'lazy');
    block.querySelector('.carousel.block > div:first-of-type picture:nth-of-type(2) img').setAttribute('loading', 'eager');
  }
}