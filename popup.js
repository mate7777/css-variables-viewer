document.addEventListener("DOMContentLoaded", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let history = [];
    let historyIndex = -1;
  
    const onElement = (id, event, callback) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(event, callback);
    };
  
    try {
      let [response] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: getCSSVariables
      });
  
      if (response && response.result) {
        renderVariablesList(response.result);
        initEventListeners();
  
        chrome.storage.local.get(['lastUsedValues'], result => {
          if (result.lastUsedValues) {
            console.log('Last used values loaded:', result.lastUsedValues);
          }
        });
      } else {
        throw new Error("No CSS variable found");
      }
    } catch (error) {
      console.error("CSS variable retrieval error:", error);
      const list = document.getElementById("variables-list");
      if (list) {
        list.innerHTML = "";
        const item = document.createElement("li");
        item.textContent = `Error: ${error.message}`;
        list.appendChild(item);
      }
    }
  
    function initEventListeners() {
      onElement('search-input', 'input', function () {
        filterVariables(this.value.toLowerCase());
      });
  
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          filterByCategory(this.dataset.category);
        });
      });
  
      onElement('undo-btn', 'click', undo);
      onElement('redo-btn', 'click', redo);
      onElement('export-btn', 'click', exportCSSVariables);
      onElement('check-undefined-btn', 'click', checkUndefinedVariables);
      onElement('add-polyfill-btn', 'click', addPolyfill);
    }
  
    function renderVariablesList(variables) {
      const container = document.getElementById("variables-list");
      if (!container) return;
      container.innerHTML = "";
  
      if (!variables || variables.length === 0) {
        container.innerHTML = "<li>No CSS variable found.</li>";
        return;
      }
  
      const categories = {
        colors: 'Colors',
        spacing: 'Spacing',
        typography: 'Typography',
        other: 'Other'
      };
  
      const grouped = variables.reduce((acc, variable) => {
        acc[variable.category] = acc[variable.category] || [];
        acc[variable.category].push(variable);
        return acc;
      }, {});
  
      Object.entries(categories).forEach(([key, label]) => {
        if (!grouped[key]) return;
  
        const groupDiv = document.createElement('div');
        groupDiv.className = 'category-group';
  
        const heading = document.createElement('h3');
        heading.textContent = label;
        groupDiv.appendChild(heading);
  
        const ul = document.createElement('ul');
        ul.className = 'category-list';
        ul.dataset.category = key;
  
        grouped[key].forEach(({ name, value }) => {
          const li = document.createElement('li');
          li.dataset.category = key;
  
          const isColor = /^#[0-9A-F]{3,6}$/i.test(value) || value.startsWith('rgb') || value.startsWith('hsl');

          const nameElement = document.createElement('span');
          nameElement.className = 'var-name';
          nameElement.textContent = name;
          li.appendChild(nameElement);

          if (isColor) {
            const preview = document.createElement('span');
            preview.className = 'color-preview';
            preview.style.backgroundColor = value;
            li.appendChild(preview);
          }

          const valueInput = document.createElement('input');
          valueInput.className = 'var-value-input';
          valueInput.type = 'text';
          valueInput.value = value;
          li.appendChild(valueInput);

          if (isColor) {
            const colorInput = document.createElement('input');
            colorInput.className = 'color-picker';
            colorInput.type = 'color';
            colorInput.value = convertToHex(value);
            li.appendChild(colorInput);
          }

          const applyButton = document.createElement('button');
          applyButton.className = 'apply-btn';
          applyButton.textContent = 'Apply';
          li.appendChild(applyButton);

          const tooltip = getTooltipForVariable(name);
          if (tooltip) {
            const tooltipIcon = document.createElement('span');
            tooltipIcon.className = 'tooltip-icon';
            tooltipIcon.textContent = '?';

            const tooltipText = document.createElement('span');
            tooltipText.className = 'tooltip-text';
            tooltipText.textContent = tooltip;
            tooltipIcon.appendChild(tooltipText);
            li.appendChild(tooltipIcon);
          }
  
          ul.appendChild(li);
        });
  
        groupDiv.appendChild(ul);
        container.appendChild(groupDiv);
      });
  
      document.querySelectorAll('.apply-btn').forEach(button => {
        button.addEventListener('click', function () {
          const li = this.parentElement;
          const name = li.querySelector('.var-name').textContent;
          const input = li.querySelector('.var-value-input');
          updateCSSVariable(name, input.value);
        });
      });
  
      document.querySelectorAll('.color-picker').forEach(picker => {
        picker.addEventListener('input', function () {
          const li = this.parentElement;
          const name = li.querySelector('.var-name').textContent;
          const input = li.querySelector('.var-value-input');
          input.value = this.value;
          updateCSSVariable(name, this.value);
        });
      });
    }
  
    function filterVariables(term) {
      document.querySelectorAll('#variables-list li').forEach(item => {
        const name = item.querySelector('.var-name').textContent.toLowerCase();
        const val = item.querySelector('.var-value-input').value.toLowerCase();
        item.style.display = name.includes(term) || val.includes(term) ? '' : 'none';
      });
    }
  
    function filterByCategory(category) {
      document.querySelectorAll('.category-group').forEach(group => {
        const cat = group.querySelector('ul').dataset.category;
        group.style.display = (category === 'all' || category === cat) ? '' : 'none';
      });
    }
  
    async function updateCSSVariable(name, value, saveHistory = true) {
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
      const oldValue = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: name => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
        args: [name]
      });
  
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (name, value) => document.documentElement.style.setProperty(name, value),
        args: [name, value]
      });
  
      chrome.storage.local.get(['lastUsedValues'], res => {
        const values = res.lastUsedValues || {};
        values[name] = value;
        chrome.storage.local.set({ lastUsedValues: values });
      });
  
      if (saveHistory) {
        addToHistory(name, oldValue[0].result, value);
      }
    }
  
    function addToHistory(name, oldValue, newValue) {
      if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
      }
      history.push({ name, oldValue, newValue });
      historyIndex = history.length - 1;
      updateHistoryButtons();
    }
  
    function undo() {
      if (historyIndex >= 0) {
        const { name, oldValue } = history[historyIndex];
        updateCSSVariable(name, oldValue, false);
        historyIndex--;
        updateHistoryButtons();
      }
    }
  
    function redo() {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        const { name, newValue } = history[historyIndex];
        updateCSSVariable(name, newValue, false);
        updateHistoryButtons();
      }
    }
  
    function updateHistoryButtons() {
      const undoBtn = document.getElementById('undo-btn');
      const redoBtn = document.getElementById('redo-btn');
      if (undoBtn) undoBtn.disabled = historyIndex < 0;
      if (redoBtn) redoBtn.disabled = historyIndex >= history.length - 1;
    }
  
    async function exportCSSVariables() {
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
      let [response] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: getAllCSSVariables
      });
  
      const variables = response.result;
      const css = `:root {\n${variables.map(v => `  ${v.name}: ${v.value};`).join('\n')}\n}`;
  
      const blob = new Blob([css], { type: 'text/css' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'variables.css';
      a.click();
      URL.revokeObjectURL(a.href);
    }
  
    async function checkUndefinedVariables() {
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
      let [response] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: findUndefinedCSSVariables
      });
  
      const list = document.getElementById('undefined-vars-list');
      if (!list) return;

      list.innerHTML = "";
      if (response.result.length === 0) {
        const item = document.createElement('li');
        item.textContent = 'No undefined CSS variable found.';
        list.appendChild(item);
        return;
      }

      response.result.forEach(result => {
        const item = document.createElement('li');
        const variable = document.createElement('span');
        variable.textContent = result.variable;
        item.append(variable, ` - ${result.inline ? 'Style inline' : result.selector}`);
        list.appendChild(item);
      });
    }
  
    async function addPolyfill() {
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: injectPolyfill
      });
    }
  
    function convertToHex(color) {
      if (color.startsWith('#')) return color;
      const temp = document.createElement('div');
      temp.style.color = color;
      document.body.appendChild(temp);
      const computed = getComputedStyle(temp).color;
      document.body.removeChild(temp);
      const match = computed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
      return match
        ? '#' + match.slice(1).map(v => parseInt(v).toString(16).padStart(2, '0')).join('')
        : '#000000';
    }
  
    function getTooltipForVariable(name) {
      const tooltips = {
        '--color-primary': 'Primary color',
        '--color-secondary': 'Secondary color',
        '--font-size-base': 'Base text size',
        '--spacing-unit': 'Base spacing'
      };
      return tooltips[name] || '';
    }
  });
  
  // Functions injected into the page.
  function getCSSVariables() {
    const cssVars = new Map();
  
    function getCategoryFromName(name) {
      if (name.includes('color')) return 'colors';
      if (name.includes('spacing') || name.includes('margin') || name.includes('padding')) return 'spacing';
      if (name.includes('font') || name.includes('text')) return 'typography';
      return 'other';
    }
  
    for (const sheet of document.styleSheets) {
      try {
        if (!sheet.href || sheet.href.startsWith(location.origin)) {
          for (const rule of sheet.cssRules) {
            if (rule.style) {
              for (const prop of rule.style) {
                if (prop.startsWith('--')) {
                  cssVars.set(prop, {
                    name: prop,
                    value: rule.style.getPropertyValue(prop).trim(),
                    category: getCategoryFromName(prop)
                  });
                }
              }
            }
          }
        }
      } catch (e) {}
    }
    return Array.from(cssVars.values());
  }
  
  function getAllCSSVariables() {
    const result = [];
    const styles = getComputedStyle(document.documentElement);
    for (let i = 0; i < styles.length; i++) {
      if (styles[i].startsWith('--')) {
        result.push({ name: styles[i], value: styles.getPropertyValue(styles[i]).trim() });
      }
    }
    return result;
  }
  
  function findUndefinedCSSVariables() {
    const undefinedVars = [];
    document.querySelectorAll('[style]').forEach(el => {
      const vars = el.getAttribute('style').match(/var\(--[^,)]+/g);
      if (vars) {
        vars.forEach(match => {
          const name = match.slice(4);
          if (!getComputedStyle(el).getPropertyValue(name).trim()) {
            undefinedVars.push({ variable: name, inline: true });
          }
        });
      }
    });
  
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          const match = rule.cssText.match(/var\(--[^,)]+/g);
          if (match && rule.selectorText) {
            match.forEach(m => {
              const name = m.slice(4);
              const elements = document.querySelectorAll(rule.selectorText);
              elements.forEach(el => {
                if (!getComputedStyle(el).getPropertyValue(name).trim()) {
                  undefinedVars.push({ variable: name, selector: rule.selectorText, inline: false });
                }
              });
            });
          }
        }
      } catch (e) {}
    }
    return undefinedVars;
  }
  
  function injectPolyfill() {
    if (window.cssVarsPolyfillInjected) return;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/css-vars-ponyfill@2';
    script.onload = () => {
      window.cssVars({ onlyLegacy: true, silent: true });
      window.cssVarsPolyfillInjected = true;
    };
    document.head.appendChild(script);
  }
  
