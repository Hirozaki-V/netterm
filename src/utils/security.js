/**
 * Higieniza strings para inserção segura no HTML, prevenindo ataques XSS.
 * Substitui caracteres reservados do HTML pelos seus equivalentes HTML entities.
 *
 * @param {string} str - A string de entrada a ser escapada.
 * @returns {string} A string higienizada.
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
