let quill;
export function initRichText(containerId) {
    quill = new Quill(`#${containerId}`, { theme: 'snow', placeholder: 'Write description...' });
    return quill;
}
export function getRichText() { return quill ? quill.root.innerHTML : ''; }
export function setRichText(html) { if(quill) quill.root.innerHTML = html; }
