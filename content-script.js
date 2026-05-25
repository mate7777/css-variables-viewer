function getCSSVariables() {
    const cssVariables = new Set();
    const errors = [];
  
    function getCategoryFromName(name) {
      if (name.includes('color')) return 'colors';
      if (name.includes('spacing') || name.includes('margin') || name.includes('padding')) return 'spacing';
      if (name.includes('font') || name.includes('text')) return 'typography';
      return 'other';
    }
  
    for (const sheet of document.styleSheets) {
      try {
        if (!sheet.href) {
          if (sheet.cssRules) {
            for (const rule of sheet.cssRules) {
              if (rule.style) {
                for (const prop of rule.style) {
                  if (prop.startsWith('--')) {
                    cssVariables.add({
                      name: prop,
                      value: rule.style.getPropertyValue(prop).trim(),
                      category: getCategoryFromName(prop)
                    });
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Error while accessing CSS rules for an internal stylesheet:`, error);
        errors.push({ sheet: 'Internal stylesheet', error: error.message });
      }
    }
  
    if (errors.length > 0) {
      console.error("Errors while retrieving CSS variables:", errors);
    }
  
    return [...cssVariables];
  }
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCSSVariables') {
      const variables = getCSSVariables();
      sendResponse({ variables });
    }
  });
  
