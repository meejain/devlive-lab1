import { fetchPlaceholders } from '../../scripts/aem.js';

export async function enableDescription() {
    // Check if AI image data is already available, otherwise fetch it
    let placeholders;
    if (window.placeholders && window.placeholders.aiImageLog) {
        // If aiImageLog exists, it might be a Promise, so await it
        placeholders = await window.placeholders.aiImageLog;
    } else {
        placeholders = await fetchPlaceholders();
    }
    
    // Check if Hero key exists and has generatedText
    if (placeholders && placeholders.hero && placeholders.hero.length > 0) {
        const heroData = placeholders.hero[0]; // Get the latest hero entry
        const generatedText = heroData.generatedText;
        
        if (generatedText) {
            // Target the section with .section.description classes
            const descriptionSection = document.querySelector('.section.description');
            
            if (descriptionSection) {
                // Find the P element within this section
                const pElement = descriptionSection.querySelector('p');
                
                if (pElement) {
                    // Replace the P element content with the generatedText
                    console.log('Generated text:', generatedText);
                    
                    // Split the generated text into paragraphs and create proper HTML structure
                    const paragraphs = generatedText.split('\n\n').filter(para => para.trim().length > 0);
                    
                    if (paragraphs.length > 1) {
                        // Multiple paragraphs - replace the single p element with multiple p elements
                        const parentElement = pElement.parentElement;
                        
                        // Remove the original p element
                        pElement.remove();
                        
                        // Add each paragraph as a separate p element
                        paragraphs.forEach(paragraph => {
                            const newP = document.createElement('p');
                            newP.textContent = paragraph.trim();
                            parentElement.appendChild(newP);
                        });
                    } else {
                        // Single paragraph - just replace the content
                        pElement.textContent = generatedText;
                    }
                }
            }
        }
    }
    // If Hero key doesn't exist or no generatedText, keep the text as it is
}