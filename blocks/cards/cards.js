import { createOptimizedPicture } from '../../scripts/aem.js';
import { processImageLinks } from '../../scripts/scripts.js';

export default async function decorate(block) {
  // Process any image links (links with 'assets' in href) before building the card structure
  await processImageLinks(block, {
    imageType: 'cards',
    replaceLink: true,
  });

  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.replaceChildren(ul);
}
