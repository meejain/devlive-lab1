// media query match that indicates mobile/tablet width
import { processImageLinks } from '../../scripts/scripts.js';

const isDesktop = window.matchMedia('(min-width: 900px)');

export default async function decorate(block) {
  const buttons = document.createElement('div');
  buttons.className = 'carousel-buttons';

  [...block.children].forEach((row, i) => {
    if (!i) row.classList.add('selected');
    const classes = ['image', 'text'];
    classes.forEach((e, j) => {
      row.children[j].classList.add(`carousel-${e}`);
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

  // Process all image links in the carousel block using the global utility
  await processImageLinks(block, {
    imageType: 'carousel',
    replaceLink: true,
  });

  block.append(buttons);
  setInterval(() => { let nextButton = buttons.querySelector('button.selected').nextSibling; if (!nextButton) nextButton = buttons.querySelector('button'); nextButton.click(); }, 2000);
  /* load second image for mobile eagerly for LCP */
  if (!isDesktop.matches) {
    block.querySelector('.carousel.block > div:first-of-type picture:nth-of-type(1) img').setAttribute('loading', 'lazy');
    block.querySelector('.carousel.block > div:first-of-type picture:nth-of-type(2) img').setAttribute('loading', 'eager');
  }
}